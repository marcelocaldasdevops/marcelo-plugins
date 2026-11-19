#!/usr/bin/env node
/**
 * pdf-renderer.mjs
 * Motor compartilhado de renderização editorial HTML5 + PDF (estilo Executivo Clean)
 * via Playwright Chromium para relatórios E2E, documentação de sistemas e Markdown técnico.
 *
 * Zero dependências npm extras além do `playwright` já utilizado pelo plugin.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';
import {
  PLAYWRIGHT_DEFAULTS,
  loadPlaywright,
  sanitizeSensitiveText,
  slugify,
} from './playwright-config.mjs';
import {
  assertNoForbiddenAiReferences,
  isTechnicalMetaLabel,
  normalizeAiGuardMode,
  normalizeAudienceProfile,
  sanitizeForbiddenAiTerms,
  stripTechnicalMarkdownForExecutive,
} from './content-guardrails.mjs';

const MIME_BY_EXT = Object.freeze({
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
});

const SVG_CHECK =
  '<svg class="badge-svg" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">' +
  '<circle cx="8" cy="8" r="7" fill="#16a34a"/>' +
  '<path d="M4.7 8.2l2.1 2.1 4.5-4.6" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';

const SVG_CROSS =
  '<svg class="badge-svg" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">' +
  '<circle cx="8" cy="8" r="7" fill="#dc2626"/>' +
  '<path d="M5.4 5.4l5.2 5.2M10.6 5.4l-5.2 5.2" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round"/>' +
  '</svg>';

const SVG_WARN =
  '<svg class="badge-svg" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' +
  '<path d="M8 1.6L14.8 13.8H1.2L8 1.6z" fill="#d97706"/>' +
  '<path d="M8 6v3.6M8 11.6h.01" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round"/>' +
  '</svg>';

/**
 * Escapa caracteres especiais HTML prevenindo XSS ou quebra estrutural do DOM.
 */
export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHref(rawHref) {
  const href = String(rawHref || '').trim();
  if (!href) return '#';
  if (href.startsWith('#')) {
    const anchor = href.slice(1).replace(/[^a-zA-Z0-9_-]/g, '');
    return anchor ? `#${anchor}` : '#';
  }
  if (/^(https?:\/\/|mailto:)/i.test(href)) {
    return href;
  }
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) {
    return href;
  }
  return '#';
}

function renderStatusBadge(kind, label) {
  const isPass = kind === 'pass';
  const cls = isPass ? 'status-badge status-pass' : 'status-badge status-fail';
  const icon = isPass ? SVG_CHECK : SVG_CROSS;
  return `<span class="${cls}">${icon}<span>${escapeHtml(label)}</span></span>`;
}

function renderStatusIcon(kind) {
  const isPass = kind === 'pass';
  const cls = isPass ? 'status-icon status-icon-pass' : 'status-icon status-icon-fail';
  const icon = isPass ? SVG_CHECK : SVG_CROSS;
  return `<span class="${cls}">${icon}</span>`;
}

/**
 * Resolve e converte imagens locais dentro de `baseDir` para Data URI Base64,
 * bloqueando qualquer tentativa de path traversal fora de `baseDir`.
 */
function resolveImageSource(rawSrc, baseDir) {
  const src = String(rawSrc || '').trim();
  if (!src) {
    return { ok: false, reason: 'Caminho de imagem vazio.', displayPath: '' };
  }

  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(src)) {
    return { ok: true, dataUri: src, displayPath: '[inline-data-uri]', embedded: true };
  }

  if (/^https?:\/\//i.test(src)) {
    return { ok: false, reason: 'Imagem remota externa bloqueada no modo offline/autocontido.', displayPath: src };
  }

  if (!baseDir) {
    return { ok: false, reason: 'Diretório base não informado para resolver imagem local.', displayPath: src };
  }

  const cleanRel = (() => {
    const withoutQuery = src.split('?')[0].split('#')[0];
    try {
      return decodeURIComponent(withoutQuery);
    } catch {
      return withoutQuery;
    }
  })();

  const resolvedBase = path.resolve(baseDir);
  const candidatePath = path.resolve(resolvedBase, cleanRel);
  const relToBase = path.relative(resolvedBase, candidatePath);

  if (relToBase.startsWith('..') || path.isAbsolute(relToBase)) {
    return {
      ok: false,
      reason: 'Imagem bloqueada por segurança (caminho fora do diretório do relatório).',
      displayPath: src,
    };
  }

  if (!fs.existsSync(candidatePath)) {
    return {
      ok: false,
      reason: 'Arquivo de screenshot não encontrado no disco.',
      displayPath: src,
    };
  }

  try {
    const realBase = fs.realpathSync(resolvedBase);
    const realCandidate = fs.realpathSync(candidatePath);
    const realRel = path.relative(realBase, realCandidate);
    if (realRel.startsWith('..') || path.isAbsolute(realRel)) {
      return {
        ok: false,
        reason: 'Symlink externo ao diretório base bloqueado por segurança.',
        displayPath: src,
      };
    }

    const stat = fs.statSync(realCandidate);
    if (!stat.isFile()) {
      return { ok: false, reason: 'O caminho apontado não é um arquivo regular.', displayPath: src };
    }

    const ext = path.extname(realCandidate).toLowerCase();
    const mime = MIME_BY_EXT[ext];
    if (!mime) {
      return { ok: false, reason: `Formato de imagem não suportado (${ext || 'sem extensão'}).`, displayPath: src };
    }

    const buffer = fs.readFileSync(realCandidate);
    const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;
    return {
      ok: true,
      dataUri,
      displayPath: src,
      bytes: buffer.length,
      embedded: true,
    };
  } catch (err) {
    return {
      ok: false,
      reason: `Não foi possível ler a imagem (${err?.message || 'erro de I/O'}).`,
      displayPath: src,
    };
  }
}

function buildScreenshotFigureHtml(alt, rawSrc, baseDir, stats, captionHint = '') {
  const resolved = resolveImageSource(rawSrc, baseDir);
  const safeAlt = escapeHtml(alt || 'Evidência visual');
  const fileLabel = path.basename(String(rawSrc || '').split('?')[0]);
  const captionText = captionHint
    ? `${escapeHtml(captionHint)} — <code>${escapeHtml(fileLabel || rawSrc)}</code>`
    : `${safeAlt}${fileLabel ? ` <code>${escapeHtml(fileLabel)}</code>` : ''}`;

  const isErrorShot = /-erro\.(png|jpe?g|webp)$/i.test(rawSrc) || /\berro\b/i.test(alt || '');
  const cardClass = isErrorShot ? 'screenshot-card screenshot-card-error' : 'screenshot-card';

  if (!resolved.ok) {
    if (stats) stats.missingImages += 1;
    return (
      `<figure class="${cardClass} screenshot-missing">` +
      `<div class="missing-image-box">` +
      `<div class="missing-image-title">${SVG_WARN}<span>Imagem indisponível: ${safeAlt}</span></div>` +
      `<div class="missing-image-meta">${escapeHtml(resolved.reason)} Caminho: <code>${escapeHtml(resolved.displayPath)}</code></div>` +
      `</div>` +
      `<figcaption>${captionText}</figcaption>` +
      `</figure>`
    );
  }

  if (stats) stats.embeddedImages += 1;
  return (
    `<figure class="${cardClass}">` +
    `<div class="screenshot-frame">` +
    `<img src="${resolved.dataUri}" alt="${safeAlt}" loading="eager" decoding="sync" />` +
    `</div>` +
    `<figcaption>${captionText}</figcaption>` +
    `</figure>`
  );
}

