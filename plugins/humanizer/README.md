# Humanizer ✍️ — Escrita Humana e Autêntica Anti-IA

<p align="center">
  <em>Remove os vícios e padrões artificiais de escrita gerados por IA, tornando o texto natural e autêntico sem alterar o sentido original.</em><br>
  <strong>Baseado no guia "Signs of AI Writing" da Wikipedia: prosa limpa, direta e com voz humana real.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/versão-3.1.0-blue.svg" alt="Versão">
  <img src="https://img.shields.io/badge/licença-MIT-green.svg" alt="Licença">
  <img src="https://img.shields.io/badge/padrões-26%20tells-purple.svg" alt="26 Padrões">
  <img src="https://img.shields.io/badge/compatibilidade-Antigravity%20%7C%20Claude%20%7C%20Cursor%20%7C%20Bithub%20%7C%20Codex-orange.svg" alt="Compatibilidade">
</p>

---

## 💡 Sobre o Humanizer

Modelos de linguagem modernos tendem a escrever de forma padronizada e previsível: usam contrastes melodramáticos ("Não é apenas X, é Y"), frases de efeito isoladas ("Deixe isso assentar."), travessões em toda oração, listas forçadas em grupos de três e adjetivos inflados.

O **Humanizer** atua como um editor humano implacável. Ele identifica os **26 padrões e tiques de escrita de IA** catalogados pela comunidade de editores da Wikipedia e reescreve o texto com naturalidade, ritmo variado e foco exclusivo no leitor, preservando 100% dos fatos, dados, números e argumentos originais.

