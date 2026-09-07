import test from 'node:test';
import assert from 'node:assert/strict';
import { HSBAColor } from '../src/greebles/common.js';

test('HSBAColor adjustments preserve the source and apply documented deltas', () => {
  const source = new HSBAColor(0.75, 0.4, 0.6, 0.75);

  const brighter = source.adjustBrightness(0.2);
  const brightest = source.adjustBrightness(0.8);
  const darker = source.adjustBrightness(-0.8);
  const moreSaturated = source.adjustSaturation(0.3);
  const mostSaturated = source.adjustSaturation(0.8);
  const lessSaturated = source.adjustSaturation(-0.8);
  const wrappedHue = source.shiftHue(0.5);
  const wrappedNegativeHue = source.shiftHue(-1);
  const replacedAlpha = source.withAlpha(0.2);

  assert.deepEqual(brighter, new HSBAColor(0.75, 0.4, 0.8, 0.75));
  assert.equal(brightest.b, 1);
  assert.equal(darker.b, 0);
  assert.equal(moreSaturated.s, 0.7);
  assert.equal(mostSaturated.s, 1);
  assert.equal(lessSaturated.s, 0);
  assert.equal(wrappedHue.h, 0.25);
  assert.equal(wrappedNegativeHue.h, 0.75);
  assert.deepEqual(replacedAlpha, new HSBAColor(0.75, 0.4, 0.6, 0.2));
  assert.deepEqual(source, new HSBAColor(0.75, 0.4, 0.6, 0.75));
});
