---
description: Consultar inteligência de design UI/UX (estilos, paletas, tipografia e diretrizes)
argument-hint: [termo-de-busca] [opcional: --domain <tipo>] [opcional: --stack <framework>]
---

Consulte a base de conhecimento de design do **UI/UX Pro Max**:

1. Analise os termos fornecidos: **$ARGUMENTS**
2. Se nenhum argumento for passado, solicite o nicho do produto (ex.: "saas b2b", "e-commerce moda", "dashboard financeiro") e a stack (ex.: React, Next.js, Flutter).
3. Execute a busca no motor local:
   ```bash
   python3 plugins/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "$ARGUMENTS"
   ```
4. Apresente os estilos recomendados, paleta de cores primária e secundária, tipografia e os anti-patterns a serem evitados para o nicho em questão.
