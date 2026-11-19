#!/usr/bin/env node
/**
 * content-guardrails.mjs
 * Guardrails determinísticos de conteúdo para geração de relatórios e PDFs:
 * 1. Política inviolável Zero Referência a IA (detecção, bloqueio estrito e sanitização).
 * 2. Perfis de audiência (`technical` vs `executive`) e filtragem de jargão técnico
 *    para leitores não programadores.
 *
 * Zero dependências externas (Node.js ESM nativo).
 */

export const AUDIENCE_PROFILES = Object.freeze(['technical', 'executive']);
export const AI_GUARD_MODES = Object.freeze(['strict', 'sanitize']);

const AUDIENCE_ALIASES = Object.freeze({
  technical: 'technical',
  tech: 'technical',
  tecnico: 'technical',
  técnico: 'technical',
  dev: 'technical',
  engenharia: 'technical',
  qa: 'technical',
  executive: 'executive',
  exec: 'executive',
  executivo: 'executive',
  'nao-tecnico': 'executive',
  'não-tecnico': 'executive',
  'nao-técnico': 'executive',
  'não-técnico': 'executive',
  naotecnico: 'executive',
  'non-technical': 'executive',
  nontechnical: 'executive',
  negocio: 'executive',
  negócio: 'executive',
  gestao: 'executive',
  gestão: 'executive',
  cliente: 'executive',
  diretoria: 'executive',
});

/**
 * Normaliza o identificador de público-alvo (`technical` | `executive`).
 * Retorna `null` caso o valor informado não seja reconhecido.
 */
export function normalizeAudienceProfile(value, fallback = null) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }
  const key = String(value).trim().toLowerCase();
  return AUDIENCE_ALIASES[key] || null;
}

/**
 * Normaliza o modo do verificador Anti-IA (`strict` | `sanitize`).
 * Retorna `null` caso o valor informado não seja reconhecido.
 */
export function normalizeAiGuardMode(value, fallback = null) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }
  const key = String(value).trim().toLowerCase();
  return AI_GUARD_MODES.includes(key) ? key : null;
}

/**
 * Envolve uma expressão em fronteiras de palavra Unicode seguras para português
 * (evita falsos positivos com caracteres acentuados onde `\b` ASCII falha).
 */
