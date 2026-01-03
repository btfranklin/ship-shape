import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG, HSBAColor, setPath2D } from '../src/greebler/common.js';
import { CompositeShipGenerator } from '../src/ship-shape/CompositeShipGenerator.js';
import { UnifiedTrunkComponent } from '../src/ship-shape/UnifiedTrunkComponent.js';
import type { ShipArchetype } from '../src/ship-shape/shipTypes.js';
import { createTestContext, FakePath2D } from './test-helpers.js';

setPath2D(FakePath2D as unknown as typeof Path2D);

const WIDTH = 1200;
const HEIGHT = 800;
const THEME = new HSBAColor(0.6, 0.1, 0.6);
const ARCHETYPES: ShipArchetype[] = [
  'freight',
  'science',
  'industry',
  'passengers',
  'combat',
];

function assertFiniteNumber(value: number, label: string) {
  assert.ok(Number.isFinite(value), `${label} must be finite`);
}

test('CompositeShipGenerator invariants', () => {
  for (const archetype of ARCHETYPES) {
    const rng = new RNG(12345);
    const generator = new CompositeShipGenerator();
    const components = generator.generate(WIDTH, HEIGHT, THEME, rng, archetype, 600);

    assert.ok(components.length > 0, `no components for ${archetype}`);

    for (let i = 1; i < components.length; i++) {
      assert.ok(
        components[i].zIndex >= components[i - 1].zIndex,
        `zIndex is not sorted for ${archetype}`
      );
    }

    let hasHull = false;

    for (const comp of components) {
      assertFiniteNumber(comp.bounds.x, `${archetype} bounds.x`);
      assertFiniteNumber(comp.bounds.y, `${archetype} bounds.y`);
      assertFiniteNumber(comp.bounds.w, `${archetype} bounds.w`);
      assertFiniteNumber(comp.bounds.h, `${archetype} bounds.h`);
      assert.ok(comp.bounds.w > 0, `${archetype} width must be positive`);
      assert.ok(comp.bounds.h > 0, `${archetype} height must be positive`);

      if (comp instanceof UnifiedTrunkComponent) {
        assert.ok(comp.components.length > 0, `${archetype} trunk has no components`);
        for (const child of comp.components) {
          assert.equal(child.type, 'hull', `${archetype} trunk child is not hull`);
          assert.equal(child.isTrunk, true, `${archetype} trunk child is not marked trunk`);
        }
        hasHull = true;
      } else {
        if (comp.type === 'hull') hasHull = true;
        assert.ok(comp.shapePath, `${archetype} component missing shapePath`);
      }
    }

    assert.ok(hasHull, `${archetype} produced no hull components`);
  }
});

test('CompositeShipGenerator draw does not throw', () => {
  const rng = new RNG(20240801);
  const generator = new CompositeShipGenerator();
  const components = generator.generate(WIDTH, HEIGHT, THEME, rng, 'science', 600);

  const ctx = createTestContext();

  for (const comp of components) {
    comp.draw(ctx, rng);
  }
});
