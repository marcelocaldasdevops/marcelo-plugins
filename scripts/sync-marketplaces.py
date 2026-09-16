#!/usr/bin/env python3
"""
sync-marketplaces.py
Varre o diretório 'plugins/', extrai os metadados de cada plugin e sincroniza
automaticamente todos os manifestos de marketplace (Claude Code, Cursor, Bithub,
Antigravity, Gemini) e o catálogo em README.md.
"""

import os
import json
import re

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PLUGINS_DIR = os.path.join(REPO_ROOT, "plugins")
MARKETPLACE_NAME = "marcelo-plugins"
OWNER_NAME = "Marcelo Caldas"
OWNER_URL = "https://github.com/marcelocaldasdevops"
REPO_URL = "https://github.com/marcelocaldasdevops/marcelo-plugins"

def load_json(path):
    if os.path.isfile(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Aviso: Erro ao ler {path}: {e}")
    return None

def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Atualizado: {os.path.relpath(path, REPO_ROOT)}")

def collect_plugins():
    plugins = []
    if not os.path.isdir(PLUGINS_DIR):
        return plugins

    for item in sorted(os.listdir(PLUGINS_DIR)):
        item_path = os.path.join(PLUGINS_DIR, item)
        if not os.path.isdir(item_path) or item.startswith("."):
            continue

        native_json = load_json(os.path.join(item_path, "plugin.json"))
        claude_json = load_json(os.path.join(item_path, ".claude-plugin", "plugin.json"))
        cursor_json = load_json(os.path.join(item_path, ".cursor-plugin", "plugin.json"))
        bithub_json = load_json(os.path.join(item_path, ".bithub-plugin", "plugin.json"))

        meta = {}
        for source in [native_json, claude_json, cursor_json, bithub_json]:
            if source:
                meta.update(source)

        name = meta.get("name", item)
        display_name = meta.get("displayName") or name.replace("-", " ").title()
        description = meta.get("description", "Sem descrição disponível.")
        version = meta.get("version", "1.0.0")
        category = meta.get("category", "developer-tools")
        keywords = meta.get("keywords", [name])

        plugin_data = {
            "name": name,
            "displayName": display_name,
            "description": description,
            "version": version,
            "category": category,
            "keywords": keywords,
            "dir": item,
            "source": f"./plugins/{item}",
            "homepage": f"{REPO_URL}/tree/main/plugins/{item}",
            "repository": REPO_URL
        }
        plugins.append(plugin_data)

    return plugins

def sync_registry(plugins):
    path = os.path.join(REPO_ROOT, "registry.json")
    data = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "name": MARKETPLACE_NAME,
        "displayName": "Marcelo Plugins Marketplace",
        "description": "Marketplace universal de plugins, extensões, skills, regras e MCPs para Antigravity, Cursor, Claude Code, Bithub e outros agentes de IA.",
        "owner": {
            "name": OWNER_NAME,
            "url": OWNER_URL
        },
        "repository": REPO_URL,
        "version": "1.0.0",
        "plugins": plugins
    }
    save_json(path, data)

def sync_claude(plugins):
    path = os.path.join(REPO_ROOT, ".claude-plugin", "marketplace.json")
    claude_plugins = []
    for p in plugins:
        claude_plugins.append({
            "name": p["name"],
            "source": p["source"],
            "description": p["description"],
            "version": p["version"],
            "author": {
                "name": OWNER_NAME,
                "url": OWNER_URL
            },
            "category": p["category"],
            "homepage": p["homepage"],
            "keywords": p["keywords"]
        })

    data = {
        "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
        "name": MARKETPLACE_NAME,
        "description": "Marketplace público de plugins para Claude Code, Antigravity, Cursor e Bithub por Marcelo Caldas.",
        "owner": {
            "name": OWNER_NAME,
            "url": OWNER_URL
        },
        "metadata": {
            "description": "Marketplace de plugins por Marcelo Caldas.",
            "version": "1.0.0",
            "pluginRoot": "plugins"
        },
        "plugins": claude_plugins
    }
    save_json(path, data)