function unicodeWordPattern(innerPattern, flags = 'giu') {
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${innerPattern})(?![\\p{L}\\p{N}_])`, flags);
}

/**
 * Catálogo de regras de detecção da Política Zero Referência a IA.
 * Cada regra usa fronteiras Unicode estritas para evitar falsos positivos em palavras
 * comuns do português (`dia`, `via`, `guia`, `história`, `mídia`, `copia`, `envia`,
 * `agência`, `agenda`, `agendamento`, `reagente` ou o verbo `ia` em minúsculas).
 */
const FORBIDDEN_AI_RULES = Object.freeze([
  // --- Provedores, modelos e plataformas ---
  {
    id: 'provider-anthropic-claude',
    category: 'Provedor / Modelo de IA',
    regex: unicodeWordPattern('Claude(?:\\s+(?:Code|Sonnet|Opus|Haiku|[0-9.]+))?|Anthropic'),
    replacement: '',
  },
  {
    id: 'provider-openai-gpt',
    category: 'Provedor / Modelo de IA',
    regex: unicodeWordPattern('OpenAI|ChatGPT|GPT(?:-[0-9A-Za-z.]+)?|DALL[·-]?E'),
    replacement: '',
  },
  {
    id: 'provider-google-gemini',
    category: 'Provedor / Modelo de IA',
    regex: unicodeWordPattern('Gemini(?:\\s+(?:Pro|Flash|Ultra|[0-9.]+))?|Google\\s+AI|Vertex\\s+AI|Antigravity'),
    replacement: '',
  },
  {
    id: 'provider-coding-assistants',
    category: 'Plataforma / Assistente de IA',
    regex: unicodeWordPattern('GitHub\\s+Copilot|Copilot|Cursor\\s+(?:AI|IDE)|Windsurf|Codeium|Tabnine|Devin'),
    replacement: '',
  },
  {
    id: 'provider-cursor-contextual',
    category: 'Plataforma / Assistente de IA',
    // Case-sensitive em "Cursor" precedido de preposição/contexto para nunca afetar CSS `cursor:` ou "cursor do mouse"
    regex: unicodeWordPattern('(?:via|no|pelo|com(?:\\s+o)?|editor)\\s+Cursor', 'gu'),
    replacement: '',
  },
  {
    id: 'provider-other-llms',
    category: 'Provedor / Modelo de IA',
    regex: unicodeWordPattern(
      'Perplexity|DeepSeek|Llama(?:\\s*[0-9.]+)?|Mistral|Mixtral|Grok|xAI|Midjourney|Amazon\\s+Bedrock|Bedrock|Ollama|LangChain|LlamaIndex|AutoGPT|CrewAI|Cohere|Hugging\\s*Face'
    ),
    replacement: '',
  },

  // --- Termos genéricos de IA, LLMs, Agentes, Prompts e Chatbots (frases completas antes de siglas curtas) ---
  {
    id: 'generic-artificial-intelligence',
    category: 'Termo de Inteligência Artificial',
    regex: unicodeWordPattern(
      'intelig[êe]ncia\\s+artificial|artificial\\s+intelligence|ia\\s+generativa|generative\\s+ai|genai'
    ),
    replacement: '',
  },
  {
    id: 'generic-llm-ml',
    category: 'Modelo de Linguagem / ML',
    regex: unicodeWordPattern(
      'LLMs?|large\\s+language\\s+models?|modelos?\\s+de\\s+linguagem|machine\\s+learning|aprendizado\\s+de\\s+m[áa]quina|deep\\s+learning|redes?\\s+neurais?'
    ),
    replacement: '',
  },
  {
    id: 'generic-chatbots',
    category: 'Chatbot / Assistente Conversacional',
    regex: unicodeWordPattern('chat\\s*-?\\s*bots?|assistentes?\\s+(?:de\\s+ia|virtuais?|conversacionais?)'),
    replacement: '',
  },
  {
    id: 'generic-agents',
    category: 'Agente Automatizado',
    // Captura `agente`, `agentes`, `subagente`, `subagentes`, `multi-agente` e equivalentes em inglês,
    // sem jamais capturar `agência`, `agenda`, `agendamento`, `reagente` ou header HTTP `User-Agent`.
    regex: unicodeWordPattern(
      '(?:sub|multi-?)?agentes?(?:\\s+(?:de\\s+ia|aut[ôo]nomos?|virtuais?|conversacionais?|inteligentes?))?|(?:ai|autonomous|llm|coding|virtual)\\s+agents?'
    ),
    replacement: '',
  },
  {
    id: 'generic-prompts',
    category: 'Termo de Prompt / Instrução de IA',
    // `(?!\s*\()` evita colisão com chamadas JS `window.prompt(` em código técnico
    regex: /(?<![\p{L}\p{N}_])prompts?(?:\s+de\s+ia|\s+engineering)?(?![\p{L}\p{N}_])(?!\s*\()/giu,
    replacement: '',
  },

  // --- Siglas isoladas (case-sensitive ou pontuadas para evitar o verbo "ia" e interjeições) ---
  {
    id: 'acronym-ia-uppercase',
    category: 'Menção Direta a IA',
    regex: unicodeWordPattern('IA|AI', 'gu'),
    replacement: '',
  },
  {
    id: 'acronym-ia-dotted',
    category: 'Menção Direta a IA',
    regex: /(?<![\p{L}\p{N}_])(?:I\.A\.|A\.I\.)(?![\p{L}\p{N}_])/giu,
    replacement: '',
  },
  {
    id: 'acronym-ia-contextual-lower',
    category: 'Menção Direta a IA',
    regex: unicodeWordPattern(
      '(?:sistema|modelo|motor|ferramenta|assistente|uso|apoio|gerado|criado|escrito|produzido|redigido|elaborado|automatizado)\\s+(?:de|por|via|com)\\s+ia'
    ),
    replacement: '',
  },
]);

/**
 * Mascara payloads Base64 (`data:image/...;base64,...`) linha a linha antes da varredura,
 * evitando que sequências aleatórias dentro de imagens codificadas gerem falsos positivos
 * e preservando exatamente a numeração de linhas original.
 */
function maskInlineDataUris(text) {
  return String(text || '').replace(
    /data:[a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g,
    'data:masked;base64,REDACTED'
  );
}

function buildLineExcerpt(lineText, matchIndex, matchLength, radius = 42) {
  const cleanLine = String(lineText || '');
  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(cleanLine.length, matchIndex + matchLength + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < cleanLine.length ? '…' : '';
  return `${prefix}${cleanLine.slice(start, end).trim()}${suffix}`;
}

/**
 * Inspeciona um texto e retorna todas as violações da Política Zero Referência a IA.
 *
 * @param {string} text Conteúdo Markdown, HTML ou texto plano a auditar.
 * @returns {Array<{line: number, column: number, term: string, category: string, ruleId: string, excerpt: string}>}
 */
export function detectForbiddenAiTerms(text) {
  if (!text) return [];

  const masked = maskInlineDataUris(text).replace(/\r\n/g, '\n');
  const lines = masked.split('\n');
  const violations = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (!line.trim()) continue;

    const occupiedRanges = [];

    for (const rule of FORBIDDEN_AI_RULES) {
      const regex = new RegExp(rule.regex.source, rule.regex.flags);
      let match;
      while ((match = regex.exec(line)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        // Evita duplicar a mesma ocorrência quando duas regras se sobrepõem
        const overlaps = occupiedRanges.some((r) => start < r.end && end > r.start);
        if (!overlaps) {
          occupiedRanges.push({ start, end });
          violations.push({
            line: lineIdx + 1,
            column: start + 1,
            term: match[0],
            category: rule.category,
            ruleId: rule.id,
            excerpt: buildLineExcerpt(line, start, match[0].length),
          });
        }

        if (match[0].length === 0) regex.lastIndex++;
      }
    }
  }

  violations.sort((a, b) => a.line - b.line || a.column - b.column);
  return violations;
}

/**
 * Remove ocorrências proibidas de IA do texto para uso no modo `--ai-guard sanitize`,
 * preservando integridade de imagens Base64 e limpando espaços duplicados residuais.
 *
 * @param {string} text Texto de entrada.
 * @returns {{ text: string, matches: Array<{line: number, column: number, term: string, category: string, ruleId: string, excerpt: string}> }}
 */
export function sanitizeForbiddenAiTerms(text) {
  const raw = String(text || '');
  const matches = detectForbiddenAiTerms(raw);
  if (matches.length === 0) {
    return { text: raw, matches: [] };
  }

  // Protege Data URIs Base64 durante a substituição textual
  const dataUriVault = [];
  let working = raw.replace(
    /data:[a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g,
    (uri) => {
      const token = `__DATA_URI_VAULT_${dataUriVault.length}__`;
      dataUriVault.push(uri);
      return token;
    }
  );

  // Remove conectivos comuns imediatamente antes do termo removido (ex.: "gerado por IA" -> "gerado automaticamente")
  working = working.replace(
    unicodeWordPattern(
      '(?:gerado|criado|escrito|produzido|redigido|elaborado)\\s+(?:por|via|com|pela|pelo)\\s+(?:IA|AI|I\\.A\\.|A\\.I\\.|intelig[êe]ncia\\s+artificial|ChatGPT|Claude|Anthropic|OpenAI|Gemini|Copilot|Antigravity|Cursor(?:\\s+AI)?)'
    ),
    'elaborado de forma padronizada'
  );

  for (const rule of FORBIDDEN_AI_RULES) {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    working = working.replace(regex, rule.replacement);
  }

  // Limpa artefatos pontuais de espaçamento por linha sem afetar quebras de parágrafo
  working = working
    .split('\n')
    .map((line) => {
      if (/^\s*(?:```|~~~|\|)/.test(line)) {
        return line.replace(/ {2,}/g, ' ');
      }
      return line
        .replace(/\(\s*\)/g, '')
        .replace(/\[\s*\]/g, '')
        .replace(/\s+([,.;:!?])/g, '$1')
        .replace(/ {2,}/g, ' ')
        .replace(/\s+—\s*$/g, '')
        .trimEnd();
    })
    .join('\n');

  // Restaura Data URIs intactos
  working = working.replace(/__DATA_URI_VAULT_(\d+)__/g, (_, idx) => dataUriVault[Number(idx)] || '');

  return { text: working, matches };
}

