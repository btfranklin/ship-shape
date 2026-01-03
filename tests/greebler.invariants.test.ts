import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG, HSBAColor, setPath2D } from '../src/greebler/common.js';
import {
  PanelGreebles,
  PipeGreebles,
  LightPanelGreebles,
  CapitalShipWindowsGreebles,
  EquipmentGreebles,
  HoseGreebles,
  WireGreebles,
  CutawaySectionGreebles,
  CapitalShipSurfaceGreebles,
  EquipmentTrenchGreebles,
} from '../src/greebler/index.js';
import { createTestContext, FakePath2D } from './test-helpers.js';

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

test('greeblers draw without throwing', () => {
  assert.doesNotThrow(() => {
    withContext((ctx, rng) => {
      new PanelGreebles(1, 1, THEME, 8, true).draw(ctx, rng);
      new PipeGreebles(1, 1, THEME, 4).draw(ctx, rng);
      new LightPanelGreebles(1, 1, THEME, 3).draw(ctx, rng);
      new CapitalShipWindowsGreebles(1, 1, THEME, 3).draw(ctx, rng);
      new EquipmentGreebles(1, 1, THEME, 4).draw(ctx, rng);
      new HoseGreebles(1, 1, THEME, 2).draw(ctx, rng);
      new WireGreebles(1, 1, 12).draw(ctx, rng);
      new CutawaySectionGreebles(1, 1, THEME, 1).draw(ctx, rng);
      new CapitalShipSurfaceGreebles(1, 1, THEME, 'science', 'hull').draw(ctx, rng);
      new EquipmentTrenchGreebles(1, 1, THEME, 0.5, 0.4).draw(ctx, rng);
    });
  });
});
