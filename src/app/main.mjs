import { MIDDLE_POSITION, POSITION_COUNT, createDefaultPuzzle, solvePuzzle } from '../domain/solver.mjs';
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
    return { puzzle: createDefaultPuzzle(5), selectedActor: 0 };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ puzzle, selectedActor }));
}

function resetShareDraft() {
  shareDraft = '';
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const storedState = loadState();
let puzzle = storedState.puzzle;
let selectedActor = storedState.selectedActor;
let shareDraft = '';

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
  resetShareDraft();
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
  resetShareDraft();
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
  resetShareDraft();
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
  const glyph = direction === 'left' ? '←' : '→';
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

function sharePanel(result) {
  const shareText = shareDraft || createShareText({
    puzzle,
    selectedActor,
    solution: result.status === 'solved' ? result.moves : [],
  });

  return `
    <section class="share-panel">
      <div class="panel-heading">
        <p class="eyebrow">Share</p>
        <h2>Setup and solution</h2>
      </div>
      <textarea data-action="share-text" spellcheck="false">${escapeHtml(shareText)}</textarea>
      <div class="share-actions">
        <button data-action="copy-share" type="button">Copy</button>
        <button data-action="load-share" type="button">Load</button>
      </div>
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
      <label class="count-control">
        <span>Plates</span>
        <input data-action="plate-count" type="number" min="1" max="8" value="${puzzle.initial.length}" />
      </label>
    </section>

    <section class="workspace" style="--plate-count: ${puzzle.initial.length}">
      <div class="main-panel">
        <div class="plate-board">
          ${puzzle.initial.map((_, plate) => plateCard(plate)).join('')}
        </div>
      </div>

      <aside class="side-panel">
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
        ${sharePanel(result)}
      </aside>
    </section>
  `;
}

app.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) {
    return;
  }

  const { action } = button.dataset;
  if (action === 'select-actor') {
    selectedActor = Number(button.dataset.plate);
    resetShareDraft();
    saveState();
    render();
  }

  if (action === 'set-position') {
    setPlatePosition(button.dataset.kind, Number(button.dataset.plate), Number(button.dataset.position));
  }

  if (action === 'cycle-link') {
    cycleLink(selectedActor, Number(button.dataset.target));
  }

  if (action === 'copy-share') {
    const text = app.querySelector('[data-action="share-text"]')?.value ?? '';
    navigator.clipboard?.writeText(text);
  }

  if (action === 'load-share') {
    const text = app.querySelector('[data-action="share-text"]')?.value ?? '';
    try {
      const loaded = parseShareText(text);
      puzzle = loaded.puzzle;
      selectedActor = loaded.selectedActor;
      shareDraft = '';
      saveState();
      render();
    } catch {
      shareDraft = text;
      app.querySelector('[data-action="share-text"]')?.classList.add('is-invalid');
    }
  }
});

app.addEventListener('input', (event) => {
  if (event.target.dataset.action === 'share-text') {
    shareDraft = event.target.value;
    event.target.classList.remove('is-invalid');
  }
});

app.addEventListener('change', (event) => {
  if (event.target.dataset.action === 'plate-count') {
    resizePuzzle(Number(event.target.value));
  }
});

render();
