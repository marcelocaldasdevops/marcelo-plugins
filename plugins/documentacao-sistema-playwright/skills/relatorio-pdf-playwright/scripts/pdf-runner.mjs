#!/usr/bin/env node
/**
 * pdf-runner.mjs
 * CLI para converter relatórios Markdown de testes E2E (`relatorio-testes.md`),
 * catálogos de documentação (`docs-sistema/index.md`) ou qualquer Markdown técnico
 * em PDF editorial A4 autocontido usando Playwright Chromium.
 *
 * Uso:
 *   node pdf-runner.mjs --input "./docs/testes/minha-branch/relatorio-testes.md"
 *   node pdf-runner.mjs --input "./docs-sistema/index.md" --type docs
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { PLAYWRIGHT_DEFAULTS, parseCliArgs } from '../../../lib/playwright-config.mjs';
import { loadCompanionData, renderMarkdownToPdf } from '../../../lib/pdf-renderer.mjs';

function printHelp() {
  console.log(`
Uso:
  node pdf-runner.mjs --input <arquivo.md> [opções]

Opções:
  --input <arquivo.md>            Caminho do arquivo Markdown de origem (obrigatório)
  --out <arquivo.pdf>             Caminho do PDF de saída (opcional; calculado automaticamente)
  --type <auto|e2e|docs|generic>  Perfil editorial do documento (padrão: auto)
  --title <titulo>                Sobrescreve o título exibido no cabeçalho institucional
  --emit-html-only                Gera apenas o arquivo .print.html autocontido sem abrir o Chromium
  --timeout <ms>                  Timeout de renderização no Chromium em ms (padrão: ${PLAYWRIGHT_DEFAULTS.navigationTimeout})
  -h, --help                      Exibe esta mensagem de ajuda

Exemplos:
  node pdf-runner.mjs --input "./docs/testes/feat-login/relatorio-testes.md"
  node pdf-runner.mjs --input "./docs-sistema/index.md" --out "./docs-sistema/documentacao-sistema.pdf"
  node pdf-runner.mjs --input "./docs/testes/feat-login/relatorio-testes.md" --emit-html-only
`.trim());
}

/**
 * Calcula o caminho padrão do arquivo PDF a partir do arquivo Markdown de entrada:
 * - `relatorio-testes.md` -> `<pasta>/relatorio-testes.pdf`
 * - `index.md` de documentação de sistema -> `<pasta>/documentacao-sistema.pdf`
 * - demais arquivos -> `<pasta>/<nome-base>.pdf`
 */
export function resolveDefaultOutputPath(inputPath, type = 'auto') {
  const resolvedInput = path.resolve(inputPath);
  const dir = path.dirname(resolvedInput);
  const ext = path.extname(resolvedInput);
  const stem = path.basename(resolvedInput, ext);
  const lowerBase = path.basename(resolvedInput).toLowerCase();

  if (lowerBase === 'relatorio-testes.md') {
    return path.join(dir, 'relatorio-testes.pdf');
  }

  if (lowerBase === 'index.md') {
    const companion = loadCompanionData(resolvedInput, type);
    const parentName = path.basename(dir).toLowerCase();
    if (companion.type === 'docs' || parentName.includes('docs-sistema') || fs.existsSync(path.join(dir, 'inventory.json'))) {
      return path.join(dir, 'documentacao-sistema.pdf');
    }
  }

  return path.join(dir, `${stem}.pdf`);
}

export async function runCli(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);

  if (cli.flags.help) {
    printHelp();
    return { exitCode: 0 };
  }

  const inputArg = cli.get('input') || cli.positionals[0] || null;
  if (!inputArg) {
    console.error('Erro: informe o arquivo Markdown de entrada com --input <arquivo.md>. Use --help para exemplos.');
    return { exitCode: 1 };
  }

  const rawType = String(cli.get('type', 'auto')).toLowerCase();
  if (!['auto', 'e2e', 'docs', 'generic'].includes(rawType)) {
    console.error(`Erro: valor inválido para --type ('${rawType}'). Valores aceitos: auto, e2e, docs, generic.`);
    return { exitCode: 1 };
  }

  const resolvedInput = path.resolve(inputArg);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`Erro: arquivo de entrada não encontrado em '${resolvedInput}'.`);
    return { exitCode: 1 };
  }

  const outputPath = cli.get('out')
    ? path.resolve(cli.get('out'))
    : resolveDefaultOutputPath(resolvedInput, rawType);
  const title = cli.get('title', '');
  const emitHtmlOnly = cli.getBool('emit-html-only', false);
  const timeout = cli.getNumber('timeout', PLAYWRIGHT_DEFAULTS.navigationTimeout);

  try {
    const result = await renderMarkdownToPdf({
      inputPath: resolvedInput,
      outputPath,
      type: rawType,
      title,
      emitHtmlOnly,
      timeout,
    });

    if (result.mode === 'html-only') {
      console.log(`HTML autocontido para impressão gerado com sucesso: ${result.htmlPath}`);
      console.log(
        `Resumo: perfil=${result.type} | prints embutidos=${result.stats.embeddedImages} | imagens ausentes=${result.stats.missingImages}`
      );
    } else {
      const kb = result.stats.pdfBytes ? `${(result.stats.pdfBytes / 1024).toFixed(1)} KB` : 'N/D';
      console.log(`PDF gerado com sucesso: ${result.pdfPath} (${kb})`);
      console.log(
        `Resumo: perfil=${result.type} | prints embutidos=${result.stats.embeddedImages} | imagens ausentes=${result.stats.missingImages}`
      );
    }

    return { exitCode: 0, result };
  } catch (err) {
    console.error(`Falha ao gerar PDF: ${err?.message || String(err)}`);
    if (err?.fallbackHtmlPath) {
      console.error(`Arquivo HTML autocontido disponível em: ${err.fallbackHtmlPath}`);
    }
    return { exitCode: 1, error: err };
  }
}

const isMainModule =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  runCli().then(({ exitCode }) => {
    if (exitCode !== 0) process.exit(exitCode);
  });
}
