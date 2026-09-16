# Diretrizes Vercel Agent Skills

Instruções e boas práticas para agentes de IA atuando em projetos baseados no ecossistema Vercel, Next.js, React e Web Standards.

---

## 🧭 Visão Geral
Este plugin fornece um conjunto completo de habilidades (skills) desenvolvidas e mantidas pela Vercel para estender as capacidades de agentes em:
1. **Deploy e Configuração**: Publicação automatizada, tokens de CLI e verificações pré-deploy.
2. **Otimização de Performance**: Diagnóstico de rotas, cache, Core Web Vitals e bundle size.
3. **Padrões de Arquitetura React & Next.js**: Padrões de composição, App Router, React 19, hooks e View Transitions.
4. **React Native**: Boas práticas de componentes, animações Reanimated e desempenho em listas.
5. **Design e Redação**: Diretrizes de web design, acessibilidade e redação técnica.

---

## ⚡ Skills Disponíveis e Quando Usar

- **`deploy-to-vercel`**: Execute quando solicitado para realizar deploy de uma aplicação na Vercel ou inspecionar status de build/deployment.
- **`vercel-optimize`**: Utilize para auditar projetos Next.js/Vercel buscando melhorias de performance, cache e uso de recursos.
- **`vercel-cli-with-tokens`**: Use quando interagir com a CLI da Vercel via autenticação por tokens ou variáveis de ambiente.
- **`react-best-practices`**: Aplique ao escrever ou refatorar componentes React, Server Components e hooks.
- **`react-native-skills`**: Utilize para desenvolvimento mobile com React Native e Expo.
- **`react-view-transitions`**: Aplique para animações fluidas de transição de tela usando a View Transitions API nativa e React.
- **`composition-patterns`**: Consulte para desenhar arquiteturas de componentes com composição limpa, evitando props-drilling e boolean flags excessivas.
- **`web-design-guidelines`**: Siga ao criar interfaces de usuário, layouts responsivos, paletas e componentes acessíveis.
- **`writing-guidelines`**: Aplique em documentações, mensagens para usuários e microcópia de interfaces.

---

## 📏 Princípios Gerais de Desenvolvimento
- Prefira Server Components por padrão no Next.js App Router, utilizando Client Components (`'use client'`) apenas quando necessário estado ou efeitos interativos.
- Mantenha funções e componentes limpos, modularizados e com tipagem estrita via TypeScript.
- Respeite o padrão de progressive disclosure: acesse referências e documentações auxiliares conforme demanda.
