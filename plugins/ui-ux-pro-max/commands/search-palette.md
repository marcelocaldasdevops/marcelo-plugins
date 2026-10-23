---
description: Pesquisar paletas de cores harmônicas e regras cromáticas por nicho
argument-hint: <termo-de-busca>, ex: "healthcare calming" ou "cyberpunk dark"
---

Pesquise combinações de cores e regras cromáticas na base do **UI/UX Pro Max**:

1. Termo: **$ARGUMENTS**
2. Execute a busca no domínio de cores:
   ```bash
   python3 plugins/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "$ARGUMENTS" --domain color
   ```
3. Exiba:
   - Cores primárias, secundárias e de acento com código HEX.
   - Cores para superfícies, fundos e textos em modo claro e escuro.
   - Racional psicológico de cada cor e recomendações de contraste WCAG.
