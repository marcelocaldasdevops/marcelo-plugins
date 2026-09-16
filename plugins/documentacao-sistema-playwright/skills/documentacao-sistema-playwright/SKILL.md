---
name: documentacao-sistema-playwright
description: Gera documentação técnica e funcional completa de qualquer sistema web (Next.js, React, Vue, Angular, Django, etc.) com menu navegável, sumário tabular, screenshots full page e inventário de telas usando Playwright.
license: MIT
metadata:
  author: Marcelo Caldas
  version: "2.0"
---

# Documentação de Sistema com Playwright 📸

Esta skill permite inspecionar, navegar e documentar de forma autônoma ou guiada **qualquer aplicação web**, gerando um catálogo técnico completo com:
- **Menu Navegável** com âncoras internas.
- **Sumário Tabular** com visão executiva de todas as telas.
- **Screenshots Full Page** em alta resolução salvos de forma organizada.
- **Inventário de Telas e Elementos Interativos** (formulários, filtros, botões, tabelas e modais).

---

## 🎯 Compatibilidade Universal

Projetada para funcionar de forma agnóstica a tecnologias:
- **SPAs e SSR**: Next.js, React, Vue, Nuxt, Angular, Svelte.
- **MPAs e Monolitos**: Django, Rails, Laravel, ASP.NET, Spring Boot.
- **Dashboards e Portais**: Grafana, ferramentas internas, backoffices administrativos.

---

## 📥 Entradas Esperadas

Antes de iniciar a documentação, identifique ou pergunte ao usuário:

1. **URL Base**: Exemplo: `http://localhost:3000`, `http://localhost:8080` ou URL de homologação/produção.
2. **Autenticação**:
   - Se o sistema for aberto: prosseguir diretamente.
   - Se exigir login: reutilizar a sessão aberta no navegador (cookies/storageState) ou solicitar credenciais temporárias ao usuário sem gravá-las no disco.
3. **Escopo**:
   - *Sistema completo*: descobre automaticamente menus e rotas.
   - *Módulo específico*: foca em uma seção (ex: `/financeiro`, `/admin`).
   - *Lista explícita de rotas*: quando o usuário fornecer URLs específicas.
4. **Diretório de Saída**: Padrão: `./docs-sistema` (ou outro informado pelo usuário).

---

## 🧭 Estratégias de Descoberta de Telas

Para garantir cobertura completa, combine duas estratégias:

### 1. Descoberta Estática (Análise do Código-Fonte do Projeto)
Se o agente estiver executando no repositório do projeto a ser documentado, inspecione as rotas no código:
- **Next.js App Router**: Arquivos `app/**/page.{jsx,tsx,js,ts}`.
- **Next.js Pages Router**: Arquivos `pages/**/*.{jsx,tsx,js,ts}`.
- **React Router**: Arquivos `routes.{js,ts,tsx}` ou declarações de `<Route path="...">`.
- **Vue Router**: Arquivos `router/index.{js,ts}` ou `routes`.
- **Backend / Django / Rails**: Arquivos `urls.py`, `routes.rb`, `routes/web.php`.

### 2. Descoberta Dinâmica (Navegação via DOM no Playwright)
Navegue pela página inicial / dashboard logado e extraia links a partir de:
```javascript
const rotasDescobertas = await page.evaluate(() => {
  const elementos = document.querySelectorAll('nav a, aside a, header a, [role="navigation"] a, .sidebar a, .menu a');
  const rotas = new Set();
  elementos.forEach(el => {
    const href = el.getAttribute('href');
    if (href && href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/api')) {
      rotas.add(href.split('?')[0].split('#')[0]);
    }
  });
  return Array.from(rotas);
});
```

---

## 🔄 Fluxo de Execução

```
[Iniciar Playwright] ➔ [Autenticar se necessário] ➔ [Mapear Rotas (DOM/Código)]
       │
       ▼
Para cada tela descoberta:
  1. page.goto(url) + waitForLoadState('networkidle')
  2. page.screenshot(fullPage: true) ➔ ./docs-sistema/screenshots/{slug}.png
  3. Extrair título, propósito, campos, botões, filtros e tabelas
       │
       ▼
[Compilar ./docs-sistema/index.md] ➔ [Menu + Sumário + Seções Detalhadas]
```

### Script de Extração de Elementos por Tela
```javascript
const metadadosTela = await page.evaluate(() => {
  const getTexts = (selector) => 
    [...document.querySelectorAll(selector)]
      .map(el => (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || '').trim())
      .filter(t => t.length > 0 && t.length < 100);

  return {
    titulo: document.title || document.querySelector('h1')?.innerText || 'Sem Título',
    h1: [...document.querySelectorAll('h1, h2')].map(h => h.innerText.trim()).filter(Boolean),
    botoes: getTexts('button, input[type="submit"], [role="button"]'),
    campos: [...document.querySelectorAll('input:not([type="hidden"]), textarea, select')].map(el => {
      const label = el.labels?.[0]?.innerText || el.getAttribute('placeholder') || el.getAttribute('name') || el.id || 'Campo';
      return `${label.trim()} (${el.tagName.toLowerCase()}${el.type ? `:${el.type}` : ''})`;
    }),
    tabelas: document.querySelectorAll('table, [role="grid"]').length > 0,
    links: getTexts('nav a, .breadcrumb a')
  };
});
```

