---
name: testes-e2e-playwright
description: >-
  Executa testes E2E automatizados com Playwright a partir do diff da branch atual
  ou de uma implementação informada: identifica telas e fluxos afetados, elabora
  cenários Dado/Quando/Então (caminho feliz, validações e casos de erro), executa
  passo a passo no navegador capturando prints padronizados, monitora console,
  requisições de rede (4xx/5xx) e exceções não tratadas, gera relatório completo
  em docs/testes/<nome-da-branch>/relatorio-testes.md e aciona automaticamente a
  skill relatorio-pdf-playwright para gerar relatorio-testes.pdf. Use quando o
  usuário pedir para testar as alterações da branch, rodar testes E2E, validar um
  fluxo/PR no navegador ou gerar evidências de teste com Playwright.
license: MIT
metadata:
  author: Marcelo Caldas
  version: "1.1"
---

# Testes E2E de Branch / Implementação com Playwright 🧪

Esta skill testa ponta a ponta (E2E) todo o fluxo das alterações presentes na **branch atual** (ou de uma **implementação indicada na chamada**), monitora erros em tempo real no navegador e gera um documento completo de evidências e diagnóstico em Markdown:

- **Escopo orientado a código**: identifica telas, rotas e fluxos afetados pelo diff ou pela funcionalidade informada.
- **Cenários estruturados (`Dado / Quando / Então`)**: cobre caminho feliz, validações e casos de erro relevantes.
- **Execução real com Playwright**: valida cada passo no navegador reutilizando a configuração e sessão do plugin.
- **Evidências padronizadas**: prints salvos em `./docs/testes/<slug-da-branch>/screenshots/cenario-XX-passo-YY.png` (e sufixo `-erro.png` em falhas).
- **Monitoramento contínuo**: detecta erros de console, exceções não tratadas (`pageerror`), falhas HTTP (`4xx`/`5xx`) e divergências visuais/funcionais.
- **Relatório completo (Markdown + PDF)**: gera `./docs/testes/<slug-da-branch>/relatorio-testes.md` com diagnóstico de causa provável, sugestão de correção e resumo executivo, e aciona automaticamente a skill `relatorio-pdf-playwright` para gerar `./docs/testes/<slug-da-branch>/relatorio-testes.pdf`.

---

## 🎯 Compatibilidade Universal

Funciona de forma agnóstica a stack web:
- **SPAs e SSR**: Next.js, React, Vue, Nuxt, Angular, Svelte.
- **MPAs e Monolitos**: Django, Rails, Laravel, ASP.NET, Spring Boot.
- **Portais, Checkout e Dashboards**: sistemas autenticados, formulários multi-etapas, CRUDs e APIs REST/GraphQL.

---

## 📥 Entradas Esperadas e Detecção Automática

Antes de iniciar os testes, resolva automaticamente o máximo de informações do ambiente e só pergunte ao usuário o que não puder ser inferido:

1. **Escopo do Teste**:
   - *Padrão (sem escopo explícito)*: analisa o diff da branch atual em relação à branch base (`main`, `master` ou `develop`) + alterações não comitadas no working tree.
   - *Implementação informada na chamada*: foca nos fluxos, telas, rotas ou arquivos especificados pelo usuário (ex.: *"teste o fluxo de cadastro de clientes"* ou *"valide a tela `/checkout`"*).
2. **URL Base da Aplicação**:
   - Verifique primeiro se há servidor local ativo (ex.: `http://localhost:3000`, `5173`, `4200`, `8000`, `8080`) ou URL informada pelo usuário.
   - Caso nenhum servidor esteja rodando e não haja URL informada, pergunte a URL ou se deve iniciar o servidor de desenvolvimento.
3. **Autenticação**:
   - Reutilize a sessão/cookies já aberta no Playwright (ou `storageState`) sempre que disponível.
   - Se o fluxo exigir login e não houver sessão ativa, solicite credenciais temporárias de teste ao usuário sem nunca gravá-las em disco, logs ou prints.
4. **Diretório de Saída**:
   - Padrão: `./docs/testes/<slug-da-branch>/` (ou `./docs/testes/<slug-da-implementacao>/` quando estiver em `main`/`HEAD` destacado sem branch dedicada).
   - Arquivo principal: `./docs/testes/<slug-da-branch>/relatorio-testes.md`.
   - Prints: `./docs/testes/<slug-da-branch>/screenshots/`.

---

## 🔄 Fluxo de Execução em 7 Etapas

```text
[1. Escopo: Git Diff / Prompt] ➔ [2. Cenários Dado/Quando/Então] ➔ [3. Execução no Playwright]
                                                                              │
                                                                              ▼
[7. Resumo & Recomendações] ◄── [6. Relatório relatorio-testes.md] ◄── [4. Prints + 5. Erros]
```

