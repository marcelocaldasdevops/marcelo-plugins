# Especificação Editorial — Tema **Executivo Clean** (`pdf-renderer.mjs`)

Referência visual, editorial e de conformidade do motor compartilhado `lib/pdf-renderer.mjs` e das guardrails `lib/content-guardrails.mjs` utilizados pela skill `relatorio-pdf-playwright`.

---

## 1. Formato de Página e Paginação (`page.pdf`)

| Parâmetro | Valor Padrão | Finalidade |
| :--- | :--- | :--- |
| **Formato** | `A4` retrato (`210mm × 297mm`) | Compatibilidade corporativa universal para leitura em tela e impressão |
| **Margens** | `top: 18mm`, `bottom: 18mm`, `left: 12mm`, `right: 12mm` | Área útil de `186mm` com espaço dedicado para cabeçalho e rodapé paginados |
| **`printBackground`** | `true` | Preserva cabeçalho institucional escuro, cards KPI, zebrado de tabelas e badges |
| **Cabeçalho Paginado** | CSS inline `8px` (`título` + selo do perfil) | Identificação discreta no topo de todas as páginas |
| **Rodapé Paginado** | CSS inline `8px` (data de emissão + `Página X de Y`) | Rastreabilidade temporal e numeração `.pageNumber` / `.totalPages` |

> **Nota de renderização**: `headerTemplate` e `footerTemplate` executam em contexto isolado do DOM principal; por isso utilizam exclusivamente estilos inline explícitos. No fallback por binário local, regras equivalentes `@page` com `@top-left`, `@top-right`, `@bottom-left` e `@bottom-right` são injetadas automaticamente.

---

## 2. Perfis de Audiência (`--audience technical` vs `--audience executive`)

O motor adapta rótulos institucionais, barra de metadados, blocos técnicos e nomenclatura de saída conforme o público-alvo:

| Elemento Editorial | `--audience technical` (Engenharia / QA) | `--audience executive` (Gestores / Clientes / Diretoria) |
| :--- | :--- | :--- |
| **Eyebrow (`e2e`)** | `Relatório Executivo de Qualidade & Evidências E2E` | `Relatório Executivo de Validação do Sistema` |
| **Eyebrow (`docs`)** | `Catálogo Técnico & Inventário de Interfaces` | `Guia Visual e Funcional do Sistema` |
| **Eyebrow (`generic`)** | `Documento Técnico Consolidado` | `Relatório Institucional Consolidado` |
| **Cabeçalho Direito (`e2e`)** | `Testes E2E • Playwright` | `Validação do Sistema` |
| **Cabeçalho Direito (`docs`)** | `Documentação de Sistema • Playwright` | `Guia do Sistema` |
| **Cabeçalho Direito (`generic`)** | `Relatório • Playwright` | `Documento Executivo` |
| **Rodapé Esquerdo** | `Gerado via Playwright • DD/MM/AAAA HH:MM` | `Documento emitido em DD/MM/AAAA HH:MM` |
| **Barra de Metadados** | Mantém `Branch`, `Branch Base`, `Commit`, `URL Base`, `Data` | Oculta metadados de código/Git (`Branch`, `Branch Base`, `Commit`, `Diff`, `SHA`, `PR`) |
| **Seções e Blocos de Código** | Preserva `Arquivos Detectados no Diff`, logs HTTP e stack traces | Omite automaticamente seções de diff/código e blocos brutos de stack trace/HTTP |
| **Arquivo PDF Padrão (`e2e`)** | `relatorio-testes.pdf` | `relatorio-testes-executivo.pdf` |
| **Arquivo PDF Padrão (`docs`)** | `documentacao-sistema.pdf` | `documentacao-sistema-executiva.pdf` |

---

## 3. Cards Executivos de KPI por Perfil e Audiência

### 3.1 Perfil `e2e`

| Card | `--audience technical` | `--audience executive` |
| :--- | :--- | :--- |
| **Card 1** | **Cenários Executados** (`Taxa de aprovação: X%`) | **Fluxos Validados** (`Índice de aprovação: X%`) |
| **Card 2** | **Aprovados** (`Fluxos validados sem falhas`) | **Aprovados** (`Etapas concluídas conforme esperado`) |
| **Card 3** | **Falharam** (`Nenhuma quebra funcional` / `Requer correção antes do merge`) | **Pontos de Atenção** (`Nenhum impedimento identificado` / `Requer ajuste antes da liberação`) |
| **Card 4** | **Parecer Técnico** (`Aprovado` / `Bloqueado` + `N ocorrência(s) de erro`) | **Situação da Entrega** (`Pronta` / `Requer Ajustes` + resumo claro de ocorrências) |

### 3.2 Perfil `docs`

