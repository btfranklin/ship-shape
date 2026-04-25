import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG, HSBAColor, setPath2D } from '../src/greebles/common.js';
import {
  PanelGreebles,
  PipeGreebles,
  LightPanelGreebles,
  CapitalShipWindowsGreebles,
  EquipmentGreebles,
  ElectronicsPanelGreebles,
  HoseGreebles,
  WireGreebles,
  CutawaySectionGreebles,
  CapitalShipSurfaceGreebles,
  EquipmentTrenchGreebles,
} from '../src/greebles/index.js';
import { createSurfaceLayerPlan } from '../src/greebles/surfaceLayerPlan.js';
import { createTestContext, FakePath2D } from './test-helpers.js';
import type { TestContextCall } from './test-helpers.js';

setPath2D(FakePath2D as unknown as typeof Path2D);

const SIZE = 300;
const THEME = HSBAColor.fromRGBA(150, 155, 160);

function withContext(fn: (ctx: CanvasRenderingContext2D, rng: RNG) => void) {
  const ctx = createTestContext();
  const rng = new RNG(42);
  ctx.save();
  ctx.scale(SIZE, SIZE);
  fn(ctx, rng);
  ctx.restore();
}

test('greebles draw without throwing', () => {
  assert.doesNotThrow(() => {
    withContext((ctx, rng) => {
      new PanelGreebles(1, 1, THEME, 8, true).draw(ctx, rng);
      new PipeGreebles(1, 1, THEME, 4).draw(ctx, rng);
      new LightPanelGreebles(1, 1, THEME, 3).draw(ctx, rng);
      new CapitalShipWindowsGreebles(1, 1, THEME, 3).draw(ctx, rng);
      new EquipmentGreebles(1, 1, THEME, 4).draw(ctx, rng);
      new ElectronicsPanelGreebles(1, 1, THEME, 1).draw(ctx, rng);
      new HoseGreebles(1, 1, THEME, 2).draw(ctx, rng);
      new WireGreebles(1, 1, 12).draw(ctx, rng);
      new CutawaySectionGreebles(1, 1, THEME, 1).draw(ctx, rng);
      new CapitalShipSurfaceGreebles(1, 1, THEME, 'science', 'hull').draw(ctx, rng);
      new EquipmentTrenchGreebles(1, 1, THEME, 0.5, 0.4).draw(ctx, rng);
    });
  });
});

test('CapitalShipSurfaceGreebles emissive pass uses offscreen canvas path when available', () => {
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
  surface.draw(ctx, rng, { skipEmissive: true });
  surface.drawEmissive(ctx, rng);
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

test('CapitalShipSurfaceGreebles layer plans are deterministic for fixed seeds', () => {
  const config = {
    xUnits: 1,
    yUnits: 1,
    themeColor: THEME,
    shipArchetype: 'science' as const,
    componentType: 'hull' as const,
    skipBaseFill: false,
    isTrunk: true,
    skipEmissive: true,
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
  }, new RNG(10));
  assert.equal(industrialPlan.style, 'industrial');
  assert.ok(industrialPlan.layers.some((layer) => layer.kind === 'panels'));
  assert.ok(industrialPlan.layers.some((layer) => layer.kind === 'pipes'));
});

test('CapitalShipSurfaceGreebles skipEmissive plans include occluder metadata', () => {
  const plan = createSurfaceLayerPlan({
    xUnits: 1,
    yUnits: 2,
    themeColor: THEME,
    shipArchetype: 'industry',
    componentType: 'hull',
    skipBaseFill: false,
    isTrunk: true,
    skipEmissive: true,
  }, new RNG(99));

  assert.ok(plan.emissivePlan, 'skipEmissive should create an emissive plan');
  assert.ok(plan.layers.some((layer) => layer.kind === 'pipes'), 'industrial trunk plans should include pipes');
  assert.ok(
    plan.emissivePlan.occludersAfterLights.some((occluder) => occluder.kind === 'pipes'),
    'pipe layers should become light occluders for the emissive pass'
  );
  assert.ok(
    plan.emissivePlan.occludersAfterWindows.some((occluder) => occluder.kind === 'pipes'),
    'pipe layers should become window occluders for the emissive pass'
  );
  assert.ok(
    plan.emissivePlan.occludersAfterCutaways.some((occluder) => occluder.kind === 'pipes'),
    'pipe layers should become cutaway occluders for the emissive pass'
  );
});
