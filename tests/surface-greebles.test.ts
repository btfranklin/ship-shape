import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG, HSBAColor, setPath2D } from '../src/greebles/common.js';
import { CapitalShipSurfaceGreebles } from '../src/greebles/index.js';
import { CapitalShipSurfaceEmissiveRenderer } from '../src/greebles/CapitalShipSurfaceEmissiveRenderer.js';
import { createSurfaceLayerPlan } from '../src/greebles/surfaceLayerPlan.js';
import {
  createTestContext,
  FakePath2D,
  getCanvasObservations,
  resetCanvasObservations,
} from './test-helpers.js';
import type { TestContextCall } from './test-helpers.js';

setPath2D(FakePath2D as unknown as typeof Path2D);

const SIZE = 300;
const THEME = HSBAColor.fromRGBA(150, 155, 160);

test('RNG.choice rejects an empty collection', () => {
  assert.throws(() => new RNG(1).choice([]), {
    name: 'RangeError',
    message: 'RNG.choice requires at least one item.',
  });
});

test('capital ship surfaces own immutable non-empty light palettes', () => {
  const surface = new CapitalShipSurfaceGreebles(1, 1, THEME, 'science', 'hull', false, false, []);
  assert.equal(surface.lightColors.length, 1);
  assert.equal(Object.isFrozen(surface.lightColors), true);
});

test('surface emissive rendering composites through an offscreen canvas', () => {
  const calls: TestContextCall[] = [];
  const ctx = createTestContext({
    calls,
    withCanvas: true,
    withTransform: true,
  });
  const rng = new RNG(90125);
  const surface = new CapitalShipSurfaceGreebles(1, 1, THEME, 'science', 'hull');

  ctx.save();
  ctx.scale(SIZE, SIZE);
  const preparedSurface = surface.prepare(rng);
  preparedSurface.drawBase(ctx);
  preparedSurface.drawEmissive(ctx);
  ctx.restore();

  assert.ok(
    calls.some((call) => call.name === 'setTransform'),
    'offscreen emissive path should reset or apply transforms'
  );
  assert.ok(
    calls.some((call) => call.name === 'drawImage'),
    'offscreen emissive path should composite its canvas back onto the target context'
  );
});

test('prepared surfaces own independent plans and painting does not consume caller randomness', () => {
  class CountingRNG extends RNG {
    calls = 0;

    override next(): number {
      this.calls += 1;
      return super.next();
    }
  }

  const recordPainting = (
    paint: (context: CanvasRenderingContext2D) => void
  ) => {
    const calls: Array<{ name: PropertyKey; args: unknown[] }> = [];
    const target = createTestContext();
    const context = new Proxy(target, {
      get(object, property) {
        const value = Reflect.get(object, property);
        if (typeof value !== 'function') return value;
        return (...args: unknown[]) => {
          calls.push({ name: property, args });
          return Reflect.apply(value, object, args);
        };
      },
      set(object, property, value) {
        calls.push({ name: property, args: [value] });
        return Reflect.set(object, property, value);
      },
    });
    paint(context);
    return JSON.stringify(calls);
  };

  const surface = new CapitalShipSurfaceGreebles(1, 1, THEME, 'science', 'hull');
  const firstRng = new CountingRNG(90125);
  const secondRng = new CountingRNG(90127);
  const first = surface.prepare(firstRng);
  const firstPlanningCalls = firstRng.calls;
  const second = surface.prepare(secondRng);
  const secondPlanningCalls = secondRng.calls;

  const firstEmissiveBeforeBase = recordPainting(first.drawEmissive);
  const firstBaseRendering = recordPainting(first.drawBase);
  const secondBaseRendering = recordPainting(second.drawBase);
  const repeatedFirstBaseRendering = recordPainting(first.drawBase);
  const secondEmissiveRendering = recordPainting(second.drawEmissive);
  const firstEmissiveAfterBase = recordPainting(first.drawEmissive);

  assert.notEqual(firstBaseRendering, secondBaseRendering, 'different preparations should own different base plans');
  assert.equal(repeatedFirstBaseRendering, firstBaseRendering, 'a later preparation must not replace an earlier base plan');
  assert.notEqual(firstEmissiveBeforeBase, '[]', 'the first preparation should include emissive painting');
  assert.notEqual(secondEmissiveRendering, '[]', 'the second preparation should include emissive painting');
  assert.notEqual(firstEmissiveBeforeBase, secondEmissiveRendering, 'different preparations should own different emissive plans');
  assert.equal(firstEmissiveAfterBase, firstEmissiveBeforeBase, 'emissive painting must not depend on a prior base paint');
  assert.equal(firstRng.calls, firstPlanningCalls, 'painting must not consume the first caller RNG');
  assert.equal(secondRng.calls, secondPlanningCalls, 'painting must not consume the second caller RNG');
});