---

## 📄 Estrutura do Documento Gerado (`docs-sistema/index.md`)

```markdown
# Documentação do Sistema

> Documentação técnica e catálogo de interfaces gerado automaticamente com Playwright.
> **URL Base:** `http://localhost:3000` | **Data:** 16/09/2026 | **Total de Telas:** 3

---

## 📑 Menu

- [1. Autenticação (Login)](#login)
- [2. Dashboard Principal](#dashboard-principal)
- [3. Gestão de Usuários](#gestao-de-usuarios)

---

## 📊 Sumário

| # | Tela | Rota / Caminho | Módulo | Descrição Resumida |
|---|------|----------------|--------|--------------------|
| 1 | Autenticação (Login) | `/login` | Acesso | Autenticação de credenciais de usuário. |
| 2 | Dashboard Principal | `/dashboard` | Geral | Métricas, atalhos rápidos e resumo geral. |
| 3 | Gestão de Usuários | `/usuarios` | Administração | Listagem, filtros e cadastro de usuários. |

---

## <a id="login"></a>1. Autenticação (Login)

- **Caminho / Rota:** `/login`
- **Módulo:** Acesso

### Screenshot
![Autenticação (Login)](./screenshots/login.png)

### Descrição Técnica
Interface de entrada responsável pela autenticação segura de usuários no sistema.

### Elementos Principais
- **Campos de Entrada:**
  - `E-mail ou Usuário (input:email)`: Identificação da conta.
  - `Senha (input:password)`: Senha pessoal de acesso.
- **Ações e Botões:**
  - `Entrar`: Submete as credenciais para validação.
  - `Esqueci minha senha`: Redireciona para o fluxo de recuperação.

---

## <a id="dashboard-principal"></a>2. Dashboard Principal

- **Caminho / Rota:** `/dashboard`
- **Módulo:** Geral

### Screenshot
![Dashboard Principal](./screenshots/dashboard-principal.png)

### Descrição Técnica
Painel de controle exibido logo após a autenticação, concentrando indicadores operacionais e navegação principal.

### Elementos Principais
- **Cards de Indicadores:** Total de Vendas, Usuários Ativos, Pendências.
- **Tabelas:** Grid de últimas atividades registradas.
- **Filtros:** Seletor de período (Hoje, 7 dias, Mês).

---
```

---

## 🤖 Uso pelo Agente de IA

Quando o agente for encarregado de documentar um sistema, ele deve utilizar as ferramentas do Playwright disponíveis no ambiente na seguinte ordem:

1. `browser_navigate`: Acessa a URL inicial ou de login.
2. `browser_take_screenshot`: Tira o print e salva no diretório `./docs-sistema/screenshots/{slug}.png`.
3. `browser_snapshot` ou `browser_evaluate`: Inspeciona a árvore de elementos para identificar botões, formulários e links de navegação.
4. Repete o processo para cada rota identificada.
5. Escreve o documento final em `./docs-sistema/index.md`.

---

## 💻 Script Automatizado (`scripts/doc-runner.mjs`)

O plugin inclui um script independente em Node.js que pode ser executado diretamente no terminal para gerar a documentação de forma autônoma:

```bash
node plugins/documentacao-sistema-playwright/skills/documentacao-sistema-playwright/scripts/doc-runner.mjs \
  --url "http://localhost:3000" \
  --out "./docs-sistema" \
  --title "Documentação do Sistema"
```

### Argumentos Suportados:
- `--url <url>`: URL base inicial (obrigatório).
- `--out <dir>`: Diretório de destino (padrão: `./docs-sistema`).
- `--routes <r1,r2>`: Lista explícita de rotas separadas por vírgula (opcional).
- `--title <titulo>`: Título do documento principal.
- `--headless`: Executa em modo sem interface gráfica (padrão: `true`).

---

## 🛡️ Checklist de Qualidade e Segurança

- [ ] **Sanitização de Dados**: Certifique-se de que prints e textos não contenham senhas reais, CPFs ou chaves de API.
- [ ] **Estabilidade de Carregamento**: Sempre aguarde `networkidle` ou seletores visíveis antes de disparar o screenshot.
- [ ] **Âncoras Válidas**: Valide que todo link no Menu possui a respectiva âncora `<a id="slug"></a>`.
- [ ] **Links Relativos Corretos**: As imagens devem apontar para `./screenshots/{nome}.png` para abrir corretamente no GitHub, GitLab e editores locais.