/**
 * Converte formatação inline Markdown (negrito, itálico, código, links, âncoras seguras
 * e badges/ícones SVG vetoriais para status ✅/❌) escapando qualquer HTML arbitrário.
 */
export function inlineMarkdownToHtml(text, options = {}) {
  if (text === null || text === undefined) return '';
  let work = String(text);
  const tokens = [];

  const putToken = (htmlSnippet) => {
    const key = `\x00PDFTOK_${tokens.length}_\x00`;
    tokens.push(htmlSnippet);
    return key;
  };

  // 1. Preserva exclusivamente âncoras seguras `<a id="slug"></a>`
  work = work.replace(/<a\s+id=["']([a-zA-Z0-9_-]+)["']\s*>\s*<\/a>/gi, (_, id) =>
    putToken(`<a id="${id}"></a>`)
  );

  // 2. Preserva spans de código inline sem interpretar Markdown dentro deles
  work = work.replace(/`([^`]+)`/g, (_, code) => putToken(`<code>${escapeHtml(code)}</code>`));

  // 3. Imagens inline (ex.: dentro de células de tabela)
  work = work.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, src) => {
    if (options.baseDir) {
      const resolved = resolveImageSource(src, options.baseDir);
      if (resolved.ok) {
        if (options.stats) options.stats.embeddedImages += 1;
        return putToken(
          `<img class="inline-screenshot" src="${resolved.dataUri}" alt="${escapeHtml(alt || 'Imagem')}" />`
        );
      }
      if (options.stats) options.stats.missingImages += 1;
    }
    return putToken(`<span class="inline-missing-img">[Imagem: ${escapeHtml(alt || src)}]</span>`);
  });

  // 4. Links Markdown `[label](href)`
  work = work.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, href) => {
    const safeHref = escapeHtml(sanitizeHref(href));
    const renderedLabel = inlineMarkdownToHtml(label, options);
    const isInternal = safeHref.startsWith('#');
    const cls = isInternal ? 'doc-link doc-link-internal' : 'doc-link';
    return putToken(`<a class="${cls}" href="${safeHref}">${renderedLabel}</a>`);
  });

  // 5. Substitui indicadores de status com emojis por badges/ícones SVG vetoriais
  work = work.replace(
    /✅\s*\*?\*?(Passou|Aprovado(?:\s+para\s+[\w/çãõáéíóú-]+)?|Apta(?:\s+para\s+[\w/çãõáéíóú-]+)?)\*?\*?/gi,
    (_, word) => putToken(renderStatusBadge('pass', word))
  );
  work = work.replace(
    /❌\s*\*?\*?(Falhou|Reprovado|Bloquead[oa](?:\s+para\s+[\w/çãõáéíóú-]+)?)\*?\*?/gi,
    (_, word) => putToken(renderStatusBadge('fail', word))
  );
  work = work.replace(/✅/g, () => putToken(renderStatusIcon('pass')));
  work = work.replace(/❌/g, () => putToken(renderStatusIcon('fail')));

  // 6. Escapa todo o texto remanescente antes de aplicar <strong> / <em>
  work = escapeHtml(work);

  // 7. Negrito e itálico
  work = work.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  work = work.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  work = work.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  work = work.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');

  // 8. Restaura tokens protegidos (em ordem reversa caso haja aninhamento)
  for (let i = tokens.length - 1; i >= 0; i--) {
    work = work.split(`\x00PDFTOK_${i}_\x00`).join(tokens[i]);
  }

  return work;
}

function splitTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);

  const cells = [];
  let current = '';
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '\\' && trimmed[i + 1] === '|') {
      current += '|';
      i++;
      continue;
    }
    if (ch === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function isTableSeparatorLine(line) {
  if (!line || !line.includes('|')) return false;
  const cells = splitTableRow(line);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function parseTableAlignments(separatorLine) {
  return splitTableRow(separatorLine).map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });
}

/**
 * Converte um documento Markdown completo em HTML5 semântico para impressão editorial.
 */
export function markdownToHtml(markdown, { baseDir = process.cwd(), stats = null, stripFirstH1 = false } = {}) {
  const normalized = String(markdown || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const out = [];
  const inlineOpts = { baseDir, stats };

  let i = 0;
  let firstH1Stripped = false;
  let pendingStepCaption = '';

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Linha contendo exclusivamente `<a id="..."></a>`
    const standaloneAnchor = trimmed.match(/^<a\s+id=["']([a-zA-Z0-9_-]+)["']\s*>\s*<\/a>$/i);
    if (standaloneAnchor) {
      out.push(`<a id="${standaloneAnchor[1]}"></a>`);
      i++;
      continue;
    }

    // Bloco de código cercado ```lang ... ```
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
      const langBadge = lang ? `<div class="code-lang">${escapeHtml(lang)}</div>` : '';
      out.push(
        `<div class="code-block-card">${langBadge}<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre></div>`
      );
      pendingStepCaption = '';
      continue;
    }

    // Separador horizontal `---` ou `***`
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      out.push('<hr class="section-divider" />');
      pendingStepCaption = '';
      i++;
      continue;
    }

    // Cabeçalhos `#` .. `######`
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      let headingContent = headingMatch[2].trim();

      if (level === 1 && stripFirstH1 && !firstH1Stripped) {
        firstH1Stripped = true;
        i++;
        continue;
      }

      let explicitId = null;
      headingContent = headingContent.replace(
        /<a\s+id=["']([a-zA-Z0-9_-]+)["']\s*>\s*<\/a>\s*/i,
        (_, capturedId) => {
          explicitId = capturedId;
          return '';
        }
      );

      const plainForSlug = headingContent
        .replace(/<[^>]+>/g, '')
        .replace(/[*_`[\]()]/g, '')
        .trim();
      const headingId = explicitId || slugify(plainForSlug, `secao-${i + 1}`);

      const classes = [`doc-h${level}`];
      if (/^ERR-\d+/i.test(plainForSlug)) {
        classes.push('err-heading');
      } else if (/^Cen[aá]rio\s+\d+/i.test(plainForSlug)) {
        if (/❌|\bFalhou\b/i.test(headingContent)) {
          classes.push('scenario-heading', 'scenario-heading-fail');
        } else if (/✅|\bPassou\b/i.test(headingContent)) {
          classes.push('scenario-heading', 'scenario-heading-pass');
        } else {
          classes.push('scenario-heading');
        }
      }

      out.push(
        `<h${level} id="${escapeHtml(headingId)}" class="${classes.join(' ')}">${inlineMarkdownToHtml(
          headingContent,
          inlineOpts
        )}</h${level}>`
      );
      pendingStepCaption = '';
      i++;
      continue;
    }

    // Legenda de passo antecedendo screenshot (ex.: `**Passo 01 — Estado inicial:**`)
    const stepCaptionMatch = trimmed.match(/^\*\*(Passo\s+\d+[^*]*?):?\*\*:?\s*$/i);
    if (stepCaptionMatch) {
      let lookahead = i + 1;
      while (lookahead < lines.length && !lines[lookahead].trim()) lookahead++;
      if (lookahead < lines.length && /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/.test(lines[lookahead].trim())) {
        pendingStepCaption = stepCaptionMatch[1].replace(/:$/, '').trim();
        i++;
        continue;
      }
    }

    // Imagem isolada em linha própria -> `<figure class="screenshot-card">`
    const standaloneImgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
    if (standaloneImgMatch) {
      const [, alt, src] = standaloneImgMatch;
      out.push(buildScreenshotFigureHtml(alt, src, baseDir, stats, pendingStepCaption));
      pendingStepCaption = '';
      i++;
      continue;
    }

    // Tabelas GFM
    if (trimmed.includes('|') && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1])) {
      const headers = splitTableRow(rawLine);
      const alignments = parseTableAlignments(lines[i + 1]);
      i += 2;

      const bodyRows = [];
      while (i < lines.length) {
        const rowTrimmed = lines[i].trim();
        if (!rowTrimmed || !rowTrimmed.includes('|')) break;
        if (/^(#{1,6}\s|```|~~~|>\s)/.test(rowTrimmed)) break;
        bodyRows.push(splitTableRow(lines[i]));
        i++;
      }

      const theadCells = headers
        .map((cell, idx) => {
          const align = alignments[idx] || 'left';
          return `<th style="text-align:${align}">${inlineMarkdownToHtml(cell, inlineOpts)}</th>`;
        })
        .join('');

      const tbodyRowsHtml = bodyRows
        .map((row) => {
          const tds = headers
            .map((_, idx) => {
              const align = alignments[idx] || 'left';
              const val = row[idx] ?? '';
              return `<td style="text-align:${align}">${inlineMarkdownToHtml(val, inlineOpts)}</td>`;
            })
            .join('');
          return `<tr>${tds}</tr>`;
        })
        .join('');

      out.push(
        `<div class="table-wrap"><table class="doc-table"><thead><tr>${theadCells}</tr></thead><tbody>${tbodyRowsHtml}</tbody></table></div>`
      );
      pendingStepCaption = '';
      continue;
    }

    // Blockquote `> ...`
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      const renderedQuote = quoteLines.map((ql) => inlineMarkdownToHtml(ql, inlineOpts)).join('<br />');
      out.push(`<blockquote class="doc-callout">${renderedQuote}</blockquote>`);
      pendingStepCaption = '';
      continue;
    }

    // Listas ordenadas e não ordenadas (suporta subitens indentados e screenshots indentados)
    const listMatch = rawLine.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const isOrdered = /\d+\./.test(listMatch[2]);
      const listTag = isOrdered ? 'ol' : 'ul';
      const items = [];

      while (i < lines.length) {
        const line = lines[i];
        const t = line.trim();
        if (!t) {
          // Olha adiante: se a próxima linha não vazia for imagem indentada ou item da mesma lista, continua
          let nextIdx = i + 1;
          while (nextIdx < lines.length && !lines[nextIdx].trim()) nextIdx++;
          if (nextIdx < lines.length) {
            const nextRaw = lines[nextIdx];
            const nextImg = nextRaw.match(/^\s{2,}!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/);
            const nextFence = nextRaw.match(/^\s{2,}(`{3,}|~{3,})([\w+-]*)\s*$/);
            const nextItem = nextRaw.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
            if ((nextImg || nextFence) && items.length > 0) {
              i = nextIdx;
              continue;
            }
            if (nextItem && Boolean(/\d+\./.test(nextItem[2])) === isOrdered && nextItem[1].length === 0) {
              i = nextIdx;
              continue;
            }
          }
          break;
        }

        // Imagem indentada pertencente ao último item da lista (ex.: `- **Print do erro:**` seguido de imagem)
        const indentedImg = line.match(/^\s{2,}!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/);
        if (indentedImg && items.length > 0) {
          items[items.length - 1].extraHtml.push(
            buildScreenshotFigureHtml(indentedImg[1], indentedImg[2], baseDir, stats)
          );
          i++;
          continue;
        }

        // Bloco de código indentado dentro de item de lista (ex.: `- **Mensagem / Log capturado:**`)
        const indentedFence = line.match(/^\s{2,}(`{3,}|~{3,})([\w+-]*)\s*$/);
        if (indentedFence && items.length > 0) {
          const fence = indentedFence[1];
          const lang = indentedFence[2] || '';
          const codeBuf = [];
          i++;
          while (i < lines.length && !lines[i].trim().startsWith(fence)) {
            codeBuf.push(lines[i].replace(/^\s{2}/, ''));
            i++;
          }
          if (i < lines.length) i++;
          const langBadge = lang ? `<div class="code-lang">${escapeHtml(lang)}</div>` : '';
          items[items.length - 1].extraHtml.push(
            `<div class="code-block-card">${langBadge}<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre></div>`
          );
          continue;
        }

        const itemMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
        if (!itemMatch) break;

        const indent = itemMatch[1].length;
        let itemBody = itemMatch[3].trim();

        // Checklist `[x]` / `[ ]`
        const taskMatch = itemBody.match(/^\[([ xX])\]\s+(.+)$/);
        let prefixHtml = '';
        if (taskMatch) {
          const checked = taskMatch[1].toLowerCase() === 'x';
          prefixHtml = checked ? `${renderStatusIcon('pass')} ` : '<span class="task-box"></span> ';
          itemBody = taskMatch[2];
        }

        if (indent >= 2 && items.length > 0) {
          items[items.length - 1].subItems.push(`${prefixHtml}${inlineMarkdownToHtml(itemBody, inlineOpts)}`);
        } else {
          items.push({
            html: `${prefixHtml}${inlineMarkdownToHtml(itemBody, inlineOpts)}`,
            subItems: [],
            extraHtml: [],
          });
        }
        i++;
      }

      const renderedItems = items
        .map((item) => {
          const subList =
            item.subItems.length > 0
              ? `<ul class="doc-sublist">${item.subItems.map((s) => `<li>${s}</li>`).join('')}</ul>`
              : '';
          const extras = item.extraHtml.join('');
          return `<li>${item.html}${subList}${extras}</li>`;
        })
        .join('');

      out.push(`<${listTag} class="doc-list">${renderedItems}</${listTag}>`);
      pendingStepCaption = '';
      continue;
    }

    // Parágrafo comum (agrupa linhas adjacentes simples)
    const paraLines = [];
    while (i < lines.length) {
      const l = lines[i];
      const t = l.trim();
      if (!t) break;
      if (
        /^(#{1,6}\s|```|~~~|>\s|(?:-{3,}|\*{3,}|_{3,})$|!\[[^\]]*\]\([^)\s]+|<a\s+id=)/.test(t) ||
        /^(\s*)([-*+]|\d+\.)\s+/.test(l) ||
        (t.includes('|') && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1]))
      ) {
        break;
      }
      paraLines.push(t);
      i++;
    }

    if (paraLines.length > 0) {
      out.push(`<p class="doc-p">${paraLines.map((pl) => inlineMarkdownToHtml(pl, inlineOpts)).join(' ')}</p>`);
      pendingStepCaption = '';
    } else {
      i++;
    }
  }

  return out.join('\n');
}

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Carrega automaticamente `evidencias.json` ou `inventory.json` na mesma pasta de `inputPath`
 * e classifica o relatório em `'e2e' | 'docs' | 'generic'`.
 */
