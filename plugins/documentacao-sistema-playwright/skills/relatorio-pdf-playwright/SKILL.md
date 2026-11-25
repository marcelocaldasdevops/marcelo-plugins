---
name: relatorio-pdf-playwright
description: >-
  Gera relatórios e guias de sistema em PDF editorial A4 (estilo Executivo Clean)
  a partir de relatórios de testes E2E (`relatorio-testes.md`), documentação de
  sistema (`docs-sistema/index.md`) ou qualquer documento Markdown com screenshots,
  adaptando o conteúdo para Público Técnico ou Público Não Técnico / Executivo e
  aplicando a Política Zero Referência a IA. Acionada automaticamente ao finalizar
  `testes-e2e-playwright` ou sob demanda (`/relatorio-pdf`).
license: MIT
metadata:
  author: Marcelo Caldas
  version: "1.3.1"
---

# Exportação Editorial em PDF (`relatorio-pdf-playwright`) 📄

Esta skill converte relatórios Markdown com evidências visuais em documentos **PDF A4 editoriais (estilo Executivo Clean)** utilizando o motor nativo `page.pdf()` do Chromium compartilhado pelo plugin, com suporte a dois perfis de leitura (**Técnico** e **Não Técnico / Executivo**) e auditoria estrita **Zero Referência a IA**.

---

## 🛑 Passo 0 Obrigatório — Definir o Público Antes de Gerar o PDF

Sempre que esta skill for acionada (seja no handoff pós-testes E2E, na exportação da documentação do sistema ou via `/relatorio-pdf`), **verifique se o usuário já informou para quem é o PDF**.

Caso o público ainda **não** tenha sido especificado na conversa ou via flag `--audience`, **pergunte obrigatoriamente antes de gerar o PDF**:

> *"Antes de gerar o PDF, para qual público este relatório será destinado?*
> *1. **Público Técnico** (desenvolvedores / QA — mantém cards de métricas, rotas, arquivos, logs e diagnóstico técnico)*
> *2. **Público Não Técnico / Executivo** (gestores, clientes, diretoria — linguagem simples de alto nível, foco direto nas telas validadas, sem cards de KPI, sem seção de parecer de liberação/próximos passos, sem jargão de programação e sem nenhuma referência a IA)"*

---

## 🚫 Política Inviolável — Zero Referência a IA

Em **qualquer** documento gerado (especialmente para público executivo/cliente, mas auditado em todos os modos por `lib/content-guardrails.mjs`):

- **Proibição absoluta**: nunca inclua menções a sistemas de inteligência artificial, provedores, modelos ou plataformas (`Claude`, `Anthropic`, `OpenAI`, `ChatGPT`, `GPT`, `Gemini`, `Antigravity`, `Cursor`, `Copilot`, `Perplexity`, `DeepSeek`, `Llama`, `Mistral`, `Grok`, `Vertex AI`, `Bedrock`, `Ollama`, `LangChain`, etc.) nem termos correlatos (`IA`, `I.A.`, `AI`, `LLM`, `inteligência artificial`, `agente`, `subagente`, `chatbot`, `prompt`, `modelo de linguagem`).
- **Bloqueio determinístico (`--ai-guard strict`)**: o `pdf-runner.mjs` audita o texto linha a linha antes de renderizar. Se detectar qualquer termo proibido, aborta a emissão apontando a linha e o trecho exato para correção imediata.

---

## 🧭 Fluxos de Execução por Público

### Fluxo 1 — Público Técnico (`--audience technical`)

Indicado para desenvolvedores, arquitetos, QA e anexos técnicos de Pull Request:
1. Preserva integralmente o relatório técnico original (`relatorio-testes.md` ou `docs-sistema/index.md`) com cards de KPI, rotas, arquivos alterados, status HTTP, logs de console, sugestões de código e conclusão técnica.
2. Garante que o texto esteja livre de referências a IA e de dados sensíveis.
3. Executa diretamente o gerador:
   ```bash
   node plugins/documentacao-sistema-playwright/skills/relatorio-pdf-playwright/scripts/pdf-runner.mjs \
     --input "./docs/testes/<slug-da-branch>/relatorio-testes.md" \
     --audience technical
   ```
   - Saída padrão: `relatorio-testes.pdf` (ou `documentacao-sistema.pdf` para `docs-sistema/index.md`).