### Etapa 1 — Identificar o Escopo das Alterações

#### Modo A: Análise da Branch Atual (Padrão)
Execute os comandos Git para descobrir a branch, a base e todo o diff relevante:

```bash
# 1. Branch atual e último commit
git branch --show-current
git rev-parse --short HEAD

# 2. Detectar branch base existente (main, master ou develop)
git show-ref --verify --quiet refs/heads/main && BASE=main || \
  (git show-ref --verify --quiet refs/heads/master && BASE=master || BASE=develop)

# 3. Listar arquivos alterados na branch + working tree
git diff --name-status "${BASE}...HEAD"
git status --short

# 4. Inspecionar diff detalhado
git diff "${BASE}...HEAD"
git diff
```

Com base nos arquivos alterados, mapeie:
- **Rotas / Telas afetadas**: páginas (`app/**/page.*`, `pages/**/*`, `views/**`, `routes/**`, templates).
- **Componentes e UI impactados**: formulários, botões, modais, tabelas, estados de erro/carregamento.
- **Regras de negócio e APIs**: schemas de validação, endpoints, handlers, queries e mutations consumidas pelo frontend.
- **Fluxos de ponta a ponta**: jornadas completas de usuário que atravessam os arquivos alterados.

#### Modo B: Implementação Informada na Chamada
Quando o usuário especificar o alvo diretamente (ex.: *"teste a funcionalidade de reset de senha"*):
1. Localize no código-fonte as rotas, componentes, validações e endpoints ligados à implementação informada.
2. Liste explicitamente as telas, arquivos e fluxos mapeados para compor o cabeçalho do relatório.

---

### Etapa 2 — Descrever os Cenários (`Dado / Quando / Então`)

Para **cada fluxo afetado**, redija cenários numerados (`Cenário 01`, `Cenário 02`, ...) no formato Gherkin em português, garantindo cobertura das 3 categorias sempre que aplicáveis:

1. **Caminho Feliz (`caminho-feliz`)**: fluxo principal concluído com sucesso do início ao fim, verificando persistência/feedback visual esperado.
2. **Validações (`validacao`)**: campos obrigatórios vazios, formatos inválidos, limites de tamanho/valor, regras condicionais e estados de botão/mensagens inline.
3. **Casos de Erro / Borda (`erro`)**: acessos sem permissão, dados duplicados, registros inexistentes, estados vazios ou falhas de integração relevantes à alteração.

Exemplo de especificação por cenário:
```markdown
- **Dado** que o usuário autenticado acessa `/pedidos/novo`
- **Quando** preenche cliente, adiciona um item válido e clica em "Salvar pedido"
- **Então** o sistema retorna sucesso, exibe a mensagem de confirmação e redireciona para o detalhe do pedido criado sem erros no console ou na rede
```

> **Atenção em cenários negativos**: quando um cenário testa propositalmente uma resposta `400`, `401`, `403` ou `422` da API (ex.: e-mail já cadastrado), registre explicitamente qual status HTTP é **esperado** no cenário — assim ele só falha se a aplicação não tratar o erro na UI ou disparar erro `5xx`/exceção JS inesperada.

---

### Etapa 3 — Executar Passo a Passo com Playwright

Reaproveite sempre a configuração do Playwright já existente no plugin:
- **Viewport padrão**: `1440×900` (e teste mobile `375×812` adicional apenas se o diff alterar responsividade/layout mobile).
- **Estabilidade**: aguarde carregamento da página/rede (`networkidle` ou elemento-chave visível) antes de interagir e antes de capturar cada print.
- **Sessão**: reutilize cookies/contexto já autenticados no Playwright ou `--storage-state`.

#### Modo 1 — Agente Interativo via Ferramentas MCP do Playwright (Preferencial)
Ideal para execução guiada passo a passo com inspeção dinâmica do DOM:
1. `browser_resize`: garanta viewport `1440×900` quando iniciar nova sessão.
2. `browser_navigate`: acesse a rota inicial do cenário.
3. `browser_snapshot`: inspecione a árvore de acessibilidade para localizar elementos com segurança.
4. `browser_take_screenshot`: capture o estado inicial (`cenario-01-passo-01.png`).
5. `browser_fill_form` / `browser_type` / `browser_click` / `browser_select_option` / `browser_press_key` / `browser_hover`: execute cada ação do cenário.
6. `browser_wait_for`: aguarde resposta da UI (mensagem, redirecionamento, tabela atualizada).
7. `browser_take_screenshot`: capture ações importantes e resultado final (`cenario-01-passo-02.png`, `cenario-01-passo-03.png`).
8. `browser_console_messages` e `browser_network_requests`: colete erros de console e respostas HTTP `4xx`/`5xx` ocorridos durante o cenário.
9. `browser_evaluate`: use quando precisar validar estado de DOM, atributos, contagem de linhas ou mensagens específicas.

