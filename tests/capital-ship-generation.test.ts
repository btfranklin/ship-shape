import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG, HSBAColor, setPath2D } from '../src/greebles/common.js';
import { CompositeShipGenerator } from '../src/capitalships/CompositeShipGenerator.js';
import { UnifiedTrunkComponent } from '../src/capitalships/UnifiedTrunkComponent.js';
import { ShipComponent } from '../src/capitalships/ShipComponent.js';
import type { ShipArchetype } from '../src/capitalships/shipTypes.js';
import { FakePath2D } from './test-helpers.js';

setPath2D(FakePath2D as unknown as typeof Path2D);

const WIDTH = 1200;
const HEIGHT = 800;
const THEME = new HSBAColor(0.6, 0.1, 0.6);
const ARCHETYPES: ShipArchetype[] = [
  'freight',
  'science',
  'industry',
  'passenger',
  'combat',
];

function assertFiniteNumber(value: number, label: string) {
  assert.ok(Number.isFinite(value), `${label} must be finite`);
}

function projectShipComponent(component: ShipComponent) {
  return {
    type: component.type,
    variant: component.variant,
    bounds: component.bounds,
    zIndex: component.zIndex,
    isTrunk: component.isTrunk,
    engineStyle: component.engineStyle,
    energyGlowHue: component.energyGlowHue,
    facing: component.facing,
    invertLighting: component.invertLighting,
    shipCenterX: component.shipCenterX,
    shipCenterY: component.shipCenterY,
  };
}

function projectShip(components: Array<ShipComponent | UnifiedTrunkComponent>) {
  return components.map((component) => component instanceof UnifiedTrunkComponent
    ? {
        kind: 'unified-trunk' as const,
        bounds: component.bounds,
        zIndex: component.zIndex,
        components: component.components.map(projectShipComponent),
      }
    : {
        kind: 'component' as const,
        ...projectShipComponent(component),
      });
}

test('direct components own shape and bounds state from construction onward', () => {
  const rng = new RNG(100);
  const component = new ShipComponent({
    bounds: { x: 1, y: 2, w: 30, h: 20 },
    zIndex: 1,
    type: 'hull',
    color: THEME,
    rng,
    shipArchetype: 'science',
    lightColors: [],
  });
  const initialShape = component.shapePath;

  assert.ok(initialShape);
  assert.equal(component.lightColors.length, 1, 'an empty palette should use the default light color');
  assert.equal(Object.isFrozen(component.bounds), true);
  assert.throws(
    () => {
      (component.bounds as { w: number }).w = 99;
    },
    TypeError
  );

  component.updateBounds({ w: 40 }, rng);
  assert.equal(component.bounds.w, 40);
  assert.notEqual(component.shapePath, initialShape);
});

test('unified trunks keep a stable snapshot of their component list and geometry', () => {
  const rng = new RNG(101);
  const component = new ShipComponent({
    bounds: { x: 0, y: 0, w: 30, h: 20 },
    zIndex: 1,
    type: 'hull',
    color: THEME,
    rng,
    shipArchetype: 'science',
    isTrunk: true,
  });
  const source = [component];
  const trunk = new UnifiedTrunkComponent(source);

  source.push(component);
  assert.equal(trunk.components.length, 1);
  assert.equal(Object.isFrozen(trunk.components), true);
  assert.equal(Object.isFrozen(trunk.bounds), true);
});

test('generated capital ships satisfy draw-order and shape invariants', () => {
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

test('CompositeShipGenerator structure is deterministic for fixed seeds', () => {
  for (const archetype of ARCHETYPES) {
    const first = new CompositeShipGenerator().generate(
      WIDTH,
      HEIGHT,
      THEME,
      new RNG(20240801),
      archetype,
      600
    );
    const second = new CompositeShipGenerator().generate(
      WIDTH,
      HEIGHT,
      THEME,
      new RNG(20240801),
      archetype,
      600
    );

    assert.deepEqual(
      projectShip(first),
      projectShip(second),
      `${archetype} structure changed for the same seed`
    );
  }
});

test('tower sensor attachments are generated as draw-ready components', () => {
  const scenarios: Array<{ archetype: ShipArchetype; seed: number }> = [
    { archetype: 'freight', seed: 8 },
    { archetype: 'science', seed: 1 },
    { archetype: 'industry', seed: 8 },
    { archetype: 'passenger', seed: 8 },
    { archetype: 'combat', seed: 4 },
  ];

  for (const { archetype, seed } of scenarios) {
    const rng = new RNG(seed);
    const generator = new CompositeShipGenerator();
    const components = generator.generate(WIDTH, HEIGHT, THEME, rng, archetype, 600);
    const towerSensors: ShipComponent[] = [];
    const towers: ShipComponent[] = [];

    for (const comp of components) {
      if (
        !(comp instanceof UnifiedTrunkComponent) &&
        comp.type === 'sensor' &&
        comp.shipCenterX !== undefined
      ) {
        towerSensors.push(comp);
      } else if (!(comp instanceof UnifiedTrunkComponent) && comp.type === 'tower') {
        towers.push(comp);
      }
    }

    assert.ok(towerSensors.length > 0, `${archetype} seed ${seed} produced no tower sensor attachments`);

    for (const sensor of towerSensors) {
      assert.ok(sensor.shapePath, `${archetype} seed ${seed} tower sensor missing shapePath`);
      assert.equal(
        sensor.variant === 'front' || sensor.variant === 'back',
        true,
        `${archetype} seed ${seed} tower sensor has unexpected variant`
      );
      assertFiniteNumber(sensor.shipCenterX as number, `${archetype} tower sensor shipCenterX`);
      const parentTower = towers.find((tower) => (
        Math.abs(tower.bounds.x + tower.bounds.w / 2 - (sensor.shipCenterX as number)) < 0.0001
      ));
      if (!parentTower) {
        assert.fail(`${archetype} seed ${seed} tower sensor has no matching tower`);
      }
      assert.ok(sensor.zIndex < parentTower.zIndex, `${archetype} tower sensor should draw below its tower`);
      assert.ok(
        components.indexOf(sensor) < components.indexOf(parentTower),
        `${archetype} tower sensor should sort before its tower`
      );
    }
  }
});