test('emissive fallback never erases pixels from the target canvas', () => {
  resetCanvasObservations();
  const renderer = new CapitalShipSurfaceEmissiveRenderer(1, 1, THEME);
  const context = createTestContext();

  renderer.draw(context, {
    lightPanels: { seeds: [1], colors: [THEME] },
    occludersAfterLights: [{ kind: 'equipment', seed: 2, count: 1 }],
    occludersAfterWindows: [],
    occludersAfterCutaways: [],
  });

  assert.doesNotMatch(
    getCanvasObservations().compositeOperations.join(','),
    /destination-out/,
    'the direct fallback must not erase the existing target canvas'
  );
});

test('emissive scratch canvases are limited to the rendered surface', () => {
  const renderer = new CapitalShipSurfaceEmissiveRenderer(1, 1, THEME);
  const context = createTestContext({ withCanvas: true, withTransform: true });
  resetCanvasObservations();

  renderer.draw(context, {
    windows: { seeds: [1], color: THEME },
    occludersAfterLights: [],
    occludersAfterWindows: [],
    occludersAfterCutaways: [],
  });

  const { sizes } = getCanvasObservations();
  assert.equal(sizes.length, 3, 'the compositor should allocate three scratch canvases');
  assert.ok(
    sizes.every(({ width, height }) => width < 300 && height < 150),
    'scratch canvases must be smaller than the caller canvas for a small surface'
  );
});

test('empty emissive plans do not allocate scratch canvases', () => {
  const renderer = new CapitalShipSurfaceEmissiveRenderer(1, 1, THEME);
  const context = createTestContext({ withCanvas: true, withTransform: true });
  resetCanvasObservations();

  renderer.draw(context, {
    occludersAfterLights: [],
    occludersAfterWindows: [],
    occludersAfterCutaways: [],
  });

  assert.deepEqual(getCanvasObservations().sizes, []);
});

test('CapitalShipSurfaceGreebles layer plans are deterministic for fixed seeds', () => {
  const config = {
    xUnits: 1,
    yUnits: 1,
    themeColor: THEME,
    shipArchetype: 'science' as const,
    componentType: 'hull' as const,
    skipBaseFill: false,
    isTrunk: true,
    emissiveMode: 'separate' as const,
  };

  const first = createSurfaceLayerPlan(config, new RNG(1234));
  const second = createSurfaceLayerPlan(config, new RNG(1234));

  assert.deepEqual(first, second);
});

test('CapitalShipSurfaceGreebles layer plans expose representative surface layers', () => {
  const trenchPlan = createSurfaceLayerPlan({
    xUnits: 1,
    yUnits: 1,
    themeColor: THEME,
    shipArchetype: 'industry',
    componentType: 'trench',
    skipBaseFill: false,
    isTrunk: false,
    emissiveMode: 'inline',
  }, new RNG(10));
  assert.equal(trenchPlan.style, 'trench');
  assert.ok(trenchPlan.layers.some((layer) => layer.kind === 'trench'));
  assert.ok(!trenchPlan.layers.some((layer) => layer.kind === 'panels'));

  const industrialPlan = createSurfaceLayerPlan({
    xUnits: 1,
    yUnits: 2,
    themeColor: THEME,
    shipArchetype: 'industry',
    componentType: 'hull',
    skipBaseFill: false,
    isTrunk: true,
    emissiveMode: 'inline',
  }, new RNG(10));
  assert.equal(industrialPlan.style, 'industrial');
  assert.ok(industrialPlan.layers.some((layer) => layer.kind === 'panels'));
  assert.ok(industrialPlan.layers.some((layer) => layer.kind === 'pipes'));
  assert.ok(
    industrialPlan.layers.every(
      (layer) => !('emissiveMode' in layer) || layer.emissiveMode === 'inline'
    ),
    'inline plans must contain only inline emissive layers'
  );
});

test('CapitalShipSurfaceGreebles separate emissive plans include occluder metadata', () => {
  const plan = createSurfaceLayerPlan({
    xUnits: 1,
    yUnits: 2,
    themeColor: THEME,
    shipArchetype: 'industry',
    componentType: 'hull',
    skipBaseFill: false,
    isTrunk: true,
    emissiveMode: 'separate',
  }, new RNG(99));

  assert.equal(plan.emissiveMode, 'separate');
  const { emissivePlan } = plan;
  assert.ok(plan.layers.some((layer) => layer.kind === 'pipes'), 'industrial trunk plans should include pipes');
  assert.ok(
    plan.layers.every(
      (layer) => !('emissiveMode' in layer) || layer.emissiveMode === 'separate'
    ),
    'separate plans must contain only separate emissive layers'
  );
  assert.ok(
    emissivePlan.occludersAfterLights.some((occluder) => occluder.kind === 'pipes'),
    'pipe layers should become light occluders for the emissive pass'
  );
  assert.ok(
    emissivePlan.occludersAfterWindows.some((occluder) => occluder.kind === 'pipes'),
    'pipe layers should become window occluders for the emissive pass'
  );
  assert.ok(
    emissivePlan.occludersAfterCutaways.some((occluder) => occluder.kind === 'pipes'),
    'pipe layers should become cutaway occluders for the emissive pass'
  );
});
