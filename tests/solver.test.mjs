import assert from 'node:assert/strict';
import test from 'node:test';

import { applyMove, compressMoves, solvePuzzle } from '../src/domain/solver.mjs';

test('a one-way actor link only applies for the selected plate', () => {
  const links = [
    [
      { target: 2, direction: 'left' },
      { target: 3, direction: 'right' },
    ],
    [],
    [{ target: 1, direction: 'left' }],
    [],
  ];

  assert.deepEqual(applyMove([3, 3, 3, 3], 0, 'right', links), [4, 3, 2, 4]);
  assert.deepEqual(applyMove([3, 3, 3, 3], 2, 'right', links), [3, 2, 4, 3]);
});

test('linked plates can follow in the same or opposite direction', () => {
  const links = [
    [
      { target: 1, mode: 'same' },
      { target: 2, mode: 'opposite' },
    ],
    [],
    [],
  ];

  assert.deepEqual(applyMove([3, 3, 3], 0, 'right', links), [4, 4, 2]);
  assert.deepEqual(applyMove([3, 3, 3], 0, 'left', links), [2, 2, 4]);
});

test('moves that push any affected plate outside the seven positions are illegal', () => {
  assert.equal(applyMove([0], 0, 'left', [[]]), null);
  assert.equal(
    applyMove([3, 0], 0, 'right', [[{ target: 1, mode: 'opposite' }], []]),
    null,
  );
  assert.equal(
    applyMove([3, 6], 0, 'right', [[{ target: 1, mode: 'same' }], []]),
    null,
  );
});

test('solver does not use boundary wrapping as a shortcut', () => {
  const result = solvePuzzle({
    initial: [0],
    target: [6],
    links: [[]],
  });

  assert.equal(result.status, 'solved');
  assert.deepEqual(result.moves, [{ actor: 0, direction: 'right', count: 6 }]);
});

test('solver finds and compresses repeated moves', () => {
  const result = solvePuzzle({
    initial: [0],
    target: [3],
    links: [[]],
  });

  assert.equal(result.status, 'solved');
  assert.deepEqual(result.moves, [{ actor: 0, direction: 'right', count: 3 }]);
});

test('solver can enforce actor-at-target before moving', () => {
  const result = solvePuzzle({
    initial: [1, 0],
    target: [0, 1],
    links: [[], []],
    requireActorAtTarget: true,
  });

  assert.equal(result.status, 'unsolved');
});

test('compressMoves preserves plate and direction changes', () => {
  assert.deepEqual(
    compressMoves([
      { actor: 0, direction: 'right' },
      { actor: 0, direction: 'right' },
      { actor: 1, direction: 'right' },
      { actor: 1, direction: 'left' },
    ]),
    [
      { actor: 0, direction: 'right', count: 2 },
      { actor: 1, direction: 'right', count: 1 },
      { actor: 1, direction: 'left', count: 1 },
    ],
  );
});
