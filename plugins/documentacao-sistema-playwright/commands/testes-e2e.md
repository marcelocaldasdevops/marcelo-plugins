---
description: Executa testes E2E com Playwright sobre as alterações da branch atual (ou implementação informada), captura prints padronizados, verifica erros de console/rede e gera relatório em docs/testes/<branch>/relatorio-testes.md.
---

Por favor, execute a skill `testes-e2e-playwright` para identificar o escopo das alterações da branch atual (ou da implementação informada nesta chamada), escrever os cenários em formato Dado/Quando/Então (caminho feliz, validações e erros), executá-los passo a passo no navegador com Playwright capturando prints padronizados (`cenario-XX-passo-YY.png`), monitorar erros de console/rede (4xx/5xx) e gerar o relatório completo em `./docs/testes/<slug-da-branch>/relatorio-testes.md`.
