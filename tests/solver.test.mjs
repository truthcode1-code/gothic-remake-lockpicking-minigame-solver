import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyMove,
  applyCompressedMove,
  applyCompressedMoves,
  compressMoves,
  countPlateSwitches,
  createDefaultPuzzle,
  createResetPuzzle,
  defaultMaxVisitedForPlateCount,
  solvePuzzle,
} from '../src/domain/solver.mjs';

test('default puzzle starts with five plates', () => {
  assert.deepEqual(createDefaultPuzzle().initial, [3, 3, 3, 3, 3]);
});

test('reset puzzle preserves the current plate count', () => {
  assert.deepEqual(createResetPuzzle(createDefaultPuzzle(7)).initial, [3, 3, 3, 3, 3, 3, 3]);
});

test('default search budget increases for larger plate counts', () => {
  assert.equal(defaultMaxVisitedForPlateCount(1), 250000);
  assert.equal(defaultMaxVisitedForPlateCount(5), 250000);
  assert.equal(defaultMaxVisitedForPlateCount(6), 750000);
  assert.equal(defaultMaxVisitedForPlateCount(7), 2250000);
  assert.equal(defaultMaxVisitedForPlateCount(8), 5000000);
});

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

test('solver prefers the fewest displayed steps among equally short solutions', () => {
  const result = solvePuzzle({
    initial: [0, 0],
    target: [1, 2],
    links: [[], [{ target: 0, mode: 'same' }]],
  });

  assert.equal(result.status, 'solved');
  assert.deepEqual(result.moves, [
    { actor: 1, direction: 'right', count: 2 },
    { actor: 0, direction: 'left', count: 1 },
  ]);
});

test('solver prefers grouped repeated moves over shorter noisy raw paths', () => {
  const puzzle = {
    initial: [0, 2, 6, 5, 4],
    target: [3, 3, 3, 3, 3],
    links: [
      [{ target: 3, mode: 'opposite' }],
      [{ target: 3, mode: 'opposite' }],
      [
        { target: 0, mode: 'same' },
        { target: 4, mode: 'opposite' },
      ],
      [{ target: 4, mode: 'same' }],
      [
        { target: 0, mode: 'same' },
        { target: 1, mode: 'same' },
      ],
    ],
  };

  const result = solvePuzzle(puzzle);

  assert.equal(result.status, 'solved');
  assert.equal(result.moves.length, 9);
  assert.deepEqual(applyCompressedMoves(puzzle.initial, result.moves, puzzle.links), puzzle.target);
});

test('solver keeps copied setup solutions to the fewest displayed rows', () => {
  const puzzle = {
    initial: [3, 2, 6, 1, 4],
    target: [3, 3, 3, 3, 3],
    links: [
      [
        { target: 1, mode: 'opposite' },
        { target: 2, mode: 'opposite' },
      ],
      [
        { target: 0, mode: 'same' },
        { target: 3, mode: 'opposite' },
      ],
      [
        { target: 3, mode: 'same' },
        { target: 1, mode: 'same' },
        { target: 0, mode: 'opposite' },
      ],
      [
        { target: 4, mode: 'same' },
        { target: 0, mode: 'opposite' },
      ],
      [{ target: 2, mode: 'opposite' }],
    ],
  };

  const result = solvePuzzle(puzzle);

  assert.equal(result.status, 'solved');
  assert.equal(result.moves.length, 9);
  assert.equal(countPlateSwitches(result.moves), 8);
  assert.deepEqual(applyCompressedMoves(puzzle.initial, result.moves, puzzle.links), puzzle.target);
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

test('compressed solution moves can be replayed without wrapping', () => {
  const links = [
    [{ target: 1, mode: 'opposite' }],
    [],
  ];

  const move = { actor: 0, direction: 'right', count: 2 };

  assert.deepEqual(applyCompressedMove([1, 5], move, links), [3, 3]);
  assert.deepEqual(applyCompressedMoves([1, 5], [move], links), [3, 3]);
  assert.equal(applyCompressedMove([5, 1], move, links), null);
});
