import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import {
  assertCanvasHasMeaningfulOutput,
  assertCanvasTransformIsIdentity,
  openAuditedPage,
} from './canvas-audit.mjs';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '..');

let browser;
let server;
let baseUrl;

function auditPage(relativeUrl, run) {
  return openAuditedPage({ browser, baseUrl, relativeUrl, run });
}

async function setControl(page, selector, value) {
  await page.locator(selector).selectOption(value);
  await page.waitForTimeout(25);
}

test.before(async () => {
  server = await createServer({
    configFile: path.join(REPO_ROOT, 'vite.config.ts'),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  assert.ok(address && typeof address === 'object', 'Vite did not expose a listening address');
  baseUrl = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
}, { timeout: 120000 });

test.after(async () => {
  await browser?.close();
  await server?.close();
});

test('all documented playgrounds render through native Chromium canvas APIs', { timeout: 120000 }, async () => {
  const pages = [
    ['/greeble_showcase.html', '#grid canvas', 14],
    ['/element_showcase.html', '#list canvas', 1],
  ];

  for (const [relativeUrl, selector, minimumCount] of pages) {
    const audit = await auditPage(relativeUrl, async (page) => {
      await page.waitForFunction(
        ({ selector, minimumCount }) => document.querySelectorAll(selector).length >= minimumCount,
        { selector, minimumCount }
      );
      const canvases = page.locator(selector);
      const count = await canvases.count();
      assert.ok(count >= minimumCount, `${relativeUrl} should expose representative canvases`);
      for (let index = 0; index < count; index++) {
        await assertCanvasHasMeaningfulOutput(canvases.nth(index), `${relativeUrl} canvas ${index}`);
      }
    });

    const drawCalls = (audit.calls['CanvasRenderingContext2D.fill'] ?? 0)
      + (audit.calls['CanvasRenderingContext2D.stroke'] ?? 0)
      + (audit.calls['CanvasRenderingContext2D.fillRect'] ?? 0);
    assert.ok(drawCalls > 0, `${relativeUrl} should execute native drawing calls`);
  }
});

test('capital ship archetypes and emissive compositing render with fixed seeds', { timeout: 120000 }, async () => {
  const audit = await auditPage('/index.html', async (page) => {
    await page.locator('#appCanvas').waitFor();
    await page.locator('#seedInput').fill('12345');
    await setControl(page, '#modeSelect', 'full');
    await assert.ok(await page.locator('#rainbowControl').isVisible());

    for (const archetype of ['freight', 'science', 'industry', 'passenger', 'combat']) {
      await setControl(page, '#archetypeSelect', archetype);
      await page.locator('#generateBtn').click();
      await assertCanvasHasMeaningfulOutput(page.locator('#appCanvas'), `${archetype} capital ship`);
      await assertCanvasTransformIsIdentity(page.locator('#appCanvas'), `${archetype} capital ship`);
    }

    await page.locator('#seedInput').fill('7185');
    await setControl(page, '#archetypeSelect', 'random');
    await page.locator('#generateBtn').click();
    await assert.strictEqual(
      await page.locator('#archetypeDisplay').textContent(),
      'Archetype: FREIGHT'
    );
    const randomArchetypePixels = await page.locator('#appCanvas').evaluate(
      (canvas) => canvas.toDataURL()
    );

    await setControl(page, '#archetypeSelect', 'freight');
    await page.locator('#generateBtn').click();
    const selectedArchetypePixels = await page.locator('#appCanvas').evaluate(
      (canvas) => canvas.toDataURL()
    );
    assert.equal(
      randomArchetypePixels,
      selectedArchetypePixels,
      'seed 7185 must render the same Freight ship in Random and Freight modes'
    );

    await page.locator('#rainbowCheck').check();
    await setControl(page, '#archetypeSelect', 'science');
    await setControl(page, '#modeSelect', 'shape');
    await assert.equal(await page.locator('#rainbowControl').isVisible(), false);
    await assert.equal(await page.locator('#rainbowCheck').isChecked(), false);
    await page.locator('#generateBtn').click();
    await assertCanvasHasMeaningfulOutput(page.locator('#appCanvas'), 'capital ship wireframe');
    await assertCanvasTransformIsIdentity(page.locator('#appCanvas'), 'capital ship wireframe');
    assert.deepEqual(
      await page.locator('#appCanvas').evaluate((canvas) => (
        [...canvas.getContext('2d').getImageData(0, 0, 1, 1).data]
      )),
      [0, 0, 0, 255],
      'wireframe mode should paint an opaque black background'
    );

    const greeblesModuleUrl = new URL(
      `/@fs${path.join(REPO_ROOT, 'src/greebles/index.ts')}`,
      baseUrl
    ).href;
    await page.evaluate(async (moduleUrl) => {
      const { CapitalShipSurfaceGreebles, HSBAColor, RNG } = await import(moduleUrl);
      const canvas = document.createElement('canvas');
      canvas.id = 'emissiveAuditCanvas';
      canvas.width = 900;
      canvas.height = 600;
      document.body.append(canvas);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to create emissive audit context');
      const surface = new CapitalShipSurfaceGreebles(
        1.5,
        1,
        HSBAColor.fromRGBA(150, 155, 160),
        'industry',
        'hull',
        false,
        true
      );
      const rng = new RNG(90125);
      context.save();
      context.scale(600, 600);
      const preparedSurface = surface.prepare(rng);
      preparedSurface.drawBase(context);
      preparedSurface.drawEmissive(context);
      context.restore();
    }, greeblesModuleUrl);
    await assertCanvasHasMeaningfulOutput(page.locator('#emissiveAuditCanvas'), 'emissive surface');
    await assertCanvasTransformIsIdentity(page.locator('#emissiveAuditCanvas'), 'emissive surface');
  });

  const compositeCalls = (audit.calls['CanvasRenderingContext2D.drawImage'] ?? 0)
    + (audit.calls['OffscreenCanvasRenderingContext2D.drawImage'] ?? 0);
  assert.ok(compositeCalls > 0, 'emissive rendering should composite native canvases with drawImage');
  assert.ok((audit.calls['Path2D.rect'] ?? 0) + (audit.calls['Path2D.lineTo'] ?? 0) > 0, 'native Path2D geometry should be exercised');
});
