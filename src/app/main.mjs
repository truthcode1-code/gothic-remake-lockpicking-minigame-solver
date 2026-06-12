import {
  MIDDLE_POSITION,
  POSITION_COUNT,
  applyCompressedMoves,
  createDefaultPuzzle,
  createResetPuzzle,
  solvePuzzle,
} from '../domain/solver.mjs';
import { readClipboardText, writeClipboardText } from '../share/clipboard.mjs';
import { createShareText, normalizeSharePuzzle, parseShareText } from '../share/share.mjs';

const app = document.querySelector('#app');
const STORAGE_KEY = 'gothic-lockpick-solver-state';

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    const puzzleState = normalizeSharePuzzle(stored?.puzzle);
    const actor = Number(stored?.selectedActor);
    return {
      puzzle: puzzleState,
      selectedActor: Number.isInteger(actor) ? Math.min(Math.max(actor, 0), puzzleState.initial.length - 1) : 0,
    };
  } catch {
    return { puzzle: createDefaultPuzzle(), selectedActor: 0 };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ puzzle, selectedActor }));
}

const storedState = loadState();
let puzzle = storedState.puzzle;
let selectedActor = storedState.selectedActor;
let helpOpen = false;
let playbackStep = 0;
let solutionCache = { key: '', result: null };

function cloneLinks(links) {
  return links.map((effects) => effects.map((effect) => ({ ...effect })));
}

function puzzleSolutionKey() {
  return JSON.stringify({ initial: puzzle.initial, target: puzzle.target, links: puzzle.links });
}

function currentSolution() {
  const key = puzzleSolutionKey();
  if (solutionCache.key !== key) {
    solutionCache = { key, result: solvePuzzle(puzzle) };
  }
  return solutionCache.result;
}

function resizePuzzle(count) {
  const nextCount = Math.max(1, Math.min(8, count));
  const next = createDefaultPuzzle(nextCount);
  next.initial = Array.from({ length: nextCount }, (_, index) => puzzle.initial[index] ?? 0);
  next.target = Array.from({ length: nextCount }, () => MIDDLE_POSITION);
  next.links = Array.from({ length: nextCount }, (_, actor) =>
    (puzzle.links[actor] ?? [])
      .filter((effect) => effect.target < nextCount)
      .map((effect) => ({ ...effect })),
  );
  puzzle = next;
  selectedActor = Math.min(selectedActor, nextCount - 1);
  playbackStep = 0;
  saveState();
  render();
}

function resetPuzzle() {
  puzzle = createResetPuzzle(puzzle);
  selectedActor = 0;
  playbackStep = 0;
  saveState();
  render();
}

function setPlatePosition(kind, plate, position) {
  if (kind !== 'initial') {
    return;
  }

  puzzle = {
    ...puzzle,
    [kind]: puzzle[kind].map((value, index) => (index === plate ? position : value)),
    links: cloneLinks(puzzle.links),
  };
  playbackStep = 0;
  saveState();
  render();
}

function cycleLink(actor, target) {
  if (actor === target) {
    return;
  }

  const links = cloneLinks(puzzle.links);
  const existing = links[actor].find((effect) => effect.target === target);
  if (!existing) {
    links[actor].push({ target, mode: 'same' });
  } else if (existing.mode === 'same' || existing.direction === 'right') {
    existing.mode = 'opposite';
    delete existing.direction;
  } else {
    links[actor] = links[actor].filter((effect) => effect.target !== target);
  }
  puzzle = { ...puzzle, links };
  playbackStep = 0;
  saveState();
  render();
}

function currentShareText() {
  const result = currentSolution();
  return createShareText({
    puzzle,
    selectedActor,
    solution: result.status === 'solved' ? result.moves : [],
  });
}

async function copySetup() {
  await writeClipboardText(currentShareText());
}

async function pasteSetup() {
  const text = await readClipboardText();
  if (!text) {
    return;
  }

  const loaded = parseShareText(text);
  puzzle = loaded.puzzle;
  selectedActor = loaded.selectedActor;
  playbackStep = 0;
  saveState();
  render();
}

function getLinkMode(actor, target) {
  const effect = puzzle.links[actor].find((candidate) => candidate.target === target);
  if (!effect) {
    return 'none';
  }

  return effect.mode ?? (effect.direction === 'left' ? 'opposite' : 'same');
}

function formatArrows(direction, count) {
  const glyph = direction === 'left' ? '→' : '←';
  return glyph.repeat(count);
}

