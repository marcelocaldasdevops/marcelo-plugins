#!/usr/bin/env node
/**
 * playwright-config.mjs
 * Configuração e utilitários compartilhados do Playwright para todas as skills
 * do plugin `documentacao-sistema-playwright` (Documentação e Testes E2E).
 */

import fs from 'fs';
import path from 'path';

export const PLAYWRIGHT_DEFAULTS = Object.freeze({
  headless: true,
  viewport: { width: 1440, height: 900 },
  navigationTimeout: 30000,
  actionTimeout: 10000,
  waitUntil: 'networkidle',
  screenshotFullPage: true,
});

/**
 * Normaliza textos, rotas ou nomes de branch em slugs seguros para arquivos e âncoras.
 */
export function slugify(text, fallback = 'item') {
  return (
    String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback
  );
}

/**
 * Parser leve de argumentos CLI suportando `--chave valor`, `--chave=valor` e flags booleanas.
 */
export function parseCliArgs(argv = process.argv.slice(2)) {
  const flags = {};
  const positionals = [];

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('-')) {
      positionals.push(token);
      continue;
    }

    if (token === '-h' || token === '--help') {
      flags.help = true;
      continue;
    }

    if (token.startsWith('--')) {
      const eqIdx = token.indexOf('=');
      if (eqIdx !== -1) {
        const key = token.slice(2, eqIdx);
        flags[key] = token.slice(eqIdx + 1);
      } else {
        const key = token.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('-')) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    }
  }

  return {
    flags,
    positionals,
    get(name, defaultValue = null) {
      const cleanName = name.replace(/^--/, '');
      if (Object.prototype.hasOwnProperty.call(flags, cleanName)) {
        return flags[cleanName];
      }
      return defaultValue;
    },
    getBool(name, defaultValue = false) {
      const cleanName = name.replace(/^--/, '');
      if (!Object.prototype.hasOwnProperty.call(flags, cleanName)) {
        return defaultValue;
      }
      const val = flags[cleanName];
      if (typeof val === 'boolean') return val;
      return !['false', '0', 'no', 'nao', 'off'].includes(String(val).toLowerCase());
    },
    getNumber(name, defaultValue) {
      const cleanName = name.replace(/^--/, '');
      if (!Object.prototype.hasOwnProperty.call(flags, cleanName)) {
        return defaultValue;
      }
      const num = Number(flags[cleanName]);
      return Number.isFinite(num) ? num : defaultValue;
    },
  };
}

/**
 * Carrega o pacote `playwright` dinamicamente com mensagem clara caso não esteja instalado.
 */
export async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch (err) {
    throw new Error(
      "O pacote 'playwright' não está instalado globalmente ou neste projeto.\n" +
        'Instale executando: npm install -D playwright && npx playwright install chromium'
    );
  }
}

/**
 * Inicia o Chromium reutilizando os padrões de viewport, timeout e sessão autenticada do plugin.
 */
