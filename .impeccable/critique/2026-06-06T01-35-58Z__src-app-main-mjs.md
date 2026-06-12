---
target: landing page
total_score: 25
p0_count: 0
p1_count: 3
timestamp: 2026-06-06T01-35-58Z
slug: src-app-main-mjs
---
**Design Health Score**

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Selection state is visible, but copy/paste/reset give little confirmation. |
| 2 | Match System / Real World | 3 | Plate/pin language mostly fits, but link-state copy still mixes app language with lock language. |
| 3 | User Control and Freedom | 3 | Reset, paste, and persistent state are useful; no undo or escape handling for help. |
| 4 | Consistency and Standards | 3 | Components are mostly coherent, but mobile layout and label casing drift. |
| 5 | Error Prevention | 3 | Position choices are constrained well; paste and clipboard failures are under-explained. |
| 6 | Recognition Rather Than Recall | 2 | Main controls are visible, but the user must remember that selecting a plate changes the link editor context. |
| 7 | Flexibility and Efficiency | 2 | Fast enough for mouse/touch users, but no keyboard accelerators or compact expert path. |
| 8 | Aesthetic and Minimalist Design | 3 | Focused, atmospheric, and task-oriented; right sidebar competes with core plate setup. |
| 9 | Error Recovery | 1 | Invalid paste only marks the button red; no explanation or recovery guidance. |
| 10 | Help and Documentation | 3 | Help is visible and practical, but the modal is long and interrupts the task. |
| **Total** | | **25/40** | **Acceptable: strong prototype foundation, needs clarity and responsive hardening.** |

**Anti-Patterns Verdict**

**LLM assessment**: This does not read as generic AI landing-page output. It reads like a compact utility, which is the right register for a solver. The warm dark palette and dense rows give it a lock/workbench feeling. The weak point is that it is not really a landing page: it drops users directly into a task surface with almost no first-run orientation besides the Help button. That is fine for returning users, but first-timers need a stronger visible path through “set positions, select actor, set links, read solution.”

The main AI-slop risk is repetitive card structure. Every plate row, link button, and panel uses the same bordered rectangle language. It is coherent, but it flattens hierarchy and makes the page feel assembled from repeated blocks instead of designed around the lock model.

**Deterministic scan**: The bundled Impeccable detector was attempted with `node /home/dome/.agents/skills/impeccable/scripts/detect.mjs --json index.html`, but the installed skill reports `Error: bundled detector not found.` No automated rule counts are available for this run.

**Visual overlays**: No reliable user-visible overlay is available because the detector bundle is missing. I used headless Chrome screenshots at desktop and mobile sizes as the fallback visual signal.

**Overall Impression**

The app has a solid utility shape: users can immediately see plates, positions, links, and solution. The biggest opportunity is to turn the current dense control grid into a more guided solver workflow. The interface should make the selected actor and its linked effects feel like one combined mental model, not two separate panels the user has to mentally synchronize.

**What’s Working**

- The default state is calming and useful: all pins start at position 4, so the page communicates the correct notch without extra explanation.
- The plate rows are scannable. Numbered positions from 1 to 7 are visible, constrained, and easy to compare across plates.
- The right sidebar placement is directionally correct. Plate count, link editor, solution, and support live away from the main plate setup, which keeps the core list clean.

**Priority Issues**

**[P1] Mobile horizontal overflow breaks the first impression**

**Why it matters**: On a 390px-wide screenshot, the H1 is clipped and the position rows run off the right edge. A mobile user cannot reliably see all seven pin positions or the full product name. This is a core usability failure, not just polish.

**Fix**: On small screens, let the title wrap and give `.position-row` a mobile-specific layout that preserves all seven choices inside the viewport. Good options: smaller fixed circular buttons with `grid-template-columns: repeat(7, minmax(34px, 1fr))`, reduced gaps, and no horizontal overflow; or a segmented scroller with explicit scroll affordance if seven buttons cannot fit.

**Suggested command**: `$impeccable adapt landing page`

**[P1] The selected actor relationship is still cognitively expensive**

