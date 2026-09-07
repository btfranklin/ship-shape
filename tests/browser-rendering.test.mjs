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

test('ship conditions preserve seeded surfaces and expose real holes', { timeout: 120000 }, async () => {
  await auditPage('/index.html', async (page) => {
    const results = await page.evaluate(async (repoRoot) => {
      const { CompositeShipGenerator, drawCapitalShip } = await import(`/@fs${repoRoot}/src/capitalships/index.ts`);
      const { RNG, HSBAColor } = await import(`/@fs${repoRoot}/src/greebles/index.ts`);
      const results = [];
      for (const archetype of ['freight', 'science', 'industry', 'passenger', 'combat']) {
        const render = (condition, legacy = false, damageSeed = 42, cutAway = 0.5) => {
          const canvas = document.createElement('canvas');
          canvas.width = 1800;
          canvas.height = 1200;
          const ctx = canvas.getContext('2d');
          const rng = new RNG(12345);
          const components = new CompositeShipGenerator().generate(1800, 1200, new HSBAColor(0.55, 0.1, 0.6), rng, archetype, 600);
          if (legacy) for (const component of components) component.draw(ctx, rng);
          else drawCapitalShip(ctx, components, rng, { condition, damageSeed, cutAway });
          return { pixels: ctx.getImageData(0, 0, 1800, 1200).data, next: rng.next() };
        };
        const normal = render('normal');
        const legacy = render('normal', true);
        const ghost = render('ghost');
        const derelict = render('derelict');
        const repeat = render('derelict');
        const different = render('derelict', false, 12345);
        const holesOnly = render('derelict', false, 42, 0);
        const mostlyGone = render('derelict', false, 42, 0.8);
        const rightEdge = (pixels) => {
          let edge = 0;
          for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] > 240) edge = Math.max(edge, ((i - 3) / 4) % 1800);
          }
          return edge;
        };
        let removed = 0, retained = 0, lit = 0, dark = 0;
        for (let i = 0; i < ghost.pixels.length; i += 4) {
          if (ghost.pixels[i + 3] > 240 && derelict.pixels[i + 3] === 0) removed++;
          if (ghost.pixels[i + 3] > 240 && ghost.pixels.slice(i, i + 4).every((v, j) => v === derelict.pixels[i + j])) retained++;
          lit += normal.pixels[i] + normal.pixels[i + 1] + normal.pixels[i + 2];
          dark += ghost.pixels[i] + ghost.pixels[i + 1] + ghost.pixels[i + 2];
        }
        results.push({ archetype, removed, retained, lit, dark,
          cutLengths: rightEdge(mostlyGone.pixels) < rightEdge(derelict.pixels) - 100 && rightEdge(derelict.pixels) < rightEdge(holesOnly.pixels) - 200,
          normalUnchanged: normal.pixels.every((v, i) => v === legacy.pixels[i]),
          repeatable: derelict.pixels.every((v, i) => v === repeat.pixels[i]),
          different: derelict.pixels.some((v, i) => v !== different.pixels[i]),
          rngUnchanged: normal.next === ghost.next && ghost.next === derelict.next
        });
      }
      return results;
    }, REPO_ROOT);
    for (const result of results) {
      assert.ok(result.cutLengths, `${result.archetype}: larger cuts must remove more ship length`);
      assert.ok(result.normalUnchanged, `${result.archetype}: normal rendering changed`);
      assert.ok(result.repeatable && result.different, `${result.archetype}: damage seed must control output`);
      assert.ok(result.rngUnchanged, `${result.archetype}: condition changed the surface RNG`);
      assert.ok(result.dark < result.lit, `${result.archetype}: ghost lights must be off`);
      assert.ok(result.removed > 1000, `${result.archetype}: damage must remove hull pixels`);
      assert.ok(result.retained > 1000, `${result.archetype}: damage must retain hull detail`);
    }
    await page.locator('#seedInput').fill('42');
    for (const condition of ['ghost', 'derelict']) {
      await setControl(page, '#modeSelect', condition);
      await page.locator('#rainbowCheck').check();
      await assertCanvasHasMeaningfulOutput(page.locator('#appCanvas'), condition);
      await assertCanvasTransformIsIdentity(page.locator('#appCanvas'), condition);
    }
  });
});

