import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG, HSBAColor, setPath2D } from '../src/greebles/common.js';
import { CapitalShipSurfaceGreebles } from '../src/greebles/index.js';
import { createSurfaceLayerPlan } from '../src/greebles/surfaceLayerPlan.js';
import { createTestContext, FakePath2D } from './test-helpers.js';
import type { TestContextCall } from './test-helpers.js';

setPath2D(FakePath2D as unknown as typeof Path2D);

const SIZE = 300;
const THEME = HSBAColor.fromRGBA(150, 155, 160);

test('CapitalShipSurfaceGreebles emissive pass wires the offscreen composite branch', () => {
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
  const { emissivePlan } = plan;
  assert.ok(plan.layers.some((layer) => layer.kind === 'pipes'), 'industrial trunk plans should include pipes');
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
