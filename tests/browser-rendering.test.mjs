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

test('playground tabs support keyboard navigation and leave the tab list on Tab', { timeout: 120000 }, async () => {
  await auditPage('/index.html', async (page) => {
    const capitalTab = page.locator('#tab-capital-button');
    const greebleTab = page.locator('#tab-greebles-button');

    const assertActiveTab = async (button, panelId) => {
      const buttonId = await button.getAttribute('id');
      assert.equal(await button.getAttribute('aria-selected'), 'true');
      assert.equal(await button.evaluate((element) => element.tabIndex), 0);
      const inactiveTab = buttonId === 'tab-capital-button' ? greebleTab : capitalTab;
      const inactivePanelId = panelId === 'tab-capital' ? 'tab-greebles' : 'tab-capital';
      assert.equal(await inactiveTab.getAttribute('aria-selected'), 'false');
      assert.equal(await inactiveTab.evaluate((element) => element.tabIndex), -1);
      assert.equal(await page.locator(`#${panelId}`).getAttribute('aria-hidden'), 'false');
      assert.equal(await page.locator(`#${inactivePanelId}`).getAttribute('aria-hidden'), 'true');
      assert.equal(await page.evaluate(() => document.activeElement.id), buttonId);
    };

    await capitalTab.focus();
    await page.keyboard.press('ArrowRight');
    await assertActiveTab(greebleTab, 'tab-greebles');

    await page.keyboard.press('ArrowRight');
    await assertActiveTab(capitalTab, 'tab-capital');

    await page.keyboard.press('ArrowLeft');
    await assertActiveTab(greebleTab, 'tab-greebles');

    await page.keyboard.press('Home');
    await assertActiveTab(capitalTab, 'tab-capital');

    await page.keyboard.press('End');
    await assertActiveTab(greebleTab, 'tab-greebles');

    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'refreshBtn');

    await capitalTab.click();
    assert.equal(await capitalTab.getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#tab-capital').getAttribute('aria-hidden'), 'false');
  });
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

test('caller transforms preserve ship lights and normalized surface clips', { timeout: 120000 }, async () => {
  await auditPage('/index.html', async (page) => {
    const results = await page.evaluate(async (repoRoot) => {
      const { ShipComponent, drawCapitalShip } = await import(`/@fs${repoRoot}/src/capitalships/index.ts`);
      const { RNG, HSBAColor } = await import(`/@fs${repoRoot}/src/greebles/index.ts`);
      const { CapitalShipSurfaceEmissiveRenderer } = await import(`/@fs${repoRoot}/src/greebles/CapitalShipSurfaceEmissiveRenderer.ts`);
      const theme = new HSBAColor(0.55, 0.1, 0.6);
      const hull = new ShipComponent({
        type: 'hull', bounds: { x: 20, y: 20, w: 300, h: 300 },
        zIndex: 0, color: theme, rng: new RNG(1), shipArchetype: 'passenger',
      });
      const countVisible = (canvas) => {
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let visible = 0;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) visible++;
        return visible;
      };
      const shipLights = [];
      for (const [label, transform] of [
        ['identity', [1, 0, 0, 1, 0, 0]],
        ['translated', [1, 0, 0, 1, 500, 0]],
        ['scaled', [1.5, 0, 0, 1.5, 400, 0]],
        ['rotated', [0, 1, -1, 0, 500, 30]],
      ]) {
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(...transform);
        const drawImage = ctx.drawImage.bind(ctx);
        let lightPixels = 0;
        ctx.drawImage = (image, ...args) => {
          lightPixels += countVisible(image);
          drawImage(image, ...args);
        };
        drawCapitalShip(ctx, [hull], new RNG(90125));
        const matrix = ctx.getTransform();
        shipLights.push({ label, lightPixels, transform: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f], expected: transform });
      }
      const surfaceClips = [];
      for (const fallback of [false, true]) {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        ctx.translate(250, 40);
        ctx.scale(200, 200);
        const getTransform = ctx.getTransform;
        if (fallback) ctx.getTransform = undefined;
        const clipPath = new Path2D();
        clipPath.rect(0, 0, 0.5, 1);
        new CapitalShipSurfaceEmissiveRenderer(1, 1, theme).draw(ctx, {
          windows: { seeds: [1], color: HSBAColor.fromRGBA(171, 232, 255) },
          occludersAfterLights: [], occludersAfterWindows: [], occludersAfterCutaways: [],
        }, { clipPath });
        ctx.getTransform = getTransform;
        const pixels = ctx.getImageData(0, 0, 600, 300).data;
        let outside = 0;
        for (let i = 3; i < pixels.length; i += 4) {
          const x = ((i - 3) / 4) % 600;
          if (pixels[i] > 0 && (x < 250 || x >= 350)) outside++;
        }
        const visible = countVisible(canvas);
        ctx.fillStyle = 'white';
        ctx.fillRect(0.75, 0.75, 0.05, 0.05);
        const clipRestored = ctx.getImageData(405, 195, 1, 1).data[3] > 0;
        surfaceClips.push({ fallback, visible, outside, clipRestored });
      }
      return { shipLights, surfaceClips };
    }, REPO_ROOT);
    for (const result of results.shipLights) {
      assert.ok(result.lightPixels > 100, `${result.label}: ship lights must remain visible`);
      assert.deepEqual(result.transform, result.expected, `${result.label}: drawing must restore the caller transform`);
    }
    for (const result of results.surfaceClips) {
      assert.ok(result.visible > 100, `fallback=${result.fallback}: clipping must retain lights`);
      assert.equal(result.outside, 0, `fallback=${result.fallback}: the clip must use normalized surface coordinates`);
      assert.ok(result.clipRestored, `fallback=${result.fallback}: drawing must restore the caller clip`);
    }
  });
});

