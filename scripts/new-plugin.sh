#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_DIR="$REPO_ROOT/templates/plugin-template"
PLUGINS_DIR="$REPO_ROOT/plugins"

echo "============================================================"
echo "    Criador de Plugins - Marcelo Plugins Marketplace        "
echo "============================================================"

# Recebe parâmetros ou pergunta interativamente
PLUGIN_NAME="$1"
PLUGIN_DISPLAY_NAME="$2"
PLUGIN_DESCRIPTION="$3"

if [ -z "$PLUGIN_NAME" ]; then
    read -rp "Identificador do plugin (slug em minúsculas, ex: git-guard): " PLUGIN_NAME
fi

# Sanitiza nome do plugin
PLUGIN_NAME=$(echo "$PLUGIN_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-_')

if [ -z "$PLUGIN_NAME" ]; then
    echo "Erro: O identificador do plugin não pode ser vazio."
    exit 1
fi

TARGET_DIR="$PLUGINS_DIR/$PLUGIN_NAME"

if [ -d "$TARGET_DIR" ]; then
    echo "Erro: O plugin '$PLUGIN_NAME' já existe em '$TARGET_DIR'."
    exit 1
fi

if [ -z "$PLUGIN_DISPLAY_NAME" ]; then
    read -rp "Nome de exibição (ex: Git Guard): " PLUGIN_DISPLAY_NAME
fi

if [ -z "$PLUGIN_DISPLAY_NAME" ]; then
    PLUGIN_DISPLAY_NAME="$PLUGIN_NAME"
fi

if [ -z "$PLUGIN_DESCRIPTION" ]; then
    read -rp "Descrição do plugin: " PLUGIN_DESCRIPTION
fi

if [ -z "$PLUGIN_DESCRIPTION" ]; then
    PLUGIN_DESCRIPTION="Plugin $PLUGIN_DISPLAY_NAME para automação de agentes de IA."
fi

echo ""
echo "Criando plugin:"
echo "  - Slug:        $PLUGIN_NAME"
echo "  - Nome:        $PLUGIN_DISPLAY_NAME"
echo "  - Descrição:   $PLUGIN_DESCRIPTION"
echo "  - Destino:     $TARGET_DIR"
echo ""

# Copia template
cp -r "$TEMPLATE_DIR" "$TARGET_DIR"

# Substitui variáveis nos arquivos clonados
find "$TARGET_DIR" -type f \( -name "*.json" -o -name "*.md" \) | while read -r file; do
    sed -i "s|{{PLUGIN_NAME}}|$PLUGIN_NAME|g" "$file"
    sed -i "s|{{PLUGIN_DISPLAY_NAME}}|$PLUGIN_DISPLAY_NAME|g" "$file"
    sed -i "s|{{PLUGIN_DESCRIPTION}}|$PLUGIN_DESCRIPTION|g" "$file"
done

echo "==> Estrutura de arquivos criada com sucesso!"

# Sincroniza os marketplaces
python3 "$REPO_ROOT/scripts/sync-marketplaces.py"

# Validação com agy se disponível
if command -v agy &>/dev/null; then
    echo ""
    echo "==> Validando plugin com Antigravity CLI (agy)..."
    agy plugin validate "$TARGET_DIR" || true
fi

echo ""
echo "============================================================"
echo "  Plugin '$PLUGIN_NAME' criado e registrado com sucesso!"
echo "============================================================"
echo "Edite os arquivos em: plugins/$PLUGIN_NAME/"
echo "  - Regras:       plugins/$PLUGIN_NAME/rules/AGENTS.md"
echo "  - Skills:       plugins/$PLUGIN_NAME/skills/"
echo "  - Comandos:     plugins/$PLUGIN_NAME/commands/"
echo "  - Agentes:      plugins/$PLUGIN_NAME/agents/"
echo "  - Servidores:   plugins/$PLUGIN_NAME/mcp_config.json"
echo "  - Hooks:        plugins/$PLUGIN_NAME/hooks.json"
echo ""
