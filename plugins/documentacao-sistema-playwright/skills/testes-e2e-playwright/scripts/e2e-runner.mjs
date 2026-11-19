#!/usr/bin/env node
/**
 * e2e-runner.mjs
 * Script de automação para executar cenários E2E (Dado/Quando/Então) via Playwright,
 * monitorar console/exceções/rede (4xx/5xx), capturar screenshots padronizados e gerar
 * o relatório completo em `docs/testes/<slug-da-branch>/relatorio-testes.md`.
 *
 * Reutiliza a configuração compartilhada do Playwright em `../../../lib/playwright-config.mjs`.
 *
 * Uso:
 *   node e2e-runner.mjs --url "http://localhost:3000" --plan "./plano-e2e.json"
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';
import {
  PLAYWRIGHT_DEFAULTS,
  attachTelemetry,
  createBrowserSession,
  parseCliArgs,
  sanitizeSensitiveText,
  slugify,
  waitForPageStable,
} from '../../../lib/playwright-config.mjs';
import { renderMarkdownToPdf } from '../../../lib/pdf-renderer.mjs';

export function pad2(num) {
  return String(num).padStart(2, '0');
}

export function formatStepScreenshotName(scenarioIndex, stepIndex, isError = false) {
  const suffix = isError ? '-erro' : '';
  return `cenario-${pad2(scenarioIndex)}-passo-${pad2(stepIndex)}${suffix}.png`;
}

function runGit(args, cwd = process.cwd()) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Coleta metadados da branch atual, branch base, commit e arquivos alterados via Git.
 */
export function resolveGitContext({ branchOverride = null, baseOverride = null, cwd = process.cwd() } = {}) {
  const detectedBranch = runGit(['branch', '--show-current'], cwd);
  const commit = runGit(['rev-parse', '--short', 'HEAD'], cwd) || 'desconhecido';

  let baseBranch = baseOverride;
  if (!baseBranch) {
    for (const candidate of ['main', 'master', 'develop']) {
      const exists = runGit(['show-ref', '--verify', `refs/heads/${candidate}`], cwd);
      if (exists) {
        baseBranch = candidate;
        break;
      }
    }
  }
  baseBranch = baseBranch || 'main';

  const branchName = branchOverride || detectedBranch || 'implementacao-local';
  const branchSlug = slugify(branchName, 'branch');

  const changedFilesSet = new Set();
  if (detectedBranch && baseBranch && detectedBranch !== baseBranch) {
    const diffList = runGit(['diff', '--name-only', `${baseBranch}...HEAD`], cwd);
    if (diffList) {
      diffList
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .forEach((f) => changedFilesSet.add(f));
    }
  }

  const statusList = runGit(['status', '--porcelain'], cwd);
  if (statusList) {
    statusList
      .split('\n')
      .map((l) => l.slice(3).trim())
      .filter(Boolean)
      .forEach((f) => changedFilesSet.add(f));
  }

  return {
    branchName,
    branchSlug,
    baseBranch,
    commit,
    changedFiles: Array.from(changedFilesSet),
  };
}

/**
 * Infere causa provável e sugestão de correção iniciais a partir da categoria do erro.
 */
