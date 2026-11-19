---
description: Gera ou atualiza um relatório editorial em PDF A4 (Público Técnico ou Não Técnico/Executivo com Política Zero Referência a IA) a partir de relatorio-testes.md, docs-sistema/index.md ou qualquer Markdown com prints.
---

Por favor, execute a skill `relatorio-pdf-playwright`. Antes de gerar o PDF (caso o público ainda não tenha sido informado), pergunte se o documento será destinado a **Público Técnico** (mantém detalhes de engenharia/QA) ou **Público Não Técnico / Executivo** (reescreve em linguagem simples de alto nível em um arquivo `-executivo.md` preservando o original, sem jargões técnicos e aplicando rigorosamente a Política Zero Referência a IA). Em seguida, gere o PDF A4 via `scripts/pdf-runner.mjs`.
