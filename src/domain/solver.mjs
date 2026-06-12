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

function searchKey(state, lastActor) {
  return `${stateKey(state)}|${lastActor ?? 'none'}`;
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

export function countPlateSwitches(moves) {
  return moves.reduce((switches, move, index) => {
    if (index === 0 || moves[index - 1].actor === move.actor) {
      return switches;
    }

    return switches + 1;
  }, 0);
}

function isBetterSolution(candidate, current) {
  if (current === null) {
    return true;
  }

  if (candidate.moves.length !== current.moves.length) {
    return candidate.moves.length < current.moves.length;
  }

  const candidateSwitches = countPlateSwitches(candidate.moves);
  const currentSwitches = countPlateSwitches(current.moves);
  if (candidateSwitches !== currentSwitches) {
    return candidateSwitches < currentSwitches;
  }

  return candidate.rawMoves.length < current.rawMoves.length;
}

function compareSearchNodes(a, b) {
  if (a.moves.length !== b.moves.length) {
    return a.moves.length - b.moves.length;
  }

  if (a.plateSwitches !== b.plateSwitches) {
    return a.plateSwitches - b.plateSwitches;
  }

  return a.rawMoveCount - b.rawMoveCount;
}

function isBetterSearchNode(candidate, current) {
  return current === undefined || compareSearchNodes(candidate, current) < 0;
}

class MinHeap {
  #items = [];

  get size() {
    return this.#items.length;
  }

  push(item) {
    this.#items.push(item);
    this.#bubbleUp(this.#items.length - 1);
  }

  pop() {
    if (this.#items.length === 0) {
      return null;
    }

    const item = this.#items[0];
    const last = this.#items.pop();
    if (this.#items.length > 0) {
      this.#items[0] = last;
      this.#bubbleDown(0);
    }

    return item;
  }

  #bubbleUp(index) {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (compareSearchNodes(this.#items[current], this.#items[parent]) >= 0) {
        break;
      }

      [this.#items[current], this.#items[parent]] = [this.#items[parent], this.#items[current]];
      current = parent;
    }
  }

  #bubbleDown(index) {
    let current = index;
    while (true) {
      const left = current * 2 + 1;
      const right = left + 1;
      let smallest = current;

      if (
        left < this.#items.length &&
        compareSearchNodes(this.#items[left], this.#items[smallest]) < 0
      ) {
        smallest = left;
      }

      if (
        right < this.#items.length &&
        compareSearchNodes(this.#items[right], this.#items[smallest]) < 0
      ) {
        smallest = right;
      }

      if (smallest === current) {
        break;
      }

      [this.#items[current], this.#items[smallest]] = [this.#items[smallest], this.#items[current]];
      current = smallest;
    }
  }
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

  const start = {
    state: normalizedInitial,
    moves: [],
    rawMoveCount: 0,
    plateSwitches: 0,
    lastActor: null,
  };
  const queue = new MinHeap();
  queue.push(start);

  const bestByState = new Map([[searchKey(start.state, start.lastActor), start]]);

  while (queue.size > 0) {
    const node = queue.pop();
    const nodeKey = searchKey(node.state, node.lastActor);
    if (bestByState.get(nodeKey) !== node) {
      continue;
    }

    if (sameState(node.state, normalizedTarget)) {
      return {
        status: 'solved',
        moves: node.moves,
        rawMoves: expandCompressedMoves(node.moves),
        visited: bestByState.size,
      };
    }

    if (bestByState.size > visitedLimit) {
      return { status: 'limit', moves: [], visited: bestByState.size };
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
          const nextNode = {
            state: nextState,
            moves,
            rawMoveCount: node.rawMoveCount + count,
            plateSwitches: node.plateSwitches + (
              node.lastActor !== null && node.lastActor !== actor ? 1 : 0
            ),
            lastActor: actor,
          };

          const key = searchKey(nextState, actor);
          if (!isBetterSearchNode(nextNode, bestByState.get(key))) {
            continue;
          }

          bestByState.set(key, nextNode);
          queue.push(nextNode);
        }
      }
    }
  }

  return { status: 'unsolved', moves: [], visited: bestByState.size };
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