| Card | `--audience technical` | `--audience executive` |
| :--- | :--- | :--- |
| **Card 1** | **Telas Mapeadas** (`Catálogo navegável do sistema`) | **Telas Apresentadas** (`Visão navegável do sistema`) |
| **Card 2** | **Screenshots HD** (`Capturas full-page incorporadas`) | **Capturas de Tela** (`Imagens reais das interfaces`) |
| **Card 3** | **Campos Mapeados** (`Entradas, seletores e formulários`) | **Campos da Interface** (`Áreas de preenchimento e consulta`) |
| **Card 4** | **Status do Catálogo** (`Inventário técnico atualizado`) | **Situação do Guia** (`Conteúdo completo e atualizado`) |

*(No perfil `generic`, a grade de KPI é omitida para manter o foco no texto editorial).*

---

## 4. Política Absoluta Zero Referência a IA (`content-guardrails.mjs`)

Todos os relatórios passam pela auditoria determinística de `lib/content-guardrails.mjs`:

1. **Escopo da Proibição**:
   - Provedores, modelos e plataformas: `Claude`, `Anthropic`, `OpenAI`, `ChatGPT`, `GPT`, `Gemini`, `Google AI`, `Vertex AI`, `Antigravity`, `Cursor AI`, `GitHub Copilot`, `Copilot`, `Perplexity`, `DeepSeek`, `Llama`, `Mistral`, `Grok`, `xAI`, `Midjourney`, `Bedrock`, `Ollama`, `LangChain`, `AutoGPT`, `CrewAI`, entre outros.
   - Siglas e conceitos correlatos: `IA`, `I.A.`, `AI`, `A.I.`, `inteligência artificial`, `artificial intelligence`, `LLM`, `modelo de linguagem`, `machine learning`, `aprendizado de máquina`, `agente`, `subagente`, `multi-agente`, `chatbot`, `prompt`.
2. **Precisão Linguística em Português**:
   - As expressões regulares utilizam fronteiras Unicode (`(?<![\p{L}\p{N}_])...(?![\p{L}\p{N}_])`) e diferenciação contextual de caixa para **nunca** gerar falsos positivos em vocábulos comuns do português (`dia`, `via`, `guia`, `história`, `mídia`, `copia`, `envia`, `agência`, `agenda`, `agendamento`, `reagente` ou o verbo `ia` em minúsculas) nem em payloads Base64 de screenshots.
3. **Modos de Operação (`--ai-guard`)**:
   - `strict` *(padrão)*: bloqueia imediatamente a geração do PDF com erro `FORBIDDEN_AI_REFERENCE` detalhando linha, categoria e trecho exato.
   - `sanitize`: remove/substitui ocorrências residuais de forma limpa e registra aviso no console.

---

## 5. Guia Rápido de Adaptação para Público Não Técnico

Ao produzir `<nome>-executivo.md` antes de chamar `--audience executive`:

1. **Foco na Jornada do Usuário**: descreva cada tela pelo objetivo de negócio (*"Tela de acompanhamento de faturas"*) em vez da arquitetura (*"Componente SSR da rota `/billing`"*).
2. **Tradução de Falhas sem Omissão**: mantenha total transparência sobre falhas encontradas, porém descreva o sintoma percebido e a consequência operacional (*"Ao clicar em Salvar com o cadastro em branco, o sistema não exibiu aviso de preenchimento obrigatório e interrompeu a operação"*) em vez de despejar `HTTP 500` ou `Cannot read properties of undefined`.
3. **Recomendações Orientadas a Decisão**: classifique ações como **Impeditivas antes da liberação** vs **Melhorias recomendadas**, permitindo tomada de decisão rápida por gestores e clientes.

---

## 6. Paleta Institucional, Badges SVG e Segurança

- **Paleta Executivo Clean**:
  - Cabeçalho institucional: gradiente `#0f172a` ➔ `#1e293b`, texto `#ffffff`, linha de destaque `#2563eb`, eyebrow `#93c5fd`.
  - Semântica de aprovação: fundo `#dcfce7` / `#f0fdf4`, borda `#86efac`, texto `#166534`.
  - Semântica de falha / atenção: fundo `#fee2e2` / `#fef2f2`, borda `#fca5a5`, texto `#991b1b`.
- **Badges Vetoriais SVG e Paginação**:
  - `✅ Passou`, `❌ Falhou`, `✅ Aprovado`, `❌ Reprovado`, `✅` e `❌` são convertidos em SVGs inline independentes de fontes de emoji do SO.
  - Figuras (`figure.screenshot-card`) usam `break-inside: avoid` e `max-height: 170mm`, mantendo imagem e legenda unidas na mesma folha A4.
  - Tabelas repetem `<thead>` automaticamente ao cruzar páginas (`display: table-header-group`).
- **Segurança e Sanitização**:
  - `sanitizeSensitiveText()` mascara tokens `Bearer`/JWT, senhas, chaves de API, cookies e documentos sensíveis antes da conversão HTML.
  - Tags HTML cruas são escapadas via `escapeHtml()`, preservando apenas âncoras internas seguras `<a id="slug"></a>`.
  - Imagens locais são validadas com `path.resolve` + `fs.realpathSync` contra *path traversal*, aceitando exclusivamente arquivos dentro do diretório base do relatório.