export async function createBrowserSession(options = {}) {
  const pw = await loadPlaywright();
  const headless =
    options.headless !== undefined ? Boolean(options.headless) : PLAYWRIGHT_DEFAULTS.headless;
  const viewport = options.viewport || PLAYWRIGHT_DEFAULTS.viewport;
  const navigationTimeout = options.navigationTimeout ?? PLAYWRIGHT_DEFAULTS.navigationTimeout;
  const actionTimeout = options.actionTimeout ?? PLAYWRIGHT_DEFAULTS.actionTimeout;

  const browser = await pw.chromium.launch({ headless });

  const contextOptions = {
    viewport,
    ignoreHTTPSErrors: Boolean(options.ignoreHTTPSErrors),
  };

  if (options.baseURL) {
    contextOptions.baseURL = options.baseURL;
  }

  if (options.storageState) {
    const resolvedState = path.resolve(options.storageState);
    if (fs.existsSync(resolvedState)) {
      contextOptions.storageState = resolvedState;
    } else {
      console.warn(`Aviso: storageState não encontrado em '${resolvedState}'. Seguindo sem sessão prévia.`);
    }
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(navigationTimeout);
  page.setDefaultTimeout(actionTimeout);

  return { browser, context, page };
}

/**
 * Aguarda estabilização de carregamento da página com fallback seguro para SPAs com SSE/WebSocket.
 */
export async function waitForPageStable(page, options = {}) {
  const timeout = options.timeout ?? PLAYWRIGHT_DEFAULTS.navigationTimeout;
  const waitUntil = options.waitUntil ?? PLAYWRIGHT_DEFAULTS.waitUntil;
  const settleMs = options.settleMs ?? 300;

  try {
    await page.waitForLoadState(waitUntil, { timeout: Math.min(timeout, 10000) });
  } catch {
    await page.waitForLoadState('domcontentloaded', { timeout: Math.min(timeout, 5000) }).catch(() => {});
  }

  if (settleMs > 0) {
    await page.waitForTimeout(settleMs);
  }
}

/**
 * Remove credenciais, tokens e parâmetros sensíveis de logs, URLs e mensagens antes de persistir.
 */
export function sanitizeSensitiveText(input) {
  if (input === null || input === undefined) return '';
  let text = String(input);

  // Tokens Bearer / JWT
  text = text.replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1[REDACTED]');
  text = text.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[JWT_REDACTED]');

  // Query params e pares chave=valor sensíveis
  text = text.replace(
    /((?:password|passwd|senha|secret|token|access_token|refresh_token|api_key|apikey|authorization|cookie|cpf|cnpj)\s*[=:]\s*["']?)([^&\s"',;}\]]+)/gi,
    '$1[REDACTED]'
  );

  return text;
}

/**
 * Anexa coletores de console, exceções não tratadas (pageerror) e falhas HTTP/rede (4xx/5xx)
 * para monitoramento passo a passo em execuções E2E.
 */
export function attachTelemetry(page, options = {}) {
  const captureWarnings = Boolean(options.captureWarnings);
  const events = [];

  const pushEvent = (event) => {
    events.push({
      id: events.length + 1,
      timestamp: new Date().toISOString(),
      ...event,
    });
  };

  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || (captureWarnings && type === 'warning')) {
      const loc = msg.location?.() || {};
      pushEvent({
        category: type === 'error' ? 'console_error' : 'console_warning',
        severity: type === 'error' ? 'error' : 'warning',
        message: sanitizeSensitiveText(msg.text()),
        location: loc.url ? `${sanitizeSensitiveText(loc.url)}:${loc.lineNumber ?? 0}` : null,
      });
    }
  });

  page.on('pageerror', (err) => {
    pushEvent({
      category: 'pageerror',
      severity: 'error',
      message: sanitizeSensitiveText(err?.message || String(err)),
      stack: err?.stack ? sanitizeSensitiveText(err.stack).slice(0, 1500) : null,
    });
  });

  page.on('response', async (response) => {
    const status = response.status();
    if (status < 400) return;

    const req = response.request();
    let responseSnippet = null;
    try {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('json') || contentType.includes('text')) {
        const body = await response.text();
        responseSnippet = sanitizeSensitiveText(body).slice(0, 500);
      }
    } catch {
      // Corpo indisponível (redirect, stream encerrado ou CORS)
    }

    pushEvent({
      category: 'http_error',
      severity: status >= 500 ? 'error' : 'http_4xx',
      status,
      statusText: response.statusText(),
      method: req.method(),
      url: sanitizeSensitiveText(response.url()),
      resourceType: req.resourceType(),
      message: `${req.method()} ${sanitizeSensitiveText(response.url())} → HTTP ${status} ${response.statusText()}`.trim(),
      responseBody: responseSnippet,
    });
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure();
    const errorText = failure?.errorText || 'Falha de rede desconhecida';
    // Ignora cancelamentos normais de navegação/abort pelo cliente
    if (errorText.includes('ERR_ABORTED')) return;

    pushEvent({
      category: 'request_failed',
      severity: 'error',
      method: req.method(),
      url: sanitizeSensitiveText(req.url()),
      resourceType: req.resourceType(),
      message: `${req.method()} ${sanitizeSensitiveText(req.url())} falhou: ${sanitizeSensitiveText(errorText)}`,
    });
  });

  return {
    mark() {
      return events.length;
    },
    getSince(cursor = 0) {
      return events.slice(cursor);
    },
    getAll() {
      return [...events];
    },
  };
}