function getPlaybackPositions(result) {
  if (result.status !== 'solved' || playbackStep === 0) {
    return puzzle.initial;
  }

  return applyCompressedMoves(puzzle.initial, result.moves.slice(0, playbackStep), puzzle.links) ?? puzzle.initial;
}

function getMovingPlates(result) {
  if (result.status !== 'solved' || playbackStep === 0) {
    return new Set();
  }

  const move = result.moves[playbackStep - 1];
  return new Set([move.actor, ...(puzzle.links[move.actor] ?? []).map((effect) => effect.target)]);
}

function linkSummary() {
  const effects = puzzle.links[selectedActor] ?? [];
  if (effects.length === 0) {
    return `No other plates move with Plate ${selectedActor + 1} yet.`;
  }

  return `Moves with it: ${effects
    .map((effect) => `Plate ${effect.target + 1} ${getLinkMode(selectedActor, effect.target) === 'opposite' ? 'opposite' : 'same'}`)
    .join(', ')}.`;
}

function playbackControls(result) {
  if (result.status !== 'solved' || result.moves.length === 0) {
    return '';
  }

  const atEnd = playbackStep >= result.moves.length;
  return `
    <div class="playback-controls" aria-label="Solution playback">
      <button data-action="playback-next" type="button" ${atEnd ? 'disabled' : ''}>
        ${playbackStep === 0 ? 'Start playback' : 'Next step'}
      </button>
      <button data-action="playback-reset" type="button" ${playbackStep === 0 ? 'disabled' : ''}>Reset preview</button>
      <span>Step ${playbackStep} of ${result.moves.length}</span>
    </div>
  `;
}

function positionVisual(position, isMoving) {
  const plateLeft = POSITION_COUNT - 1 - position;
  return `
    <div class="plate-motion ${isMoving ? 'is-moving' : ''}" style="--plate-left: ${plateLeft}" aria-hidden="true">
      <div class="fixed-target"></div>
      <div class="moving-plate">
        ${Array.from({ length: POSITION_COUNT }, (_, index) => `<span>${index + 1}</span>`).join('')}
      </div>
    </div>
  `;
}

function currentPinStepper(plate) {
  const value = puzzle.initial[plate];
  return `
    <div class="pin-stepper" aria-label="Initial pin position for plate ${plate + 1}">
      <button
        data-action="step-position"
        data-plate="${plate}"
        data-delta="-1"
        type="button"
        aria-label="Move plate ${plate + 1} pin position left"
        ${value === 0 ? 'disabled' : ''}
      >←</button>
      <span><small>Initial pin position</small><strong>${value + 1}</strong></span>
      <button
        data-action="step-position"
        data-plate="${plate}"
        data-delta="1"
        type="button"
        aria-label="Move plate ${plate + 1} pin position right"
        ${value === POSITION_COUNT - 1 ? 'disabled' : ''}
      >→</button>
    </div>
  `;
}

function positionPicker(kind, plate, positions, movingPlates) {
  const displayPosition = positions[plate];
  const isMoving = movingPlates.has(plate);
  return `
    ${positionVisual(displayPosition, isMoving)}
    ${currentPinStepper(plate)}
  `;
}

function plateCard(plate, positions, movingPlates) {
  const selected = selectedActor === plate;
  return `
    <article class="plate ${selected ? 'is-selected' : ''} ${movingPlates.has(plate) ? 'is-moving' : ''}">
      <button class="plate-title" data-action="select-actor" data-plate="${plate}">
        <span>Plate ${plate + 1}</span>
        <strong>${selected ? 'Actor' : 'Set as actor'}</strong>
      </button>
      <div class="plate-pickers">
        <label>
          ${positionPicker('initial', plate, positions, movingPlates)}
        </label>
      </div>
    </article>
  `;
}

function linkButton(target) {
  const mode = getLinkMode(selectedActor, target);
  const disabled = selectedActor === target;
  const label = disabled
    ? 'actor'
    : mode === 'none'
      ? 'Not linked'
      : mode === 'same'
        ? 'Same direction'
        : 'Opposite direction';
  return `
    <button
      class="link-button ${mode !== 'none' ? 'is-linked' : ''} ${disabled ? 'is-actor' : ''}"
      data-action="cycle-link"
      data-target="${target}"
      ${disabled ? 'disabled' : ''}
    >
      <span>Plate ${target + 1}</span>
      <strong>${label}</strong>
    </button>
  `;
}