export function loadCompanionData(inputPath, reportType = 'auto') {
  const normalizedType = String(reportType || 'auto').toLowerCase();
  const explicitType = ['e2e', 'docs', 'generic'].includes(normalizedType) ? normalizedType : 'auto';

  if (!inputPath) {
    return {
      type: explicitType === 'auto' ? 'generic' : explicitType,
      evidencias: null,
      inventory: null,
      sourcePath: null,
    };
  }

  const resolvedInput = path.resolve(inputPath);
  const dir = path.dirname(resolvedInput);
  const baseName = path.basename(resolvedInput).toLowerCase();

  const evidenciasPath = path.join(dir, 'evidencias.json');
  const inventoryPath = path.join(dir, 'inventory.json');

  const evidencias = safeReadJson(evidenciasPath);
  const inventory = safeReadJson(inventoryPath);

  let detectedType = explicitType;
  if (detectedType === 'auto') {
    if (evidencias || baseName.includes('relatorio-testes') || baseName.includes('e2e')) {
      detectedType = 'e2e';
    } else if (
      inventory ||
      path.basename(dir).toLowerCase().includes('docs-sistema') ||
      baseName.includes('documentacao')
    ) {
      detectedType = 'docs';
    } else if (fs.existsSync(resolvedInput)) {
      try {
        const sample = fs.readFileSync(resolvedInput, 'utf-8').slice(0, 2500);
        if (/Relat[oó]rio de Testes E2E|Cen[aá]rio\s+01|Dado\s*\*\*/i.test(sample)) {
          detectedType = 'e2e';
        } else if (/Documenta[cç][aã]o do Sistema|Total de Telas|Elementos Principais/i.test(sample)) {
          detectedType = 'docs';
        } else {
          detectedType = 'generic';
        }
      } catch {
        detectedType = 'generic';
      }
    } else {
      detectedType = 'generic';
    }
  }

  return {
    type: detectedType,
    evidencias,
    inventory,
    sourcePath:
      detectedType === 'e2e' && evidencias
        ? evidenciasPath
        : detectedType === 'docs' && inventory
          ? inventoryPath
          : evidencias
            ? evidenciasPath
            : inventory
              ? inventoryPath
              : null,
  };
}

