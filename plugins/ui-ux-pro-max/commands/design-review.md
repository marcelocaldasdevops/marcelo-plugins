---
description: Executar auditoria de 7 fases de acessibilidade (WCAG AA), contraste, responsividade e estados de UI
argument-hint: [url-ou-arquivo] [foco opcional, ex: "fluxo de checkout" ou "menu mobile"]
---

Execute a auditoria de qualidade de UI/UX em 7 fases:

Alvo: **$1**
Foco: **$2**

Se nenhuma URL ou arquivo for fornecido, solicite a URL do servidor local de desenvolvimento (ex.: `http://localhost:3000`) ou o caminho de um componente/arquivo HTML.

### As 7 Fases da Auditoria:
1. **Fase 0 - Configuração e Baseline**: Inspecione a página e capture mensagens de erro no console ou falhas de carregamento.
2. **Fase 1 - Interação e Estados**: Teste botões, inputs, abas e modais. Verifique se existem estados distintos para `hover`, `focus-visible`, `active`, `disabled` e `loading`. Verifique a presença de `cursor-pointer`.
3. **Fase 2 - Acessibilidade e Contraste**: Valide WCAG 2.1 AA. Texto com contraste >= 4.5:1 (>= 3:1 para headings). Foco de navegação por teclado visível. Sem ícones de emoji em controles estruturais.
4. **Fase 3 - Responsividade**: Valide nas resoluções 375px (mobile), 768px (tablet), 1024px e 1440px (desktop). Certifique-se de que não haja scroll horizontal indesejado nem quebras de palavras feias.
5. **Fase 4 - Tipografia e Hierarquia**: Cheque tamanhos, line-height, alinhamento à esquerda de textos longos e consistência das famílias tipográficas.
6. **Fase 5 - Cores e Consistência**: Teste a harmonia visual em Modo Claro e Modo Escuro. Verifique se as bordas e divisores continuam visíveis.
7. **Fase 6 - Movimento e Redução**: Verifique se as animações duram entre 150ms e 300ms e se `@media (prefers-reduced-motion)` é respeitado.

Retorne uma lista priorizada de correções: **[Bloqueador]**, **[Alta]**, **[Média]** e **[Melhoria]**.
