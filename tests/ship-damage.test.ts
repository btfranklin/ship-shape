import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG, setPath2D } from '../src/greebles/common.js';
import { planShipDamage } from '../src/capitalships/shipDamage.js';
import { FakePath2D } from './test-helpers.js';

setPath2D(FakePath2D as unknown as typeof Path2D);
const bounds = { x: 100, y: 200, w: 1200, h: 300 };

test('cuts vary in direction with an overall angle below 45 degrees', () => {
  const directions = new Set<number>();
  for (let seed = 1; seed <= 20; seed++) {
    const [cut] = planShipDamage(bounds, [bounds], new RNG(seed), 0.5);
    const first = cut.edge[0];
    const last = cut.edge[cut.edge.length - 1];
    const slope = (last.x - first.x) / (last.y - first.y);
    assert.ok(Math.abs(slope) > 0.2 && Math.abs(slope) <= 1);
    directions.add(Math.sign(slope));
    const deviations = cut.edge.map(point => point.x - first.x - (point.y - first.y) * slope);
    assert.ok(Math.max(...deviations) - Math.min(...deviations) > 30, 'cut must depart from a straight diagonal');
  }
  assert.equal(directions.size, 2, 'seeds must produce cuts in both directions');
});

test('damage depth layers repeat and can break on either side of the facing edge', () => {
  const damage = planShipDamage(bounds, [bounds], new RNG(42), 0.5);
  const repeat = planShipDamage(bounds, [bounds], new RNG(42), 0.5);
  for (let i = 0; i < damage.length; i++) {
    const breach = damage[i];
    for (const layer of ['farHull', 'machinery'] as const) {
      assert.deepEqual(breach[layer].edge, repeat[i][layer].edge);
      const offsets = breach.edge.map((point, index) => {
        const dx = breach.kind === 'cut' ? 1 : breach.center.x - point.x;
        const dy = breach.kind === 'cut' ? 0 : breach.center.y - point.y;
        const shifted = breach[layer].edge[index];
        return (shifted.x - point.x) * dx + (shifted.y - point.y) * dy;
      });
      if (breach.kind === 'hole') {
        assert.ok(offsets.some(value => value > 0), `${layer} must extend into the opening`);
        assert.ok(offsets.some(value => value < 0), `${layer} must also break behind the facing edge`);
      }
    }
    assert.notDeepEqual(breach.farHull.edge, breach.machinery.edge);
  }
});


test('some seeds expose long depth steps while others reverse or reduce them', () => {
  let exposed = 0, reversed = 0, shallow = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const [cut] = planShipDamage(bounds, [bounds], new RNG(seed), 0.5);
    const meanOffset = (edge: typeof cut.edge) => edge.reduce((sum, point, i) => sum + point.x - cut.edge[i].x, 0) / edge.length;
    const far = meanOffset(cut.farHull.edge);
    const middle = meanOffset(cut.machinery.edge);
    if (far > bounds.w * 0.07) {
      exposed++;
      assert.ok(middle > 20 && middle < far - 20, 'machinery must form a distinct intermediate step');
    } else if (far < -bounds.w * 0.07) reversed++;
    else shallow++;
    assert.ok(Math.abs(far) < bounds.w * 0.22, 'the depth step must remain bounded');
  }
  assert.ok(exposed > 0 && reversed > 0 && shallow > 0);
});
