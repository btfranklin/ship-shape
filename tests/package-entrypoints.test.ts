import test from 'node:test';
import assert from 'node:assert/strict';

async function importEntrypoint(specifier: string): Promise<Record<string, unknown>> {
  return (await import(specifier)) as Record<string, unknown>;
}

test('published package entrypoints resolve through package exports', async () => {
  const root = await importEntrypoint('ship-shape');
  const greebles = await importEntrypoint('ship-shape/greebles');
  const capitalships = await importEntrypoint('ship-shape/capitalships');

  assert.equal(typeof root.CompositeShipGenerator, 'function');
  assert.equal(typeof root.RNG, 'function');
  assert.equal(typeof greebles.RNG, 'function');
  assert.equal(typeof greebles.CapitalShipSurfaceGreebles, 'function');
  assert.equal(typeof capitalships.ShipComponent, 'function');
  assert.equal(typeof capitalships.UnifiedTrunkComponent, 'function');
});
