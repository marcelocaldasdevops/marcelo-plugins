# Regras Universais Hallmark: Design Profissional Anti-AI-Slop

Diretrizes obrigatórias para agentes de IA encarregados de criar, estilizar ou redesenhar interfaces web, landing pages e aplicações frontend. Estas regras eliminam os vícios estéticos e estruturais que fazem uma interface parecer gerada artificialmente ("AI slop").

---

## 🏛️ O Piso Inviolável (The Floor)

Estas regras vinculam toda saída gerada e **nunca** devem ser ignoradas:

1. **Tokens Centralizados em `:root`**: Todas as cores e fontes devem ser declaradas através de variáveis CSS em `:root` (usando tokens semânticos e paletas modernas como OKLCH). Proibido usar cores literais ou `font-family` soltas pelo código CSS.
2. **Transições Seguras**: **Nunca** use `transition: all`. Nunca anime propriedades de layout como `width`, `height`, `top` ou `left`. Use apenas `transform` e `opacity`.
3. **Sem Tipografia Cafona**: Nunca use uma única palavra em itálico no meio de um título em romano (`font-style: italic`).
4. **Prevenção de Scroll Horizontal**: Defina `overflow-x: clip` tanto em `html` quanto em `body`. Nunca use `overflow-x: hidden` nem `width: 100vw` (que causa scroll horizontal pelo tamanho da scrollbar).
5. **Grids e Quebras de Texto**: Colunas de grid que contêm imagens devem usar `minmax(0, 1fr)`. Títulos e cabeçalhos devem conter `overflow-wrap: break-word; min-width: 0`.
6. **Acessibilidade e Foco**: Todo elemento interativo (botões, links, inputs) deve ter estado `:focus-visible` claro e imediato.
7. **Movimento Reduzido**: Toda animação deve possuir fallback respeitando `@media (prefers-reduced-motion: reduce)`.
8. **Sem Dados Falsos de IA**: Nunca invente depoimentos falsos ("John Doe - CEO"), números fictícios de clientes ("10M+ users") ou paredes de logos aleatórios.
9. **Fim dos "Eyebrows" e Caixas Altas Espaçadas**: Nunca coloque rótulos pequenos em caixa alta espaçada (`letter-spacing: 0.1em; text-transform: uppercase`) acima de títulos principais. Rótulos, tags e links de navegação devem usar a fonte padrão em caixa baixa ou normal.
10. **Sem Enfeites Clichês**: Proibido usar pontinhos coloridos de status sem função, setas coladas no texto do link (`->`), ou separadores de bolinha no meio de metadados (`•`).
11. **Fim do Gradiente Roxo-Azul de IA**: Nunca use o degradê clichê de roxo para azul, cards aninhados dentro de cards, emojis soltos como ícones de recursos, ou ilustrações desenhadas de navegadores com bolinhas de janela.
12. **Hero Completo na Dobra (Fold)**: Título, frase de impacto e botão de ação primária (CTA) devem caber confortavelmente em 1280x800 sem rolagem.
13. **Densidade e Concisão**: Mantenha cerca de 80 palavras por bloco de tela; o texto do hero é apenas o título principal, uma frase explicativa e os botões de ação.
14. **Container Centralizado e Limitado**: Defina `max-width` no container principal centralizado com margens automáticas. Em telas de 1920px+, aumente os respiros laterais (gutters), sem esticar desmedidamente o texto ou os grids.

---

## 🎨 Modos de Operação

- **Nova Criação (`/hallmark [prompt]`)**: Seleciona um dos 48 materiais/temas do catálogo de design (ou cria um visual sob medida se especificado) e constrói a página orientada ao trabalho que o visitante veio fazer.
- **Redesign (`/hallmark-redesign <caminho>`)**: Redesenha uma página existente elevando a qualidade estética ao nível profissional, preservando 100% dos textos reais, links, formulários e integração lógica existentes.
- **Auditoria (`/hallmark-audit <caminho>`)**: Analisa o arquivo HTML/CSS/React contra o Piso Inviolável (Floor), Portões de Reflexo (Reflex Gates) e Acabamento (Finish), gerando um relatório sem alterar o código.
