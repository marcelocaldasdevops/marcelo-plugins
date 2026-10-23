# Regras Universais Diagram Design: Diagramas Técnicos e Editoriais de Alta Qualidade

Diretrizes obrigatórias para agentes de IA encarregados de desenhar, planejar ou converter diagramas técnicos, arquiteturais e de fluxo. O Diagram Design produz diagramas elegantes em arquivos únicos e autocontidos de HTML + SVG inline, sem dependências externas e sem o visual genérico ("Mermaid slop").

---

## 🎨 Filosofia Central de Design

1. **A Ação de Maior Qualidade é a Deleção**:
   - Cada nó representa uma ideia distinta. Dois nós que sempre viajam juntos devem ser combinados em um único nó.
   - Cada conexão deve carregar informação real. Se a relação já for óbvia pelo próprio alinhamento visual, remova a linha.
   - O diagrama não está concluído quando não há mais nada a adicionar, mas sim quando **nada mais pode ser removido sem perda de sentido**.
2. **Uso Editorial da Cor de Destaque**:
   - A cor de destaque (coral/accent) é um foco editorial, não uma bandeira decorativa.
   - Use a cor de destaque em no máximo **1 a 2 nós focais** por diagrama. Colorir 5 ou mais nós destrói o sinal de atenção.
3. **Densidade Alvo (4/10)**:
   - Suficientemente detalhado para ser tecnicamente completo, mas limpo o bastante para não exigir legenda ou manual de leitura.
   - Se uma visualização tiver mais de 9 a 10 nós principais, considere dividi-la em dois diagramas complementares (visão de alto nível + detalhamento de componente).
4. **Arquivo Único e Autocontido**:
   - A saída é sempre um único arquivo `.html` legível e autocontido com `<svg>` inline.
   - Funciona imediatamente com duplo clique em qualquer navegador (Chrome, Firefox, Safari, Edge).
   - Não use bibliotecas pesadas de terceiros em runtime nem renderizadores externos desnecessários.

---

## 📊 Os 45 Tipos de Diagrama Suportados

Escolha o tipo visual de acordo com o propósito da informação:

1. **Sistemas e Arquitetura**:
   - `architecture`: Visão de componentes, clientes, serviços, mensageria e banco de dados.
   - `architecture-delta`: Mostra o que muda (novo, modificado, removido) em uma migração ou RFC.
   - `deployment`: Mapeamento de infraestrutura, Kubernetes, nós, clusters e nuvem.
   - `dependency`: Grafo acíclico de dependências entre pacotes, módulos ou serviços.
   - `layers`: Pilhas de abstração e camadas de software (ex: SO, runtime, aplicação).
   - `it-state`: Mapeamento de estado atual de infraestrutura de TI corporativa.
   - `high-level`: Diagrama executivo simplificado de alto nível.

2. **Fluxo, Tempo e Processos**:
   - `flowchart`: Fluxo de decisão com pontos de ramificação claros.
   - `sequence`: Interação temporal entre atores, serviços e respostas com lifelines.
   - `state`: Máquina de estados com transições, gatilhos e guardas.
   - `timeline`: Marcos cronológicos ao longo de uma linha do tempo.
   - `swimlane`: Processos distribuídos por papéis, departamentos ou serviços em raias.
   - `process`: Etapas sequenciais de um processo de negócio.
   - `data-flow`: Fluxo de dados end-to-end com transformações e sinks.
   - `medallion`: Arquitetura de dados Lakehouse (Bronze -> Silver -> Gold).
   - `sankey`: Fluxo proporcional de volume, tráfego ou custos.

3. **Estratégia e Decisão**:
   - `quadrant`: Gráfico 2x2 para priorização (ex: Impacto vs Esforço).
   - `wardley`: Mapeamento de evolução de valor e maturidade de componentes.
   - `radar` / `polar`: Comparação multidimensional de capacidades ou métricas.
   - `pyramid`: Funis de conversão ou hierarquias de maturidade.
   - `kanban`: Quadro de fluxo de trabalho com limites WIP e raias.
   - `journey`: Jornada do usuário com fases, ações e sentimentos.
   - `service-blueprint`: Integração entre ações do cliente, frontstage e backstage.

4. **Modelagem de Dados e Software**:
   - `er`: Modelo Entidade-Relacionamento conceitual com cardinalidades.
   - `db-schema`: Esquema relacional com tabelas, colunas, tipos e chaves estrangeiras.
   - `uml-class`: Diagrama de classes orientado a objetos com métodos, atributos e herança.
   - `tree` / `org-chart`: Árvores hierárquicas e organogramas funcionais.
   - `nested`: Diagrama de Venn ou inclusão por agrupamento aninhado.

5. **Gráficos e Estatísticas Especializadas**:
   - `bar` / `waterfall` / `heatmap` / `treemap` / `scatter` / `gantt` / `line`.

---

## 🛠️ Comandos e Conversão

- **Criação Direta**: Utilize a skill `diagram-design` indicando os componentes e relações.
- **Importação**: Converta diagramas legados mantendo o novo padrão visual editorial:
  - Mermaid (`/import-mermaid <arquivo>`)
  - Draw.io (`/import-drawio <arquivo>`)
  - Excalidraw (`/import-excalidraw <arquivo>`)
- **Exportação**: Exporte para SVG puro ou PNG de alta resolução (`/export-diagram <arquivo.html>`).
- **Diagnóstico**: Verifique dependências de renderização (`/doctor`).