test('unpowered window openings stay visible without bloom', { timeout: 120000 }, async () => {
  await auditPage('/index.html', async (page) => {
    const results = await page.evaluate(async (repoRoot) => {
      const { CapitalShipWindowsGreebles, SphereWindowsGreebles, RNG, HSBAColor } = await import(`/@fs${repoRoot}/src/greebles/index.ts`);
      return [CapitalShipWindowsGreebles, SphereWindowsGreebles].map((Windows) => {
        const theme = new HSBAColor(0.55, 0.1, 0.6);
        const windows = Windows === CapitalShipWindowsGreebles
          ? new Windows(2, 2, theme, 3)
          : new Windows(2, 2, theme, CapitalShipWindowsGreebles.BLUE_LIGHT);
        const draw = (mode) => {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 600;
          const ctx = canvas.getContext('2d');
          ctx.scale(300, 300);
          const rng = new RNG(12345);
          if (mode === 'lights') windows.drawLights(ctx, rng);
          else windows.drawPanels(ctx, rng, mode === 'dark');
          return { pixels: ctx.getImageData(0, 0, 600, 600).data, next: rng.next() };
        };
        const panels = draw('panels');
        const dark = draw('dark');
        const lights = draw('lights');
        let litCores = 0, darkCores = 0, changedPanelPixels = 0;
        for (let i = 0; i < lights.pixels.length; i += 4) {
          if (lights.pixels[i + 3] === 0 && panels.pixels.slice(i, i + 4).some((value, channel) => value !== dark.pixels[i + channel])) {
            changedPanelPixels++;
          }
          if (lights.pixels[i + 3] > 150 && lights.pixels[i + 2] > 200) {
            litCores++;
            if (dark.pixels[i] < 65 && dark.pixels[i + 1] < 75 && dark.pixels[i + 2] < 85 && dark.pixels[i + 3] === 255) darkCores++;
          }
        }
        return { name: Windows.name, litCores, darkCores, changedPanelPixels,
          visible: panels.pixels.some((value, i) => value !== dark.pixels[i]),
          sameRng: panels.next === dark.next && dark.next === lights.next };
      });
    }, REPO_ROOT);
    for (const result of results) {
      assert.equal(result.changedPanelPixels, 0, `${result.name}: panel gaps must stay unchanged`);
      assert.ok(result.visible, `${result.name}: dark openings must differ from blank panels`);
      assert.ok(result.sameRng, `${result.name}: window positions must retain their RNG sequence`);
      assert.ok(result.litCores > 10, `${result.name}: fixture must contain lit windows`);
      assert.ok(result.darkCores / result.litCores > 0.9, `${result.name}: lit cores must become opaque dark openings`);
    }
  });
});

test('attached wreckage extends beyond the old hull with a bounded reach', { timeout: 120000 }, async () => {
  await auditPage('/index.html', async (page) => {
    const results = await page.evaluate(async (repoRoot) => {
      const { planShipDamage, drawDamageEdges, drawDamageInterior } = await import(`/@fs${repoRoot}/src/capitalships/shipDamage.ts`);
      const { RNG } = await import(`/@fs${repoRoot}/src/greebles/index.ts`);
      const bounds = { x: 150, y: 150, w: 700, h: 200 };
      const silhouette = new Path2D();
      silhouette.rect(bounds.x, bounds.y, bounds.w, bounds.h);
      const results = [];
      for (const cutAway of [0, 0.5]) {
        const damage = planShipDamage(bounds, [bounds], new RNG(42), cutAway);
        for (const layer of ['front', 'interior']) {
          const canvas = document.createElement('canvas');
          canvas.width = 1000;
          canvas.height = 500;
          const ctx = canvas.getContext('2d');
          if (layer === 'front') drawDamageEdges(ctx, damage, silhouette, bounds, new RNG(42));
          else drawDamageInterior(ctx, damage, silhouette, bounds, new RNG(42));
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let outside = 0, tooFar = 0;
          for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] < 30) continue;
            const x = ((i - 3) / 4) % canvas.width;
            const y = Math.floor((i - 3) / 4 / canvas.width);
            if (x < 148 || x > 852 || y < 148 || y > 352) outside++;
            if (x < 50 || x > 950 || y < 50 || y > 450) tooFar++;
          }
          results.push({ cutAway, layer, outside, tooFar });
        }
      }
      return results;
    }, REPO_ROOT);
    for (const result of results) {
      assert.ok(result.outside > 20, `${result.layer}, cut ${result.cutAway}: fragments must extend outside the hull`);
      assert.equal(result.tooFar, 0, `${result.layer}, cut ${result.cutAway}: fragments must stay near their roots`);
    }
  });
});
