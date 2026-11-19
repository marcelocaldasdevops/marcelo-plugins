# Template de Relatório de Testes E2E (`relatorio-testes.md`)

Use este modelo como referência padrão ao gerar `./docs/testes/<slug-da-branch>/relatorio-testes.md`. Adapte o número de cenários, passos e erros conforme o resultado real da execução.

---

## 📄 Estrutura Padrão do Documento

```markdown
# Relatório de Testes E2E — <Nome da Branch ou Implementação>

> Relatório de validação ponta a ponta gerado com Playwright.
> **Branch / Escopo:** `<nome-da-branch>` | **Branch Base:** `<main>` | **Commit:** `<abc1234>`
> **URL Base:** `http://localhost:3000` | **Data:** `DD/MM/AAAA HH:MM` | **Resultado Geral:** ✅ Aprovado / ❌ Reprovado

---

## 📑 Menu de Navegação

- [1. Resumo da Branch / Implementação Testada](#resumo-escopo)
- [2. Sumário Executivo dos Cenários](#sumario-cenarios)
- [3. Detalhamento dos Cenários](#detalhamento-cenarios)
  - [Cenário 01 — <Título do Cenário 01>](#cenario-01)
  - [Cenário 02 — <Título do Cenário 02>](#cenario-02)
- [4. Erros Encontrados e Diagnóstico](#erros-encontrados)
- [5. Conclusão e Recomendações](#conclusao)

---

## <a id="resumo-escopo"></a>1. Resumo da Branch / Implementação Testada

### Contexto das Alterações
Breve resumo objetivo do que foi implementado ou modificado na branch/escopo inspecionado.

### Telas, Rotas e Fluxos Afetados
| Rota / Tela | Fluxo / Funcionalidade | Arquivos Relacionados no Diff |
| :--- | :--- | :--- |
| `/exemplo/rota` | Cadastro e validação do recurso X | `src/pages/exemplo.tsx`, `src/api/recurso.ts` |

---

## <a id="sumario-cenarios"></a>2. Sumário Executivo dos Cenários

| # | Cenário | Fluxo | Tipo | Status | Prints | Erros |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| 01 | [Cadastro com dados válidos](#cenario-01) | Recurso X | Caminho Feliz | ✅ Passou | 3 | 0 |
| 02 | [Validação de campos obrigatórios](#cenario-02) | Recurso X | Validação | ❌ Falhou | 2 | 1 |

---

## <a id="detalhamento-cenarios"></a>3. Detalhamento dos Cenários

### <a id="cenario-01"></a>Cenário 01 — Cadastro com dados válidos (✅ Passou)

- **Fluxo:** Recurso X (`/exemplo/rota`)
- **Tipo:** Caminho Feliz
- **Status:** ✅ Passou
- **Console / Rede:** Sem erros de console, exceções ou respostas HTTP 4xx/5xx inesperadas.

#### Especificação (`Dado / Quando / Então`)
- **Dado** que o usuário autenticado acessa `/exemplo/rota`
- **Quando** preenche os campos obrigatórios com dados válidos e clica em **Salvar**
- **Então** o sistema exibe a confirmação de sucesso e lista o novo registro na tabela

#### Passos Executados e Evidências

| Passo | Ação Realizada | Resultado Observado | Status | Print |
| :---: | :--- | :--- | :---: | :--- |
| 01 | Acessar `/exemplo/rota` | Formulário carregado sem erros | ✅ | `cenario-01-passo-01.png` |
| 02 | Preencher campos e clicar em **Salvar** | Requisição `POST /api/recurso` retornou `201 Created` | ✅ | `cenario-01-passo-02.png` |
| 03 | Validar feedback e listagem atualizada | Toast de sucesso visível e item exibido na tabela | ✅ | `cenario-01-passo-03.png` |

#### Prints do Cenário 01

**Passo 01 — Estado inicial:**
![Cenário 01 - Passo 01](./screenshots/cenario-01-passo-01.png)

**Passo 02 — Ação / preenchimento:**
![Cenário 01 - Passo 02](./screenshots/cenario-01-passo-02.png)

**Passo 03 — Resultado final:**
![Cenário 01 - Passo 03](./screenshots/cenario-01-passo-03.png)

---

### <a id="cenario-02"></a>Cenário 02 — Validação de campos obrigatórios (❌ Falhou)

- **Fluxo:** Recurso X (`/exemplo/rota`)
- **Tipo:** Validação
- **Status:** ❌ Falhou
- **Erros Registrados:** 1 erro (ver [`ERR-01`](#err-01))

#### Especificação (`Dado / Quando / Então`)
- **Dado** que o usuário acessa `/exemplo/rota` com o formulário em branco
- **Quando** clica diretamente em **Salvar**
- **Então** o formulário bloqueia o envio e exibe mensagens de campo obrigatório sem disparar erro `500`

#### Passos Executados e Evidências

| Passo | Ação Realizada | Resultado Observado | Status | Print |
| :---: | :--- | :--- | :---: | :--- |
| 01 | Acessar `/exemplo/rota` | Formulário carregado | ✅ | `cenario-02-passo-01.png` |
| 02 | Clicar em **Salvar** sem preencher campos | API recebeu payload vazio e retornou `HTTP 500` | ❌ | `cenario-02-passo-02-erro.png` |

#### Prints do Cenário 02

**Passo 01 — Estado inicial:**
![Cenário 02 - Passo 01](./screenshots/cenario-02-passo-01.png)

**Passo 02 — Erro capturado:**
![Cenário 02 - Passo 02 (Erro)](./screenshots/cenario-02-passo-02-erro.png)

---

## <a id="erros-encontrados"></a>4. Erros Encontrados e Diagnóstico

*(Se nenhum erro for encontrado, substitua os blocos abaixo por: "Nenhum erro de console, exceção não tratada, falha de rede (4xx/5xx) ou divergência comportamental foi identificado durante a execução dos cenários.")*

### <a id="err-01"></a>ERR-01 — Envio de formulário vazio gera HTTP 500

- **Cenário / Passo:** Cenário 02 — Passo 02 (`Clicar em Salvar sem preencher campos`)
- **Categoria:** Erro HTTP (`5xx`) + Divergência Comportamental
- **O que aconteceu:** Ao clicar em **Salvar** com os campos obrigatórios vazios, o frontend não bloqueou a submissão e enviou `POST /api/recurso` com corpo vazio, resultando em erro interno `HTTP 500` e ausência de mensagem amigável na interface.
- **Mensagem / Log capturado:**
  ```text
  HTTP 500 Internal Server Error — POST http://localhost:3000/api/recurso
  Resposta: {"error":"Cannot read properties of undefined (reading 'trim')"}
  Console: Failed to load resource: the server responded with a status of 500 (Internal Server Error)
  ```
- **Print do erro:**

  ![ERR-01 — Cenário 02 Passo 02](./screenshots/cenario-02-passo-02-erro.png)

- **Causa provável:** No diff da branch (`src/pages/exemplo.tsx`), o atributo `required` / validação do schema antes do `submit` foi removido e o handler `src/api/recurso.ts` chama `body.nome.trim()` sem validar se `body.nome` existe.
- **Sugestão de correção:**
  1. Validar os campos obrigatórios no cliente antes de chamar `POST /api/recurso`, exibindo erro inline nos campos.
  2. Adicionar validação defensiva no backend (`src/api/recurso.ts`) retornando `HTTP 400`/`422` com mensagem estruturada quando campos obrigatórios estiverem ausentes.

---

## <a id="conclusao"></a>5. Conclusão e Recomendações

### Resumo Quantitativo
| Métrica | Valor |
| :--- | :--- |
| **Total de Cenários** | 2 |
| **Passaram (✅)** | 1 (50%) |
| **Falharam (❌)** | 1 (50%) |
| **Erros de Console (`console.error`)** | 1 |
| **Exceções Não Tratadas (`pageerror`)** | 0 |
| **Falhas de Rede / HTTP (`4xx` / `5xx`)** | 1 |

### Parecer Final
- **Status da Branch:** ❌ **Bloqueada para merge** até a correção dos erros críticos listados na seção 4 *(ou ✅ **Apta para revisão/merge** quando 100% dos cenários passarem sem erros).*

### Recomendações
1. **[Bloqueante]** Corrigir `ERR-01` adicionando validação no formulário e retorno `400/422` no endpoint `/api/recurso`.
2. **[Sugestão]** Adicionar teste automatizado de regressão cobrindo submissão de formulário vazio.
```

---

## 📋 Formato do Plano JSON para `scripts/e2e-runner.mjs`

Ao executar via script (`--plan ./plano-e2e.json`), utilize a estrutura abaixo:

```json
{
  "title": "Testes E2E — feat/novo-checkout",
  "baseUrl": "http://localhost:3000",
  "scopeSummary": "Alterações no fluxo de criação e validação de pedidos.",
  "affectedFlows": [
    {
      "route": "/pedidos/novo",
      "flow": "Criação de pedidos",
      "files": ["src/pages/pedidos/novo.tsx", "src/api/pedidos.ts"]
    }
  ],
  "scenarios": [
    {
      "id": "01",
      "title": "Criar pedido com dados válidos",
      "flow": "Criação de pedidos",
      "route": "/pedidos/novo",
      "type": "Caminho Feliz",
      "given": "que o usuário autenticado acessa /pedidos/novo",
      "when": "preenche cliente e item válido e clica em Salvar",
      "then": "o pedido é salvo com confirmação visual e sem erros",
      "allowedHttpStatuses": [],
      "steps": [
        {
          "description": "Acessar tela de novo pedido",
          "action": "goto",
          "path": "/pedidos/novo",
          "screenshot": true
        },
        {
          "description": "Preencher nome do cliente",
          "action": "fill",
          "selector": "input[name='cliente']",
          "value": "Empresa Teste LTDA",
          "screenshot": true
        },
        {
          "description": "Clicar em Salvar pedido",
          "action": "click",
          "selector": "button[type='submit']",
          "waitForStable": true,
          "screenshot": true
        },
        {
          "description": "Verificar mensagem de confirmação",
          "action": "assertVisible",
          "text": "Pedido criado com sucesso",
          "screenshot": true
        }
      ]
    }
  ]
}
```

### Ações Suportadas por Passo no `e2e-runner.mjs`

| Ação (`action`) | Campos Principais | Observação |
| :--- | :--- | :--- |
| `goto` / `navigate` | `path` ou `url` | Navega com `waitUntil: 'networkidle'` (com fallback seguro) |
| `click` | `selector` ou `text` ou `role` + `name` | Clica no elemento alvo; aceita `waitForStable: true` |
| `fill` / `type` | `selector` (ou `label`/`placeholder`), `value`, `sensitive?` | Se `sensitive: true`, mascara o valor no relatório e logs |
| `select` | `selector`, `value` ou `label` | Seleciona opção em `<select>` |
| `check` / `uncheck` | `selector` | Marca/desmarca checkbox ou radio |
| `press` | `key`, `selector?` | Envia tecla (ex.: `Enter`, `Escape`, `Tab`) |
| `hover` | `selector` | Passa o mouse sobre elemento |
| `wait` | `selector?`, `text?`, `ms?`, `networkidle?` | Aguarda elemento, texto, tempo ou rede estável |
| `assertVisible` | `selector` ou `text` | Falha se o elemento/texto não estiver visível |
| `assertHidden` | `selector` ou `text` | Falha se o elemento/texto ainda estiver visível |
| `assertText` | `selector`, `contains` ou `equals` | Valida conteúdo textual do elemento |
| `assertUrl` | `contains`, `equals` ou `regex` | Valida a URL atual do navegador |
| `assertCount` | `selector`, `equals` / `min` / `max` | Valida contagem de elementos no DOM |
| `screenshot` | `fullPage?` | Captura screenshot explícito do passo |