function solutionPanel(result) {
  if (result.status === 'solved' && result.moves.length === 0) {
    return '<div class="solution-body"><p class="solution-note">Already solved. Initial and correct positions match.</p></div>';
  }

  if (result.status !== 'solved') {
    const message = result.status === 'limit'
      ? `Search stopped after ${result.visited.toLocaleString()} states.`
      : `No solution found after ${result.visited.toLocaleString()} states.`;
    return `<div class="solution-body"><p class="solution-note is-warning">${message}</p></div>`;
  }

  return `
    <div class="solution-body">
      ${playbackControls(result)}
      <ol class="solution-list">
        ${result.moves.map((move, index) => `
          <li class="${index === playbackStep - 1 ? 'is-current' : ''}">
            <span class="move-plate">${move.actor + 1}</span>
            <span class="move-arrows">${formatArrows(move.direction, move.count)}</span>
            <span class="move-count">${move.count} ${move.count === 1 ? 'step' : 'steps'}</span>
          </li>
        `).join('')}
      </ol>
    </div>
  `;
}

function mountCoffeeButton() {
  const host = app.querySelector('#coffee-button');
  if (!host) {
    return;
  }

  host.innerHTML = '<a class="bmc-fallback" href="https://buymeacoffee.com/gothic.locksolver" target="_blank" rel="noreferrer">Buy me a coffee</a>';
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js';
  script.dataset.name = 'bmc-button';
  script.dataset.slug = 'gothic.locksolver';
  script.dataset.color = '#C8A15D';
  script.dataset.emoji = '';
  script.dataset.font = 'Arial';
  script.dataset.text = 'Buy me a coffee';
  script.dataset.outlineColor = '#5E503F';
  script.dataset.fontColor = '#171513';
  script.dataset.coffeeColor = '#ffffff';
  script.addEventListener('load', () => {
    const generatedButton = host.querySelector('.bmc-btn, iframe');
    if (generatedButton) {
      host.querySelector('.bmc-fallback')?.remove();
    }
  });
  host.append(script);
}

function topActions() {
  return `
    <div class="top-actions">
      <button class="reset-button" data-action="reset-puzzle" type="button">Reset</button>
      <button class="share-button" data-action="copy-share" type="button">Copy setup</button>
      <button class="share-button" data-action="paste-share" type="button">Paste setup</button>
      <button class="help-button" data-action="toggle-help" type="button" aria-expanded="${helpOpen}">Help</button>
    </div>
  `;
}

function plateControls() {
  return `
    <section class="plate-controls" aria-label="Plate count">
      <div>
        <p class="eyebrow">Setup</p>
        <h2>Plates</h2>
      </div>
      <div class="plate-stepper">
        <button data-action="decrease-plates" type="button" aria-label="Decrease plates">−</button>
        <span><strong>${puzzle.initial.length}</strong> plates</span>
        <button data-action="increase-plates" type="button" aria-label="Increase plates">+</button>
      </div>
    </section>
  `;
}

function helpPanel() {
  if (!helpOpen) {
    return '';
  }

  return `
    <section class="help-overlay" aria-label="How to use the solver">
      <div class="help-panel">
        <div class="help-header">
          <div>
            <p class="eyebrow">Quick guide</p>
            <h2>How it works</h2>
          </div>
          <button data-action="toggle-help" type="button" aria-label="Close help">×</button>
        </div>
        <ol class="help-steps">
          <li><strong>Choose plates.</strong> Use − and + to match the number of lock plates.</li>
          <li><strong>Select a plate.</strong> Click a plate row. That plate becomes the actor you are configuring.</li>
          <li><strong>Set pin positions.</strong> For every plate, set its starting pin position from 1 to 7.</li>
          <li><strong>Configure linked movement.</strong> In the link editor, click each plate to cycle Not linked, same, opposite.</li>
          <li><strong>Repeat per actor.</strong> Select the next plate and configure which plates move when that plate moves.</li>
          <li><strong>Read the solution.</strong> Move the numbered plate by the shown arrows and step count, top to bottom.</li>
        </ol>
        <figure class="help-example">
          <img
            src="https://www.pcgames.de/screenshots/1000x562/2026/06/Gothic_Remake_Schloss-pc-games_artwork1.jpg"
            alt="Gothic Remake lockpicking minigame reference showing six plate pins"
          />
          <figcaption>
            Example reference from
            <a href="https://www.pcgames.de/screenshots/1000x562/2026/06/Gothic_Remake_Schloss-pc-games_artwork1.jpg" target="_blank" rel="noreferrer">PC Games</a>:
            the visible pin positions are plate 1 = 2, plate 2 = 5, plate 3 = 6, plate 4 = 6, plate 5 = 5, and plate 6 = 4.
            The goal is always to bring every pin to the 4th position.
          </figcaption>
        </figure>
      </div>
    </section>
  `;
}

