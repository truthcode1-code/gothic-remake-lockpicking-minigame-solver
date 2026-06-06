# Gothic Remake Lockpicking Minigame Solver

A browser-based solver for experimenting with the Gothic Remake lockpicking minigame. Configure the plate setup, model linked plate movement, and get a shortest valid sequence that respects the seven-position plate boundaries.

Live app: https://truthcode1-code.github.io/gothic-remake-lockpicking-minigame-solver/

Features:

- Configure 1 to 8 plates with 7 positions each.
- Link plates by actor plate using same-direction or opposite-direction movement.
- Solve valid move sequences while respecting plate boundaries.
- Copy and paste setups from the header, including solution context.
- Remember the last setup locally in the browser.
- Klaro disclosure for functional localStorage usage.

## Support

If this saved you some trial and error, you can support the project here:

https://buymeacoffee.com/gothic.locksolver

## How it works

Each plate has seven positions. The correct position is the middle notch. A move selects one actor plate and moves it left or right by one step. Linked plates can move with the actor in the same direction or the opposite direction. A move is invalid if the actor or any linked plate would leave the `1..7` range.

The visible solution groups repeated moves by plate and direction, for example `1 ←←←`. The header copy/paste controls use a JSON payload with the full setup plus solution context so a setup can be shared and loaded again later.

## User guide

The solver is split into three working areas:

```text
Plate setup                 Link editor                 Solution
-----------                 -----------                 --------
Plate 1  [1 2 3 4 5 6 7]    Plate 1: actor              1  ←←
Plate 2  [1 2 3 4 5 6 7]    Plate 2: same              3  →
Plate 3  [1 2 3 4 5 6 7]    Plate 3: opposite
```

1. Choose the number of plates with the `-` and `+` buttons in the header.

2. Click a plate row to select it. The selected plate is the actor plate, meaning the plate you are currently configuring and moving in the lock.

3. For each plate, set the current pin position with the `1..7` buttons in the plate setup list. The correct position is always the middle position, `4`.

4. With a plate selected, use the link editor to choose which other plates move when that selected plate moves. Click each linked plate button to cycle through:

```text
off -> same -> opposite -> off
```

5. Use `same` when the linked plate moves in the same direction as the selected plate. Use `opposite` when it moves in the other direction.

6. Repeat steps 2 to 5 for every plate whose movement affects other plates.

7. Read the solution from top to bottom. The number is the plate to move, and the repeated arrows show the direction and count. For example, `2 ←←←` means move plate 2 three times in that displayed direction.

8. Use `Copy setup` to copy the current setup and solution. Use `Paste setup` to load a setup from your clipboard.

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