---

### Fluxo 2 — Público Não Técnico / Executivo (`--audience executive`)

Indicado para diretoria, gestores de negócio, clientes finais, homologação funcional e apresentações institucionais:

#### Passo 1 — Preservar o Original e Criar o Markdown Executivo
- **Nunca sobrescreva** o `.md` técnico original (`relatorio-testes.md` ou `docs-sistema/index.md`).
- Crie um arquivo dedicado na mesma pasta:
  - Testes: `./docs/testes/<slug-da-branch>/relatorio-testes-executivo.md`
  - Documentação: `./docs-sistema/documentacao-sistema-executiva.md`
- **Mantenha todas as capturas de tela reais** (`./screenshots/...`) e a fidelidade absoluta aos resultados observados (nunca oculte falhas reais; explique-as em linguagem de negócio).

#### Passo 2 — Redigir em Linguagem de Alto Nível (Sem KPIs e Sem Parecer de Liberação)
Reescreva títulos, resumos, passos e diagnósticos substituindo todo jargão de engenharia por explicações claras do comportamento do sistema e impacto para o usuário:

| Evitar (Jargão Técnico / Seções Desnecessárias) | Usar no Modo Executivo (Linguagem Clara) |
| :--- | :--- |
| `Branch feat/checkout`, `Commit abc1234`, `Diff` | Entrega avaliada / Conjunto de melhorias analisadas |
| `Testes E2E com Playwright` | Validação prática dos fluxos do sistema |
| `Rota /pedidos/novo`, `GET / POST /api/pedidos` | Tela de Novo Pedido / Envio das informações do pedido |
| `HTTP 500 Internal Server Error` + stack trace | O sistema apresentou uma falha interna ao tentar concluir a ação |
| `console.error` / `pageerror` / `TypeError` | Falha interna de funcionamento detectada durante o uso da tela |
| `input:email`, `input:password`, `select` | Campo de e-mail, campo de senha, lista de seleção |
| `Corrigir handler em src/api/recurso.ts` | Ajustar o tratamento do formulário para orientar o usuário antes do envio |
| Seção `Parecer Final de Liberação` / `Próximos Passos` | **Omitir completamente** (encerrar após os fluxos validados ou pontos de atenção) |

Estrutura obrigatória e enxuta para `relatorio-testes-executivo.md`:
1. **Título claro de negócio** (ex.: `# Relatório Executivo de Validação — Novo Fluxo de Pedidos`).
2. **Bloco de contexto** sem hashes Git (`> **Escopo Avaliado:** ... | **Data:** ... | **Situação Geral:** ✅ Aprovado / ❌ Requer Ajustes`).
3. **Resumo Executivo** explicando de forma objetiva o que foi avaliado na entrega.
4. **Quadro Resumo dos Fluxos Validados** e **Passo a Passo com Capturas de Tela** em linguagem cotidiana.
5. **Pontos de Atenção Encontrados** *(incluir apenas se houver falhas)*: *O que aconteceu na tela*, *Impacto para o usuário*, *Evidência visual* e *Ajuste funcional necessário*, sem despejar código ou stack traces.

> **O que NÃO incluir no Modo Executivo**:
> - **Sem grade de cards KPI**: o motor `pdf-renderer.mjs` omite automaticamente os cards superiores de métricas quando `--audience executive` é utilizado.
> - **Sem seção final de Parecer de Liberação / Conclusão / Próximos Passos**: **não** escreva seções como *"Parecer Final de Liberação"*, *"Conclusão e Recomendações"* ou *"Próximos Passos Recomendados"* (homologação, janelas de deploy, publicação em produção). Caso o arquivo de entrada possua essas seções, `stripTechnicalMarkdownForExecutive()` também as remove automaticamente.

