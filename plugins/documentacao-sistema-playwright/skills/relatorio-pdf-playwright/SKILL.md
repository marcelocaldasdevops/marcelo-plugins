---
name: relatorio-pdf-playwright
description: >-
  Gera relatórios e catálogos técnicos em PDF editorial A4 (estilo Executivo Clean)
  a partir de relatórios de testes E2E (`relatorio-testes.md`), documentação de
  sistema (`docs-sistema/index.md`) ou qualquer documento Markdown com screenshots,
  usando Playwright Chromium sem dependências extras. Acionada automaticamente ao
  finalizar `testes-e2e-playwright` ou sob demanda quando o usuário pedir para
  exportar/converter relatório ou documentação para PDF (`/relatorio-pdf`).
license: MIT
metadata:
  author: Marcelo Caldas
  version: "1.0"
---

# Exportação Editorial em PDF com Playwright 📄

Esta skill converte relatórios Markdown com evidências visuais em documentos **PDF A4 prontos para diretoria, auditoria, anexos de PR e clientes**, utilizando exclusivamente o motor nativo `page.pdf()` do **Playwright Chromium** compartilhado pelo plugin:

- **Acionamento automático pós-E2E**: gera `./docs/testes/<slug-da-branch>/relatorio-testes.pdf` ao final da bateria de testes E2E.
- **Uso avulso sob demanda**: converte relatórios anteriores (`relatorio-testes.md`), catálogos de telas (`./docs-sistema/index.md` ➔ `documentacao-sistema.pdf`) ou qualquer Markdown técnico com prints.
- **Layout Executivo Clean**: cabeçalho institucional escuro, barra de metadados, cards executivos de KPI, badges vetoriais SVG (independentes de fontes de emoji do sistema operacional), tabelas com cabeçalho repetido entre páginas e controle inteligente de quebras (`break-inside: avoid`).
- **Autocontido e seguro**: embute screenshots locais em Base64 validando caminhos contra *path traversal* e aplica `sanitizeSensitiveText()` antes da renderização.

---

## 🔄 Modos de Acionamento

### 1. Automático ao Concluir `testes-e2e-playwright` (Padrão)
Sempre que a skill `testes-e2e-playwright` finalizar a gravação de `./docs/testes/<slug-da-branch>/relatorio-testes.md` (seja via agente interativo MCP ou pelo `e2e-runner.mjs`), gere em seguida o PDF correspondente na mesma pasta:

- **Entrada**: `./docs/testes/<slug-da-branch>/relatorio-testes.md` (+ `evidencias.json` se existir).
- **Saída padrão**: `./docs/testes/<slug-da-branch>/relatorio-testes.pdf`.
- **Desativação opcional**: só pule a geração do PDF se o usuário pedir explicitamente apenas Markdown ou passar `--no-pdf` no CLI.

### 2. Sob Demanda na Documentação de Sistema (`documentacao-sistema-playwright`)
Quando o usuário pedir a documentação em PDF, invocar `/relatorio-pdf` sobre `./docs-sistema/index.md` ou passar `--pdf` no `doc-runner.mjs`:

- **Entrada**: `./docs-sistema/index.md` (+ `inventory.json` se existir).
- **Saída padrão**: `./docs-sistema/documentacao-sistema.pdf`.

### 3. Conversão Avulsa de Qualquer Relatório Existente
Quando o usuário apontar qualquer arquivo `.md` existente no projeto:
1. Identifique o arquivo Markdown alvo (ou localize o relatório mais recente em `./docs/testes/` ou `./docs-sistema/` caso não tenha sido especificado).
2. Execute o `pdf-runner.mjs` passando `--input <arquivo.md>`.
3. Informe o caminho final do `.pdf` gerado, tamanho do arquivo e quantidade de screenshots incorporados.

---

## 💻 Execução via CLI (`scripts/pdf-runner.mjs`)

Utilize o script dedicado da skill (que consome o motor compartilhado em [lib/pdf-renderer.mjs](../../lib/pdf-renderer.mjs)):

```bash
# 1. Converter relatório de testes E2E (gera relatorio-testes.pdf na mesma pasta)
node plugins/documentacao-sistema-playwright/skills/relatorio-pdf-playwright/scripts/pdf-runner.mjs \
  --input "./docs/testes/<slug-da-branch>/relatorio-testes.md"

# 2. Converter catálogo de documentação do sistema (gera documentacao-sistema.pdf)
node plugins/documentacao-sistema-playwright/skills/relatorio-pdf-playwright/scripts/pdf-runner.mjs \
  --input "./docs-sistema/index.md" \
  --type docs

# 3. Converter qualquer Markdown definindo título e caminho de saída customizados
node plugins/documentacao-sistema-playwright/skills/relatorio-pdf-playwright/scripts/pdf-runner.mjs \
  --input "./docs/auditoria.md" \
  --out "./docs/auditoria-executiva.pdf" \
  --title "Relatório de Auditoria Técnica"
```

### Argumentos Suportados pelo `pdf-runner.mjs`
- `--input <arquivo.md>`: arquivo Markdown de origem (obrigatório).
- `--out <arquivo.pdf>`: caminho do PDF gerado (opcional; padrão automático conforme o tipo de entrada).
- `--type <auto|e2e|docs|generic>`: força o perfil de KPIs e cabeçalhos ou detecta automaticamente (`auto` por padrão).
- `--title <titulo>`: sobrescreve o título principal do cabeçalho institucional.
- `--emit-html-only`: gera apenas `<nome>.print.html` autocontido (com CSS `@page` e imagens Base64), sem iniciar o Chromium.
- `--timeout <ms>`: timeout máximo de carregamento/renderização (padrão: `30000`).

---

## 🛟 Fallback Resiliente (`--emit-html-only`)

Se o ambiente onde o comando está sendo executado não tiver o binário do Chromium instalado no momento:
1. O motor grava automaticamente um arquivo `<nome>.print.html` 100% autocontido (todas as imagens já convertidas em Data URI Base64 e regras `@page` A4 configuradas).
2. Informe ao usuário o caminho do `.print.html` gerado e as duas opções imediatas:
   - Instalar o navegador (`npm install -D playwright && npx playwright install chromium`) e reexecutar o `pdf-runner.mjs`; ou
   - Abrir o `.print.html` diretamente no Chrome/Edge e acionar **Imprimir ➔ Salvar como PDF**.

Para detalhes completos da tipografia, margens A4, paleta de cores, cards de KPI e regras de paginação, consulte **[references/pdf-layout-spec.md](./references/pdf-layout-spec.md)**.

---

## 🛡️ Checklist de Qualidade e Segurança

- [ ] **Sanitização Garantida**: Nenhum token Bearer/JWT, senha, cookie ou segredo pode vazar para o PDF ou para o `.print.html`.
- [ ] **Imagens Locais Verificadas**: Confirme no log do `pdf-runner.mjs` que `imagens ausentes=0` (todos os screenshots de `./screenshots/` foram embutidos com sucesso).
- [ ] **Sem Emojis Quebrados**: Status `✅ Passou` / `❌ Falhou` são renderizados com badges vetoriais SVG nítidos em qualquer SO (Linux headless, macOS ou Windows).
- [ ] **Paginação Limpa**: Tabelas repetem `<thead>` ao quebrar página e screenshots/diagnósticos `ERR-XX` mantêm legenda e imagem agrupadas sem cortes abruptos.
