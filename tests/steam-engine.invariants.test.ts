import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG, HSBAColor, setPath2D } from '../src/greebles/common.js';
import { SteamEngineGenerator } from '../src/railway/SteamEngineGenerator.js';
import type { RailVehicleLayout } from '../src/railway/SteamEngineGenerator.js';
import { FakePath2D } from './test-helpers.js';

setPath2D(FakePath2D as unknown as typeof Path2D);

const WIDTH = 1400;
const HEIGHT = 800;
const THEME = new HSBAColor(0.12, 0.2, 0.6);

function assertFiniteNumber(value: number, label: string) {
  assert.ok(Number.isFinite(value), `${label} must be finite`);
}

function projectRailVehicle(layout: RailVehicleLayout) {
  return {
    kind: layout.kind,
    bounds: layout.bounds,
    couplerFront: layout.couplerFront,
    couplerRear: layout.couplerRear,
    components: layout.components.map((component) => ({
      type: component.type,
      variant: component.variant,
      wheelStyle: component.wheelStyle,
      bounds: component.bounds,
      zIndex: component.zIndex,
    })),
  };
}

test('SteamEngineGenerator invariants', () => {
  const rng = new RNG(12001);
  const generator = new SteamEngineGenerator();
  const components = generator.generate(WIDTH, HEIGHT, THEME, rng);

  assert.ok(components.length > 0, 'no components generated');

  for (let i = 1; i < components.length; i++) {
    assert.ok(
      components[i].zIndex >= components[i - 1].zIndex,
      'zIndex is not sorted'
    );
  }

  let hasWheel = false;
  let hasBoiler = false;

  for (const comp of components) {
    assertFiniteNumber(comp.bounds.x, 'bounds.x');
    assertFiniteNumber(comp.bounds.y, 'bounds.y');
    assertFiniteNumber(comp.bounds.w, 'bounds.w');
    assertFiniteNumber(comp.bounds.h, 'bounds.h');
    assert.ok(comp.bounds.w > 0, 'width must be positive');
    assert.ok(comp.bounds.h > 0, 'height must be positive');
    assert.ok(comp.shapePath, 'component missing shapePath');

    if (comp.type === 'wheel') hasWheel = true;
    if (comp.type === 'boiler') hasBoiler = true;
  }

  assert.ok(hasWheel, 'engine has no wheels');
  assert.ok(hasBoiler, 'engine has no boiler');
});

test('SteamEngineGenerator layouts are deterministic for fixed seeds and options', () => {
  const generator = new SteamEngineGenerator();
  const createLayouts = () => {
    const engine = generator.generateLayout(WIDTH, HEIGHT, THEME, new RNG(20240802), {
      includeTender: true,
      includeCowcatcher: true,
      wheelStyle: 'mixed',
    });
    const car = generator.generateCar(WIDTH, HEIGHT, THEME, new RNG(20240803), {
      kind: 'mixed',
      wheelStyle: 'mixed',
    });
    const consist = generator.generateConsist(WIDTH, HEIGHT, THEME, new RNG(20240804), {
      includeTender: true,
      includeCowcatcher: true,
      kind: 'mixed',
      wheelStyle: 'mixed',
      carCount: 4,
    });

    return [engine, car, ...consist].map(projectRailVehicle);
  };

  assert.deepEqual(createLayouts(), createLayouts());
});

test('war-train consist aligns and orders couplers', () => {
  const rng = new RNG(41277);
  const generator = new SteamEngineGenerator();
  const consist = generator.generateConsist(WIDTH, HEIGHT, THEME, rng, {
    includeTender: true,
    includeCowcatcher: true,
    kind: 'mixed',
    carCount: 3
  });

  assert.ok(consist.length >= 3, 'expected multiple vehicles in consist');

  const couplerY = consist[0].couplerFront.y;
  for (const vehicle of consist) {
    assertFiniteNumber(vehicle.couplerFront.x, 'couplerFront.x');
    assertFiniteNumber(vehicle.couplerRear.x, 'couplerRear.x');
    assert.equal(vehicle.couplerFront.y, couplerY, 'front coupler height mismatch');
    assert.equal(vehicle.couplerRear.y, couplerY, 'rear coupler height mismatch');
    assert.ok(vehicle.couplerRear.x > vehicle.couplerFront.x, 'vehicle coupler ordering invalid');
  }

  for (let i = 1; i < consist.length; i++) {
    assert.ok(
      consist[i].couplerFront.x > consist[i - 1].couplerRear.x,
      'vehicle couplers should be ordered from left to right'
    );
  }
});
