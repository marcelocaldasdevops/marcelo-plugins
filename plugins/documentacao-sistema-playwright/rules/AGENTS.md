# Regras Universais: Documentação de Sistemas Web com Playwright

Diretrizes obrigatórias para agentes de IA encarregados de catalogar e documentar interfaces, menus e fluxos de qualquer aplicação web.

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
