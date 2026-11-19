# Documentação de Sistema e Testes E2E com Playwright 📸🧪

Plugin universal para **Google Antigravity**, **Cursor**, **Claude Code**, **Bithub** e outros agentes de IA, focado na geração automatizada de **documentação técnica de sistemas web** e na execução de **testes E2E com relatório completo de evidências** usando Playwright.

---

## 🧩 Skills Incluídas

| Skill | Finalidade | Saída Padrão |
| :--- | :--- | :--- |
| **`documentacao-sistema-playwright`** | Mapeia telas, captura screenshots full page, extrai elementos interativos e gera catálogo navegável. | `./docs-sistema/index.md` |
| **`testes-e2e-playwright`** | Analisa o diff da branch atual (ou implementação informada), cria cenários Dado/Quando/Então, executa passo a passo no navegador monitorando console/rede (`4xx`/`5xx`) e gera relatório de testes com diagnóstico de erros. | `./docs/testes/<slug-da-branch>/relatorio-testes.md` |

---

## ✨ Recursos

### Documentação de Sistemas (`documentacao-sistema-playwright`)
- **Menu Navegável**: Índice com âncoras internas para navegação instantânea.
- **Sumário Executivo Tabular**: Tabela resumo com número, nome da tela, rota, elementos chave e descrição curta.
- **Screenshots Full Page**: Capturas completas em alta resolução salvas em `./docs-sistema/screenshots/`.
- **Inventário Detalhado**: Extração semântica de formulários, campos de entrada, botões, tabelas, filtros e modais.
- **Descoberta Dupla de Rotas**: Mapeamento tanto por análise estática do código (routers) quanto por navegação dinâmica no DOM (`<nav>`, `aside`, headers).

### Testes E2E de Branch / Implementação (`testes-e2e-playwright`)
- **Escopo Inteligente**: Analisa o diff da branch atual em relação à branch base (`main`/`master`/`develop`) ou uma implementação indicada na chamada.
- **Cenários Dado/Quando/Então**: Cobertura estruturada de caminho feliz, validações e casos de erro relevantes.
- **Execução Passo a Passo + Prints Padronizados**: Captura estado inicial, ações, resultado final e erros em `./docs/testes/<slug-da-branch>/screenshots/cenario-XX-passo-YY.png` (e `-erro.png`).
- **Monitoramento Completo de Erros**: Audita console (`console.error`), exceções não tratadas (`pageerror`), respostas HTTP `4xx`/`5xx`, falhas de rede e divergências comportamentais.
- **Relatório com Diagnóstico**: Documento `relatorio-testes.md` com resumo da branch, status ✅/❌ por cenário, prints incorporados, causa provável, sugestão de correção e resumo executivo final.

### Base Compartilhada do Playwright
- **Configuração Reutilizada**: Ambas as skills compartilham o mesmo módulo [lib/playwright-config.mjs](./lib/playwright-config.mjs) (viewport `1440×900`, `networkidle`, timeouts, `storageState` e sanitização de dados sensíveis) e o mesmo padrão de ferramentas MCP do Playwright.
- **Compatibilidade Universal**: Funciona em qualquer stack web (Next.js, React, Vue, Angular, Django, Rails, Laravel, etc.).

---

## ⌨️ Comandos Slash
- **`/doc-sistema`**: Aciona a skill `documentacao-sistema-playwright` para documentar telas do sistema.
- **`/testes-e2e`**: Aciona a skill `testes-e2e-playwright` para testar a branch atual ou uma implementação específica e gerar `relatorio-testes.md`.

---

## 🚀 Como Usar

### 1. Pelo Agente de IA (Antigravity, Cursor, Claude Code)
Para documentar o sistema:
> *"Documente o sistema rodando em http://localhost:3000 gerando o menu e os prints das telas."*

Para executar testes E2E da branch atual ou de uma feature:
> *"Execute os testes E2E das alterações desta branch em http://localhost:3000 e gere o relatório com prints."*

### 2. Pelo Terminal com os Scripts Automatizados

**Documentação (`doc-runner.mjs`):**
```bash
node plugins/documentacao-sistema-playwright/skills/documentacao-sistema-playwright/scripts/doc-runner.mjs \
  --url "http://localhost:3000" \
  --out "./docs-sistema"
```

**Testes E2E (`e2e-runner.mjs`):**
```bash
node plugins/documentacao-sistema-playwright/skills/testes-e2e-playwright/scripts/e2e-runner.mjs \
  --url "http://localhost:3000" \
  --plan "./plano-e2e.json" \
  --out "./docs/testes/minha-branch"
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
