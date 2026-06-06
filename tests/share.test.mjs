import assert from 'node:assert/strict';
import test from 'node:test';

import { createShareText, parseShareText } from '../src/share/share.mjs';

test('share text round trips puzzle setup and selected actor', () => {
  const puzzle = {
    initial: [1, 2, 3],
    target: [3, 3, 3],
    links: [[{ target: 1, mode: 'same' }], [], [{ target: 0, mode: 'opposite' }]],
  };

  const text = createShareText({
    puzzle,
    selectedActor: 2,
    solution: [{ actor: 0, direction: 'right', count: 2 }],
  });

  assert.deepEqual(parseShareText(text), { puzzle, selectedActor: 2 });
});

test('share text includes affected linked plates for each solution step', () => {
  const text = createShareText({
    puzzle: {
      initial: [1, 2, 3],
      target: [3, 3, 3],
      links: [[{ target: 1, mode: 'same' }, { target: 2, mode: 'opposite' }], [], []],
    },
    selectedActor: 0,
    solution: [{ actor: 0, direction: 'left', count: 2 }],
  });

  const parsed = JSON.parse(text);

  assert.deepEqual(parsed.solution[0].movesWith, [
    { plate: 2, mode: 'same' },
    { plate: 3, mode: 'opposite' },
  ]);
});

test('share text clamps malformed setup to valid plate positions and links', () => {
  assert.deepEqual(
    parseShareText(JSON.stringify({
      selectedActor: 99,
      puzzle: {
        initial: [-1, 7, 2],
        links: [[{ target: 0, mode: 'same' }, { target: 2, mode: 'opposite' }], [], []],
      },
    })),
    {
      puzzle: {
        initial: [3, 3, 2],
        target: [3, 3, 3],
        links: [[{ target: 2, mode: 'opposite' }], [], []],
      },
      selectedActor: 2,
    },
  );
});
