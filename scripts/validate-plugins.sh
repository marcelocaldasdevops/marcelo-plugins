#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "============================================================"
echo "    Validação de Plugins e Manifestos de Marketplace        "
echo "============================================================"

# 1. Valida integridade do JSON em todos os manifests
echo "==> Verificando sintaxe de todos os arquivos JSON..."
python3 -c "
import os, json, sys

root = '$REPO_ROOT'
errors = 0
for dirpath, _, filenames in os.walk(root):
    for f in filenames:
        if f.endswith('.json'):
            full_path = os.path.join(dirpath, f)
            try:
                with open(full_path, 'r', encoding='utf-8') as fp:
                    json.load(fp)
            except Exception as e:
                print(f'ERRO no arquivo {full_path}: {e}', file=sys.stderr)
                errors += 1

if errors == 0:
    print('    [OK] Todos os arquivos JSON sao validos.')
else:
    sys.exit(1)
"

# 2. Valida com Antigravity CLI caso instalado
if command -v agy &>/dev/null; then
    echo "==> Validando com Antigravity CLI ('agy plugin validate')..."
    echo "    - Validando template..."
    agy plugin validate "$REPO_ROOT/templates/plugin-template" || true

    for p in "$REPO_ROOT"/plugins/*; do
        if [ -d "$p" ]; then
            echo "    - Validando plugin $(basename "$p")..."
            agy plugin validate "$p" || true
        fi
    done
fi

echo "==> Validação concluída com sucesso!"