#### Modo 2 — Script Automatizado (`scripts/e2e-runner.mjs`)
Para baterias reproduzíveis ou quando preferir execução programática direta em Node.js usando a configuração compartilhada em [lib/playwright-config.mjs](../../lib/playwright-config.mjs):

```bash
node plugins/documentacao-sistema-playwright/skills/testes-e2e-playwright/scripts/e2e-runner.mjs \
  --url "http://localhost:3000" \
  --plan "./plano-e2e.json" \
  --out "./docs/testes/<slug-da-branch>"
```

**Argumentos suportados pelo `e2e-runner.mjs`**:
- `--url <url>`: URL base da aplicação (obrigatório caso não esteja em `plan.baseUrl`).
- `--plan <arquivo.json>`: caminho para o plano JSON de cenários (formato detalhado em [references/report-template.md](./references/report-template.md)).
- `--out <dir>`: diretório de saída (padrão: `./docs/testes/<slug-da-branch>`).
- `--branch <nome>`: sobrescreve o nome da branch/escopo no relatório.
- `--base <branch-base>`: sobrescreve a branch base exibida no resumo.
- `--storage-state <arquivo.json>`: reaproveita cookies/sessão autenticada do Playwright.
- `--headless <true|false>` / `--headed`: executa com ou sem interface gráfica (padrão: `true`).
- `--timeout <ms>`: timeout padrão de navegação (padrão: `30000`).
- `--no-pdf`: desativa a geração automática de `relatorio-testes.pdf` ao final (padrão: PDF habilitado).

---

### Etapa 4 — Capturar Prints com Nomenclatura Padronizada

Salve todas as capturas em `./docs/testes/<slug-da-branch>/screenshots/` seguindo rigorosamente o padrão com zero à esquerda (`01`, `02`, ...):

| Momento da Captura | Padrão de Nome do Arquivo | Exemplo |
| :--- | :--- | :--- |
| Estado inicial da tela | `cenario-XX-passo-01.png` | `cenario-01-passo-01.png` |
| Ação / preenchimento / interação relevante | `cenario-XX-passo-YY.png` | `cenario-01-passo-02.png` |
| Resultado final após ação | `cenario-XX-passo-ZZ.png` | `cenario-01-passo-03.png` |
| Falha / erro / estado inesperado | `cenario-XX-passo-YY-erro.png` | `cenario-02-passo-02-erro.png` |

Regras de captura:
- Use links relativos `./screenshots/<arquivo>.png` no Markdown para renderização correta no GitHub, GitLab e editores locais.
- Prefira `fullPage: true` no estado inicial, resultado final e capturas de erro (garante visibilidade de banners, toasts e rodapés).
- Se ocorrer erro inesperado em qualquer passo, capture o print `-erro.png` **imediatamente** antes de navegar para o próximo cenário.

---

### Etapa 5 — Verificar e Classificar Erros

Em **todos os passos** de **todos os cenários**, audite simultaneamente 4 dimensões:

1. **Console do Navegador**: qualquer `console.error` (e `console.warn` críticos como falhas de hidratação React/Vue, chaves duplicadas graves ou deprecações quebrando fluxo).
2. **Exceções Não Tratadas (`pageerror`)**: `TypeError`, `ReferenceError`, `ChunkLoadError`, rejeições de Promise não capturadas.
3. **Rede / HTTP (`4xx` / `5xx` e `requestfailed`)**: respostas `400–499` inesperadas, qualquer `500–599`, falhas de CORS, DNS ou timeout de API.
4. **Divergência Funcional ou Visual**: texto/status diferente do esperado na cláusula `Então`, redirecionamento errado, botão travado em loading, elemento quebrado ou invisível.

**Critério de aprovação do cenário**:
- ✅ **Passou**: todos os passos concluídos, cláusula `Então` confirmada na UI e **nenhum** erro inesperado de console, exceção ou HTTP `4xx`/`5xx`.
- ❌ **Falhou**: qualquer asserção funcional falhou **ou** houve `pageerror`, `console.error` ou HTTP `4xx`/`5xx` não esperado — mesmo que a interface pareça ter funcionado visualmente.

