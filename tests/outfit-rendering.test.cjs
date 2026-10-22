// PLAYWRIGHT_MODULE and CHROME_PATH may point to an existing local installation.
// OUTFIT_GALLERY optionally saves the default look and all collection front/back previews.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

(async () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(process.env.OUTFIT_HTML || path.join(root, 'index.html'));
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') return res.end(html);
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    fs.readFile(file, (error, data) => error ? res.writeHead(404).end() : res.end(data));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
    const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 2 });
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.waitForFunction(() => typeof fitDrawModel === 'function' && typeof FIT_COLLECTIONS !== 'undefined');
    const result = await page.evaluate(() => {
      const saved = { ctx, H, W, time, ball, charType };
      const canvas = document.createElement('canvas');
      canvas.width = 480; canvas.height = 360;
      const g = canvas.getContext('2d');
      const failures = [];
      let previews = 0, motions = 0;
      const prototype = CanvasRenderingContext2D.prototype, originals = new Map();
      for (const name of ['moveTo', 'lineTo', 'arc', 'ellipse', 'bezierCurveTo', 'quadraticCurveTo', 'roundRect', 'fillRect', 'translate', 'rotate', 'scale', 'transform', 'createLinearGradient']) {
        const original = prototype[name]; originals.set(name, original);
        prototype[name] = function (...args) {
          if (args.some(arg => typeof arg === 'number' && !Number.isFinite(arg))) throw new Error(`Non-finite Canvas ${name}: ${args}`);
          return original.apply(this, args);
        };
      }
      const check = (ok, message) => { if (!ok) failures.push(message); };
      const visible = c => c.getImageData(0, 0, c.canvas.width, c.canvas.height).data.some((v, i) => i % 4 === 3 && v);
      const state = c => JSON.stringify([c.getTransform().toJSON(), c.globalAlpha, c.globalCompositeOperation, c.getLineDash(), c.shadowBlur]);
      try {
        charType = 'pastor'; ball = null; time = 3;
        const all = [
          ...FIT_TOPS.map(([id]) => ({ top: id })),
          ...FIT_BOTS.map(([id]) => ({ bot: id })),
          ...FIT_ACC.map(([id, , slot]) => ({ [slot]: id })),
        ];
        for (const fit of all) for (const back of [false, true]) {
          const v = document.createElement('canvas');
          const oldCtx = ctx, oldH = H;
          fitDrawModel(v, fit, back);
          check(ctx === oldCtx && H === oldH, `Preview leaked globals: ${JSON.stringify(fit)}`);
          check(visible(v.getContext('2d')), `Empty preview: ${JSON.stringify(fit)}`);
          previews++;
        }
        ctx = g; W = 480;
        const motionFits = [...FIT_COLLECTIONS, ...FIT_BOTS.filter(([id]) => ['jeans', 'cargo', 'armor', 'jogger'].includes(id)).map(([id]) => ({ id, fit: { bot: id } }))];
        for (const collection of motionFits) {
          for (const character of ['pastor', 'jersey']) {
            const look = withFit(LOOKS[character], collection.fit);
            for (const scale of [.65, 1.3]) for (const back of [false, true]) {
              H = back ? 10 : 4000;
              for (const [stroke, crouch] of [['drive', 0], ['back', .8], ['smash', 1]]) {
                g.clearRect(0, 0, 480, 360);
                const before = state(g);
                person({ x: 230, vx: 100, crouch, legLen: 44 * scale, lean: .3 }, 220,
                  { x: 285, y: 145 }, .35, look, scale, 'shake', '#16161a', 1, stroke, .12);
                check(state(g) === before, `Canvas state leak: ${collection.id}/${stroke}`);
                check(visible(g), `Empty motion: ${collection.id}/${stroke}`);
                motions++;
              }
            }
            for (const at of [.2, 1.6, 4.3, 8.7]) {
              g.clearRect(0, 0, 480, 360);
              const before = state(g);
              victoryFigure(look, { x: 230, y: 280 }, victoryDancePose(at), 1.3);
              check(state(g) === before, `Victory state leak: ${collection.id}/${at}`);
              check(visible(g), `Empty victory: ${collection.id}/${at}`);
              motions++;
            }
          }
        }
        for (const [kind, tile] of fitFabricTiles) check(fitFabric(kind) === tile, `Fabric cache miss: ${kind}`);
        check(fitFabricTiles.size <= 8, 'Unbounded fabric tile cache');
        return { previews, motions, fabrics: [...fitFabricTiles.keys()], failures };
      } finally {
        ({ ctx, H, W, time, ball, charType } = saved);
        for (const [name, original] of originals) prototype[name] = original;
      }
    });
    assert.deepEqual(result.failures, []);
    assert.ok(result.previews > 200 && result.motions >= 300);
    if (process.env.OUTFIT_GALLERY) {
      await page.evaluate(() => {
        document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
        const gallery = document.createElement('div');
        gallery.id = 'outfit-test-gallery';
        gallery.style.cssText = 'position:absolute;z-index:999999;top:0;left:0;width:1480px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px;background:#151a29;color:#fff;box-sizing:border-box;font:14px sans-serif';
        const old = charType; charType = 'pastor';
        try {
          const details = [
            ...FIT_BOTS.filter(([id]) => ['jeans', 'cargo', 'armor', 'jogger'].includes(id)).map(([id, name]) => ({ name, fit: { bot: id } })),
            ...FIT_TOPS.filter(([id]) => ['hawaii', 'plaid', 'tux'].includes(id)).map(([id, name]) => ({ name, fit: { top: id } })),
          ];
          for (const collection of [{ name: '기본 코디', fit: {} }, ...FIT_COLLECTIONS, ...details]) {
            const card = document.createElement('div');
            card.style.cssText = 'background:#252c3d;border:1px solid #4c586f;border-radius:12px;padding:8px;text-align:center';
            const title = document.createElement('div'); title.textContent = collection.name + ' · 앞 / 뒤'; card.append(title);
            for (const back of [false, true]) {
              const v = document.createElement('canvas'); v.style.cssText = 'width:160px;height:205px;display:inline-block';
              fitDrawModel(v, collection.fit, back); card.append(v);
            }
            gallery.append(card);
          }
        } finally { charType = old; }
        document.body.append(gallery);
      });
      await page.locator('#outfit-test-gallery').screenshot({ path: process.env.OUTFIT_GALLERY });
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify(result));
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
