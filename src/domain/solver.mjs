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

export function solvePuzzle({
  initial,
  target,
  links,
  maxVisited = 250000,
  requireActorAtTarget = false,
}) {
  if (initial.length !== target.length) {
    throw new Error('Initial and target positions must have the same length.');
  }

  const normalizedInitial = initial.map(normalizePosition);
  const normalizedTarget = target.map(normalizePosition);
  if (sameState(normalizedInitial, normalizedTarget)) {
    return { status: 'solved', moves: [], visited: 1 };
  }

  const queue = [{ state: normalizedInitial, moves: [] }];
  const visited = new Set([stateKey(normalizedInitial)]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    if (visited.size > maxVisited) {
      return { status: 'limit', moves: [], visited: visited.size };
    }

    const node = queue[cursor];
    for (let actor = 0; actor < normalizedInitial.length; actor += 1) {
      if (!isActorLegalBeforeMove(node.state, normalizedTarget, actor, requireActorAtTarget)) {
        continue;
      }

      for (const direction of ['left', 'right']) {
        const nextState = applyMove(node.state, actor, direction, links);
        if (nextState === null) {
          continue;
        }

        const key = stateKey(nextState);
        if (visited.has(key)) {
          continue;
        }

        const moves = [...node.moves, { actor, direction }];
        if (sameState(nextState, normalizedTarget)) {
          return {
            status: 'solved',
            moves: compressMoves(moves),
            rawMoves: moves,
            visited: visited.size + 1,
          };
        }


        visited.add(key);
        queue.push({ state: nextState, moves });
      }
    }
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
