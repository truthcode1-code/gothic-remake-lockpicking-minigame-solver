# Gothic Remake Lockpicking Minigame Solver

A small browser prototype for modeling the Gothic Remake lockpicking minigame.

Features:

- Configure 1 to 8 plates with 7 positions each.
- Link plates by actor plate using same-direction or opposite-direction movement.
- Solve valid move sequences while respecting plate boundaries.
- Copy and load setups, including solution context.
- Remember the last setup locally in the browser.
- Klaro disclosure for functional localStorage usage.

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
