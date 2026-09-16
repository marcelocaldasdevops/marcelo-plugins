# Documentação de Sistema com Playwright 📸

Plugin universal para **Google Antigravity**, **Cursor**, **Claude Code**, **Bithub** e outros agentes de IA, focado na geração automatizada de documentações técnicas e funcionais de sistemas web.

---

## ✨ Recursos

- **Menu Navegável**: Índice com âncoras internas para navegação instantânea.
- **Sumário Executivo Tabular**: Tabela resumo com número, nome da tela, rota, elementos chave e descrição curta.
- **Screenshots Full Page**: Capturas completas em alta resolução salvas em `./docs-sistema/screenshots/`.
- **Inventário Detalhado**: Extração semântica de formulários, campos de entrada, botões, tabelas, filtros e modais.
- **Compatibilidade Universal**: Funciona em qualquer stack web (Next.js, React, Vue, Angular, Django, Rails, Laravel, etc.).
- **Descoberta Dupla de Rotas**: Mapeamento tanto por análise estática do código (routers) quanto por navegação dinâmica no DOM (`<nav>`, `aside`, headers).
- **Script Autônomo em Node.js**: Script `doc-runner.mjs` pronto para rodar varreduras completas diretamente do terminal.

---

## ⌨️ Comandos Slash
- **`/doc-sistema`**: Aciona o fluxo de documentação de telas com Playwright.

---

## 🚀 Como Usar

### 1. Pelo Agente de IA (Antigravity, Cursor, Claude Code)
Basta pedir no chat:
> *"Documente o sistema rodando em http://localhost:3000 gerando o menu e os prints das telas."*

### 2. Pelo Terminal com o Script Automatizado
```bash
node plugins/documentacao-sistema-playwright/skills/documentacao-sistema-playwright/scripts/doc-runner.mjs \
  --url "http://localhost:3000" \
  --out "./docs-sistema"
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
