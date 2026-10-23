# Ponytail 🚀 — Modo Dev Sênior Preguiçoso (Lazy Senior Dev)

<p align="center">
  <img src="assets/logo.png" width="200" alt="Ponytail Logo">
</p>

<p align="center">
  <em>"Ele não diz nada. Ele escreve uma única linha. E funciona."</em><br>
  <strong>O melhor código é aquele que você nunca precisou escrever.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/versão-1.0.0-blue.svg" alt="Versão">
  <img src="https://img.shields.io/badge/licença-MIT-green.svg" alt="Licença">
  <img src="https://img.shields.io/badge/compatibilidade-Antigravity%20%7C%20Claude%20%7C%20Cursor%20%7C%20Bithub%20%7C%20Codex-orange.svg" alt="Compatibilidade">
</p>

---

## 💡 Sobre o Ponytail

Você certamente conhece esse profissional: rabo de cavalo, óculos ovais, está na empresa há mais tempo do que o sistema de controle de versão. Você mostra cinquenta linhas cheias de abstrações e classes para ele; ele olha em silêncio, apaga tudo e substitui por uma única linha da biblioteca padrão.

O **Ponytail** coloca esse desenvolvedor sênior dentro do seu agente de inteligência artificial. Ele força a solução mais simples e direta que resolve 100% da tarefa, aplicando rigorosamente **YAGNI** (*You Aren't Gonna Need It*), priorizando a **biblioteca padrão** e eliminando qualquer sobre-engenharia acidental.

Empacotado e disponibilizado para o [marcelo-plugins](https://github.com/marcelocaldasdevops/marcelo-plugins) por [Marcelo Caldas](https://github.com/marcelocaldasdevops), baseado no projeto original criado por [Dietrich Gebert](https://github.com/DietrichGebert/ponytail).

---

## 📊 Métricas Comprovadas em Benchmark

Em benchmarks rigorosos (39 tarefas em repositórios reais com FastAPI + React, Opus 5.5, 5 execuções cada):

- **-53% Linhas de Código**: Elimina boilerplate desnecessário.
- **-41% Tempo de Execução**: Menos código gerado = resposta muito mais rápida.
- **-26% Custo por Tarefa**: Menos tokens trafegados.
- **-45% Output Tokens**: Respostas cirúrgicas e sem enrolação.
- **98% de Lógica Crítica Testada** (contra apenas 68% do agente sem o plugin).

---

## 🪜 A Escada da Menor Alteração (The Simplicity Ladder)

Sempre que uma tarefa de código é solicitada, o agente avalia esta escada e adota a primeira opção viável:

1. **Precisa mesmo existir? (YAGNI)**: Ignore opções flexíveis, configurações e abstrações para "o futuro" que ninguém pediu.
2. **Já existe nesta base de código?**: Reutilize helpers, serviços ou componentes existentes antes de inventar novos.
3. **Biblioteca padrão ou recurso nativo da plataforma?**: Use a stdlib nativa da linguagem (Node.js, Python, Go, etc.) em vez de instalar pacotes npm/pip.
4. **Dependência já instalada no projeto?**: Use o que já está no `package.json` ou `requirements.txt`. Nunca instale uma lib externa por causa de meia dúzia de linhas.
5. **Pode ser uma linha legível?**: Se o leitor entender de imediato, faça em uma linha.
6. **Caso contrário**: A menor quantidade de código limpo que resolva o problema por completo.

---

## 🎚️ Níveis de Intensidade (Levels)

| Nível | Comando | Comportamento |
| :--- | :--- | :--- |
| **Lite** | `/ponytail lite` | Constrói o que foi pedido, mas aponta em uma linha a alternativa menor e deixa o usuário decidir. |
| **Full** *(Padrão)* | `/ponytail` | Aplica a disciplina completa do Ponytail: a menor alteração completa, sem abstrações e com testes nas partes críticas. |
| **Ultra** | `/ponytail ultra` | Questiona o próprio pedido antes de escrever: recusa educadamente complexidades que não tenham justificativa técnica real. |

Desative a qualquer momento dizendo `"stop ponytail"`, `"normal mode"` ou `/ponytail off`.

---

## ⚡ Skills Incluídas

O plugin disponibiliza 6 skills especializadas:

| Skill | Gatilho / Comando | O que faz |
| :--- | :--- | :--- |
| **`ponytail`** | `/ponytail [nível]` | Ativa o modo dev sênior minimalista para todas as tarefas de desenvolvimento. |
| **`ponytail-audit`** | `/ponytail-audit [pasta]` | Auditoria completa de repositório: localiza bugs reais, falhas de concorrência/escala e código morto que pode ser deletado. |
| **`ponytail-review`** | `/ponytail-review [diff/PR]` | Revisão minuciosa de PR ou diff contra sobre-engenharia, fugas de escopo e quebras de chamadores. |
| **`ponytail-debt`** | `/ponytail-debt` | Varre comentários `shortcut:` e lista o razão de atalhos e débitos técnicos assumidos deliberadamente. |
| **`ponytail-gain`** | `/ponytail-gain` | Exibe o placar comparativo de economia e benchmark comprovado do Ponytail. |
| **`ponytail-help`** | `/ponytail-help` | Cartão de referência rápida com os níveis, comandos e diretrizes. |

---

## 🔍 Exemplo Real: Debounce em Vanilla JS

**Pedido do Usuário:** *"Adicione debounce em um input de busca em vanilla JS."*

### Sem o Ponytail (116 linhas de código):
Cria uma classe utilitária de debounce genérica, opções de cancelamento, `immediate: false`, classes de wrapper HTML, CSS desnecessário e 3 variações conceituais.

### Com o Ponytail (10 linhas de código):
```javascript
const searchInput = document.querySelector('input[type="search"]');
let debounceTimer;

searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetch(`/api/search?q=${encodeURIComponent(e.target.value)}`)
      .then(r => r.json())
      .then(data => console.log(data)); // substitua pela sua renderização
  }, 300);
});
```
> *O que foi ignorado: utilitário de debounce genérico e wrappers. `setTimeout` + `clearTimeout` já são o debounce. Adicione um utilitário compartilhado apenas quando tiver 3 ou mais inputs.*

---

## 🚀 Como Instalar

### 1. Google Antigravity CLI (`agy`)
```bash
# Validar o plugin
agy plugin validate plugins/ponytail

# Instalar o plugin localmente
agy plugin install plugins/ponytail

# Listar plugins instalados
agy plugin list
```

### 2. Claude Code
```text
/plugin install ponytail@marcelo-plugins
```

### 3. Cursor e Bithub
Adicione o repositório `marcelo-plugins` no marketplace de plugins ou configure a pasta `plugins/ponytail` na sua área de personalização.

### 4. Codex / OpenCode / Cline / Roo Code
Basta apontar o leitor de regras para `rules/AGENTS.md` e a pasta `skills/`.

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte [LICENSE](../../LICENSE) para mais detalhes.
