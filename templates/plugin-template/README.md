# {{PLUGIN_DISPLAY_NAME}}

{{PLUGIN_DESCRIPTION}}

Plugin desenvolvido por [Marcelo Caldas](https://github.com/marcelocaldasdevops) para o marketplace [marcelo-plugins](https://github.com/marcelocaldasdevops/marcelo-plugins).

---

## 📦 Estrutura

- **`skills/`**: Procedimentos operacionais e automações sob demanda para o agente.
- **`rules/AGENTS.md`**: Diretrizes de codificação e comportamento universais.
- **`commands/`**: Atalhos e comandos slash (`/comando`).
- **`agents/`**: Subagentes e personas especializadas.
- **`mcp_config.json`**: Conectores e ferramentas do Model Context Protocol (MCP).
- **`hooks.json`**: Ações automatizadas em eventos de ciclo de vida do agente.

---

## 🚀 Como Instalar e Usar

### Antigravity CLI (`agy`)
```bash
agy plugin install plugins/{{PLUGIN_NAME}}
```

### Claude Code
```text
/plugin install {{PLUGIN_NAME}}@marcelo-plugins
```

### Cursor e Bithub
Ative o plugin na interface do marketplace de extensões.