/**
 * Garante que o texto não contenha nenhuma referência proibida a IA.
 * Lança erro estruturado (`err.code = 'FORBIDDEN_AI_REFERENCE'`) caso haja violações.
 */
export function assertNoForbiddenAiReferences(text, { contextLabel = 'documento' } = {}) {
  const matches = detectForbiddenAiTerms(text);
  if (matches.length === 0) return;

  const previewLines = matches
    .slice(0, 8)
    .map(
      (m) =>
        `  - Linha ${m.line} [${m.category}]: termo "${m.term}" em "${m.excerpt}"`
    )
    .join('\n');
  const extraCount = matches.length > 8 ? `\n  ... e mais ${matches.length - 8} ocorrência(s).` : '';

  const err = new Error(
    `Violação da Política Zero Referência a IA detectada em ${contextLabel} (${matches.length} ocorrência(s)):\n` +
      `${previewLines}${extraCount}\n` +
      `Remova todas as referências a IA, modelos, provedores, agentes ou chatbots antes de gerar o PDF (ou utilize --ai-guard sanitize).`
  );
  err.code = 'FORBIDDEN_AI_REFERENCE';
  err.matches = matches;
  throw err;
}

const TECHNICAL_META_LABEL_PATTERNS = [
  /^branch(?:\s*\/\s*escopo)?$/i,
  /^branch\s+base$/i,
  /^commit(?:\s+sha|\s+hash)?$/i,
  /^(?:git\s+)?(?:sha|hash|diff)$/i,
  /^arquivos?(?:\s+alterados|\s+no\s+diff)?$/i,
  /^reposit[óo]rio$/i,
  /^(?:pr|pull\s+request|merge\s+request)$/i,
  /^url\s+(?:t[ée]cnica|base)$/i,
  /^(?:motor|runner|framework|playwright|viewport|headless)$/i,
];