test('small windows keep the ship canvas visible and controls scrollable', { timeout: 120000 }, async () => {
  const viewports = [
    { width: 800, height: 600 },
    { width: 360, height: 640 },
  ];

  for (const viewport of viewports) {
    await auditPage('/index.html', async (page) => {
      await page.setViewportSize(viewport);
      await page.locator('#appCanvas').waitFor();

      for (const mode of ['full', 'derelict']) {
        await setControl(page, '#modeSelect', mode);
        const canvasSize = await page.locator('#appCanvas').evaluate((canvas) => {
          const { width, height } = canvas.getBoundingClientRect();
          return { width, height };
        });
        assert.ok(
          canvasSize.width >= 150 && canvasSize.height >= 100,
          `${viewport.width}x${viewport.height} ${mode} canvas should stay useful: ${canvasSize.width}x${canvasSize.height}`
        );

        const controls = page.locator('#controls');
        const canScroll = await controls.evaluate((element) => element.scrollHeight > element.clientHeight);
        assert.ok(canScroll, `${viewport.width}x${viewport.height} controls should use a scroll area`);

        const controlCount = await page.locator(
          '#controls input:visible, #controls select:visible, #controls button:visible, #controls a:visible'
        ).count();
        for (let index = 0; index < controlCount; index++) {
          const control = page.locator(
            '#controls input:visible, #controls select:visible, #controls button:visible, #controls a:visible'
          ).nth(index);
          await control.scrollIntoViewIfNeeded();
          const controlPosition = await control.evaluate((element) => {
            const controlBounds = element.getBoundingClientRect();
            const panel = document.querySelector('#controls');
            const panelBounds = panel.getBoundingClientRect();
            return {
              fits: controlBounds.top >= panelBounds.top - 1 && controlBounds.bottom <= panelBounds.bottom + 1,
              controlTop: controlBounds.top,
              controlBottom: controlBounds.bottom,
              panelTop: panelBounds.top,
              panelBottom: panelBounds.bottom,
              scrollTop: panel.scrollTop,
              scrollHeight: panel.scrollHeight,
              clientHeight: panel.clientHeight,
            };
          });
          assert.ok(
            controlPosition.fits,
            `${viewport.width}x${viewport.height} ${mode} control ${index} should be reachable by scrolling: ${JSON.stringify(controlPosition)}`
          );
        }
      }
    });
  }
});

