---
description: Gerar um Design System completo (tokens, paleta, tipografia, regras de UX) para um projeto
argument-hint: <nome-do-projeto> [palavras-chave do nicho] [--persist]
---

Gere uma especificação de Design System estruturada utilizando o motor de raciocínio do **UI/UX Pro Max**:

1. Analise o projeto e contexto fornecidos: **$ARGUMENTS**
2. Execute o gerador de design system:
   ```bash
   python3 plugins/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "$ARGUMENTS" --design-system -p "AppDesignSystem"
   ```
3. Se o usuário solicitou salvar ou persistir (`--persist`), adicione o parâmetro para gravar o arquivo em `design-system/<slug>/MASTER.md`.
4. Apresente os tokens extraídos:
   - Padrão de layout e seções recomendadas.
   - Paleta de cores com hexadecimais (Primary, Secondary, Accent, Background, Surface, Text).
   - Pares tipográficos do Google Fonts (Headings e Body).
   - Efeitos visuais e sombras recomendadas.
   - Lista de anti-patterns específicos do nicho que devem ser evitados.
   - Checklist pré-entrega de validação visual.