**Why it matters**: The selected plate is highlighted on the left, but the consequences of editing it live in the right sidebar. The user has to remember “Plate 1 is the actor” while looking at Plate 2, Plate 3, etc. This is especially risky because the whole game depends on directional linked movement.

**Fix**: Add a compact actor summary directly in the sidebar heading: “When Plate 1 moves:” followed by linked chips only for affected plates. Keep the full link grid below. In the plate list, replace “editing links/select” with a clearer state like “Actor” and “Set as actor.”

**Suggested command**: `$impeccable clarify landing page`

**[P1] Clipboard and paste errors have almost no feedback**

**Why it matters**: Copy setup, paste setup, and reset are high-trust actions. Currently copy has no success state, reset has no confirmation of what changed, and invalid paste only adds a red border to the button. Users cannot tell whether they copied the full setup, pasted bad JSON, or hit a browser clipboard permission issue.

**Fix**: Add a small status line in the topbar or sidebar: “Setup copied”, “Loaded 5-plate setup”, “Paste failed: clipboard text was not a solver setup.” Make the message time out after a few seconds and preserve the current puzzle on failure.

**Suggested command**: `$impeccable harden landing page`

**[P2] Help is useful but too separate from the task**

**Why it matters**: The modal explains the workflow well, but it forces users out of the page context. First-timers need guidance while looking at the actual controls, especially for “same” versus “opposite.”

**Fix**: Keep the Help modal, but add inline microcopy where decisions happen. For example, under the link grid: “Same means the linked plate follows the actor’s direction; opposite means it moves the other way.” This can replace the current generic sentence.

**Suggested command**: `$impeccable clarify landing page`

**[P2] Visual hierarchy is too evenly carded**

**Why it matters**: Plate rows, sidebar panels, link buttons, solution rows, and support panel all have similar borders and surfaces. The solver’s primary path should dominate: current positions first, link mapping second, solution third. Right now the Buy Me a Coffee block and setup controls have nearly the same visual weight as the solution.

**Fix**: Reduce the support panel weight to a simple text/button row below solution, tighten the plate count block, and make the solution panel’s empty/solved state visually distinct. Use fewer full-box containers inside the sidebar.

**Suggested command**: `$impeccable layout landing page`

**Persona Red Flags**

**Jordan (First-Timer)**: Jordan sees “Current pin position” and can set positions, but the next conceptual jump is not obvious. “Click linked plates” does not fully explain that they are configuring what moves when the selected actor moves. Jordan may set all current pins and then stare at “Already solved” without understanding that links only matter when the puzzle is unsolved.

**Sam (Accessibility-Dependent User)**: Sam can reach buttons because they are real buttons, which is good. The red invalid paste state is visual-only, and there is no `aria-live` region for copy/paste/reset status. The help overlay has no dialog role, no focus trap, and no Escape handling, so keyboard/screen-reader flow can leak behind it.

**Casey (Distracted Mobile User)**: Casey hits the worst current issue. The mobile screenshot clips the title and position controls. Top actions are large enough to tap, but they consume the top of the viewport before any task content, and the cookie banner covers active plate rows.

**Minor Observations**

- The hint still says “off” while the control label says “Not linked” in `src/app/main.mjs:355`; this is a copy consistency bug.
- The radiogroup aria label says `initial position` through the internal key in `src/app/main.mjs:139`; users hear implementation language instead of “Current pin position for plate 1.”
- The H1 uses `clamp(..., 3vh, ...)` in `src/styles.css:60`; viewport-height-based title sizing contributes to awkward responsive behavior.
- The cookie banner is legally useful but visually dominant on mobile. Its placement conflicts with the no-scroll/dense-solver goal.
- The Buy Me a Coffee fallback uses hex colors while the rest of the palette uses OKLCH; visually acceptable, but it weakens token consistency.

**Questions to Consider**

- Should this behave more like a compact expert tool or a guided first-time solver? Options: expert dense, guided steps, or hybrid with inline guidance.
- On mobile, should the solver prioritize seeing all plates at once or completing one plate at a time? Options: compressed full list, accordion per plate, or horizontal position scroller.
- Do you want the next pass to focus on functional UX hardening or visual atmosphere? Options: feedback/error states, responsive layout, or more Gothic/game-like styling.
