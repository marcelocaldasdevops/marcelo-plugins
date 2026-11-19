# Regras Universais: Documentação e Testes E2E de Sistemas Web com Playwright

Diretrizes obrigatórias para agentes de IA encarregados de catalogar interfaces, documentar fluxos e executar testes ponta a ponta (E2E) com evidências em qualquer aplicação web.

---

## 🎯 Padrão de Qualidade da Documentação

Sempre que o usuário solicitar a documentação de um sistema web:

1. **Estrutura Obrigatória do Documento (`index.md`)**:
   - **Cabeçalho**: Título da aplicação, URL base inspecionada, data e total de telas.
   - **Menu Navegável**: Lista ordenada com links diretos para cada tela mapeada (`- [1. Nome da Tela](#slug)`).
   - **Sumário Executivo Tabular**: Tabela Markdown contendo `#`, `Tela`, `Caminho/Rota`, `Elementos Chave` e `Descrição Resumida`.
   - **Detalhamento das Telas**: Cada tela deve conter âncora HTML `<a id="slug"></a>`, print em alta definição, caminho/rota, descrição do propósito funcional e inventário de botões, formulários, tabelas e filtros.

2. **Diretório e Armazenamento dos Arquivos**:
   - Salvar por padrão em `./docs-sistema/` (ou caminho especificado pelo usuário).
   - Armazenar prints full page em `./docs-sistema/screenshots/{slug}.png`.
   - Gerar slugs normalizados em minúsculas, sem acentos ou caracteres especiais (ex: `painel-financeiro`).

3. **Estratégia de Descoberta**:
   - Inspecione tanto o código-fonte (arquivos de rotas do framework como Next.js, React Router, Vue Router, Django) quanto a navegação em tempo real do navegador (menus `<nav>`, `aside`, headers e sidebars).

4. **Tratamento de Autenticação**:
   - Reutilize o contexto e cookies da sessão já aberta no Playwright sempre que disponível.
   - Caso o sistema exija login e não haja sessão ativa, solicite credenciais temporárias ou a URL de autenticação ao usuário.
   - **Nunca** grave senhas em texto puro ou comite dados sensíveis (senhas, tokens, dados bancários) nos arquivos de documentação ou prints.

5. **Linguagem e Tom**:
   - Utilize tom técnico, objetivo e impessoal.
   - Descreva o propósito funcional da tela antes dos detalhes técnicos dos elementos.

---

## 🧪 Padrão de Qualidade para Testes E2E com Playwright

Sempre que o usuário solicitar testes E2E da branch atual ou de uma implementação específica:

1. **Identificação de Escopo Baseada em Evidência**:
   - Analise o diff real da branch atual em relação à branch base (`git diff <base>...HEAD` + alterações não comitadas) ou inspecione os arquivos da implementação indicada antes de escrever os cenários.
   - Liste explicitamente as telas, rotas, fluxos e arquivos impactados no início do relatório.

2. **Cobertura e Formato dos Cenários (`Dado / Quando / Então`)**:
   - Descreva todos os cenários em formato estruturado **Dado / Quando / Então**.
   - Cubra obrigatoriamente **caminho feliz**, **validações** e **casos de erro / borda** relevantes às alterações.

3. **Diretório e Nomenclatura de Evidências**:
   - Salvar o relatório principal em `./docs/testes/<slug-da-branch>/relatorio-testes.md` (ou diretório informado pelo usuário).
   - Salvar screenshots em `./docs/testes/<slug-da-branch>/screenshots/` usando nomes padronizados com zero à esquerda: `cenario-01-passo-01.png`, `cenario-01-passo-02.png` e sufixo `-erro.png` em capturas de falha (`cenario-02-passo-02-erro.png`).
   - Referenciar imagens com links relativos (`./screenshots/...`) incorporados em cada cenário e em cada diagnóstico de erro.

4. **Monitoramento Obrigatório de Erros**:
   - Em todo cenário, monitore simultaneamente: console do navegador (`console.error`), exceções não tratadas (`pageerror`), requisições HTTP com falha (`4xx`/`5xx`), falhas de rede (`requestfailed`) e divergências funcionais/visuais.
   - Um cenário que dispare `5xx` ou exceção de runtime silenciosa deve ser marcado como ❌ **Falhou**, mesmo que a UI aparente funcionar.
   - Para cada erro encontrado, documente obrigatoriamente: **o que aconteceu**, **cenário e passo**, **mensagem/log capturado**, **print do erro**, **causa provável** (correlacionada ao diff) e **sugestão de correção**.

5. **Estrutura do Relatório e Segurança**:
   - Inclua cabeçalho com metadados, resumo da branch/implementação, menu navegável, sumário tabular com status (`✅ Passou` / `❌ Falhou`), detalhamento dos cenários com prints, catálogo de erros e conclusão com totais e recomendações.
   - Reaproveite a configuração e sessão autenticada do Playwright já existente no plugin e **nunca** exponha senhas, tokens, cookies ou dados pessoais reais nos relatórios, logs JSON ou prints.