Para **cada erro encontrado**, investigue o código alterado no diff e documente obrigatoriamente os 6 itens:
1. **O que aconteceu** (descrição clara e objetiva);
2. **Em qual cenário e passo** ocorreu;
3. **Mensagem / Log capturado** (console, stack trace ou método/URL/status/corpo HTTP sanitizado);
4. **Print do momento do erro** incorporado (`![Erro](./screenshots/cenario-XX-passo-YY-erro.png)`);
5. **Causa provável** (correlacionando com os arquivos modificados no diff sempre que possível);
6. **Sugestão de correção** (ajuste técnico objetivo indicando arquivo/camada provável).

---

### Etapa 6 — Gerar o Documento de Teste (`relatorio-testes.md`)

Consulte o template completo e as diretrizes detalhadas de formatação em **[references/report-template.md](./references/report-template.md)** antes de escrever o arquivo final.

Estrutura obrigatória de `./docs/testes/<slug-da-branch>/relatorio-testes.md`:
1. **Cabeçalho** com branch/implementação testada, branch base, commit, URL base, data/hora e status consolidado.
2. **Resumo da Branch / Implementação Testada** (arquivos alterados, telas e fluxos impactados).
3. **Menu Navegável** com âncoras HTML (`<a id="..."></a>`) para resumo, cada cenário, erros encontrados e conclusão.
4. **Sumário Executivo de Cenários** (tabela Markdown com `#`, `Cenário`, `Fluxo`, `Tipo`, `Status` ✅/❌, `Prints` e `Erros`).
5. **Detalhamento dos Cenários** (Dado/Quando/Então + tabela de passos + prints incorporados em cada cenário).
6. **Erros Encontrados e Diagnóstico** (todos os 6 campos obrigatórios para cada erro, ou declaração explícita de zero erros encontrados).
7. **Conclusão e Recomendações** (Etapa 7).

Salve também `./docs/testes/<slug-da-branch>/evidencias.json` (quando executado via script ou sempre que útil para rastreabilidade) contendo a telemetria sanitizada da execução.

### Handoff Automático — Gerar PDF (`relatorio-pdf-playwright`)

Assim que `./docs/testes/<slug-da-branch>/relatorio-testes.md` estiver salvo e validado (a menos que o usuário tenha pedido explicitamente apenas Markdown), **acione imediatamente a skill `relatorio-pdf-playwright`** executando o gerador compartilhado para produzir `./docs/testes/<slug-da-branch>/relatorio-testes.pdf` na mesma pasta:

```bash
node plugins/documentacao-sistema-playwright/skills/relatorio-pdf-playwright/scripts/pdf-runner.mjs \
  --input "./docs/testes/<slug-da-branch>/relatorio-testes.md"
```

- No **Modo CLI (`e2e-runner.mjs`)**, essa exportação já ocorre automaticamente ao final via [lib/pdf-renderer.mjs](../../lib/pdf-renderer.mjs) (use `--no-pdf` apenas se desejar pular).
- Se o Chromium do Playwright não estiver disponível no Node CLI, o gerador produzirá automaticamente o fallback `./docs/testes/<slug-da-branch>/relatorio-testes.print.html` autocontido para impressão A4.

---

### Etapa 7 — Concluir com Resumo Executivo

Finalize o relatório (e a resposta ao usuário no chat) apresentando:
- **Total de cenários executados**, quantos **passaram (✅)** e quantos **falharam (❌)** com percentual de aprovação.
- **Saúde técnica**: total de erros de console, exceções `pageerror` e falhas HTTP (`4xx`/`5xx`).
- **Artefatos gerados**: caminhos de `relatorio-testes.md`, `relatorio-testes.pdf` (ou `.print.html` em fallback) e pasta `screenshots/`.
- **Parecer de prontidão**: se a branch está apta para merge/homologação ou bloqueada por correções.
- **Recomendações priorizadas**: correções obrigatórias (bloqueantes) e melhorias sugeridas (não bloqueantes).

---

## 🛡️ Checklist de Qualidade e Segurança

- [ ] **Sanitização Estrita**: Nunca registre senhas reais, tokens Bearer/JWT, cookies de sessão, chaves de API ou dados pessoais reais (CPF, cartão) nos relatórios, logs JSON ou prints.
- [ ] **Evidências Íntegras**: Verifique que todo print referenciado em `relatorio-testes.md` existe em `./screenshots/` com link relativo válido.
- [ ] **Âncoras Válidas**: Confirme que cada item do menu navegável aponta para um `<a id="..."></a>` correspondente.
- [ ] **Cobertura Real do Diff**: Todo fluxo principal impactado pelo diff tem ao menos 1 cenário de caminho feliz e cenários pertinentes de validação/erro.
- [ ] **Sem Falsos Positivos Silenciosos**: Console e requisições HTTP foram auditados em todos os cenários, não apenas a aparência visual.
