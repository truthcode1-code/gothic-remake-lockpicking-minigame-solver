import { MIDDLE_POSITION, POSITION_COUNT, createDefaultPuzzle } from './solver.mjs';

export function normalizeSharePuzzle(value) {
  const count = Math.max(1, Math.min(8, Number(value?.initial?.length) || 5));
  const fallback = createDefaultPuzzle(count);

  return {
    initial: Array.from({ length: count }, (_, index) => {
      const position = Number(value?.initial?.[index]);
      return Number.isInteger(position) && position >= 0 && position < POSITION_COUNT
        ? position
        : fallback.initial[index];
    }),
    target: Array.from({ length: count }, () => MIDDLE_POSITION),
    links: Array.from({ length: count }, (_, actor) => {
      const effects = Array.isArray(value?.links?.[actor]) ? value.links[actor] : [];
      const seen = new Set();
      return effects
        .filter((effect) => Number.isInteger(effect?.target) && effect.target >= 0 && effect.target < count)
        .filter((effect) => effect.target !== actor)
        .filter((effect) => {
          if (seen.has(effect.target)) {
            return false;
          }
          seen.add(effect.target);
          return true;
        })
        .map((effect) => ({
          target: effect.target,
          mode: effect.mode === 'opposite' || effect.direction === 'left' ? 'opposite' : 'same',
        }));
    }),
  };
}

export function createShareText({ puzzle, selectedActor, solution }) {
  const enrichedSolution = solution.map((move) => ({
    ...move,
    plate: move.actor + 1,
    movesWith: (puzzle.links[move.actor] ?? []).map((effect) => ({
      plate: effect.target + 1,
      mode: effect.mode,
    })),
  }));

  return JSON.stringify(
    {
      app: 'gothic-remake-lockpicking-minigame-solver',
      version: 1,
      selectedActor,
      puzzle: {
        initial: puzzle.initial,
        links: puzzle.links,
      },
      solution: enrichedSolution,
    },
    null,
    2,
  );
}

export function parseShareText(text) {
  const parsed = JSON.parse(text);
  const puzzle = normalizeSharePuzzle(parsed?.puzzle ?? parsed);
  const actor = Number(parsed?.selectedActor);
  return {
    puzzle,
    selectedActor: Number.isInteger(actor) ? Math.min(Math.max(actor, 0), puzzle.initial.length - 1) : 0,
  };
}
