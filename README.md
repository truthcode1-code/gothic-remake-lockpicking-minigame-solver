# Gothic Remake Lockpicking Minigame Solver

A browser-based solver for experimenting with the Gothic Remake lockpicking minigame. Configure the plate setup, model linked plate movement, and get a shortest valid sequence that respects the seven-position plate boundaries.

Features:

- Configure 1 to 8 plates with 7 positions each.
- Link plates by actor plate using same-direction or opposite-direction movement.
- Solve valid move sequences while respecting plate boundaries.
- Copy and load setups, including solution context.
- Remember the last setup locally in the browser.
- Klaro disclosure for functional localStorage usage.

## How it works

Each plate has seven positions. The correct position is the middle notch. A move selects one actor plate and moves it left or right by one step. Linked plates can move with the actor in the same direction or the opposite direction. A move is invalid if the actor or any linked plate would leave the `1..7` range.

The visible solution groups repeated moves by plate and direction, for example `1 ←←←`. The share box includes the full setup plus solution context so a setup can be copied, pasted, and loaded again later.

## Development

```bash
npm install
npm run dev
```

The dev server is configured for `http://localhost:5005/` and binds to `0.0.0.0`.

## Project layout

```text
src/app/       Browser UI and event handling
src/domain/    Lockpicking state model and solver
src/share/     Share/export/import serialization
tests/         Node test runner coverage
public/        Static files copied by Vite
```

## Verification

```bash
npm test
npm run build
```