def sync_cursor(plugins):
    path = os.path.join(REPO_ROOT, ".cursor-plugin", "marketplace.json")
    cursor_plugins = []
    for p in plugins:
        cursor_plugins.append({
            "name": p["name"],
            "source": p["source"],
            "description": p["description"]
        })

    data = {
        "name": MARKETPLACE_NAME,
        "owner": {
            "name": OWNER_NAME,
            "url": OWNER_URL
        },
        "metadata": {
            "description": "Marketplace de plugins para Cursor por Marcelo Caldas.",
            "version": "1.0.0"
        },
        "plugins": cursor_plugins
    }
    save_json(path, data)

def sync_bithub(plugins):
    path = os.path.join(REPO_ROOT, ".bithub-plugin", "marketplace.json")
    bithub_plugins = []
    for p in plugins:
        bithub_plugins.append({
            "name": p["name"],
            "displayName": p["displayName"],
            "description": p["description"],
            "version": p["version"],
            "category": p["category"],
            "repository": p["homepage"],
            "homepage": p["homepage"],
            "keywords": p["keywords"],
            "source": p["source"]
        })

    data = {
        "name": MARKETPLACE_NAME,
        "description": "Marketplace público de plugins para Bithub por Marcelo Caldas.",
        "owner": {
            "name": OWNER_NAME,
            "url": OWNER_URL
        },
        "metadata": {
            "description": "Marketplace de plugins por Marcelo Caldas.",
            "version": "1.0.0",
            "pluginRoot": "plugins"
        },
        "plugins": bithub_plugins
    }
    save_json(path, data)

def sync_antigravity(plugins):
    for subpath in [
        os.path.join(REPO_ROOT, ".antigravity", "marketplace.json"),
        os.path.join(REPO_ROOT, ".gemini-plugin", "marketplace.json")
    ]:
        data = {
            "name": MARKETPLACE_NAME,
            "description": "Marketplace público de plugins para Google Antigravity e Gemini por Marcelo Caldas.",
            "owner": {
                "name": OWNER_NAME,
                "url": OWNER_URL
            },
            "metadata": {
                "description": "Marketplace de plugins por Marcelo Caldas.",
                "version": "1.0.0",
                "pluginRoot": "plugins"
            },
            "plugins": plugins
        }
        save_json(subpath, data)

def sync_readme_table(plugins):
    readme_path = os.path.join(REPO_ROOT, "README.md")
    if not os.path.isfile(readme_path):
        return

    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()

    start_marker = "<!-- PLUGINS_TABLE_START -->"
    end_marker = "<!-- PLUGINS_TABLE_END -->"

    if start_marker not in content or end_marker not in content:
        return

    if not plugins:
        table = "*Nenhum plugin registrado ainda. Crie seu primeiro plugin com `./scripts/new-plugin.sh`.*"
    else:
        rows = [
            "| Plugin | Descrição | Versão | Diretório |",
            "| :--- | :--- | :--- | :--- |"
        ]
        for p in plugins:
            rows.append(f"| **[{p['displayName']}]({p['homepage']})** | {p['description']} | `{p['version']}` | [`plugins/{p['dir']}`](./plugins/{p['dir']}) |")
        table = "\n".join(rows)

    new_block = f"{start_marker}\n{table}\n{end_marker}"
    pattern = re.compile(rf"{re.escape(start_marker)}.*?{re.escape(end_marker)}", re.DOTALL)
    new_content = pattern.sub(new_block, content)

    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Atualizado: Tabela de plugins no README.md")

def main():
    print(f"==> Sincronizando marketplaces em '{REPO_ROOT}'...")
    plugins = collect_plugins()
    print(f"==> {len(plugins)} plugin(s) detectado(s).")
    sync_registry(plugins)
    sync_claude(plugins)
    sync_cursor(plugins)
    sync_bithub(plugins)
    sync_antigravity(plugins)
    sync_readme_table(plugins)
    print("==> Sincronização concluída com sucesso!")

if __name__ == "__main__":
    main()