Empacotado e disponibilizado para o [marcelo-plugins](https://github.com/marcelocaldasdevops/marcelo-plugins) por [Marcelo Caldas](https://github.com/marcelocaldasdevops), baseado no projeto de [blader/humanizer](https://github.com/blader/humanizer).

---

## 📝 Exemplo Real: Antes e Depois

### 🤖 Antes (Texto Típico de IA):
> *"Tenho o prazer de anunciar que os rascunhos compartilhados finalmente chegaram! 🚀 Por meses, nossa equipe esteve afundada em arquivos chamados `final_v7.docx` — e sabíamos que precisava haver uma maneira melhor. Agora, duas pessoas podem editar o mesmo documento ao mesmo tempo, com cada alteração aparecendo ao vivo para ambas. Não é apenas uma funcionalidade; é uma mudança fundamental na forma como colaboramos. Os comentários permanecem ancorados à frase exata que referenciam, mesmo enquanto o texto ao redor evolui. E a melhor parte? Está disponível hoje em todos os planos, completamente grátis. Deixe isso assentar."*

### ✍️ Depois (Com Humanizer):
> *"Os rascunhos compartilhados foram lançados hoje. Durante meses nossa equipe trocou arquivos chamados `final_v7.docx`, então criamos uma forma de duas pessoas editarem o mesmo documento juntas, com as mudanças aparecendo em tempo real para ambas. Os comentários ficam fixados na frase exata a que se referem, mesmo se o texto ao redor mudar. É gratuito em todos os planos."*

---

## 🔍 Os 5 Tiques Mais Fortes de IA

1. **"Não X, mas Y"**: *"Não é apenas uma ferramenta, é um divisor de águas."*
2. **Fechamento dramático de uma linha**: *"Deixe isso assentar."* / *"O futuro começa hoje."*
3. **Reflexões pseudo-profundas**: *"Em sua essência, o que realmente importa é..."*
4. **Aquecimento teatral antes do ponto**: *"Aqui está o ponto central."* / *"Sendo honesto? Depende..."*
5. **Debater contra o nada**: *"Não estou dizendo que X é ruim, mas..."* (quando ninguém disse isso).

---

## 📋 Tabela dos 26 Padrões Identificados

| # | Padrão | Antes (Típico de IA) | Depois (Humano) |
|---|---|---|---|
| **1** | **Não X, mas Y** | *"Não é só X, é Y"* | Afirma o ponto diretamente. |
| **2** | **Fechamentos Dramáticos** | *"Essa é a verdadeira vitória."* / *"Sem precedentes."* | Corta a frase de efeito; foca no fato. |
| **3** | **Provérbios Superficiais** | *"A simetria é a linguagem da confiança"* | Substitui pelo dado técnico específico. |
| **4** | **Abertura Teatral** | *"Vamos mergulhar nisso"* / *"A verdade é uma só"* | Remove o preâmbulo e vai direto ao ponto. |
| **5** | **Debate Sem Oponente** | *"Isso não se trata de..."* / *"Uma abordagem tentadora seria..."* | Remove a objeção imaginária. |
| **6** | **Tríades Forçadas** | *"Inovação, inspiração e insights"* | Usa apenas o número de itens que a frase pede. |
| **7** | **Aberturas Repetidas** | Três frases consecutivas começando da mesma forma | Varia o sujeito e o início das frases. |
| **8** | **Travessões Excessivos** | *"instituições—não as pessoas—e isso continua—"* | Usa vírgulas, pontos ou parênteses naturais. |
| **9** | **Qualificadores Empilhados** | *"poderia potencialmente possivelmente indicar"* | Mantém apenas o grau de certeza suportado pelo fato. |
| **10** | **Hifenizações Artificiais** | *"o relatório é de-alta-qualidade"* | Usa linguagem fluida sem hifens desnecessários. |
| **11** | **Voz Passiva Sem Sujeito** | *"Nenhum arquivo de configuração necessário"* | Diz claramente quem faz o quê quando ajuda. |
| **12** | **Palavras Viciadas de IA** | *"delve... testament... landscape... fostering... seamless"* | Usa vocabulário comum e preciso. |
| **13** | **Significância Inflada** | *"marcando um momento decisivo"* / *"o futuro é brilhante"* | Apresenta o fato concreto sem adjetivação vazia. |
| **14** | **Conexão Vaga** | *"desempenha um papel vital no ecossistema de"* | Diz a relação exata que o fato descreve. |
| **15** | **Cauda em Gerúndio Vazia** | *"simbolizando... refletindo... promovendo o sucesso"* | Mantém apenas o que possui base factual. |
| **16** | **Linguagem de Vendas** | *"aninhado na deslumbrante região de"* | Descreve o que a coisa realmente é. |
| **17** | **Autoridade Emprestada** | *"Especialistas concordam que..."* sem citar fonte | Cita a fonte real e o que ela disse ou remove. |
| **18** | **Fuga de Verbos Simples** | *"serve como... ostenta... apresenta"* | Usa verbos simples (*"é"*, *"tem"*). |
| **19** | **Negrito Decorativo** | Negrito em quase todo substantivo ou rótulo de lista | Remove o negrito decorativo; transforma em prosa fluida. |
| **20** | **Títulos Teatrais** | *"🚀 Fase de Lançamento:"* / *"A Decisão Final"* | Nomes descritivos e diretos em sentence case. |
| **21** | **Aspas Tipográficas Curvas** | `“o projeto”` inconsistente | Usa aspas retas padronizadas `"o projeto"`. |
| **22** | **Resíduos de Chatbot** | *"Ótima pergunta! ... Espero que ajude!"* | Remove a embalagem de conversa; entrega o conteúdo. |
| **23** | **Disclaimers Desnecessários** | *"Embora fontes limitadas existam, parece..."* | Afirma o que a fonte mostra ou remove a conjectura. |
| **24** | **Repetição de Cabeçalho** | `## Performance` seguido de *"A velocidade é importante."* | Deixa o título fazer o trabalho dele. |
| **25** | **Falar do Documento** | *"Esta tabela compara..."* / *"O objetivo deste texto é..."* | Descreve o assunto diretamente. |
| **26** | **Explicar o Óbvio ao Leitor** | Explicar o que é um conceito básico antes de dar a resposta | Começa com a decisão ou resposta direta. |

---

## ⚡ Comandos e Modos de Uso

### Modo Comando Slash
```text
/humanizer "Cole aqui o texto ou passe o caminho de um arquivo markdown/txt"
```

### Modos Suportados
1. **Texto Colado (Padrão)**: Retorna o rascunho inicial, a lista curta dos padrões detectados e a reescrita final humanizada.
2. **Modo Arquivo (`/humanizer <caminho>`)**: Modifica apenas a prosa do arquivo, preservando blocos de código, comandos, tabelas e links intactos.
3. **Modo Embutido (Subagentes, PRs e Commits)**: Gera diretamente o texto final refinado sem embalagens ou preâmbulos.

---

## 🚀 Como Instalar

### 1. Google Antigravity CLI (`agy`)
```bash
# Validar o plugin
agy plugin validate plugins/humanizer

# Instalar localmente
agy plugin install plugins/humanizer

# Listar plugins instalados
agy plugin list
```

### 2. Claude Code
```text
/plugin install humanizer@marcelo-plugins
```

### 3. Cursor e Bithub
Ative o plugin na interface do marketplace de extensões ou selecione `humanizer` na aba de plugins.

### 4. Codex / OpenCode / Cline / Roo Code
Basta apontar para `rules/AGENTS.md` e a pasta `skills/humanizer/`.

---

## 📄 Licença

Distribuído sob a licença MIT. Criado por [blader](https://github.com/blader/humanizer) e mantido no marketplace por [Marcelo Caldas](https://github.com/marcelocaldasdevops).
