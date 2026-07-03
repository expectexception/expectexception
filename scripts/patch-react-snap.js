/*
  Patch react-snap to work with modern Puppeteer versions.
  react-snap@1.23.0 uses `page._client.send(...)` which relies on a Puppeteer internal.
  In newer Puppeteer builds this internal isn't present, causing:
    TypeError: page._client.send is not a function

  We patch it to use a supported CDP session:
    const client = page._client || (await page.target().createCDPSession());
    await client.send('ServiceWorker.disable');

  This file is intentionally small and idempotent.
*/

const fs = require('fs');
const path = require('path');

const puppeteerUtilsTarget = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-snap',
  'src',
  'puppeteer_utils.js'
);

const trackerTarget = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-snap',
  'src',
  'tracker.js'
);

function patchPuppeteerUtils() {
  if (!fs.existsSync(puppeteerUtilsTarget)) {
    // react-snap not installed (yet)
    return;
  }

  let content = fs.readFileSync(puppeteerUtilsTarget, 'utf8');

  // Already patched
  if (content.includes('createCDPSession') && content.includes('ServiceWorker.disable')) {
    return;
  }

  const needle = 'await page._client.send("ServiceWorker.disable");';
  if (!content.includes(needle)) {
    // Unexpected upstream change; don't corrupt the file.
    console.warn('[patch-react-snap] puppeteer_utils.js: expected line not found; skipping patch');
    return;
  }

  const replacement = [
    "const client = page._client && typeof page._client.send === 'function' ? page._client : await page.target().createCDPSession();",
    'await client.send("ServiceWorker.disable");',
  ].join('\n        ');

  content = content.replace(needle, replacement);
  fs.writeFileSync(puppeteerUtilsTarget, content);
  console.log('[patch-react-snap] Patched react-snap puppeteer_utils.js for CDP session compatibility');
}

function patchTracker() {
  if (!fs.existsSync(trackerTarget)) {
    return;
  }

  let content = fs.readFileSync(trackerTarget, 'utf8');

  // Already patched
  if (content.includes('page.off') || content.includes('detach("request"')) {
    return;
  }

  const disposeNeedle = [
    'dispose: () => {',
    '      page.removeListener("request", onStarted);',
    '      page.removeListener("requestfinished", onFinished);',
    '      page.removeListener("requestfailed", onFinished);',
    '    }',
  ].join('\n');

  if (!content.includes(disposeNeedle)) {
    console.warn('[patch-react-snap] tracker.js: expected dispose block not found; skipping patch');
    return;
  }

  const disposeReplacement = [
    'dispose: () => {',
    '      const detach = page.off ? page.off.bind(page) : page.removeListener ? page.removeListener.bind(page) : null;',
    '      if (!detach) return;',
    '      detach("request", onStarted);',
    '      detach("requestfinished", onFinished);',
    '      detach("requestfailed", onFinished);',
    '    }',
  ].join('\n');

  content = content.replace(disposeNeedle, disposeReplacement);
  fs.writeFileSync(trackerTarget, content);
  console.log('[patch-react-snap] Patched react-snap tracker.js for Puppeteer EventEmitter compatibility');
}

try {
  patchPuppeteerUtils();
  patchTracker();
} catch (e) {
  console.error('[patch-react-snap] Failed:', e);
  process.exitCode = 0; // don't break installs
}