export function inferErrorDiagnosis(errorItem, changedFiles = []) {
  const relatedHint =
    changedFiles.length > 0
      ? ` Verifique primeiro os arquivos modificados no diff (${changedFiles.slice(0, 5).join(', ')}).`
      : '';

  if (errorItem.category === 'http_error') {
    if (errorItem.status >= 500) {
      return {
        probableCause:
          errorItem.probableCause ||
          `Erro interno no servidor (HTTP ${errorItem.status}) ao processar ${errorItem.method || 'requisição'} em ${errorItem.url || 'endpoint da API'}.${relatedHint}`,
        suggestedFix:
          errorItem.suggestedFix ||
          'Inspecionar logs/stack trace do backend para o endpoint afetado, validar entrada de dados e garantir tratamento de exceções retornando status 4xx estruturado quando apropriado.',
      };
    }
    return {
      probableCause:
        errorItem.probableCause ||
        `Requisição rejeitada inesperadamente com HTTP ${errorItem.status} em ${errorItem.url || 'recurso'}. Pode indicar payload incompatível, rota incorreta ou falta de autenticação/permissão.${relatedHint}`,
      suggestedFix:
        errorItem.suggestedFix ||
        'Confirmar contrato de payload/headers entre frontend e backend, verificar permissões da rota e garantir feedback visual adequado caso o erro 4xx seja esperado.',
    };
  }

  if (errorItem.category === 'pageerror') {
    return {
      probableCause:
        errorItem.probableCause ||
        `Exceção JavaScript não tratada em tempo de execução no navegador (${errorItem.message}).${relatedHint}`,
      suggestedFix:
        errorItem.suggestedFix ||
        'Adicionar verificação defensiva contra valores null/undefined no componente ou handler indicado no stack trace e cobrir o caso com teste unitário/E2E.',
    };
  }

  if (errorItem.category === 'console_error') {
    return {
      probableCause:
        errorItem.probableCause ||
        `Erro registrado no console do navegador durante a interação (${errorItem.message}).${relatedHint}`,
      suggestedFix:
        errorItem.suggestedFix ||
        'Corrigir a origem do console.error (hidratação, chamada assíncrona rejeitada, recurso ausente ou validação quebrada) antes do merge.',
    };
  }

  if (errorItem.category === 'request_failed') {
    return {
      probableCause:
        errorItem.probableCause ||
        `Falha de rede/conexão ou bloqueio de CORS ao requisitar ${errorItem.url || 'recurso'}.${relatedHint}`,
      suggestedFix:
        errorItem.suggestedFix ||
        'Verificar se o serviço/API de destino está acessível, conferir política de CORS e URL configurada em variáveis de ambiente.',
    };
  }

  return {
    probableCause:
      errorItem.probableCause ||
      `Comportamento observado divergiu do esperado ou o elemento alvo não atingiu o estado aguardado dentro do timeout.${relatedHint}`,
    suggestedFix:
      errorItem.suggestedFix ||
      'Revisar o fluxo na interface, confirmar seletores/estados de renderização e validar se as alterações do diff afetaram visibilidade, textos ou redirecionamento.',
  };
}

function resolveLocator(page, step) {
  if (step.selector) return page.locator(step.selector);
  if (step.role) return page.getByRole(step.role, step.name ? { name: step.name } : undefined);
  if (step.label) return page.getByLabel(step.label);
  if (step.placeholder) return page.getByPlaceholder(step.placeholder);
  if (step.text) return page.getByText(step.text);
  throw new Error('Passo requer ao menos um localizador: selector, role, label, placeholder ou text.');
}

