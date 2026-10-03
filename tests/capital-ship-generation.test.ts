import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG, HSBAColor, setPath2D } from '../src/greebles/common.js';
import { CompositeShipGenerator } from '../src/capitalships/CompositeShipGenerator.js';
import { UnifiedTrunkComponent } from '../src/capitalships/UnifiedTrunkComponent.js';
import { ShipComponent } from '../src/capitalships/ShipComponent.js';
import type { ShipComponentOptions } from '../src/capitalships/ShipComponent.js';
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

function acceptComponentOptions(_options: ShipComponentOptions): void {}

const TYPE_CHECK_OPTIONS = {
  bounds: { x: 0, y: 0, w: 10, h: 10 },
  zIndex: 1,
  color: THEME,
  rng: new RNG(1),
  shipArchetype: 'science' as const,
};

acceptComponentOptions({ ...TYPE_CHECK_OPTIONS, type: 'hull', variant: 'taper-front' });
acceptComponentOptions({ ...TYPE_CHECK_OPTIONS, type: 'engine', engineStyle: 'energy' });
acceptComponentOptions({ ...TYPE_CHECK_OPTIONS, type: 'storage', variant: 'liquid', storageBands: 2 });
// @ts-expect-error Hull components do not accept storage variants.
acceptComponentOptions({ ...TYPE_CHECK_OPTIONS, type: 'hull', variant: 'liquid' });
// @ts-expect-error Hull components do not accept engine settings.
acceptComponentOptions({ ...TYPE_CHECK_OPTIONS, type: 'hull', engineStyle: 'energy' });
// @ts-expect-error Engine components do not accept storage settings.
acceptComponentOptions({ ...TYPE_CHECK_OPTIONS, type: 'engine', storageBands: 2 });
// @ts-expect-error Storage components do not accept engine settings.
acceptComponentOptions({ ...TYPE_CHECK_OPTIONS, type: 'storage', engineStyle: 'radiator' });

function assertFiniteNumber(value: number, label: string) {
  assert.ok(Number.isFinite(value), `${label} must be finite`);
}

type RecordedPathCommand =
  | { name: 'moveTo' | 'lineTo'; x: number; y: number }
  | { name: 'closePath' };

class RecordingPath2D extends FakePath2D {
  readonly commands: RecordedPathCommand[] = [];

  override moveTo(x: number, y: number): void {
    this.commands.push({ name: 'moveTo', x, y });
  }

  override lineTo(x: number, y: number): void {
    this.commands.push({ name: 'lineTo', x, y });
  }

  override closePath(): void {
    this.commands.push({ name: 'closePath' });
  }
}

function assertValidConvexPath(
  path: RecordingPath2D,
  bounds: Readonly<{ x: number; y: number; w: number; h: number }>,
  label: string
): void {
  const points = path.commands.flatMap((command) => (
    command.name === 'closePath' ? [] : [{ x: command.x, y: command.y }]
  ));
  assert.equal(path.commands.filter((command) => command.name === 'closePath').length, 1, `${label} must close once`);
  assert.ok(points.length >= 3, `${label} must have at least three vertices`);
  for (const [index, point] of points.entries()) {
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), `${label} vertex ${index} must be finite`);
    assert.ok(point.x >= bounds.x && point.x <= bounds.x + bounds.w, `${label} vertex ${index} must stay within x bounds`);
    assert.ok(point.y >= bounds.y && point.y <= bounds.y + bounds.h, `${label} vertex ${index} must stay within y bounds`);
  }

  let turnDirection = 0;
  let twiceArea = 0;
  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const afterNext = points[(index + 2) % points.length];
    twiceArea += current.x * next.y - next.x * current.y;
    const cross = (next.x - current.x) * (afterNext.y - next.y)
      - (next.y - current.y) * (afterNext.x - next.x);
    assert.ok(Math.abs(cross) > 1e-9, `${label} must not have a collapsed corner`);
    const direction = Math.sign(cross);
    if (turnDirection === 0) turnDirection = direction;
    assert.equal(direction, turnDirection, `${label} must be convex and non-crossing`);
  }
  assert.ok(Math.abs(twiceArea) > 1e-9, `${label} must have non-zero area`);
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

test('top-view weapon geometry stays valid for a 10 by 10 component', () => {
  setPath2D(RecordingPath2D as unknown as typeof Path2D);
  try {
    const rng = new RNG(1);
    const expectedRng = new RNG(1);
    expectedRng.choice(['hex', 'chamfer', 'oct']);
    expectedRng.range(5, 15);
    expectedRng.range(8, 15);
    const component = new ShipComponent({
      bounds: { x: 25, y: 35, w: 10, h: 10 },
      zIndex: 1,
      type: 'weapon',
      variant: 'top-view',
      color: THEME,
      rng,
      shipArchetype: 'combat',
    });
    const path = component.shapePath as unknown as RecordingPath2D;

    assert.equal(path.commands.filter((command) => command.name !== 'closePath').length, 8, 'seed 1 must exercise chamfer geometry');
    assertValidConvexPath(path, component.bounds, '10 by 10 top-view weapon');
    assert.equal(rng.next(), expectedRng.next(), 'geometry limits must preserve the RNG call count');
  } finally {
    setPath2D(FakePath2D as unknown as typeof Path2D);
  }
});

test('small generated combat turrets stay inside bounds with valid polygons', () => {
  setPath2D(RecordingPath2D as unknown as typeof Path2D);
  try {
    const components = new CompositeShipGenerator().generate(
      600,
      400,
      THEME,
      new RNG(17),
      'combat'
    );
    const topViewWeapons = components.filter((component): component is ShipComponent => (
      component instanceof ShipComponent
      && component.type === 'weapon'
      && component.variant === 'top-view'
    ));
    const smallTurrets = topViewWeapons.filter((component) => component.bounds.w < 30);

    assert.ok(smallTurrets.length >= 2, 'combat seed 17 should include the two small turrets');
    for (const [index, component] of topViewWeapons.entries()) {
      assertValidConvexPath(
        component.shapePath as unknown as RecordingPath2D,
        component.bounds,
        `combat seed 17 top-view weapon ${index} (${component.bounds.w} by ${component.bounds.h})`
      );
    }
  } finally {
    setPath2D(FakePath2D as unknown as typeof Path2D);
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
