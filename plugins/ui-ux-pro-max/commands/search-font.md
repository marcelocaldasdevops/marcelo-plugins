---
description: Pesquisar pares de fontes e combinações Google Fonts por tom e contexto
argument-hint: <termo-de-busca>, ex: "editorial luxury" ou "clean tech"
---

Pesquise pares tipográficos na base de dados do **UI/UX Pro Max**:

1. Termo: **$ARGUMENTS**
2. Execute a busca no domínio de tipografia:
   ```bash
   python3 plugins/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "$ARGUMENTS" --domain typography
   ```
3. Exiba:
   - Famílias para Títulos (Heading) e Texto Corrido (Body).
   - Tom e humor transmitidos pela combinação.
   - Link de importação direta do Google Fonts.
   - Recomendações de escala e pesos (font-weight).