async function executeStepAction(page, step, baseUrl, navigationTimeout) {
  const action = String(step.action || '').trim();
  const timeout = step.timeout ?? PLAYWRIGHT_DEFAULTS.actionTimeout;

  switch (action) {
    case 'goto':
    case 'navigate': {
      const target = step.url || new URL(step.path || '/', baseUrl).toString();
      await page.goto(target, {
        waitUntil: step.waitUntil || PLAYWRIGHT_DEFAULTS.waitUntil,
        timeout: step.timeout ?? navigationTimeout,
      });
      await waitForPageStable(page, { timeout: step.timeout ?? navigationTimeout, settleMs: step.settleMs ?? 250 });
      return `Navegou para ${sanitizeSensitiveText(page.url())}`;
    }

    case 'click': {
      const locator = resolveLocator(page, step).first();
      await locator.click({ timeout });
      if (step.waitForStable) {
        await waitForPageStable(page, { timeout: navigationTimeout });
      }
      return `Clique executado em ${step.selector || step.text || step.name || step.role}`;
    }

    case 'fill':
    case 'type': {
      const locator = resolveLocator(page, step).first();
      const value = step.value ?? '';
      if (action === 'type') {
        await locator.click({ timeout });
        await locator.pressSequentially(String(value), { delay: step.delay ?? 20 });
      } else {
        await locator.fill(String(value), { timeout });
      }
      const displayValue = step.sensitive ? '[REDACTED]' : sanitizeSensitiveText(String(value));
      return `Campo preenchido com "${displayValue}"`;
    }

    case 'select': {
      const locator = resolveLocator(page, step).first();
      if (step.label !== undefined && step.selector) {
        await locator.selectOption({ label: String(step.label) }, { timeout });
        return `Opção "${step.label}" selecionada`;
      }
      await locator.selectOption(String(step.value ?? ''), { timeout });
      return `Valor "${step.value ?? ''}" selecionado`;
    }

    case 'check': {
      await resolveLocator(page, step).first().check({ timeout });
      return 'Elemento marcado';
    }

    case 'uncheck': {
      await resolveLocator(page, step).first().uncheck({ timeout });
      return 'Elemento desmarcado';
    }

    case 'press': {
      if (step.selector || step.role || step.label || step.placeholder) {
        await resolveLocator(page, step).first().press(String(step.key), { timeout });
      } else {
        await page.keyboard.press(String(step.key));
      }
      if (step.waitForStable) {
        await waitForPageStable(page, { timeout: navigationTimeout });
      }
      return `Tecla "${step.key}" pressionada`;
    }

    case 'hover': {
      await resolveLocator(page, step).first().hover({ timeout });
      return 'Hover executado';
    }

    case 'wait': {
      if (step.networkidle) {
        await waitForPageStable(page, { timeout: step.timeout ?? navigationTimeout });
        return 'Rede e página estabilizadas';
      }
      if (step.selector || step.text || step.role) {
        await resolveLocator(page, step)
          .first()
          .waitFor({ state: step.state || 'visible', timeout });
        return `Elemento aguardado (${step.state || 'visible'}) confirmado`;
      }
      const ms = Number(step.ms ?? 500);
      await page.waitForTimeout(ms);
      return `Aguardou ${ms}ms`;
    }

    case 'assertVisible': {
      const locator = resolveLocator(page, step).first();
      await locator.waitFor({ state: 'visible', timeout });
      return 'Elemento/texto confirmado como visível';
    }

    case 'assertHidden': {
      const locator = resolveLocator(page, step).first();
      await locator.waitFor({ state: 'hidden', timeout });
      return 'Elemento/texto confirmado como oculto';
    }

    case 'assertText': {
      const locator = resolveLocator(page, step).first();
      await locator.waitFor({ state: 'visible', timeout });
      const actual = (await locator.innerText()).trim();
      if (step.equals !== undefined && actual !== String(step.equals)) {
        throw new Error(`Texto divergente: esperado exatamente "${step.equals}", obtido "${actual}".`);
      }
      if (step.contains !== undefined && !actual.includes(String(step.contains))) {
        throw new Error(`Texto divergente: esperado conter "${step.contains}", obtido "${actual}".`);
      }
      return `Texto validado: "${sanitizeSensitiveText(actual).slice(0, 120)}"`;
    }

    case 'assertUrl': {
      const currentUrl = page.url();
      if (step.equals !== undefined && currentUrl !== String(step.equals)) {
        throw new Error(`URL divergente: esperado "${step.equals}", obtido "${currentUrl}".`);
      }
      if (step.contains !== undefined && !currentUrl.includes(String(step.contains))) {
        throw new Error(`URL divergente: esperado conter "${step.contains}", obtido "${currentUrl}".`);
      }
      if (step.regex !== undefined && !new RegExp(step.regex).test(currentUrl)) {
        throw new Error(`URL divergente: esperado casar com /${step.regex}/, obtido "${currentUrl}".`);
      }
      return `URL validada: ${sanitizeSensitiveText(currentUrl)}`;
    }

    case 'assertCount': {
      const count = await resolveLocator(page, step).count();
      if (step.equals !== undefined && count !== Number(step.equals)) {
        throw new Error(`Contagem divergente: esperado ${step.equals}, obtido ${count}.`);
      }
      if (step.min !== undefined && count < Number(step.min)) {
        throw new Error(`Contagem divergente: esperado no mínimo ${step.min}, obtido ${count}.`);
      }
      if (step.max !== undefined && count > Number(step.max)) {
        throw new Error(`Contagem divergente: esperado no máximo ${step.max}, obtido ${count}.`);
      }
      return `Contagem validada (${count} elemento(s))`;
    }

    case 'screenshot': {
      return 'Captura de evidência registrada';
    }

    default:
      throw new Error(`Ação não suportada no plano E2E: "${action}"`);
  }
}