function supportPanel() {
  return `
    <section class="support-panel" aria-label="Support this project">
      <p>Saved you some headaches?</p>
      <div id="coffee-button" class="coffee-button"></div>
    </section>
  `;
}

function keepCurrentSolutionStepVisible() {
  if (playbackStep === 0) {
    return;
  }

  app.querySelector('.solution-list li.is-current')?.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
  });
}

function render() {
  const result = currentSolution();
  playbackStep = Math.min(playbackStep, result.status === 'solved' ? result.moves.length : 0);
  const playbackPositions = getPlaybackPositions(result);
  const movingPlates = getMovingPlates(result);
  app.innerHTML = `
    <section class="topbar">
      <div>
        <p class="eyebrow">Gothic Remake</p>
        <h1>Lockpicking Minigame Solver</h1>
      </div>
      ${topActions()}
    </section>

    <section class="app-workspace" style="--plate-count: ${puzzle.initial.length}">
      <section class="workspace">
        <div class="main-panel">
          <div class="plate-board">
            ${puzzle.initial.map((_, plate) => plateCard(plate, playbackPositions, movingPlates)).join('')}
          </div>
        </div>

        <aside class="side-panel">
          ${plateControls()}
          <section class="link-editor">
            <div class="panel-heading">
              <p class="eyebrow">Actor plate ${selectedActor + 1}</p>
              <h2>When Plate ${selectedActor + 1} moves</h2>
            </div>
            <p class="link-summary">${linkSummary()}</p>
            <div class="link-grid">
              ${puzzle.initial.map((_, target) => linkButton(target)).join('')}
            </div>
            <p class="hint">Click a plate to cycle: Not linked, same direction, opposite direction. Same follows Plate ${selectedActor + 1}. Opposite moves the other way.</p>
          </section>

          <section class="solution-panel">
            <div class="panel-heading">
              <p class="eyebrow">Shortest search</p>
              <h2>Solution</h2>
            </div>
            ${solutionPanel(result)}
          </section>
          ${supportPanel()}
        </aside>
      </section>
    </section>
    ${helpPanel()}
  `;
  mountCoffeeButton();
  keepCurrentSolutionStepVisible();
}

app.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) {
    return;
  }

  const { action } = button.dataset;
  if (action === 'select-actor') {
    selectedActor = Number(button.dataset.plate);
    playbackStep = 0;
    saveState();
    render();
  }

  if (action === 'set-position') {
    setPlatePosition(button.dataset.kind, Number(button.dataset.plate), Number(button.dataset.position));
  }

  if (action === 'step-position') {
    const plate = Number(button.dataset.plate);
    const nextPosition = puzzle.initial[plate] + Number(button.dataset.delta);
    if (nextPosition >= 0 && nextPosition < POSITION_COUNT) {
      setPlatePosition('initial', plate, nextPosition);
    }
  }

  if (action === 'cycle-link') {
    cycleLink(selectedActor, Number(button.dataset.target));
  }

  if (action === 'decrease-plates') {
    resizePuzzle(puzzle.initial.length - 1);
  }

  if (action === 'increase-plates') {
    resizePuzzle(puzzle.initial.length + 1);
  }

  if (action === 'reset-puzzle') {
    resetPuzzle();
  }

  if (action === 'toggle-help') {
    helpOpen = !helpOpen;
    render();
  }

  if (action === 'copy-share') {
    await copySetup();
  }

  if (action === 'paste-share') {
    try {
      await pasteSetup();
    } catch {
      button.classList.add('is-invalid');
    }
  }

  if (action === 'playback-next') {
    const result = currentSolution();
    if (result.status === 'solved') {
      playbackStep = Math.min(playbackStep + 1, result.moves.length);
      render();
    }
  }

  if (action === 'playback-reset') {
    playbackStep = 0;
    render();
  }
});

app.addEventListener('change', (event) => {
  if (event.target.dataset.action === 'plate-count') {
    resizePuzzle(Number(event.target.value));
  }
});

render();
