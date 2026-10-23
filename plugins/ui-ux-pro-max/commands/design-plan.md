---
description: Planejar tokens, estilo e assinatura visual antes de iniciar a codificação do front-end
argument-hint: <produto/nicho + estilo>, ex: "fintech dashboard trustworthy data-dense"
---

Antes de escrever qualquer linha de HTML, JSX ou CSS, planeje o sistema visual para: **$ARGUMENTS**

1. Execute o gerador de design system para obter estilo + cores + fontes + regras de UX:
   ```bash
   python3 plugins/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "$ARGUMENTS" --design-system -p "Plan"
   ```

2. Busque especificidades adicionais se o briefing exigir:
   - Cores / semântica: `python3 plugins/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "$ARGUMENTS" --domain color`
   - Tipografia / Google Fonts: `python3 plugins/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "$ARGUMENTS" --domain typography`
   - Diretrizes de UX: `python3 plugins/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "$ARGUMENTS" --domain ux`

3. Defina os 4 pilares antes de codificar:
   - **Objetivo & Tom**: Qual é a emoção e clareza necessária (ex: confiança técnica, sofisticação serena)?
   - **Assinatura Visual Única**: Um detalhe de design distintivo (ex.: borda sutil com acento coral, layout bento box assimétrico).
   - **Bloco de Tokens**: 4-6 cores com nomes, 2 papéis tipográficos, escala de espaçamento de 8dp.
   - **Restrições**: Anti-patterns que não devem aparecer (evitar gradientes genéricos de IA, cores sem contraste).

Não inicie a codificação até que os tokens e a assinatura visual estejam alinhados.