function escapePipes(text) {
  return String(text || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * Compila o documento Markdown completo (`relatorio-testes.md`) a partir das evidências coletadas.
 */
export function generateMarkdownReport(evidence) {
  const { meta, scope, scenarios, errors, summary } = evidence;
  const overallBadge = summary.failed === 0 ? '✅ Aprovado' : '❌ Reprovado';

  const lines = [];
  lines.push(`# ${meta.title || `Relatório de Testes E2E — ${meta.branchName}`}`);
  lines.push('');
  lines.push('> Relatório de validação ponta a ponta gerado com Playwright.');
  lines.push(
    `> **Branch / Escopo:** \`${meta.branchName}\` | **Branch Base:** \`${meta.baseBranch}\` | **Commit:** \`${meta.commit}\``
  );
  lines.push(
    `> **URL Base:** \`${meta.baseUrl}\` | **Data:** \`${meta.executedAtDisplay}\` | **Resultado Geral:** ${overallBadge}`
  );
  lines.push('');
  lines.push('---');
  lines.push('');

  // Menu navegável
  lines.push('## 📑 Menu de Navegação');
  lines.push('');
  lines.push('- [1. Resumo da Branch / Implementação Testada](#resumo-escopo)');
  lines.push('- [2. Sumário Executivo dos Cenários](#sumario-cenarios)');
  lines.push('- [3. Detalhamento dos Cenários](#detalhamento-cenarios)');
  for (const sc of scenarios) {
    const icon = sc.status === 'passed' ? '✅' : '❌';
    lines.push(`  - [Cenário ${sc.id} — ${sc.title} (${icon})](#cenario-${sc.id})`);
  }
  lines.push('- [4. Erros Encontrados e Diagnóstico](#erros-encontrados)');
  lines.push('- [5. Conclusão e Recomendações](#conclusao)');
  lines.push('');
  lines.push('---');
  lines.push('');

  // 1. Resumo do escopo
  lines.push('## <a id="resumo-escopo"></a>1. Resumo da Branch / Implementação Testada');
  lines.push('');
  lines.push('### Contexto das Alterações');
  lines.push(scope.summary || `Validação E2E das alterações da branch \`${meta.branchName}\` em relação a \`${meta.baseBranch}\`.`);
  lines.push('');

  if (scope.affectedFlows && scope.affectedFlows.length > 0) {
    lines.push('### Telas, Rotas e Fluxos Afetados');
    lines.push('');
    lines.push('| Rota / Tela | Fluxo / Funcionalidade | Arquivos Relacionados |');
    lines.push('| :--- | :--- | :--- |');
    for (const item of scope.affectedFlows) {
      const filesText = Array.isArray(item.files) && item.files.length > 0
        ? item.files.map((f) => `\`${f}\``).join(', ')
        : '—';
      lines.push(`| \`${escapePipes(item.route || '/')}\` | ${escapePipes(item.flow || 'Fluxo principal')} | ${escapePipes(filesText)} |`);
    }
    lines.push('');
  }

  if (scope.changedFiles && scope.changedFiles.length > 0) {
    lines.push('### Arquivos Detectados no Diff');
    lines.push('');
    for (const f of scope.changedFiles.slice(0, 30)) {
      lines.push(`- \`${f}\``);
    }
    if (scope.changedFiles.length > 30) {
      lines.push(`- *(+${scope.changedFiles.length - 30} outros arquivos alterados)*`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // 2. Sumário executivo dos cenários
  lines.push('## <a id="sumario-cenarios"></a>2. Sumário Executivo dos Cenários');
  lines.push('');
  lines.push('| # | Cenário | Fluxo | Tipo | Status | Prints | Erros |');
  lines.push('| :--- | :--- | :--- | :--- | :---: | :---: | :---: |');
  for (const sc of scenarios) {
    const statusText = sc.status === 'passed' ? '✅ Passou' : '❌ Falhou';
    const printsCount = sc.steps.filter((st) => Boolean(st.screenshot)).length;
    lines.push(
      `| ${sc.id} | [${escapePipes(sc.title)}](#cenario-${sc.id}) | ${escapePipes(sc.flow || 'Geral')} | ${escapePipes(sc.type || 'Funcional')} | ${statusText} | ${printsCount} | ${sc.errorIds.length} |`
    );
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // 3. Detalhamento dos cenários
  lines.push('## <a id="detalhamento-cenarios"></a>3. Detalhamento dos Cenários');
  lines.push('');
  for (const sc of scenarios) {
    const statusText = sc.status === 'passed' ? '✅ Passou' : '❌ Falhou';
    lines.push(`### <a id="cenario-${sc.id}"></a>Cenário ${sc.id} — ${sc.title} (${statusText})`);
    lines.push('');
    lines.push(`- **Fluxo:** ${sc.flow || 'Geral'}${sc.route ? ` (\`${sc.route}\`)` : ''}`);
    lines.push(`- **Tipo:** ${sc.type || 'Funcional'}`);
    lines.push(`- **Status:** ${statusText}`);
    if (sc.errorIds.length > 0) {
      const refs = sc.errorIds.map((eid) => `[\`${eid}\`](#${eid.toLowerCase()})`).join(', ');
      lines.push(`- **Erros Registrados:** ${sc.errorIds.length} (${refs})`);
    } else {
      lines.push('- **Console / Rede:** Sem erros inesperados de console, exceções ou HTTP 4xx/5xx.');
    }
    lines.push('');
    lines.push('#### Especificação (`Dado / Quando / Então`)');
    lines.push(`- **Dado** ${sc.given || 'que a aplicação está acessível no estado inicial esperado'}`);
    lines.push(`- **Quando** ${sc.when || 'as interações do fluxo são executadas passo a passo'}`);
    lines.push(`- **Então** ${sc.then || 'o comportamento esperado é confirmado sem erros de console ou rede'}`);
    lines.push('');
    lines.push('#### Passos Executados e Evidências');
    lines.push('');
    lines.push('| Passo | Ação Realizada | Resultado Observado | Status | Print |');
    lines.push('| :---: | :--- | :--- | :---: | :--- |');
    for (const st of sc.steps) {
      const stepIcon = st.status === 'passed' ? '✅' : '❌';
      const printCell = st.screenshot ? `\`${path.basename(st.screenshot)}\`` : '—';
      lines.push(
        `| ${st.index} | ${escapePipes(st.description)} | ${escapePipes(st.observation)} | ${stepIcon} | ${printCell} |`
      );
    }
    lines.push('');

    const stepsWithPrints = sc.steps.filter((st) => Boolean(st.screenshot));
    if (stepsWithPrints.length > 0) {
      lines.push(`#### Prints do Cenário ${sc.id}`);
      lines.push('');
      for (const st of stepsWithPrints) {
        const label = st.status === 'failed' ? ' (Erro)' : '';
        lines.push(`**Passo ${st.index} — ${st.description}${label}:**`);
        lines.push(`![Cenário ${sc.id} - Passo ${st.index}${label}](${st.screenshot})`);
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
  }

  // 4. Erros encontrados
  lines.push('## <a id="erros-encontrados"></a>4. Erros Encontrados e Diagnóstico');
  lines.push('');
  if (errors.length === 0) {
    lines.push(
      'Nenhum erro de console, exceção não tratada, falha de rede (`4xx`/`5xx`) ou divergência comportamental foi identificado durante a execução dos cenários.'
    );
    lines.push('');
  } else {
    for (const err of errors) {
      lines.push(`### <a id="${err.code.toLowerCase()}"></a>${err.code} — ${err.title}`);
      lines.push('');
      lines.push(`- **Cenário / Passo:** Cenário ${err.scenarioId} — Passo ${err.stepIndex} (${err.stepDescription})`);
      lines.push(`- **Categoria:** ${err.categoryLabel}`);
      lines.push(`- **O que aconteceu:** ${err.whatHappened}`);
      lines.push('- **Mensagem / Log capturado:**');
      lines.push('  ```text');
      for (const logLine of String(err.log || 'Sem detalhes adicionais.').split('\n')) {
        lines.push(`  ${logLine}`);
      }
      lines.push('  ```');
      if (err.screenshot) {
        lines.push('- **Print do erro:**');
        lines.push('');
        lines.push(`  ![${err.code} — Cenário ${err.scenarioId} Passo ${err.stepIndex}](${err.screenshot})`);
        lines.push('');
      }
      lines.push(`- **Causa provável:** ${err.probableCause}`);
      lines.push(`- **Sugestão de correção:** ${err.suggestedFix}`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');

  // 5. Conclusão e recomendações
  lines.push('## <a id="conclusao"></a>5. Conclusão e Recomendações');
  lines.push('');
  lines.push('### Resumo Quantitativo');
  lines.push('');
  lines.push('| Métrica | Valor |');
  lines.push('| :--- | :--- |');
  lines.push(`| **Total de Cenários** | ${summary.total} |`);
  lines.push(`| **Passaram (✅)** | ${summary.passed} (${summary.passRate}%) |`);
  lines.push(`| **Falharam (❌)** | ${summary.failed} (${summary.failRate}%) |`);
  lines.push(`| **Erros de Console (\`console.error\`)** | ${summary.consoleErrors} |`);
  lines.push(`| **Exceções Não Tratadas (\`pageerror\`)** | ${summary.pageErrors} |`);
  lines.push(`| **Falhas de Rede / HTTP (\`4xx\` / \`5xx\`)** | ${summary.networkErrors} |`);
  lines.push('');
  lines.push('### Parecer Final');
  if (summary.failed === 0) {
    lines.push(
      `- **Status da Branch:** ✅ **Apta para revisão/merge** — todos os ${summary.total} cenário(s) passaram sem erros de console, exceções ou falhas de rede.`
    );
  } else {
    lines.push(
      `- **Status da Branch:** ❌ **Bloqueada para merge** — ${summary.failed} de ${summary.total} cenário(s) falharam (${errors.length} erro(s) registrado(s)).`
    );
  }
  lines.push('');
  lines.push('### Recomendações');
  if (errors.length === 0) {
    lines.push('1. Manter o relatório de evidências vinculado ao Pull Request como comprovação dos fluxos validados.');
    lines.push('2. Caso novas alterações entrem na branch antes do merge, reexecutar a bateria para garantir ausência de regressões.');
  } else {
    errors.forEach((err, idx) => {
      lines.push(`${idx + 1}. **[Bloqueante — ${err.code}]** ${err.suggestedFix}`);
    });
    lines.push(
      `${errors.length + 1}. Após aplicar as correções, reexecutar a skill \`testes-e2e-playwright\` para confirmar 100% de aprovação.`
    );
  }
  lines.push('');

  return lines.join('\n');
}

function categoryToLabel(category) {
  switch (category) {
    case 'console_error':
      return 'Erro de Console (`console.error`)';
    case 'pageerror':
      return 'Exceção Não Tratada (`pageerror`)';
    case 'http_error':
      return 'Falha HTTP (`4xx` / `5xx`)';
    case 'request_failed':
      return 'Falha de Rede (`requestfailed`)';
    default:
      return 'Divergência Comportamental / Asserção';
  }
}

function printHelp() {
  console.log(`Uso:
  node e2e-runner.mjs --url "http://localhost:3000" --plan "./plano-e2e.json" [opções]

Opções:
  --url <url>                URL base da aplicação (ou definida em plan.baseUrl)
  --plan <arquivo.json>      Plano JSON com os cenários Dado/Quando/Então (obrigatório)
  --out <dir>                Diretório de saída (padrão: ./docs/testes/<slug-da-branch>)
  --branch <nome>            Nome da branch ou escopo testado (auto-detectado via Git)
  --base <branch-base>       Branch base de comparação (padrão: main/master/develop)
  --storage-state <arquivo>  JSON de storageState/cookies para sessão autenticada
  --headless <true|false>    Modo headless (padrão: true)
  --headed                   Atalho para executar com navegador visível
  --timeout <ms>             Timeout padrão de navegação (padrão: ${PLAYWRIGHT_DEFAULTS.navigationTimeout})
  --no-pdf                   Desativa a geração automática de relatorio-testes.pdf ao final
  --help, -h                 Exibe esta ajuda
`);
}

export async function runCli(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);

  if (cli.getBool('help', false)) {
    printHelp();
    process.exit(0);
  }

  const planPathArg = cli.get('plan');
  if (!planPathArg) {
    console.error('Erro: Parâmetro --plan é obrigatório.');
    printHelp();
    process.exit(1);
  }

  const planPath = path.resolve(planPathArg);
  if (!fs.existsSync(planPath)) {
    console.error(`Erro: Arquivo de plano não encontrado em '${planPath}'.`);
    process.exit(1);
  }

  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
  } catch (err) {
    console.error(`Erro: JSON inválido em '${planPath}': ${err.message}`);
    process.exit(1);
  }

  const baseUrl = cli.get('url') || plan.baseUrl;
  if (!baseUrl) {
    console.error('Erro: Informe a URL base via --url ou no campo "baseUrl" do plano JSON.');
    process.exit(1);
  }

  if (!Array.isArray(plan.scenarios) || plan.scenarios.length === 0) {
    console.error('Erro: O plano JSON deve conter um array não vazio em "scenarios".');
    process.exit(1);
  }

  const gitCtx = resolveGitContext({
    branchOverride: cli.get('branch') || plan.branchName || null,
    baseOverride: cli.get('base') || plan.baseBranch || null,
  });

  const outputDir = path.resolve(cli.get('out') || path.join('./docs/testes', gitCtx.branchSlug));
  const screenshotsDir = path.join(outputDir, 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const storageState = cli.get('storage-state') || plan.storageState || null;
  const headless = cli.getBool('headed', false)
    ? false
    : cli.getBool('headless', PLAYWRIGHT_DEFAULTS.headless);
  const navigationTimeout = cli.getNumber('timeout', PLAYWRIGHT_DEFAULTS.navigationTimeout);
  const generatePdf = cli.getBool('no-pdf', false) ? false : cli.getBool('pdf', true);

  console.log('==> Iniciando execução de testes E2E com Playwright...');
  console.log(`    Branch / Escopo: ${gitCtx.branchName} (base: ${gitCtx.baseBranch})`);
  console.log(`    URL Base: ${baseUrl}`);
  console.log(`    Diretório de Saída: ${outputDir}`);

  let browser;
  let page;
  try {
    const session = await createBrowserSession({
      headless,
      storageState,
      baseURL: baseUrl,
      navigationTimeout,
    });
    browser = session.browser;
    page = session.page;
  } catch (err) {
    console.error(`Erro: ${err.message}`);
    process.exit(1);
  }

  const telemetry = attachTelemetry(page, { captureWarnings: false });
  const scenarioResults = [];
  const allErrors = [];
  const startedAt = new Date();

  try {
    for (let sIdx = 0; sIdx < plan.scenarios.length; sIdx++) {
      const scenario = plan.scenarios[sIdx];
      const scenarioNum = sIdx + 1;
      const scenarioId = scenario.id ? pad2(scenario.id) : pad2(scenarioNum);
      const scenarioTitle = scenario.title || `Cenário ${scenarioId}`;
      const steps = Array.isArray(scenario.steps) ? scenario.steps : [];
      const scenarioAllowedHttp = new Set(
        Array.isArray(scenario.allowedHttpStatuses) ? scenario.allowedHttpStatuses.map(Number) : []
      );

      console.log(`\n--> Cenário ${scenarioId}: ${scenarioTitle}`);

      const stepResults = [];
      const scenarioErrorIds = [];
      let scenarioFailed = false;

      for (let pIdx = 0; pIdx < steps.length; pIdx++) {
        const step = steps[pIdx];
        const stepNum = pIdx + 1;
        const stepIndex = pad2(stepNum);
        const stepDescription = step.description || `${step.action || 'passo'} #${stepIndex}`;
        const stepAllowedHttp = new Set([
          ...scenarioAllowedHttp,
          ...(Array.isArray(step.allowedHttpStatuses) ? step.allowedHttpStatuses.map(Number) : []),
        ]);

        const cursorBefore = telemetry.mark();
        let stepStatus = 'passed';
        let observation = '';
        let thrownErr = null;

        try {
          observation = await executeStepAction(page, step, baseUrl, navigationTimeout);
        } catch (err) {
          stepStatus = 'failed';
          thrownErr = err;
          observation = sanitizeSensitiveText(err?.message || String(err));
        }

        // Pequena espera para coletar respostas/console emitidos no fechamento do passo
        await page.waitForTimeout(150);
        const stepEvents = telemetry.getSince(cursorBefore);
        const unexpectedEvents = stepEvents.filter((ev) => {
          if (ev.category === 'http_error' && stepAllowedHttp.has(Number(ev.status))) {
            return false;
          }
          return true;
        });

        if (unexpectedEvents.length > 0) {
          stepStatus = 'failed';
          if (!thrownErr) {
            observation = `${observation ? `${observation} — ` : ''}Detectado(s) ${unexpectedEvents.length} erro(s) de console/rede.`;
          }
        }

        const isFirst = pIdx === 0;
        const isLast = pIdx === steps.length - 1;
        const shouldTakeScreenshot =
          stepStatus === 'failed' ||
          step.screenshot === true ||
          step.action === 'screenshot' ||
          ((isFirst || isLast) && step.screenshot !== false);

        let screenshotRel = null;
        if (shouldTakeScreenshot) {
          const filename = formatStepScreenshotName(scenarioNum, stepNum, stepStatus === 'failed');
          const absPath = path.join(screenshotsDir, filename);
          try {
            await page.screenshot({
              path: absPath,
              fullPage: step.fullPage ?? PLAYWRIGHT_DEFAULTS.screenshotFullPage,
            });
            screenshotRel = `./screenshots/${filename}`;
          } catch (shotErr) {
            console.warn(`    Aviso: não foi possível capturar screenshot '${filename}': ${shotErr.message}`);
          }
        }

        if (thrownErr) {
          const code = `ERR-${pad2(allErrors.length + 1)}`;
          const diagnosis = inferErrorDiagnosis(
            { category: 'assertion', message: observation },
            gitCtx.changedFiles
          );
          allErrors.push({
            code,
            title: `Falha no passo ${stepIndex}: ${stepDescription}`,
            scenarioId,
            stepIndex,
            stepDescription,
            category: 'assertion',
            categoryLabel: categoryToLabel('assertion'),
            whatHappened: `O passo "${stepDescription}" falhou durante a execução no Playwright.`,
            log: observation,
            screenshot: screenshotRel,
            probableCause: diagnosis.probableCause,
            suggestedFix: diagnosis.suggestedFix,
          });
          scenarioErrorIds.push(code);
        }

        for (const ev of unexpectedEvents) {
          const code = `ERR-${pad2(allErrors.length + 1)}`;
          const diagnosis = inferErrorDiagnosis(ev, gitCtx.changedFiles);
          const logParts = [ev.message];
          if (ev.location) logParts.push(`Origem: ${ev.location}`);
          if (ev.responseBody) logParts.push(`Resposta: ${ev.responseBody}`);
          if (ev.stack) logParts.push(`Stack:\n${ev.stack}`);

          allErrors.push({
            code,
            title:
              ev.category === 'http_error'
                ? `HTTP ${ev.status} em ${ev.method} ${ev.url}`
                : `${categoryToLabel(ev.category)} no passo ${stepIndex}`,
            scenarioId,
            stepIndex,
            stepDescription,
            category: ev.category,
            categoryLabel: categoryToLabel(ev.category),
            whatHappened: `Durante "${stepDescription}", foi capturado ${categoryToLabel(ev.category).toLowerCase()}.`,
            log: logParts.join('\n'),
            screenshot: screenshotRel,
            probableCause: diagnosis.probableCause,
            suggestedFix: diagnosis.suggestedFix,
          });
          scenarioErrorIds.push(code);
        }

        stepResults.push({
          index: stepIndex,
          action: step.action,
          description: stepDescription,
          status: stepStatus,
          observation,
          screenshot: screenshotRel,
        });

        const icon = stepStatus === 'passed' ? '[OK]' : '[FALHOU]';
        console.log(`    ${icon} Passo ${stepIndex}: ${stepDescription}`);

        if (stepStatus === 'failed') {
          scenarioFailed = true;
          if (thrownErr && !step.continueOnError) {
            break;
          }
        }
      }

      scenarioResults.push({
        id: scenarioId,
        title: scenarioTitle,
        flow: scenario.flow || 'Geral',
        route: scenario.route || null,
        type: scenario.type || 'Funcional',
        given: scenario.given || null,
        when: scenario.when || null,
        then: scenario.then || null,
        status: scenarioFailed ? 'failed' : 'passed',
        steps: stepResults,
        errorIds: scenarioErrorIds,
      });
    }
  } finally {
    await browser.close();
  }

  const total = scenarioResults.length;
  const passed = scenarioResults.filter((s) => s.status === 'passed').length;
  const failed = total - passed;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const failRate = total > 0 ? 100 - passRate : 0;

  const consoleErrors = allErrors.filter((e) => e.category === 'console_error').length;
  const pageErrors = allErrors.filter((e) => e.category === 'pageerror').length;
  const networkErrors = allErrors.filter(
    (e) => e.category === 'http_error' || e.category === 'request_failed'
  ).length;

  const evidence = {
    meta: {
      title: plan.title || `Relatório de Testes E2E — ${gitCtx.branchName}`,
      branchName: gitCtx.branchName,
      branchSlug: gitCtx.branchSlug,
      baseBranch: gitCtx.baseBranch,
      commit: gitCtx.commit,
      baseUrl,
      executedAt: startedAt.toISOString(),
      executedAtDisplay: startedAt.toLocaleString('pt-BR'),
    },
    scope: {
      summary: plan.scopeSummary || null,
      affectedFlows: Array.isArray(plan.affectedFlows) ? plan.affectedFlows : [],
      changedFiles: gitCtx.changedFiles,
    },
    scenarios: scenarioResults,
    errors: allErrors,
    summary: {
      total,
      passed,
      failed,
      passRate,
      failRate,
      consoleErrors,
      pageErrors,
      networkErrors,
    },
  };

  const evidenceJsonPath = path.join(outputDir, 'evidencias.json');
  fs.writeFileSync(evidenceJsonPath, JSON.stringify(evidence, null, 2), 'utf-8');

  const reportMd = generateMarkdownReport(evidence);
  const reportPath = path.join(outputDir, 'relatorio-testes.md');
  fs.writeFileSync(reportPath, reportMd, 'utf-8');

  let pdfPath = null;
  if (generatePdf) {
    const targetPdfPath = path.join(outputDir, 'relatorio-testes.pdf');
    try {
      const pdfResult = await renderMarkdownToPdf({
        inputPath: reportPath,
        outputPath: targetPdfPath,
        type: 'e2e',
        title: evidence.meta.title,
        timeout: navigationTimeout,
      });
      pdfPath = pdfResult.pdfPath;
    } catch (pdfErr) {
      console.warn(`\nAviso: não foi possível gerar o PDF automaticamente: ${pdfErr?.message || String(pdfErr)}`);
      if (pdfErr?.fallbackHtmlPath) {
        console.warn(`    Fallback HTML autocontido salvo em: ${pdfErr.fallbackHtmlPath}`);
      }
    }
  }

  console.log('\n==> Execução E2E finalizada!');
  console.log(`    Relatório Markdown: ${reportPath}`);
  if (pdfPath) {
    console.log(`    Relatório PDF: ${pdfPath}`);
  }
  console.log(`    Evidências JSON: ${evidenceJsonPath}`);
  console.log(`    Cenários: ${total} total | ${passed} passou | ${failed} falhou`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  runCli().catch((err) => {
    console.error('Falha na execução E2E:', err);
    process.exit(1);
  });
}
