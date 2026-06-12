export const DEFAULT_PLATE_COUNT = 5;
export const POSITION_COUNT = 7;
export const MIDDLE_POSITION = Math.floor(POSITION_COUNT / 2);

export function normalizePosition(value) {
  return ((value % POSITION_COUNT) + POSITION_COUNT) % POSITION_COUNT;
}

export function directionDelta(direction) {
  return direction === 'left' ? -1 : 1;
}

function movePosition(position, direction) {
  const next = position + directionDelta(direction);
  return next >= 0 && next < POSITION_COUNT ? next : null;
}

export function applyMove(state, actor, direction, links) {
  const next = [...state];
  const actorPosition = movePosition(next[actor], direction);
  if (actorPosition === null) {
    return null;
  }
  next[actor] = actorPosition;

  for (const effect of links[actor] ?? []) {
    const effectDirection = effect.mode === 'opposite'
      ? direction === 'left' ? 'right' : 'left'
      : effect.direction ?? direction;
    const effectPosition = movePosition(next[effect.target], effectDirection);
    if (effectPosition === null) {
      return null;
    }
    next[effect.target] = effectPosition;
  }

  return next;
}

function stateKey(state) {
  return state.join(',');
}

function sameState(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function isActorLegalBeforeMove(state, target, actor, requireActorAtTarget) {
  return !requireActorAtTarget || state[actor] === target[actor];
}

export function compressMoves(moves) {
  const compressed = [];
  for (const move of moves) {
    const last = compressed[compressed.length - 1];
    if (last && last.actor === move.actor && last.direction === move.direction) {
      last.count += 1;
    } else {
      compressed.push({ ...move, count: 1 });
    }
  }
  return compressed;
}

export function applyCompressedMove(state, move, links) {
  let next = [...state];
  for (let step = 0; step < move.count; step += 1) {
    next = applyMove(next, move.actor, move.direction, links);
    if (next === null) {
      return null;
    }
  }
  return next;
}

export function applyCompressedMoves(state, moves, links) {
  let next = [...state];
  for (const move of moves) {
    next = applyCompressedMove(next, move, links);
    if (next === null) {
      return null;
    }
  }
  return next;
}

function expandCompressedMoves(moves) {
  return moves.flatMap((move) =>
    Array.from({ length: move.count }, () => ({
      actor: move.actor,
      direction: move.direction,
    })),
  );
}

export function defaultMaxVisitedForPlateCount(count) {
  if (count >= 8) {
    return 5000000;
  }

  if (count >= 7) {
    return 2250000;
  }

  if (count >= 6) {
    return 750000;
  }

  return 250000;
}

export function solvePuzzle({
  initial,
  target,
  links,
  maxVisited,
  requireActorAtTarget = false,
}) {
  if (initial.length !== target.length) {
    throw new Error('Initial and target positions must have the same length.');
  }

  const normalizedInitial = initial.map(normalizePosition);
  const normalizedTarget = target.map(normalizePosition);
  const visitedLimit = maxVisited ?? defaultMaxVisitedForPlateCount(normalizedInitial.length);
  if (sameState(normalizedInitial, normalizedTarget)) {
    return { status: 'solved', moves: [], visited: 1 };
  }

  const queue = [{ state: normalizedInitial, moves: [], rawMoveCount: 0 }];
  const visited = new Set([stateKey(normalizedInitial)]);
  let bestSolution = null;

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const node = queue[cursor];
    if (bestSolution !== null && node.moves.length >= bestSolution.moves.length) {
      break;
    }

    if (visited.size > visitedLimit) {
      return { status: 'limit', moves: [], visited: visited.size };
    }

    for (let actor = 0; actor < normalizedInitial.length; actor += 1) {
      if (!isActorLegalBeforeMove(node.state, normalizedTarget, actor, requireActorAtTarget)) {
        continue;
      }

      for (const direction of ['left', 'right']) {
        let nextState = node.state;
        for (let count = 1; count < POSITION_COUNT; count += 1) {
          if (!isActorLegalBeforeMove(nextState, normalizedTarget, actor, requireActorAtTarget)) {
            break;
          }

          nextState = applyMove(nextState, actor, direction, links);
          if (nextState === null) {
            break;
          }

          const moves = [...node.moves, { actor, direction, count }];
          const rawMoveCount = node.rawMoveCount + count;
          if (sameState(nextState, normalizedTarget)) {
            if (
              bestSolution === null ||
              moves.length < bestSolution.moves.length ||
              (moves.length === bestSolution.moves.length && rawMoveCount < bestSolution.rawMoves.length)
            ) {
              bestSolution = {
                status: 'solved',
                moves,
                rawMoves: expandCompressedMoves(moves),
                visited: visited.size + 1,
              };
            }
            continue;
          }

          const key = stateKey(nextState);
          if (visited.has(key)) {
            continue;
          }

          visited.add(key);
          queue.push({ state: nextState, moves, rawMoveCount });
        }
      }
    }
  }

  if (bestSolution !== null) {
    return bestSolution;
  }

  return { status: 'unsolved', moves: [], visited: visited.size };
}

export function createDefaultPuzzle(count = DEFAULT_PLATE_COUNT) {
  return {
    initial: Array.from({ length: count }, () => MIDDLE_POSITION),
    target: Array.from({ length: count }, () => MIDDLE_POSITION),
    links: Array.from({ length: count }, () => []),
  };
}

export function createResetPuzzle(puzzle) {
  return createDefaultPuzzle(puzzle.initial.length);
}
