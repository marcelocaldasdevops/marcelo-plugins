# Marcelo Plugins Marketplace 🚀

Marketplace público e universal de **Plugins**, **Skills**, **Regras** e **Servidores MCP** para os principais ecossistemas de agentes de inteligência artificial:

- **Google Antigravity** (CLI `agy`, Antigravity IDE e Antigravity 2.0 / Gemini)
- **Cursor**
- **Claude Code**
- **Bithub**
- **OpenAI Codex, OpenCode, Cline e Roo Code**

Mantido e desenvolvido por [Marcelo Caldas](https://github.com/marcelocaldasdevops).

---

## 🗺️ Compatibilidade de Plataformas

O catálogo mantém manifestos sincronizados para cada ecossistema:

| Plataforma / Ecossistema | Manifesto / Padrão | Método de Descoberta |
| :--- | :--- | :--- |
| **Antigravity CLI (`agy`)** | `plugin.json` (em cada plugin) e `.antigravity/` | `agy plugin install plugins/<nome>` |
| **Claude Code** | [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) | `/plugin marketplace add` |
| **Cursor** | [`.cursor-plugin/marketplace.json`](.cursor-plugin/marketplace.json) | URL do repositório em *Customize* |
| **Bithub** | [`.bithub-plugin/marketplace.json`](.bithub-plugin/marketplace.json) | *Personalizar › Explorar* |
| **Codex / OpenCode / Cline** | `rules/AGENTS.md` e `skills/` | Leitura padrão de instruções e skills |

---

## 📦 Plugins Disponíveis

<!-- PLUGINS_TABLE_START -->
*Nenhum plugin registrado ainda. Crie seu primeiro plugin com `./scripts/new-plugin.sh`.*
<!-- PLUGINS_TABLE_END -->

---

## 🔌 Como Adicionar e Instalar

### 1. Google Antigravity CLI (`agy`)
Para instalar um plugin localmente:
```bash
# Validar a integridade do plugin
agy plugin validate plugins/<nome-do-plugin>

# Instalar o plugin
agy plugin install plugins/<nome-do-plugin>

# Listar plugins ativos
agy plugin list
```

### 2. Claude Code
Adicione o repositório como marketplace no Claude Code:
```text
/plugin marketplace add https://github.com/marcelocaldasdevops/marcelo-plugins.git
```
E instale plugins específicos:
```text
/plugin install <nome-do-plugin>@marcelo-plugins
```

### 3. Cursor
1. Acesse as configurações de **Customize / Plugins**.
2. Adicione a URL do repositório: `https://github.com/marcelocaldasdevops/marcelo-plugins`.
3. Ative os plugins desejados pelo catálogo.

### 4. Bithub
1. Vá em **Personalizar › Explorar**.
2. Importe a URL do repositório: `https://github.com/marcelocaldasdevops/marcelo-plugins`.

---

## 🛠️ Como Criar um Novo Plugin

O repositório inclui um assistente automatizado de scaffolding que cria a estrutura completa de pastas e registra o plugin em todos os manifestos de marketplace.

### Passo 1: Executar o gerador de plugin
```bash
./scripts/new-plugin.sh <nome-slug> "<Nome de Exibição>" "<Breve Descrição>"
```
*Exemplo:*
```bash
./scripts/new-plugin.sh git-guard "Git Guard" "Impede commits acidentais em branches protegidas."
```

### Passo 2: Desenvolver os componentes
Acesse a pasta recém-criada em `plugins/<nome-slug>/`:
- **Skills (`skills/`)**: Adicione novos diretórios com arquivos `SKILL.md` descrevendo procedimentos sob demanda.
- **Regras (`rules/AGENTS.md`)**: Defina diretrizes de código, restrições e comportamentos que o modelo deve seguir.
- **Comandos (`commands/`)**: Crie comandos slash personalizados em Markdown (`commands/<comando>.md`).
- **Subagentes (`agents/`)**: Declare subagentes especializados para delegação de tarefas.
- **Servidores MCP (`mcp_config.json`)**: Configure conexões para servidores MCP e ferramentas externas.
- **Hooks (`hooks.json`)**: Registre scripts para rodar em pontos específicos do ciclo de vida.

### Passo 3: Sincronizar e validar
Sempre que editar ou criar plugins, sincronize e valide:
```bash
# Sincroniza todos os manifests e a tabela do README
python3 ./scripts/sync-marketplaces.py

# Valida conformidade estrutural com o Antigravity CLI e sintaxe JSON
./scripts/validate-plugins.sh
```

---

## 📁 Estrutura do Repositório

```text
marcelo-plugins/
├── .antigravity/                   # Manifesto para Google Antigravity
│   └── marketplace.json
├── .bithub-plugin/                 # Manifesto para Bithub
│   └── marketplace.json
├── .claude-plugin/                 # Manifesto para Claude Code
│   └── marketplace.json
├── .cursor-plugin/                 # Manifesto para Cursor
│   └── marketplace.json
├── .gemini-plugin/                 # Manifesto para Gemini
│   └── marketplace.json
├── registry.json                   # Fonte única da verdade consolidada
├── README.md                       # Documentação principal e catálogo
├── plugins/                        # Diretório onde vivem os plugins
│   └── <seu-plugin>/
│       ├── plugin.json             # Manifesto nativo Antigravity
│       ├── .claude-plugin/
│       ├── .cursor-plugin/
│       ├── .bithub-plugin/
│       ├── skills/
│       ├── rules/AGENTS.md
│       ├── commands/
│       ├── agents/
│       ├── mcp_config.json
│       ├── hooks.json
│       └── README.md
├── templates/
│   └── plugin-template/            # Scaffold base universal
└── scripts/
    ├── new-plugin.sh               # Gerador de novos plugins
    ├── sync-marketplaces.py        # Sincronizador automático de manifests
    └── validate-plugins.sh         # Validador estrutural e de schemas
```

---

## 📄 Licença
Distribuído sob a licença [MIT](LICENSE).
