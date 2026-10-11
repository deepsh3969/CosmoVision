/**
 * CosmoVision end-to-end smoke test.
 *
 * Boots the production build with `vite preview`, drives a real headless Chrome
 * (software WebGL), exercises search + keyboard navigation and captures the
 * screenshots used by the README. Run via `npm run test:e2e`.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}/`;
const SCREENSHOTS = path.join(ROOT, 'screenshots');

const CHROME_CANDIDATES = [
  process.env.COSMOVISION_CHROME,
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    'No Chrome/Edge executable found. Set COSMOVISION_CHROME to a browser binary and retry.',
  );
}

function startPreview() {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const child = spawn(
    command,
    ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    {
      cwd: ROOT,
      stdio: 'pipe',
      shell: process.platform === 'win32',
      detached: process.platform !== 'win32',
    },
  );
  return child;
}

function stopPreview(server) {
  if (!server?.pid) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  try {
    process.kill(-server.pid);
  } catch {
    server.kill();
  }
}

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE);
      if (response.ok) return;
    } catch {
      /* server not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Preview server did not answer on ${BASE} within ${timeoutMs} ms`);
}

async function waitFor(page, selector, timeoutMs = 20_000) {
  await page.waitForSelector(selector, { timeout: timeoutMs });
}

async function main() {
  if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    throw new Error('dist/ is missing — run `npm run build` before the e2e test.');
  }

  mkdirSync(SCREENSHOTS, { recursive: true });

  const server = startPreview();
  server.stdout?.on('data', (chunk) => console.log('[preview]', chunk.toString().trim()));
  server.stderr?.on('data', (chunk) => console.error('[preview]', chunk.toString().trim()));
  let browser = null;
  let page = null;
  let failed = false;

  try {
    await waitForServer();
    console.log(`preview up on ${BASE}`);

    browser = await puppeteer.launch({
      executablePath: findChrome(),
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--enable-unsafe-swiftshader',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--window-size=1440,900',
      ],
      defaultViewport: { width: 1440, height: 900 },
    });

    page = await browser.newPage();
    page.on('pageerror', (error) => console.error('page error:', error.message));

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });

    // Boot overlay disappears once the store flips bootReady.
    await waitFor(page, '.app');
    await page.waitForSelector('.loading-screen', { hidden: true, timeout: 30_000 });
    console.log('boot complete');

    const webglOk = await page.$('canvas');
    const fallback = await page.$('.webgl-fallback');
    if (!webglOk || fallback) {
      await page.screenshot({ path: path.join(SCREENSHOTS, 'webgl-fallback.png') });
      throw new Error('WebGL context did not start — canvas missing or fallback shown.');
    }
    await page.screenshot({ path: path.join(SCREENSHOTS, 'home.png') });
    console.log('captured screenshots/home.png');

    // Search → focus Mars.
    await page.keyboard.press('Slash');
    await waitFor(page, '.search-overlay');
    await page.keyboard.type('mars');
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => document.querySelector('.panel__title')?.textContent === 'Mars',
      { timeout: 15_000 },
    );
    console.log('search + focus: Mars');

    // The focus glide across scale regimes takes ~3 s of damped camera travel.
    await new Promise((resolve) => setTimeout(resolve, 4500));
    await page.screenshot({ path: path.join(SCREENSHOTS, 'mars-focus.png') });
    console.log('captured screenshots/mars-focus.png');

    // Keyboard: open galaxy panel, verify sliders exist.
    await page.keyboard.press('Escape');
    await page.click('button[title="Galaxy explorer"]');
    await waitFor(page, 'input[type="range"]');
    console.log('galaxy explorer panel opens');
    await page.screenshot({ path: path.join(SCREENSHOTS, 'galaxy-panel.png') });
    console.log('captured screenshots/galaxy-panel.png');

    // Simulation toggle via Space.
    const chipBefore = await page.$eval('.topbar .chip', (el) => el.textContent ?? '');
    await page.keyboard.press('Space');
    const chipAfter = await page.$eval('.topbar .chip', (el) => el.textContent ?? '');
    if (chipBefore === chipAfter) throw new Error('Space did not toggle the simulation state chip');
    console.log(`simulation toggle works (${chipBefore.trim()} → ${chipAfter.trim()})`);

    console.log('e2e: all checks passed');
  } catch (error) {
    failed = true;
    console.error('e2e failed:', error.message);
    if (page) {
      try {
        const state = await page.evaluate(() => ({
          overlay: Boolean(document.querySelector('.search-overlay')),
          panelTitle: document.querySelector('.panel__title')?.textContent ?? null,
          chips: [...document.querySelectorAll('.topbar .chip')].map((el) => el.textContent),
          topbarButtons: [...document.querySelectorAll('.topbar button')].map((el) => el.textContent),
        }));
        console.error('page state:', JSON.stringify(state));
        await page.screenshot({ path: path.join(SCREENSHOTS, 'e2e-failure.png') });
      } catch {
        /* page may already be closed */
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    stopPreview(server);
    await rm(path.join(ROOT, 'dist', '.vite'), { recursive: true, force: true }).catch(() => {});
  }

  process.exit(failed ? 1 : 0);
}

main();