function extractDocumentMetadata(
  markdown,
  companionData,
  explicitTitle,
  resolvedType,
  audience = 'technical'
) {
  const isExecutive = audience === 'executive';
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');

  let docTitle = explicitTitle ? String(explicitTitle).trim() : '';
  if (!docTitle) {
    const h1Line = lines.find((l) => /^#\s+/.test(l.trim()));
    if (h1Line) {
      docTitle = h1Line
        .trim()
        .replace(/^#\s+/, '')
        .replace(/<[^>]+>/g, '')
        .trim();
    }
  }

  if (!docTitle) {
    if (isExecutive) {
      docTitle =
        resolvedType === 'e2e'
          ? 'Relatório Executivo de Validação do Sistema'
          : resolvedType === 'docs'
            ? 'Guia Visual e Funcional do Sistema'
            : 'Relatório Executivo';
    } else {
      docTitle =
        resolvedType === 'e2e'
          ? 'Relatório Executivo de Testes E2E'
          : resolvedType === 'docs'
            ? 'Documentação Técnica do Sistema'
            : 'Relatório Técnico';
    }
  }

  // Extrai pares `**Chave:** Valor` do bloco inicial `>` se presentes
  const metaPairs = [];
  for (const line of lines.slice(0, 20)) {
    const t = line.trim();
    if (!t.startsWith('>')) continue;
    const segments = t.replace(/^>\s?/, '').split('|');
    for (const seg of segments) {
      const m = seg.trim().match(/^\*\*([^*:]+):\*\*\s*(.+)$/);
      if (m) {
        const label = m[1].trim();
        if (isExecutive && isTechnicalMetaLabel(label)) continue;
        const rawVal = m[2].replace(/`/g, '').trim();
        metaPairs.push({ label, value: rawVal });
      }
    }
  }

  return { docTitle, metaPairs };
}

function computeKpiCards(markdown, resolvedType, companionData, audience = 'technical') {
  const isExecutive = audience === 'executive';
  const ev = companionData?.evidencias || null;
  const inv = companionData?.inventory || null;
  const text = String(markdown || '');

  if (resolvedType === 'e2e') {
    let totalScenarios =
      ev?.summary?.totalScenarios ??
      ev?.summary?.total ??
      ev?.totals?.scenarios ??
      (Array.isArray(ev?.scenarios) ? ev.scenarios.length : null);
    let passedScenarios =
      ev?.summary?.passedScenarios ??
      ev?.summary?.passed ??
      ev?.totals?.passed ??
      (Array.isArray(ev?.scenarios)
        ? ev.scenarios.filter((s) => s?.passed === true || s?.status === 'passed').length
        : null);
    let failedScenarios =
      ev?.summary?.failedScenarios ??
      ev?.summary?.failed ??
      ev?.totals?.failed ??
      (totalScenarios !== null && passedScenarios !== null ? totalScenarios - passedScenarios : null);

    let totalErrors =
      ev?.summary?.totalErrors ??
      ev?.totals?.errors ??
      (Array.isArray(ev?.errors)
        ? ev.errors.length
        : Array.isArray(ev?.telemetry)
          ? ev.telemetry.filter((e) => e?.severity === 'error' || e?.category === 'http_error').length
          : null);

    if (totalScenarios === null) {
      const headingMatches = text.match(/^###\s+(?:<a[^>]*><\/a>)?\s*Cen[aá]rio\s+\d+/gim) || [];
      totalScenarios = headingMatches.length;
    }
    if (passedScenarios === null) {
      const passHeadings =
        text.match(/^###\s+(?:<a[^>]*><\/a>)?\s*Cen[aá]rio\s+\d+[^\n]*(?:✅|\bPassou\b)/gim) || [];
      passedScenarios = passHeadings.length;
    }
    if (failedScenarios === null) {
      const failHeadings =
        text.match(/^###\s+(?:<a[^>]*><\/a>)?\s*Cen[aá]rio\s+\d+[^\n]*(?:❌|\bFalhou\b)/gim) || [];
      failedScenarios =
        failHeadings.length > 0 ? failHeadings.length : Math.max(0, totalScenarios - passedScenarios);
    }
    if (totalErrors === null) {
      const errHeadings = text.match(/^###\s+(?:<a[^>]*><\/a>)?\s*ERR-\d+/gim) || [];
      totalErrors = errHeadings.length;
    }

    const approvalRate =
      totalScenarios > 0 ? `${Math.round((passedScenarios / totalScenarios) * 100)}%` : 'N/A';
    const overallApproved = totalScenarios > 0 && failedScenarios === 0 && totalErrors === 0;

    if (isExecutive) {
      return [
        {
          label: 'Fluxos Validados',
          value: String(totalScenarios),
          sub: `Taxa de aprovação: ${approvalRate}`,
          tone: 'neutral',
        },
        {
          label: 'Aprovados',
          value: String(passedScenarios),
          sub: 'Fluxos funcionando conforme esperado',
          tone: 'success',
        },
        {
          label: 'Pontos de Atenção',
          value: String(failedScenarios),
          sub: failedScenarios === 0 ? 'Nenhum impedimento encontrado' : 'Requer ajuste antes da liberação',
          tone: failedScenarios > 0 ? 'danger' : 'success',
        },
        {
          label: 'Situação da Entrega',
          value: totalScenarios === 0 ? 'Informativo' : overallApproved ? 'Pronta' : 'Requer Ajustes',
          sub:
            totalErrors === 0
              ? 'Nenhuma ocorrência registrada'
              : `${totalErrors} ocorrência(s) para revisão`,
          tone: totalScenarios === 0 ? 'neutral' : overallApproved ? 'success' : 'danger',
        },
      ];
    }

    return [
      {
        label: 'Cenários Executados',
        value: String(totalScenarios),
        sub: `Taxa de aprovação: ${approvalRate}`,
        tone: 'neutral',
      },
      {
        label: 'Aprovados',
        value: String(passedScenarios),
        sub: 'Fluxos validados sem falhas',
        tone: 'success',
      },
      {
        label: 'Falharam',
        value: String(failedScenarios),
        sub: failedScenarios === 0 ? 'Nenhuma quebra funcional' : 'Requer correção antes do merge',
        tone: failedScenarios > 0 ? 'danger' : 'success',
      },
      {
        label: 'Parecer Técnico',
        value: totalScenarios === 0 ? 'Informativo' : overallApproved ? 'Aprovado' : 'Bloqueado',
        sub: `${totalErrors} ocorrência(s) de erro`,
        tone: totalScenarios === 0 ? 'neutral' : overallApproved ? 'success' : 'danger',
      },
    ];
  }

  if (resolvedType === 'docs') {
    const screensList = Array.isArray(inv)
      ? inv
      : Array.isArray(inv?.screens)
        ? inv.screens
        : Array.isArray(inv?.pages)
          ? inv.pages
          : null;

    let totalScreens = screensList ? screensList.length : null;
    if (totalScreens === null) {
      const m = text.match(/\*\*(?:Total de Telas|Telas Mapeadas):\*\*\s*(\d+)/i);
      if (m) {
        totalScreens = Number(m[1]);
      } else {
        const screenHeadings = text.match(/^#{2,3}\s+<a\s+id=["'][^"']+["']><\/a>\s*\d+\./gim) || [];
        totalScreens = screenHeadings.length;
      }
    }

    const totalScreenshots = (text.match(/!\[[^\]]*\]\([^)\s]+\)/g) || []).length;
    let totalInputs = 0;
    let totalActions = 0;

    if (screensList) {
      for (const s of screensList) {
        totalInputs += Array.isArray(s?.campos || s?.inputs || s?.fields)
          ? (s.campos || s.inputs || s.fields).length
          : 0;
        totalActions += Array.isArray(s?.botoes || s?.buttons || s?.actions)
          ? (s.botoes || s.buttons || s.actions).length
          : 0;
      }
    } else {
      totalInputs = (text.match(/\(input:|textarea|select\)/gi) || []).length;
    }

    if (isExecutive) {
      return [
        {
          label: 'Telas Apresentadas',
          value: String(totalScreens),
          sub: 'Visão navegável do sistema',
          tone: 'neutral',
        },
        {
          label: 'Capturas de Tela',
          value: String(totalScreenshots),
          sub: 'Imagens reais das interfaces',
          tone: 'success',
        },
        {
          label: 'Campos da Interface',
          value: String(totalInputs),
          sub: 'Áreas de preenchimento e consulta',
          tone: 'neutral',
        },
        {
          label: 'Situação do Guia',
          value: totalActions > 0 ? `${totalActions} ações` : 'Completo',
          sub: 'Conteúdo completo e atualizado',
          tone: 'success',
        },
      ];
    }

    return [
      {
        label: 'Telas Mapeadas',
        value: String(totalScreens),
        sub: 'Catálogo navegável do sistema',
        tone: 'neutral',
      },
      {
        label: 'Screenshots HD',
        value: String(totalScreenshots),
        sub: 'Capturas full-page incorporadas',
        tone: 'success',
      },
      {
        label: 'Campos Mapeados',
        value: String(totalInputs),
        sub: 'Entradas, seletores e formulários',
        tone: 'neutral',
      },
      {
        label: 'Status do Catálogo',
        value: totalActions > 0 ? `${totalActions} ações` : 'Completo',
        sub: 'Inventário técnico atualizado',
        tone: 'success',
      },
    ];
  }

  return [];
}

function buildExecutiveCss() {
  return `
  @page {
    size: A4 portrait;
    margin: 18mm 12mm 18mm 12mm;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.55;
  }

  .report-shell {
    width: 100%;
    max-width: 186mm;
    margin: 0 auto;
  }

  /* Cabeçalho Institucional Executivo Clean */
  .exec-header {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #f8fafc;
    border-radius: 8px;
    padding: 18px 22px;
    margin-bottom: 14px;
    border-bottom: 3px solid #2563eb;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .exec-eyebrow {
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #93c5fd;
    margin-bottom: 5px;
  }

  .exec-title {
    margin: 0;
    font-size: 17pt;
    font-weight: 700;
    line-height: 1.25;
    color: #ffffff;
  }

  .exec-meta-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid rgba(148, 163, 184, 0.28);
    font-size: 8.4pt;
    color: #cbd5e1;
  }

  .exec-meta-item strong {
    color: #f8fafc;
    font-weight: 600;
  }

  /* Cards Executivos de KPI */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin: 0 0 18px 0;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .kpi-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-top: 3px solid #334155;
    border-radius: 7px;
    padding: 10px 12px;
  }

  .kpi-card-success {
    border-top-color: #16a34a;
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  .kpi-card-danger {
    border-top-color: #dc2626;
    background: #fef2f2;
    border-color: #fecaca;
  }

  .kpi-label {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #475569;
    margin-bottom: 3px;
  }

  .kpi-value {
    font-size: 14.5pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
  }

  .kpi-card-success .kpi-value {
    color: #15803d;
  }

  .kpi-card-danger .kpi-value {
    color: #b91c1c;
  }

  .kpi-sub {
    font-size: 7.5pt;
    color: #64748b;
    margin-top: 3px;
  }

  /* Tipografia Editorial */
  .doc-h1, .doc-h2, .doc-h3, .doc-h4, .doc-h5, .doc-h6 {
    color: #0f172a;
    font-weight: 700;
    break-after: avoid;
    page-break-after: avoid;
  }

  .doc-h1 {
    font-size: 15pt;
    margin: 20px 0 10px 0;
    padding-bottom: 6px;
    border-bottom: 2px solid #0f172a;
  }

  .doc-h2 {
    font-size: 12.5pt;
    margin: 20px 0 10px 0;
    padding: 6px 10px;
    background: #f1f5f9;
    border-left: 4px solid #1e40af;
    border-radius: 0 5px 5px 0;
  }

  .doc-h3 {
    font-size: 11pt;
    margin: 16px 0 8px 0;
    color: #1e293b;
  }

  .scenario-heading {
    padding: 7px 11px;
    border-radius: 6px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-left: 4px solid #2563eb;
  }

  .scenario-heading-pass {
    background: #f0fdf4;
    border-color: #bbf7d0;
    border-left-color: #16a34a;
  }

  .scenario-heading-fail {
    background: #fef2f2;
    border-color: #fecaca;
    border-left-color: #dc2626;
  }

  .err-heading {
    padding: 8px 12px;
    border-radius: 6px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-left: 4px solid #dc2626;
    color: #991b1b;
  }

  .doc-h4 {
    font-size: 10pt;
    margin: 12px 0 6px 0;
    color: #334155;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .doc-p {
    margin: 0 0 9px 0;
    color: #1e293b;
  }

  .section-divider {
    border: 0;
    border-top: 1px solid #e2e8f0;
    margin: 16px 0;
  }

  /* Callout / Blockquote */
  .doc-callout {
    margin: 0 0 14px 0;
    padding: 10px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #2563eb;
    border-radius: 6px;
    color: #334155;
    font-size: 9.2pt;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Listas */
  .doc-list {
    margin: 0 0 11px 0;
    padding-left: 20px;
  }

  .doc-list > li {
    margin-bottom: 4px;
    color: #1e293b;
  }

  .doc-sublist {
    margin: 4px 0 4px 0;
    padding-left: 18px;
  }

  .task-box {
    display: inline-block;
    width: 10px;
    height: 10px;
    border: 1.4px solid #64748b;
    border-radius: 2px;
    vertical-align: middle;
    margin-right: 3px;
  }

  /* Links */
  .doc-link {
    color: #1d4ed8;
    text-decoration: none;
    border-bottom: 1px solid rgba(29, 78, 216, 0.3);
  }

  /* Badges e Ícones Vetoriais SVG */
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1.5px 8px 1.5px 5px;
    border-radius: 999px;
    font-size: 8.2pt;
    font-weight: 700;
    line-height: 1.3;
    vertical-align: middle;
    white-space: nowrap;
  }

  .status-pass {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
  }

  .status-fail {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  }

  .status-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: -2px;
  }

  .badge-svg {
    flex-shrink: 0;
  }

  /* Tabelas GFM Profissionais */
  .table-wrap {
    width: 100%;
    margin: 8px 0 14px 0;
  }

  .doc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.8pt;
    border: 1px solid #cbd5e1;
  }

  .doc-table thead {
    display: table-header-group;
  }

  .doc-table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .doc-table th {
    background: #0f172a;
    color: #f8fafc;
    font-weight: 600;
    padding: 7px 9px;
    border: 1px solid #1e293b;
    font-size: 8.3pt;
    letter-spacing: 0.02em;
  }

  .doc-table td {
    padding: 6px 9px;
    border: 1px solid #cbd5e1;
    color: #1e293b;
    vertical-align: top;
    word-break: break-word;
  }

  .doc-table tbody tr:nth-child(even) td {
    background: #f8fafc;
  }

  /* Código Inline e Blocos Cercados */
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    font-size: 8.4pt;
    background: #f1f5f9;
    color: #0f172a;
    padding: 1px 4px;
    border-radius: 3px;
    border: 1px solid #e2e8f0;
  }

  .code-block-card {
    margin: 8px 0 14px 0;
    background: #0f172a;
    color: #e2e8f0;
    border-radius: 6px;
    border: 1px solid #1e293b;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .code-lang {
    background: #1e293b;
    color: #93c5fd;
    font-size: 7.4pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 4px 10px;
    border-bottom: 1px solid #334155;
  }

  .code-block-card pre {
    margin: 0;
    padding: 10px 12px;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 8.1pt;
    line-height: 1.45;
  }

  .code-block-card pre code {
    background: transparent;
    color: inherit;
    border: 0;
    padding: 0;
    font-size: inherit;
  }

  /* Cards de Screenshot com Controle de Quebra de Página */
  .screenshot-card {
    margin: 10px 0 16px 0;
    padding: 8px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 7px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .screenshot-card-error {
    background: #fff5f5;
    border-color: #fca5a5;
    border-left: 4px solid #dc2626;
  }

  .screenshot-frame {
    display: flex;
    justify-content: center;
    align-items: center;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 4px;
    overflow: hidden;
  }

  .screenshot-frame img {
    display: block;
    max-width: 100%;
    max-height: 170mm;
    width: auto;
    height: auto;
    object-fit: contain;
  }

  .screenshot-card figcaption {
    margin-top: 6px;
    font-size: 8pt;
    color: #475569;
    text-align: center;
  }

  .missing-image-box {
    padding: 12px;
    background: #fffbeb;
    border: 1px dashed #f59e0b;
    border-radius: 5px;
    color: #92400e;
  }

  .missing-image-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    font-size: 8.8pt;
    margin-bottom: 4px;
  }

  .missing-image-meta {
    font-size: 8pt;
    color: #78350f;
  }

  .inline-screenshot {
    max-width: 120px;
    max-height: 60px;
    object-fit: contain;
    vertical-align: middle;
  }
  `;
}

function buildHeaderFooterTemplates({ title, typeLabel, generatedAtLabel, audience = 'technical' }) {
  const isExecutive = audience === 'executive';
  const safeTitle = escapeHtml(title || (isExecutive ? 'Relatório Executivo' : 'Relatório Técnico'));
  const safeType = escapeHtml(typeLabel || (isExecutive ? 'Relatório Executivo' : 'Playwright'));
  const safeDate = escapeHtml(generatedAtLabel || '');
  const footerLeft = isExecutive
    ? safeDate
      ? `Documento emitido em ${safeDate}`
      : 'Documento Executivo'
    : `Gerado via Playwright${safeDate ? ` • ${safeDate}` : ''}`;

  const headerTemplate =
    `<div style="font-size:8px;width:100%;padding:0 12mm;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#64748b;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:3px;">` +
    `<span style="font-weight:600;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:72%;">${safeTitle}</span>` +
    `<span>${safeType}</span>` +
    `</div>`;

  const footerTemplate =
    `<div style="font-size:8px;width:100%;padding:0 12mm;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#64748b;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e2e8f0;padding-top:3px;">` +
    `<span>${footerLeft}</span>` +
    `<span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>` +
    `</div>`;

  return { headerTemplate, footerTemplate };
}

function formatPtBrDateTime(inputDate) {
  const d = inputDate instanceof Date ? inputDate : new Date(inputDate || Date.now());
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

/**
 * Gera um documento HTML5 completo e autocontido (imagens Base64 + CSS `@page` A4)
 * no estilo Executivo Clean, respeitando o perfil de público (`technical` | `executive`)
 * e a Política Zero Referência a IA (`strict` | `sanitize`).
 */
export function buildPdfHtml({
  markdown,
  baseDir = process.cwd(),
  title = '',
  type = 'generic',
  audience = 'technical',
  aiGuard = 'strict',
  companionData = null,
  generatedAt = new Date(),
  stats = null,
} = {}) {
  const resolvedAudience = normalizeAudienceProfile(audience, 'technical') || 'technical';
  const resolvedAiGuard = normalizeAiGuardMode(aiGuard, 'strict') || 'strict';
  const isExecutive = resolvedAudience === 'executive';

  let workingMarkdown = sanitizeSensitiveText(markdown || '');
  let workingTitle = sanitizeSensitiveText(title || '');
  const renderStats = stats || { embeddedImages: 0, missingImages: 0, sanitizedAiMatches: 0 };
  if (renderStats.sanitizedAiMatches === undefined) renderStats.sanitizedAiMatches = 0;

  if (isExecutive) {
    workingMarkdown = stripTechnicalMarkdownForExecutive(workingMarkdown);
  }

  if (resolvedAiGuard === 'sanitize') {
    const mdRes = sanitizeForbiddenAiTerms(workingMarkdown);
    const titleRes = sanitizeForbiddenAiTerms(workingTitle);
    workingMarkdown = mdRes.text;
    workingTitle = titleRes.text;
    renderStats.sanitizedAiMatches += mdRes.matches.length + titleRes.matches.length;
  } else {
    if (workingTitle) {
      assertNoForbiddenAiReferences(workingTitle, { contextLabel: 'título do PDF' });
    }
    assertNoForbiddenAiReferences(workingMarkdown, { contextLabel: 'conteúdo Markdown' });
  }

  const resolvedType = ['e2e', 'docs', 'generic'].includes(type) ? type : companionData?.type || 'generic';

  const { docTitle, metaPairs } = extractDocumentMetadata(
    workingMarkdown,
    companionData,
    workingTitle,
    resolvedType,
    resolvedAudience
  );
  const generatedLabel = formatPtBrDateTime(generatedAt);

  const eyebrowLabel = isExecutive
    ? resolvedType === 'e2e'
      ? 'Relatório Executivo de Validação do Sistema'
      : resolvedType === 'docs'
        ? 'Guia Visual e Funcional do Sistema'
        : 'Relatório Executivo'
    : resolvedType === 'e2e'
      ? 'Relatório Executivo de Qualidade & Evidências E2E'
      : resolvedType === 'docs'
        ? 'Catálogo Técnico & Inventário de Interfaces'
        : 'Documento Técnico Consolidado';

  const effectiveMeta = [...metaPairs];
  if (!effectiveMeta.some((m) => /data|emiss[ãa]o/i.test(m.label)) && generatedLabel) {
    effectiveMeta.push({ label: isExecutive ? 'Data de Emissão' : 'Emissão PDF', value: generatedLabel });
  }

  const metaBarHtml =
    effectiveMeta.length > 0
      ? `<div class="exec-meta-bar">${effectiveMeta
          .slice(0, 6)
          .map(
            (m) =>
              `<span class="exec-meta-item"><strong>${escapeHtml(m.label)}:</strong> ${inlineMarkdownToHtml(
                m.value,
                { baseDir, stats: renderStats }
              )}</span>`
          )
          .join('')}</div>`
      : '';

  const kpiCards = computeKpiCards(workingMarkdown, resolvedType, companionData, resolvedAudience);
  const kpiHtml =
    kpiCards.length > 0
      ? `<section class="kpi-grid" aria-label="Indicadores Executivos">${kpiCards
          .map((card) => {
            const toneClass =
              card.tone === 'success'
                ? 'kpi-card kpi-card-success'
                : card.tone === 'danger'
                  ? 'kpi-card kpi-card-danger'
                  : 'kpi-card';
            return (
              `<div class="${toneClass}">` +
              `<div class="kpi-label">${escapeHtml(card.label)}</div>` +
              `<div class="kpi-value">${escapeHtml(card.value)}</div>` +
              `<div class="kpi-sub">${escapeHtml(card.sub)}</div>` +
              `</div>`
            );
          })
          .join('')}</section>`
      : '';

  const bodyHtml = markdownToHtml(workingMarkdown, {
    baseDir,
    stats: renderStats,
    stripFirstH1: true,
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(docTitle)}</title>
  <style>${buildExecutiveCss()}</style>
</head>
<body>
  <main class="report-shell">
    <header class="exec-header">
      <div class="exec-eyebrow">${escapeHtml(eyebrowLabel)}</div>
      <h1 class="exec-title">${escapeHtml(docTitle)}</h1>
      ${metaBarHtml}
    </header>
    ${kpiHtml}
    <article class="report-content">
      ${bodyHtml}
    </article>
  </main>
</body>
</html>`;
}

function deriveFallbackPrintHtmlPath(outputPath, inputPath) {
  if (outputPath) {
    const resolvedOut = path.resolve(outputPath);
    const dir = path.dirname(resolvedOut);
    const stem = path.basename(resolvedOut, path.extname(resolvedOut));
    return path.join(dir, `${stem}.print.html`);
  }
  const resolvedIn = path.resolve(inputPath);
  const dir = path.dirname(resolvedIn);
  const stem = path.basename(resolvedIn, path.extname(resolvedIn));
  return path.join(dir, `${stem}.print.html`);
}

function getPlaywrightCacheDirs() {
  const dirs = [];
  if (process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.PLAYWRIGHT_BROWSERS_PATH !== '0') {
    dirs.push(path.resolve(process.env.PLAYWRIGHT_BROWSERS_PATH));
  }
  const home = os.homedir();
  if (process.platform === 'darwin') {
    dirs.push(path.join(home, 'Library', 'Caches', 'ms-playwright'));
  } else if (process.platform === 'win32') {
    if (process.env.LOCALAPPDATA) {
      dirs.push(path.join(process.env.LOCALAPPDATA, 'ms-playwright'));
    }
  } else {
    dirs.push(path.join(home, '.cache', 'ms-playwright'));
  }
  return dirs.filter((d) => fs.existsSync(d));
}

function findPlaywrightCachedChromiums() {
  const candidates = [];
  for (const cacheDir of getPlaywrightCacheDirs()) {
    let entries = [];
    try {
      entries = fs.readdirSync(cacheDir);
    } catch {
      continue;
    }
    const chromiumDirs = entries
      .filter((name) => /^chromium(?:_headless_shell)?-\d+$/i.test(name))
      .sort((a, b) => {
        const aFull = !a.includes('headless_shell');
        const bFull = !b.includes('headless_shell');
        if (aFull !== bFull) return aFull ? -1 : 1;
        const aNum = Number((a.match(/\d+/) || [0])[0]);
        const bNum = Number((b.match(/\d+/) || [0])[0]);
        return bNum - aNum;
      });

    for (const dirName of chromiumDirs) {
      const base = path.join(cacheDir, dirName);
      const relPaths = [
        path.join('chrome-linux64', 'chrome'),
        path.join('chrome-linux', 'chrome'),
        path.join('chrome-headless-shell-linux64', 'chrome-headless-shell'),
        path.join('chrome-linux', 'headless_shell'),
        path.join('chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        path.join('chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
        path.join('chrome-win', 'chrome.exe'),
        path.join('chrome-win64', 'chrome.exe'),
      ];
      for (const rel of relPaths) {
        const full = path.join(base, rel);
        if (fs.existsSync(full)) {
          candidates.push(full);
        }
      }
    }
  }
  return candidates;
}

/**
 * Lista binários locais de Chrome/Chromium em ordem de prioridade (navegadores do sistema
 * com perfil de sandbox nativo do SO primeiro, seguidos pelo cache do Playwright).
 */
export function findLocalChromiumExecutables() {
  const systemCandidates =
    process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        ]
      : process.platform === 'win32'
        ? [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          ]
        : [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/snap/bin/chromium',
          ];

  const found = [];
  const seen = new Set();
  for (const bin of [...systemCandidates, ...findPlaywrightCachedChromiums()]) {
    if (fs.existsSync(bin) && !seen.has(bin)) {
      seen.add(bin);
      found.push(bin);
    }
  }
  return found;
}

export function findLocalChromiumExecutable() {
  return findLocalChromiumExecutables()[0] || null;
}

function injectChromiumCliPageCounters(
  html,
  { title, typeLabel, generatedAtLabel, audience = 'technical' }
) {
  const isExecutive = audience === 'executive';
  const safeCssStr = (val) => String(val || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const bottomLeftText = isExecutive
    ? generatedAtLabel
      ? `Documento emitido em ${safeCssStr(generatedAtLabel)}`
      : 'Documento Executivo'
    : `Gerado via Playwright${generatedAtLabel ? ` • ${safeCssStr(generatedAtLabel)}` : ''}`;
  const pageRules = `
  @page {
    size: A4 portrait;
    margin: 18mm 12mm 18mm 12mm;
    @top-left {
      content: "${safeCssStr(title)}";
      font-size: 7.5pt;
      color: #475569;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    @top-right {
      content: "${safeCssStr(typeLabel)}";
      font-size: 7.5pt;
      color: #64748b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    @bottom-left {
      content: "${bottomLeftText}";
      font-size: 7.5pt;
      color: #64748b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    @bottom-right {
      content: "Página " counter(page) " de " counter(pages);
      font-size: 7.5pt;
      color: #475569;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
  }`;
  return html.replace('</style>', `${pageRules}\n  </style>`);
}

function renderPdfWithChromiumBinary({ executablePath, html, outputPath, timeout }) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const tmpHtmlFile = path.join(
    os.tmpdir(),
    `playwright-cli-pdf-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.html`
  );
  fs.writeFileSync(tmpHtmlFile, html, 'utf-8');

  try {
    execFileSync(
      executablePath,
      [
        '--headless',
        '--disable-gpu',
        '--no-first-run',
        '--disable-extensions',
        '--no-pdf-header-footer',
        `--print-to-pdf=${outputPath}`,
        pathToFileURL(tmpHtmlFile).href,
      ],
      {
        timeout,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      throw new Error('O binário Chromium terminou sem gerar o arquivo PDF.');
    }
  } finally {
    try {
      if (fs.existsSync(tmpHtmlFile)) fs.unlinkSync(tmpHtmlFile);
    } catch {
      // Ignora erro de limpeza
    }
  }
}

/**
 * Converte um arquivo Markdown (`relatorio-testes.md`, `docs-sistema/index.md` ou outro)
 * em um PDF editorial A4 paginado usando Playwright Chromium (`page.pdf()`).
 */
export async function renderMarkdownToPdf({
  inputPath,
  outputPath,
  type = 'auto',
  audience = 'technical',
  aiGuard = 'strict',
  title = '',
  emitHtmlOnly = false,
  timeout = PLAYWRIGHT_DEFAULTS.navigationTimeout,
} = {}) {
  if (!inputPath) {
    throw new Error('O caminho de entrada (`inputPath`) é obrigatório para gerar o PDF.');
  }

  const resolvedAudience = normalizeAudienceProfile(audience, 'technical') || 'technical';
  const resolvedAiGuard = normalizeAiGuardMode(aiGuard, 'strict') || 'strict';
  const isExecutive = resolvedAudience === 'executive';

  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`Arquivo Markdown não encontrado em: '${resolvedInput}'.`);
  }

  const rawMarkdown = fs.readFileSync(resolvedInput, 'utf-8');
  let preparedMarkdown = sanitizeSensitiveText(rawMarkdown);
  let preparedTitle = sanitizeSensitiveText(title || '');
  const baseDir = path.dirname(resolvedInput);

  if (isExecutive) {
    preparedMarkdown = stripTechnicalMarkdownForExecutive(preparedMarkdown);
  }

  let sanitizedAiMatches = 0;
  if (resolvedAiGuard === 'sanitize') {
    const mdRes = sanitizeForbiddenAiTerms(preparedMarkdown);
    const titleRes = sanitizeForbiddenAiTerms(preparedTitle);
    preparedMarkdown = mdRes.text;
    preparedTitle = titleRes.text;
    sanitizedAiMatches = mdRes.matches.length + titleRes.matches.length;
  } else {
    if (preparedTitle) {
      assertNoForbiddenAiReferences(preparedTitle, { contextLabel: 'título do PDF' });
    }
    assertNoForbiddenAiReferences(preparedMarkdown, {
      contextLabel: path.basename(resolvedInput),
    });
  }

  const companionData = loadCompanionData(resolvedInput, type);
  const resolvedType = companionData.type;

  const resolvedOutput = outputPath
    ? path.resolve(outputPath)
    : path.join(baseDir, `${path.basename(resolvedInput, path.extname(resolvedInput))}.pdf`);

  const stats = {
    embeddedImages: 0,
    missingImages: 0,
    sanitizedAiMatches,
    markdownBytes: Buffer.byteLength(preparedMarkdown, 'utf-8'),
  };

  const generatedAt = new Date();
  const { docTitle } = extractDocumentMetadata(
    preparedMarkdown,
    companionData,
    preparedTitle,
    resolvedType,
    resolvedAudience
  );

  const html = buildPdfHtml({
    markdown: preparedMarkdown,
    baseDir,
    title: docTitle,
    type: resolvedType,
    audience: resolvedAudience,
    aiGuard: resolvedAiGuard,
    companionData,
    generatedAt,
    stats,
  });

  if (emitHtmlOnly) {
    const htmlPath = resolvedOutput.toLowerCase().endsWith('.html')
      ? resolvedOutput
      : deriveFallbackPrintHtmlPath(resolvedOutput, resolvedInput);
    fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
    fs.writeFileSync(htmlPath, html, 'utf-8');
    return {
      ok: true,
      mode: 'html-only',
      audience: resolvedAudience,
      aiGuard: resolvedAiGuard,
      htmlPath,
      pdfPath: null,
      type: resolvedType,
      stats,
    };
  }

  const typeLabel = isExecutive
    ? resolvedType === 'e2e'
      ? 'Validação do Sistema'
      : resolvedType === 'docs'
        ? 'Guia do Sistema'
        : 'Relatório Executivo'
    : resolvedType === 'e2e'
      ? 'Testes E2E • Playwright'
      : resolvedType === 'docs'
        ? 'Documentação de Sistema • Playwright'
        : 'Relatório • Playwright';
  const generatedAtLabel = formatPtBrDateTime(generatedAt);

  // Tier 1: pacote Node `playwright` (preferencial — suporta headerTemplate/footerTemplate completos)
  let pw = null;
  let primaryError = null;
  try {
    pw = await loadPlaywright();
  } catch (err) {
    primaryError = err;
  }

  if (pw) {
    fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
    const { headerTemplate, footerTemplate } = buildHeaderFooterTemplates({
      title: docTitle,
      typeLabel,
      generatedAtLabel,
      audience: resolvedAudience,
    });

    const tmpHtmlFile = path.join(
      os.tmpdir(),
      `playwright-pdf-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.html`
    );
    fs.writeFileSync(tmpHtmlFile, html, 'utf-8');

    let browser = null;
    try {
      browser = await pw.chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: PLAYWRIGHT_DEFAULTS.viewport,
      });
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(timeout);
      page.setDefaultTimeout(timeout);

      await page.goto(pathToFileURL(tmpHtmlFile).href, {
        waitUntil: 'load',
        timeout,
      });

      await page.evaluate(async () => {
        const images = Array.from(document.images || []);
        await Promise.all(
          images.map(async (img) => {
            if (img.complete) return;
            try {
              if (typeof img.decode === 'function') {
                await img.decode();
                return;
              }
            } catch {
              // Ignora falha de decode individual
            }
            await new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            });
          })
        );
      });

      await page.pdf({
        path: resolvedOutput,
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin: {
          top: '18mm',
          bottom: '18mm',
          left: '12mm',
          right: '12mm',
        },
      });

      const outStat = fs.statSync(resolvedOutput);
      stats.pdfBytes = outStat.size;

      return {
        ok: true,
        mode: 'pdf',
        engine: 'playwright-api',
        audience: resolvedAudience,
        aiGuard: resolvedAiGuard,
        pdfPath: resolvedOutput,
        htmlPath: null,
        type: resolvedType,
        stats,
      };
    } catch (err) {
      primaryError = err;
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
      try {
        if (fs.existsSync(tmpHtmlFile)) fs.unlinkSync(tmpHtmlFile);
      } catch {
        // Ignora erro de limpeza em arquivo temporário
      }
    }
  }

  // Tier 2: binários locais de Chrome/Chromium (navegador do sistema ou cache do Playwright)
  const chromiumCandidates = findLocalChromiumExecutables();
  if (chromiumCandidates.length > 0) {
    const cliHtml = injectChromiumCliPageCounters(html, {
      title: docTitle,
      typeLabel,
      generatedAtLabel,
      audience: resolvedAudience,
    });
    for (const chromiumBin of chromiumCandidates) {
      try {
        renderPdfWithChromiumBinary({
          executablePath: chromiumBin,
          html: cliHtml,
          outputPath: resolvedOutput,
          timeout,
        });

        const outStat = fs.statSync(resolvedOutput);
        stats.pdfBytes = outStat.size;

        return {
          ok: true,
          mode: 'pdf',
          engine: 'chromium-cli',
          audience: resolvedAudience,
          aiGuard: resolvedAiGuard,
          executablePath: chromiumBin,
          pdfPath: resolvedOutput,
          htmlPath: null,
          type: resolvedType,
          stats,
        };
      } catch (cliErr) {
        primaryError = cliErr;
      }
    }
  }

  // Tier 3: Fallback garantido gravando `.print.html` autocontido para impressão A4
  const fallbackHtmlPath = deriveFallbackPrintHtmlPath(resolvedOutput, resolvedInput);
  fs.mkdirSync(path.dirname(fallbackHtmlPath), { recursive: true });
  fs.writeFileSync(fallbackHtmlPath, html, 'utf-8');

  const friendlyError = new Error(
    `${primaryError?.message || 'Playwright / Chromium não disponível neste ambiente.'}\n` +
      `Fallback autocontido gravado em: '${fallbackHtmlPath}'.\n` +
      `Você pode abrir esse arquivo no navegador e escolher "Imprimir -> Salvar como PDF", ` +
      `ou instalar o Chromium do Playwright ('npm install -D playwright && npx playwright install chromium') e reexecutar.`
  );
  friendlyError.fallbackHtmlPath = fallbackHtmlPath;
  throw friendlyError;
}
