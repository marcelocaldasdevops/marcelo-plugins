# Regras Universais: UI/UX Pro Max (Design Intelligence)

Diretrizes obrigatórias para agentes de IA encarregados de arquitetar, desenhar, implementar, refatorar ou auditar interfaces visuais (Web, Mobile e Desktop).

---

## 🎯 Princípios Fundamentais de Qualidade Visual

Sempre que atuar no desenvolvimento ou revisão de componentes, páginas ou sistemas de design:

1. **Ícones Vetoriais e Tipografia Estrutural**:
   - **Proibido usar Emojis como ícones de interface**: Nunca use emojis (🎨, ⚙️, 🚀, 🔍) para navegação, botões ou ações do sistema. Use ícones vetoriais consistentes (Lucide, Heroicons, Phosphor Icons ou SVGs inline).
   - Emojis são permitidos apenas como conteúdo textual fornecido pelo usuário ou ilustrações contextuais de mensagens informais.
   - Mantenha a espessura do traço (*stroke width*) consistente em toda a aplicação (ex.: 1.5px ou 2px).

2. **Acessibilidade e Contraste (WCAG 2.1 AA)**:
   - **Texto normal**: Razão mínima de contraste de **4.5:1** contra o fundo em modo claro e escuro.
   - **Texto grande / títulos** (>=18pt ou >=14pt bold): Razão mínima de **3.0:1**.
   - **Componentes interativos e bordas ativas**: Mínimo de **3.0:1** em relação a superfícies adjacentes.
   - **Foco visível**: Garanta contorno de foco claro (`focus-visible:ring-2`) para navegação por teclado.
   - **Motion accessibility**: Sempre respeite `@media (prefers-reduced-motion: reduce)`. Animações decorativas devem ser desativadas ou simplificadas.

3. **Interação e Microestados**:
   - **Cursor**: Adicione `cursor-pointer` explicitamente a todos os elementos clicáveis (botões, links, cards interativos, seletores).
   - **Estados completos**: Todo elemento interativo deve ter estilos declarados para `hover`, `focus-visible`, `active`, `disabled` e `loading`.
   - **Sem saltos de layout (*Layout Shift*)**: Estados de hover/press não devem alterar `border-width` ou `font-weight` que desloquem elementos vizinhos. Prefira `outline`, `box-shadow` ou opacidade.

4. **Escala de Espaçamento e Ritmo**:
   - Utilize a escala modular baseada em **4px / 8px** (ex.: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px).
   - Evite valores mágicos ou arbitrários (ex.: `padding: 17px; margin-top: 23px`).

5. **Anti-Patterns de IA a Evitar**:
   - Não aplique gradientes genéricos de roxo/rosa/azul neon a menos que solicitado pela marca.
   - Evite "dark mode cinza chumbo" sem contraste hierárquico entre camadas (background vs. card vs. popover).
   - Não crie layouts estáticos sem planejar quebras responsivas (375px, 768px, 1024px, 1440px).

---

## 🧭 Ordem de Prioridade na Tomada de Decisão (1 a 10)

Ao criar ou revisar interfaces, resolva as decisões seguindo rigorosamente esta sequência:

| Prioridade | Categoria | Foco Obrigatório | Evitar Absolutamente |
| :---: | :--- | :--- | :--- |
| **1** | **Acessibilidade** | Contraste >= 4.5:1, foco por teclado, labels em inputs, reduced-motion | Textos cinzas apagados, inputs sem label |
| **2** | **Hierarquia & Layout** | Grid responsivo, alinhamento visual, fluxo de leitura claro (Z/F pattern) | Telas sobrecarregadas sem ponto focal |
| **3** | **Design System & Tokens** | Uso estrito de tokens semânticos (`--primary`, `--background`, `--card`) | Cores hexadecimais arbitrárias dispersas no código |
| **4** | **Estados de Interação** | Hover, active, disabled, loading, empty states, error states | Botões sem feedback de clique ou carregamento |
| **5** | **Tipografia** | Máximo 2 famílias tipográficas, escala de tamanhos e alturas de linha legíveis | Mais de 3 famílias de fontes, line-height colado |
| **6** | **Cores & Paleta** | 60-30-10 rule (dominante, secundária, acento), contraste semântico | Uso desregrado de cores saturadas em excesso |
| **7** | **Espaçamento** | Sistema de 8dp, respiração entre seções, densidade coerente com o nicho | Elementos colados, margens inconsistentes |
| **8** | **Responsividade** | Mobile-first ou adaptação fluida (375px a 1440px+), safe-areas | Scroll horizontal indesejado, texto quebrando palavras |
| **9** | **Movimento & Animação** | Transições rápidas e orgânicas (150ms-300ms, ease-out) | Animações lentas (>500ms) que atrasam o usuário |
| **10** | **Polimento Visual** | Cantos arredondados consistentes, sombras sutis, micro-detalhes | Sombras pesadas e pretas, raios de borda discordantes |

---

## ⚡ Integração com os Scripts do Plugin

O plugin possui um motor autossuficiente de pesquisa e recomendação em Python (sem dependências externas):

```bash
# Geração de Design System completo para um projeto
python3 plugins/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "fintech dashboard trustworthy" --design-system -p "FinFlow"

# Busca de estilo por nicho
python3 plugins/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "saas landing" --domain style

# Busca de paleta de cores
python3 plugins/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "health wellness" --domain color

# Busca de pares de fontes Google Fonts
python3 plugins/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "luxury modern" --domain typography

# Recomendações específicas para um framework/stack
python3 plugins/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "performance" --stack nextjs
```

---

## 🧪 Checklist Pré-Entrega de UI

Antes de finalizar qualquer tarefa de front-end:
- [ ] Nenhum emoji utilizado como ícone de controle.
- [ ] `cursor-pointer` presente em todos os elementos interativos.
- [ ] Contraste de texto aprovado (>= 4.5:1 para body, >= 3:1 para headings).
- [ ] Foco de teclado visível ao navegar via tecla `Tab`.
- [ ] Modo escuro e claro testados e legíveis em ambas as superfícies.
- [ ] Respeito a `prefers-reduced-motion` em transições CSS/JS.
- [ ] Layout testado em 375px (mobile) e 1440px (desktop) sem overflow lateral.
