#!/usr/bin/env node
/**
 * doc-runner.mjs
 * Script de automação para rastrear, capturar screenshots e gerar documentação
 * Markdown completa com menu e sumário a partir de qualquer sistema web via Playwright.
 *
 * Uso:
 *   node doc-runner.mjs --url "http://localhost:3000" --out "./docs-sistema"
 */

import fs from 'fs';
import path from 'path';

// Parse de argumentos simples
const args = process.argv.slice(2);
function getArg(name, defaultValue = null) {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return defaultValue;
}

const baseUrl = getArg('--url');
const outputDir = path.resolve(getArg('--out', './docs-sistema'));
const explicitRoutes = getArg('--routes') ? getArg('--routes').split(',').map(r => r.trim()) : null;
const docTitle = getArg('--title', 'Documentação do Sistema');

if (!baseUrl) {
  console.error('Erro: Parâmetro --url é obrigatório.');
  console.error('Exemplo: node doc-runner.mjs --url "http://localhost:3000" --out "./docs-sistema"');
  process.exit(1);
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tela';
}

async function run() {
  console.log(`==> Iniciando documentação com Playwright...`);
  console.log(`    URL Base: ${baseUrl}`);
  console.log(`    Diretório de Saída: ${outputDir}`);

  // Tenta carregar playwright
  let chromium;
  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch (err) {
    console.error(`Erro: O pacote 'playwright' não está instalado globalmente ou neste projeto.`);
    console.error(`Instale executando: npm install -D playwright`);
    process.exit(1);
  }

  const screenshotsDir = path.join(outputDir, 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const visited = new Set();
  const routesToVisit = explicitRoutes ? [...explicitRoutes] : ['/'];
  const inventory = [];

  while (routesToVisit.length > 0) {
    const route = routesToVisit.shift();
    if (visited.has(route)) continue;
    visited.add(route);

    const fullUrl = new URL(route, baseUrl).toString();
    console.log(`--> Visitando: ${fullUrl}`);

    try {
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (e) {
      console.warn(`    Aviso: Falha ao navegar para ${fullUrl}: ${e.message}`);
      continue;
    }

    // Se não tiver rotas explícitas, descobre novas rotas no menu/nav
    if (!explicitRoutes) {
      const discovered = await page.evaluate(() => {
        const links = document.querySelectorAll('nav a, aside a, header a, [role="navigation"] a, .sidebar a, .menu a');
        const found = [];
        links.forEach(a => {
          const href = a.getAttribute('href');
          if (href && href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/api')) {
            found.push(href.split('?')[0].split('#')[0]);
          }
        });
        return found;
      });

      for (const d of discovered) {
        if (!visited.has(d) && !routesToVisit.includes(d)) {
          routesToVisit.push(d);
        }
      }
    }

    // Extrai metadados
    const pageData = await page.evaluate(() => {
      const getClean = (el) => (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || '').trim();
      const title = document.title || document.querySelector('h1')?.innerText || 'Página';
      const headings = [...document.querySelectorAll('h1, h2, h3')].map(getClean).filter(t => t.length > 0 && t.length < 80);
      const buttons = [...document.querySelectorAll('button, input[type="submit"], [role="button"]')].map(getClean).filter(t => t.length > 0 && t.length < 50);
      const inputs = [...document.querySelectorAll('input:not([type="hidden"]), textarea, select')].map(el => {
        const label = el.labels?.[0]?.innerText || el.getAttribute('placeholder') || el.getAttribute('name') || el.id || 'Campo';
        return `${label.trim()} (${el.tagName.toLowerCase()}${el.type ? `:${el.type}` : ''})`;
      });
      const hasTable = document.querySelectorAll('table, [role="grid"]').length > 0;
      return { title, headings, buttons: [...new Set(buttons)], inputs: [...new Set(inputs)], hasTable };
    });

    const slug = slugify(route === '/' ? 'inicio' : route);
    const screenshotFilename = `${slug}.png`;
    const screenshotPath = path.join(screenshotsDir, screenshotFilename);

    await page.screenshot({ path: screenshotPath, fullPage: true });

    inventory.push({
      num: inventory.length + 1,
      name: pageData.title || slug,
      slug,
      route,
      screenshot: `./screenshots/${screenshotFilename}`,
      headings: pageData.headings,
      buttons: pageData.buttons,
      inputs: pageData.inputs,
      hasTable: pageData.hasTable,
      description: `Interface para visualização e gerenciamento de ${pageData.title || slug}.`
    });
  }

  await browser.close();

  // Salva inventário JSON
  fs.writeFileSync(path.join(outputDir, 'inventory.json'), JSON.stringify(inventory, null, 2), 'utf-8');

  // Compila Markdown
  let md = `# ${docTitle}\n\n`;
  md += `> Catálogo técnico gerado automaticamente via Playwright.\n`;
  md += `> **URL Base:** \`${baseUrl}\` | **Telas Mapeadas:** ${inventory.length} | **Data:** ${new Date().toLocaleDateString('pt-BR')}\n\n`;
  md += `---\n\n`;

  // Menu
  md += `## 📑 Menu de Navegação\n\n`;
  for (const item of inventory) {
    md += `- [${item.num}. ${item.name}](#${item.slug})\n`;
  }
  md += `\n---\n\n`;

  // Sumário
  md += `## 📊 Sumário Executivo\n\n`;
  md += `| # | Tela | Rota | Elementos Chave | Descrição Resumida |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;
  for (const item of inventory) {
    const badges = [];
    if (item.inputs.length > 0) badges.push(`${item.inputs.length} campos`);
    if (item.buttons.length > 0) badges.push(`${item.buttons.length} botões`);
    if (item.hasTable) badges.push('Tabela');
    const badgeText = badges.join(', ') || 'Navegação';
    md += `| ${item.num} | [${item.name}](#${item.slug}) | \`${item.route}\` | ${badgeText} | ${item.description} |\n`;
  }
  md += `\n---\n\n`;

  // Seções Detalhadas
  md += `## 🖼️ Detalhamento das Telas\n\n`;
  for (const item of inventory) {
    md += `### <a id="${item.slug}"></a>${item.num}. ${item.name}\n\n`;
    md += `- **Caminho / Rota:** \`${item.route}\`\n`;
    md += `- **Arquivo de Imagem:** \`${item.screenshot}\`\n\n`;
    md += `#### Screenshot\n\n`;
    md += `![${item.name}](${item.screenshot})\n\n`;
    md += `#### Descrição Técnica\n\n${item.description}\n\n`;

    if (item.inputs.length > 0) {
      md += `#### Formulários e Campos\n`;
      for (const inp of item.inputs.slice(0, 10)) {
        md += `- \`${inp}\`\n`;
      }
      if (item.inputs.length > 10) md += `- *(+${item.inputs.length - 10} outros campos identificados)*\n`;
      md += `\n`;
    }

    if (item.buttons.length > 0) {
      md += `#### Ações Disponíveis\n`;
      for (const btn of item.buttons.slice(0, 10)) {
        md += `- Botão / Ação: **${btn}**\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;
  }

  const indexPath = path.join(outputDir, 'index.md');
  fs.writeFileSync(indexPath, md, 'utf-8');

  console.log(`\n==> Documentação gerada com sucesso!`);
  console.log(`    Arquivo principal: ${indexPath}`);
  console.log(`    Total de telas documentadas: ${inventory.length}`);
}

run().catch(err => {
  console.error('Falha na execução:', err);
  process.exit(1);
});
