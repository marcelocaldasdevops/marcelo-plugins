# Especificação Editorial — Tema **Executivo Clean** (`pdf-renderer.mjs`)

Referência visual e técnica do motor compartilhado `lib/pdf-renderer.mjs` utilizado pela skill `relatorio-pdf-playwright`.

---

## 1. Formato de Página e Paginação (`page.pdf`)

| Parâmetro | Valor Padrão | Finalidade |
| :--- | :--- | :--- |
| **Formato** | `A4` retrato (`210mm × 297mm`) | Compatibilidade corporativa universal para leitura em tela e impressão |
| **Margens** | `top: 18mm`, `bottom: 18mm`, `left: 12mm`, `right: 12mm` | Área útil de `186mm` com espaço dedicado para cabeçalho e rodapé nativos |
| **`printBackground`** | `true` | Preserva cabeçalho escuro, cards KPI, zebrado de tabelas e badges de status |
| **Cabeçalho Nativo** | CSS inline `8px` (`title` + perfil do documento) | Identificação discreta no topo de todas as páginas |
| **Rodapé Nativo** | CSS inline `8px` (`Gerado via Playwright • data` + `Página X de Y`) | Rastreabilidade temporal e numeração `.pageNumber` / `.totalPages` |

> **Nota técnica do Chromium**: `headerTemplate` e `footerTemplate` rodam em contexto isolado do DOM principal; por isso utilizam exclusivamente estilos inline explícitos.

---

## 2. Paleta Institucional

- **Cabeçalho Institucional**: gradiente `#0f172a` ➔ `#1e293b`, texto `#ffffff`, destaque inferior `#2563eb` e selo superior `#93c5fd`.
- **Superfície & Texto**: fundo `#ffffff`, texto primário `#0f172a` / `#1e293b`, texto secundário `#475569` / `#64748b`, bordas `#cbd5e1` / `#e2e8f0`.
- **Semântica de Sucesso (`Passou` / `Aprovado`)**: fundo `#dcfce7` / `#f0fdf4`, borda `#86efac`, texto `#166534`, ícone `#16a34a`.
- **Semântica de Falha (`Falhou` / `ERR-XX`)**: fundo `#fee2e2` / `#fef2f2`, borda `#fca5a5`, texto `#991b1b`, ícone `#dc2626`.

---

## 3. Cards Executivos de KPI por Perfil (`--type`)

### Perfil `e2e` (`relatorio-testes.md` + `evidencias.json` opcional)
1. **Cenários Executados**: total de cenários e percentual de aprovação.
2. **Aprovados**: contagem de cenários com cláusula `Então` e telemetria limpas.
3. **Falharam**: contagem de cenários reprovados (destaque vermelho quando `> 0`).
4. **Parecer Técnico**: `Aprovado` ou `Bloqueado` + total de ocorrências de erro (`ERR-XX` / telemetria).

### Perfil `docs` (`docs-sistema/index.md` + `inventory.json` opcional)
1. **Telas Mapeadas**: total de telas catalogadas no documento.
2. **Screenshots HD**: total de capturas full-page incorporadas no PDF.
3. **Campos Mapeados**: total de inputs, selects e textareas inventariados.
4. **Status do Catálogo**: total de ações mapeadas ou indicador `Completo`.

*(No perfil `generic`, a grade de KPI é omitida para manter o foco no conteúdo editorial).*

---

## 4. Badges Vetoriais SVG e Regras de Quebra

- **Independência de Fontes Emoji**: servidores Linux em CI/containers frequentemente não possuem `Noto Color Emoji`. O `inlineMarkdownToHtml()` converte `✅ Passou`, `❌ Falhou`, `✅ Aprovado`, `❌ Reprovado`, `✅` e `❌` em SVGs vetoriais inline nítidos em qualquer resolução.
- **Screenshots (`figure.screenshot-card`)**:
  - `break-inside: avoid` mantém a moldura e o `<figcaption>` na mesma página.
  - `max-height: 170mm; max-width: 100%; object-fit: contain` impede que capturas `fullPage` muito altas estourem a altura útil da folha A4.
  - Capturas com sufixo `-erro.png` recebem borda lateral vermelha de destaque (`screenshot-card-error`).
- **Tabelas e Diagnósticos**:
  - `thead { display: table-header-group }` repete automaticamente os títulos das colunas caso uma tabela longa atravesse mais de uma página.
  - Cabeçalhos (`h1..h6`) usam `break-after: avoid` para nunca ficarem órfãos no fim da página.

---

## 5. Segurança e Sanitização

1. **Sanitização Prévia**: todo Markdown passa por `sanitizeSensitiveText()` antes da conversão HTML, mascarando tokens `Bearer`, JWTs e pares sensíveis (`password`, `senha`, `secret`, `api_key`, `cookie`, `cpf`, `cnpj`).
2. **Escapamento HTML Estrito**: tags HTML cruas são escapadas via `escapeHtml()`, preservando unicamente âncoras internas seguras `<a id="slug"></a>` cujo `id` valide `/^[a-zA-Z0-9_-]+$/`.
3. **Proteção Anti Path-Traversal**: imagens locais são resolvidas com `path.resolve` + `fs.realpathSync` e só são lidas em Base64 se pertencerem estritamente à árvore do diretório base do documento Markdown. Imagens ausentes exibem um aviso visual estilizado sem interromper a geração do PDF.