/**
 * Identifica rótulos de metadados voltados exclusivamente a engenharia/código
 * para ocultá-los da barra de metadados no modo `executive`.
 */
export function isTechnicalMetaLabel(label) {
  const clean = String(label || '')
    .replace(/[*_`]/g, '')
    .trim();
  if (!clean) return false;
  return TECHNICAL_META_LABEL_PATTERNS.some((rx) => rx.test(clean));
}

const TECHNICAL_SECTION_HEADING_PATTERNS = [
  /arquivos?\s+(?:detectados?|alterados?|modificados?|relacionados?)\s+no\s+diff/i,
  /\bgit\s+diff\b/i,
  /\blogs?\s+(?:brutos?|t[ée]cnicos?|de\s+console|de\s+rede)\b/i,
  /\bstack\s*traces?\b/i,
  /\btelemetria\s+(?:bruta|t[ée]cnica)\b/i,
  /\banexo\s+t[ée]cnico\b/i,
  /\bpayloads?\s+(?:http|json|brutos?)\b/i,
  /\bdiagn[óo]stico\s+de\s+c[óo]digo\b/i,
];

/**
 * Identifica títulos de seções estritamente técnicas/de código que devem ser
 * omitidas quando o PDF é renderizado no modo `executive`.
 */
export function isTechnicalSectionHeading(headingText) {
  const clean = String(headingText || '')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_`#]/g, '')
    .trim();
  if (!clean) return false;
  return TECHNICAL_SECTION_HEADING_PATTERNS.some((rx) => rx.test(clean));
}

const INPUT_TYPE_TRANSLATIONS = Object.freeze([
  [/\(\s*input:email\s*\)/gi, '(campo de e-mail)'],
  [/\(\s*input:password\s*\)/gi, '(campo de senha)'],
  [/\(\s*input:search\s*\)/gi, '(campo de busca)'],
  [/\(\s*input:tel\s*\)/gi, '(campo de telefone)'],
  [/\(\s*input:url\s*\)/gi, '(campo de endereço web)'],
  [/\(\s*input:number\s*\)/gi, '(campo numérico)'],
  [/\(\s*input:(?:date|datetime-local|month|time|week)\s*\)/gi, '(seletor de data/hora)'],
  [/\(\s*input:checkbox\s*\)/gi, '(caixa de marcação)'],
  [/\(\s*input:radio\s*\)/gi, '(opção de escolha única)'],
  [/\(\s*input:file\s*\)/gi, '(envio de arquivo)'],
  [/\(\s*input:(?:text|[^\s)]+)\s*\)/gi, '(campo de preenchimento)'],
  [/\(\s*textarea\s*\)/gi, '(campo de texto longo)'],
  [/\(\s*select\s*\)/gi, '(lista de seleção)'],
]);

function looksLikeTechnicalCodeBlock(codeContent, fenceLang) {
  const lang = String(fenceLang || '').trim().toLowerCase();
  if (
    ['js', 'jsx', 'ts', 'tsx', 'json', 'bash', 'sh', 'zsh', 'diff', 'patch', 'sql', 'http', 'stack', 'log'].includes(
      lang
    )
  ) {
    return true;
  }
  const sample = String(codeContent || '');
  return /(?:HTTP\s+[45]\d{2}|(?:GET|POST|PUT|PATCH|DELETE)\s+\/|console\.(?:error|warn)|pageerror|TypeError:|ReferenceError:|SyntaxError:|^\s*at\s+\S+\s*\(|diff\s+--git|\{"error"\s*:)/m.test(
    sample
  );
}

/**
 * Adapta um Markdown técnico para renderização segura no modo `executive` caso o CLI
 * seja invocado diretamente sobre um relatório bruto:
 * - Remove seções puramente de código (`isTechnicalSectionHeading`);
 * - Omite blocos cercados de stack trace, HTTP cru e logs técnicos;
 * - Filtra metadados de Git/dev na barra inicial `>`;
 * - Traduz rótulos técnicos de campos (`input:password`, `select`) e menções a Playwright/E2E.
 */
export function stripTechnicalMarkdownForExecutive(markdown) {
  const normalized = String(markdown || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const out = [];

  let skippedSectionLevel = null;
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Controle de omissão de seção técnica até o próximo heading de nível igual/superior ou divisor `---`
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];

      if (skippedSectionLevel !== null) {
        if (level <= skippedSectionLevel) {
          skippedSectionLevel = null;
        } else {
          i++;
          continue;
        }
      }

      if (isTechnicalSectionHeading(headingText)) {
        skippedSectionLevel = level;
        i++;
        continue;
      }
    } else if (skippedSectionLevel !== null) {
      if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        skippedSectionLevel = null;
      } else {
        i++;
        continue;
      }
    }

    // Avalia blocos cercados de código/log técnico
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})([\w+-]*)\s*$/);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const lang = fenceMatch[2] || '';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;

      if (!looksLikeTechnicalCodeBlock(codeLines.join('\n'), lang)) {
        out.push(`${fence}${lang}`);
        out.push(...codeLines);
        out.push(fence);
      }
      continue;
    }

    // Filtra pares de metadados técnicos em linhas de cabeçalho `>`
    if (trimmed.startsWith('>') && trimmed.includes('**')) {
      const contentAfterQuote = trimmed.replace(/^>\s?/, '');
      if (contentAfterQuote.includes('|') || /^\*\*[^*:]+:\*\*/.test(contentAfterQuote)) {
        const keptSegments = contentAfterQuote
          .split('|')
          .map((seg) => seg.trim())
          .filter((seg) => {
            const m = seg.match(/^\*\*([^*:]+):\*\*\s*(.+)$/);
            if (!m) return true;
            return !isTechnicalMetaLabel(m[1]);
          });

        if (keptSegments.length === 0) {
          i++;
          continue;
        }
        out.push(`> ${keptSegments.join(' | ')}`);
        i++;
        continue;
      }
    }

    // Remove itens de lista que apenas introduzem um log técnico omitido (`- **Mensagem / Log capturado:**`)
    if (/^-\s+\*\*Mensagem\s*\/\s*Log\s+capturado:\*\*\s*$/i.test(trimmed)) {
      i++;
      continue;
    }

    let adapted = rawLine;

    // Substitui frases padrão de geração técnica por redação institucional limpa
    adapted = adapted
      .replace(
        /Relat[óo]rio de valida[çc][ãa]o ponta a ponta gerado (?:automaticamente )?(?:com|via) Playwright\.?/gi,
        'Relatório executivo de validação funcional do sistema.'
      )
      .replace(
        /Documenta[çc][ãa]o t[ée]cnica e cat[áa]logo de interfaces gerado (?:automaticamente )?(?:com|via) Playwright\.?/gi,
        'Guia visual e funcional das telas do sistema.'
      )
      .replace(
        /Cat[áa]logo t[ée]cnico gerado (?:automaticamente )?(?:com|via) Playwright\.?/gi,
        'Guia visual e funcional das telas do sistema.'
      )
      .replace(/\s*(?:gerado|executado|automatizado)\s+(?:automaticamente\s+)?(?:com|via|pelo)\s+Playwright/gi, '')
      .replace(/^(\s*#{1,4}\s+)Descri[çc][ãa]o T[ée]cnica\b/i, '$1Visão Geral da Tela')
      .replace(/\*\*Caminho\s*\/\s*Rota:\*\*/gi, '**Endereço da Tela:**')
      .replace(/\|\s*Rota\s*\/\s*Caminho\s*\|/gi, '| Endereço |')
      .replace(/Relat[óo]rio de Testes E2E/gi, 'Relatório de Validação do Sistema');

    for (const [pattern, label] of INPUT_TYPE_TRANSLATIONS) {
      adapted = adapted.replace(pattern, label);
    }

    out.push(adapted);
    i++;
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