test('ship conditions preserve seeded surfaces and expose real holes', { timeout: 120000 }, async () => {
  await auditPage('/index.html', async (page) => {
    const results = await page.evaluate(async (repoRoot) => {
      const { CompositeShipGenerator, drawCapitalShip } = await import(`/@fs${repoRoot}/src/capitalships/index.ts`);
      const { RNG, HSBAColor } = await import(`/@fs${repoRoot}/src/greebles/index.ts`);
      const results = [];
      for (const archetype of ['freight', 'science', 'industry', 'passenger', 'combat']) {
        const render = (condition, legacy = false, damageSeed = 42, cutAway = 0.5, cutFromRear = false) => {
          const canvas = document.createElement('canvas');
          canvas.width = 1800;
          canvas.height = 1200;
          const ctx = canvas.getContext('2d');
          const rng = new RNG(12345);
          const components = new CompositeShipGenerator().generate(1800, 1200, new HSBAColor(0.55, 0.1, 0.6), rng, archetype, 600);
          if (legacy) for (const component of components) component.draw(ctx, rng);
          else drawCapitalShip(ctx, components, rng, { condition, damageSeed, cutAway, cutFromRear });
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
        const rearCut = render('derelict', false, 42, 0.8, true);
        const rightEdge = (pixels) => {
          let edge = 0;
          for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] > 240) edge = Math.max(edge, ((i - 3) / 4) % 1800);
          }
          return edge;
        };
        const leftEdge = (pixels) => {
          let edge = 1800;
          for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] > 240) edge = Math.min(edge, ((i - 3) / 4) % 1800);
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
          rearRemoved: leftEdge(rearCut.pixels) > leftEdge(mostlyGone.pixels) + 200,
          cutLengths: rightEdge(mostlyGone.pixels) < rightEdge(derelict.pixels) - 100 && rightEdge(derelict.pixels) < rightEdge(holesOnly.pixels) - 200,
          normalUnchanged: normal.pixels.every((v, i) => v === legacy.pixels[i]),
          repeatable: derelict.pixels.every((v, i) => v === repeat.pixels[i]),
          different: derelict.pixels.some((v, i) => v !== different.pixels[i]),
          rngUnchanged: normal.next === ghost.next && ghost.next === derelict.next && rearCut.next === derelict.next
        });
      }
      return results;
    }, REPO_ROOT);
    for (const result of results) {
      assert.ok(result.rearRemoved, `${result.archetype}: rear cuts must remove the engine end`);
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
      if (condition === 'derelict') {
        await page.locator('#cutFromRearCheck').check();
        await assertCanvasHasMeaningfulOutput(page.locator('#appCanvas'), 'rear cut');
        await assertCanvasTransformIsIdentity(page.locator('#appCanvas'), 'rear cut');
      }
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

test('rings retain their own structure, break locally, and disappear without support', { timeout: 120000 }, async () => {
  await auditPage('/index.html', async (page) => {
    const result = await page.evaluate(async (repoRoot) => {
      const { ShipComponent } = await import(`/@fs${repoRoot}/src/capitalships/index.ts`);
      const { drawDamagedRings, drawRingBacks, planRingDamage } = await import(`/@fs${repoRoot}/src/capitalships/ringDamage.ts`);
      const { RNG, HSBAColor } = await import(`/@fs${repoRoot}/src/greebles/index.ts`);
      const ring = new ShipComponent({ type: 'ring', bounds: { x: 400, y: 100, w: 60, h: 300 }, color: new HSBAColor(0.55, 0.1, 0.6), rng: new RNG(1), zIndex: 1000, shipArchetype: 'science' });
      const bounds = { x: 100, y: 200, w: 650, h: 100 };
      const hullPath = new Path2D();
      hullPath.rect(bounds.x, bounds.y, bounds.w, bounds.h);
      const support = [{ shapePath: hullPath, bounds }];
      const breach = (x, y, w, h, kind = 'hole') => {
        const path = new Path2D();
        path.rect(x, y, w, h);
        const edge = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];
        const face = { kind, path, edge, center: { x: x + w / 2, y: y + h / 2 } };
        return { ...face, farHull: face, machinery: face };
      };
      const render = (damage, ordinary = false, back = false) => {
        const canvas = document.createElement('canvas');
        canvas.width = 900;
        canvas.height = 500;
        const ctx = canvas.getContext('2d');
        if (back) drawRingBacks(ctx, [ring], support, damage, new RNG(1));
        if (ordinary) ring.draw(ctx, new RNG(1));
        else drawDamagedRings(ctx, [ring], support, damage, bounds, new RNG(42), new RNG(1));
        return ctx.getImageData(0, 0, 900, 500).data;
      };
      const intact = render([], true);
      const remote = render([breach(650, 220, 40, 40)]);
      const hole = render([breach(412, 230, 36, 40)]);
      const nearby = render([breach(470, 0, 400, 500, 'cut')]);
      const unsupported = render([breach(350, 0, 500, 500, 'cut')], false, true);
      const connected = render([breach(412, 230, 36, 40)], false, true);
      let rearPixels = 0;
      for (let i = 3; i < hole.length; i += 4) {
        if (intact[i] > 240 && hole[i] === 0 && connected[i] > 240
          && connected[i - 1] < intact[i - 1] * 0.5) rearPixels++;
      }
      const frontCut = breach(350, 0, 500, 500, 'cut');
      frontCut.farHull = breach(650, 0, 200, 500, 'cut');
      const farSupported = render([frontCut]);
      const probe = document.createElement('canvas').getContext('2d');
      probe.translate(17, 23);
      probe.scale(0.75, 0.75);
      const transformedSupported = planRingDamage(probe, ring, support, [frontCut], new RNG(42)) !== null;
      const transformedRemoved = planRingDamage(probe, ring, support, [breach(350, 0, 500, 500, 'cut')], new RNG(42)) === null;
      const count = pixels => pixels.reduce((sum, value, i) => sum + (i % 4 === 3 && value > 100 ? 1 : 0), 0);
      const removed = pixels => intact.reduce((sum, value, i) => sum + (i % 4 === 3 && value > 200 && pixels[i] === 0 ? 1 : 0), 0);
      return {
        remoteUnchanged: intact.every((value, i) => value === remote[i]),
        rearPixels,
        detachedPixels: count(unsupported), farSupportedPixels: count(farSupported),
        transformedSupported, transformedRemoved,
        holeRemoved: removed(hole), nearRemoved: removed(nearby),
        retained: count(hole),
        topRetained: hole[(130 * 900 + 430) * 4 + 3] === intact[(130 * 900 + 430) * 4 + 3]
      };
    }, REPO_ROOT);
    assert.ok(result.remoteUnchanged, 'remote hull damage must leave the ring unchanged');
    assert.ok(result.rearPixels > 20, 'front ring gaps must reveal an opaque darker far side');
    assert.equal(result.detachedPixels, 0, 'an unsupported ring must be fully removed');
    assert.ok(result.farSupportedPixels > 1000, 'a remaining far hull can support a ring');
    assert.ok(result.transformedSupported && result.transformedRemoved, 'support checks must honor caller transforms');
    assert.ok(result.holeRemoved > 20 && result.nearRemoved > 20, 'nearby cuts and hull holes must create ring-specific gaps');
    assert.ok(result.retained > 1000 && result.topRetained, 'local ring damage must preserve remote ring sections');
  });
});