#### Passo 3 — Gerar o PDF Executivo
```bash
node plugins/documentacao-sistema-playwright/skills/relatorio-pdf-playwright/scripts/pdf-runner.mjs \
  --input "./docs/testes/<slug-da-branch>/relatorio-testes-executivo.md" \
  --audience executive
```
- Saída padrão: `./docs/testes/<slug-da-branch>/relatorio-testes-executivo.pdf` (ou `./docs-sistema/documentacao-sistema-executiva.pdf`), preservando eventual PDF técnico já existente na mesma pasta. Se o usuário pedir um nome específico, informe `--out <caminho.pdf>`.

---

## 💻 Referência da CLI (`scripts/pdf-runner.mjs`)

```bash
# 1. PDF Técnico de testes E2E (gera relatorio-testes.pdf)
node plugins/documentacao-sistema-playwright/skills/relatorio-pdf-playwright/scripts/pdf-runner.mjs \
  --input "./docs/testes/<slug-da-branch>/relatorio-testes.md" \
  --audience technical

# 2. PDF Executivo para gestores/clientes (gera relatorio-testes-executivo.pdf)
node plugins/documentacao-sistema-playwright/skills/relatorio-pdf-playwright/scripts/pdf-runner.mjs \
  --input "./docs/testes/<slug-da-branch>/relatorio-testes-executivo.md" \
  --audience executive

# 3. Guia Visual Executivo do Sistema em PDF (gera documentacao-sistema-executiva.pdf)
node plugins/documentacao-sistema-playwright/skills/relatorio-pdf-playwright/scripts/pdf-runner.mjs \
  --input "./docs-sistema/documentacao-sistema-executiva.md" \
  --type docs \
  --audience executive
```

### Argumentos Suportados
- `--input <arquivo.md>`: arquivo Markdown de origem (obrigatório).
- `--out <arquivo.pdf>`: caminho do PDF gerado (opcional; calculado automaticamente conforme tipo e audiência).
- `--audience <technical|executive>`: define cabeçalhos, rodapés, exibição de KPIs e filtros editoriais (`technical` por padrão; aceita `tecnico`, `executivo`, `nao-tecnico`).
- `--ai-guard <strict|sanitize>`: auditoria Zero Referência a IA (`strict` bloqueia e aponta linha/termo; `sanitize` remove ocorrências automaticamente).
- `--type <auto|e2e|docs|generic>`: perfil estrutural do documento (`auto` por padrão).
- `--title <titulo>`: sobrescreve o título principal do cabeçalho institucional.
- `--emit-html-only`: gera apenas `<nome>.print.html` autocontido com imagens Base64 e CSS `@page` A4.
- `--timeout <ms>`: timeout máximo de renderização no navegador (padrão: `30000`).

---

## 🛟 Fallback Resiliente (`.print.html`)

Se o ambiente não possuir um binário local do Chromium/Chrome disponível no momento da execução, o motor grava automaticamente `<nome>.print.html` 100% autocontido (imagens em Base64 + paginação A4). Basta abrir o arquivo no navegador e acionar **Imprimir ➔ Salvar como PDF**, ou instalar o Chromium (`npx playwright install chromium`) e reexecutar.

Consulte **[references/pdf-layout-spec.md](./references/pdf-layout-spec.md)** para a especificação visual completa, comparativo entre os perfis e regras detalhadas de paginação.

---

## 🛡️ Checklist de Qualidade e Conformidade

- [ ] **Público Confirmado**: O público-alvo (`technical` vs `executive`) foi confirmado com o usuário antes da geração.
- [ ] **Zero Referência a IA**: Nenhuma menção a IA, provedores, modelos, agentes, LLMs, prompts ou chatbots existe no texto, títulos, cabeçalhos ou rodapés (`guarda-ia=strict` aprovado sem violações).
- [ ] **Adequação Editorial (Modo Executivo)**: Sem cards de KPI no topo, sem seção de *Parecer Final de Liberação / Próximos Passos / Conclusão*, sem código-fonte, stack trace, status HTTP cru ou jargão de Git, mantendo o `.md` técnico original intacto.
- [ ] **Sanitização e Imagens Íntegras**: Nenhum segredo/token vazou e o resumo do CLI confirmou `imagens ausentes=0`.
