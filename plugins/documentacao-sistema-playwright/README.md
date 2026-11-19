# Documentação de Sistema, Testes E2E e Relatórios PDF com Playwright 📸🧪📄

Plugin universal para **Google Antigravity**, **Cursor**, **Claude Code**, **Bithub** e outros agentes de IA, focado em **documentação técnica de sistemas web**, **testes E2E com evidências** e **exportação editorial em PDF A4** usando Playwright — sem dependências npm externas.

---

## 🧩 Skills Incluídas

| Skill | Finalidade | Acionamento | Saída Padrão |
| :--- | :--- | :--- | :--- |
| **`documentacao-sistema-playwright`** | Mapeia telas, captura screenshots full page, extrai elementos interativos e gera catálogo navegável. | Sob demanda (`/doc-sistema`) | `./docs-sistema/index.md` *(PDF opcional via `--pdf` ou `/relatorio-pdf`)* |
| **`testes-e2e-playwright`** | Analisa o diff da branch atual (ou implementação informada), cria cenários Dado/Quando/Então, executa passo a passo monitorando console/rede (`4xx`/`5xx`) e gera relatório completo. | Sob demanda (`/testes-e2e`) | `./docs/testes/<slug-da-branch>/relatorio-testes.md` + **`relatorio-testes.pdf` (automático)** |
| **`relatorio-pdf-playwright`** | Converte relatórios de testes E2E, documentações ou qualquer Markdown com prints em PDF A4 (tema **Executivo Clean**). | **Automático** pós-E2E ou sob demanda (`/relatorio-pdf`) | `./docs/testes/<slug>/relatorio-testes.pdf` ou `./docs-sistema/documentacao-sistema.pdf` |

---

## ✨ Recursos

### Documentação de Sistemas (`documentacao-sistema-playwright`)
- **Menu Navegável e Sumário Executivo**: Índice com âncoras internas e tabela resumo de telas.
- **Screenshots Full Page + Inventário**: Capturas HD em `./docs-sistema/screenshots/` e extração semântica de campos, botões, tabelas e filtros.
- **Descoberta Dupla de Rotas**: Análise estática do código (routers) + varredura dinâmica no DOM (`<nav>`, `aside`, headers).
- **Exportação PDF Opcional**: Suporte à flag `--pdf` no `doc-runner.mjs` ou conversão posterior via `/relatorio-pdf`.

### Testes E2E de Branch / Implementação (`testes-e2e-playwright`)
- **Escopo Inteligente**: Analisa o diff da branch atual vs. branch base (`main`/`master`/`develop`) ou uma implementação indicada na chamada.
- **Cenários Dado/Quando/Então**: Cobertura de caminho feliz, validações e casos de erro relevantes.
- **Prints Padronizados + Monitoramento de Erros**: Salva `cenario-XX-passo-YY.png` (e `-erro.png`), monitora `console.error`, `pageerror`, HTTP `4xx`/`5xx`, falhas de rede e documenta causa provável + sugestão de correção.
- **PDF Automático ao Concluir**: Ao terminar `relatorio-testes.md`, aciona automaticamente `relatorio-pdf-playwright` para gerar `relatorio-testes.pdf` na mesma pasta (`--no-pdf` para desativar no CLI).

### Exportação Editorial em PDF (`relatorio-pdf-playwright`)
- **Zero Dependências Externas**: Utiliza `page.pdf()` nativo do Chromium do Playwright em [lib/pdf-renderer.mjs](./lib/pdf-renderer.mjs).
- **Tema Executivo Clean (A4)**: Cabeçalho institucional escuro, barra de metadados, cards executivos de KPI (`evidencias.json` / `inventory.json`), badges vetoriais SVG (sem emoji quebrado em Linux), tabelas com `<thead>` repetido e `break-inside: avoid` em prints e diagnósticos.
- **Autocontido + Fallback Resiliente**: Incorpora imagens locais em Base64 com proteção anti *path-traversal*, aplica `sanitizeSensitiveText()` e gera fallback `.print.html` caso o binário do Chromium não esteja disponível no CLI.

### Base Compartilhada do Playwright
- **Módulos Reutilizáveis em `lib/`**: [lib/playwright-config.mjs](./lib/playwright-config.mjs) (sessão Chromium `1440×900`, `networkidle`, timeouts, `storageState`, sanitização e telemetria) e [lib/pdf-renderer.mjs](./lib/pdf-renderer.mjs) (motor editorial HTML5 + PDF).
- **Compatibilidade Universal**: Next.js, React, Vue, Angular, Svelte, Django, Rails, Laravel, Spring Boot e qualquer aplicação web.

---

## ⌨️ Comandos Slash
- **`/doc-sistema`**: Documenta telas do sistema em `./docs-sistema/index.md` (PDF opcional se solicitado).
- **`/testes-e2e`**: Executa testes E2E da branch atual ou implementação informada e gera `relatorio-testes.md` + `relatorio-testes.pdf` automaticamente.
- **`/relatorio-pdf`**: Gera ou regera o PDF A4 de qualquer relatório de testes, documentação ou Markdown com prints sem reexecutar os testes.

---

## 🚀 Como Usar

### 1. Pelo Agente de IA (Antigravity, Cursor, Claude Code)
- **Documentação:** *"Documente o sistema rodando em http://localhost:3000 gerando o menu e os prints das telas."*
- **Testes E2E (+ PDF automático):** *"Execute os testes E2E das alterações desta branch em http://localhost:3000 e gere o relatório com prints."*
- **Exportar PDF avulso:** *"Gere o PDF da documentação em ./docs-sistema/index.md."* ou *"Regere o PDF de ./docs/testes/feat-login/relatorio-testes.md."*

### 2. Pelo Terminal com os Scripts Automatizados

**Documentação (`doc-runner.mjs`):**
```bash
node plugins/documentacao-sistema-playwright/skills/documentacao-sistema-playwright/scripts/doc-runner.mjs \
  --url "http://localhost:3000" \
  --out "./docs-sistema" \
  --pdf
```

**Testes E2E (`e2e-runner.mjs` — gera PDF por padrão; passe `--no-pdf` para pular):**
```bash
node plugins/documentacao-sistema-playwright/skills/testes-e2e-playwright/scripts/e2e-runner.mjs \
  --url "http://localhost:3000" \
  --plan "./plano-e2e.json" \
  --out "./docs/testes/minha-branch"
```

**Exportação PDF Standalone (`pdf-runner.mjs`):**
```bash
node plugins/documentacao-sistema-playwright/skills/relatorio-pdf-playwright/scripts/pdf-runner.mjs \
  --input "./docs/testes/minha-branch/relatorio-testes.md"
```

---

## 📦 Instalação

### Antigravity CLI (`agy`):
```bash
agy plugin install plugins/documentacao-sistema-playwright
```

### Claude Code:
```text
/plugin install documentacao-sistema-playwright@marcelo-plugins
```

### Cursor e Bithub:
Ative o plugin no catálogo de extensões do marketplace.
