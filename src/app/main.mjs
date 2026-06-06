import {
  MIDDLE_POSITION,
  POSITION_COUNT,
  createDefaultPuzzle,
  createResetPuzzle,
  solvePuzzle,
} from '../domain/solver.mjs';
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

function cloneLinks(links) {
  return links.map((effects) => effects.map((effect) => ({ ...effect })));
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
  saveState();
  render();
}

function resetPuzzle() {
  puzzle = createResetPuzzle(puzzle);
  selectedActor = 0;
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
  saveState();
  render();
}

function currentShareText() {
  const result = solvePuzzle(puzzle);
  return createShareText({
    puzzle,
    selectedActor,
    solution: result.status === 'solved' ? result.moves : [],
  });
}

async function copySetup() {
  await navigator.clipboard?.writeText(currentShareText());
}

async function pasteSetup() {
  const text = await navigator.clipboard?.readText();
  if (!text) {
    return;
  }

  const loaded = parseShareText(text);
  puzzle = loaded.puzzle;
  selectedActor = loaded.selectedActor;
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

function positionPicker(kind, plate) {
  return `
    <div class="position-row" role="radiogroup" aria-label="${kind} position for plate ${plate + 1}">
      ${Array.from({ length: POSITION_COUNT }, (_, position) => {
        const isActive = puzzle[kind][plate] === position;
        return `
          <button
            class="notch ${isActive ? 'is-active' : ''}"
            data-action="set-position"
            data-kind="${kind}"
            data-plate="${plate}"
            data-position="${position}"
            aria-pressed="${isActive}"
          >${position + 1}</button>
        `;
      }).join('')}
    </div>
  `;
}

function plateCard(plate) {
  const selected = selectedActor === plate;
  return `
    <article class="plate ${selected ? 'is-selected' : ''}">
      <button class="plate-title" data-action="select-actor" data-plate="${plate}">
        <span>Plate ${plate + 1}</span>
        <strong>${selected ? 'editing links' : 'select'}</strong>
      </button>
      <div class="plate-pickers">
        <label>
          <span>Initial</span>
          ${positionPicker('initial', plate)}
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
      ? 'off'
      : mode === 'same'
        ? 'same'
        : 'opposite';
  return `
    <button
      class="link-button ${mode !== 'none' ? 'is-linked' : ''} ${disabled ? 'is-disabled' : ''}"
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
    return '<p class="solution-note">Already solved. Initial and correct positions match.</p>';
  }

  if (result.status !== 'solved') {
    const message = result.status === 'limit'
      ? `Search stopped after ${result.visited.toLocaleString()} states.`
      : `No solution found after ${result.visited.toLocaleString()} states.`;
    return `<p class="solution-note is-warning">${message}</p>`;
  }

  return `
    <ol class="solution-list">
      ${result.moves.map((move) => `
        <li>
          <span class="move-plate">${move.actor + 1}</span>
          <span class="move-arrows">${formatArrows(move.direction, move.count)}</span>
          <span class="move-count">${move.count} ${move.count === 1 ? 'step' : 'steps'}</span>
        </li>
      `).join('')}
    </ol>
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
          <li><strong>Set pin positions.</strong> For every plate, click its current position from 1 to 7. The correct position is always 4.</li>
          <li><strong>Configure linked movement.</strong> In the link editor, click each plate to cycle off, same, opposite.</li>
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
      <div id="coffee-button" class="coffee-button"></div>
    </section>
  `;
}

function render() {
  const result = solvePuzzle(puzzle);
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
            ${puzzle.initial.map((_, plate) => plateCard(plate)).join('')}
          </div>
        </div>

        <aside class="side-panel">
          ${plateControls()}
          <section class="link-editor">
            <div class="panel-heading">
              <p class="eyebrow">Actor plate ${selectedActor + 1}</p>
              <h2>Click linked plates</h2>
            </div>
            <div class="link-grid">
              ${puzzle.initial.map((_, target) => linkButton(target)).join('')}
            </div>
            <p class="hint">Choose which plates follow plate ${selectedActor + 1}. Click a plate to cycle between off, same direction, and opposite direction.</p>
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
}

app.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) {
    return;
  }

  const { action } = button.dataset;
  if (action === 'select-actor') {
    selectedActor = Number(button.dataset.plate);
    saveState();
    render();
  }

  if (action === 'set-position') {
    setPlatePosition(button.dataset.kind, Number(button.dataset.plate), Number(button.dataset.position));
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
});

app.addEventListener('change', (event) => {
  if (event.target.dataset.action === 'plate-count') {
    resizePuzzle(Number(event.target.value));
  }
});

render();
