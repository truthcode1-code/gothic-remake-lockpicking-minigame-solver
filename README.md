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

## Verification

```bash
npm test
npm run build
```
