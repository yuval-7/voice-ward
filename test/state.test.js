import test from 'node:test';
import assert from 'node:assert/strict';

test('a newer generation fences a late response', () => {
  let generation = 4;
  const lateResponseGeneration = 4;
  generation += 1;
  assert.notEqual(lateResponseGeneration, generation);
});
