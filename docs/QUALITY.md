# Quality

## Required Commands

- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run check:legibility`

Use `npm run generate:legibility` after changing public entrypoints, docs inventories, or runtime pages.

## What The Checks Enforce

- ESLint covers TypeScript hygiene.
- TypeScript compilation builds the package and declaration files.
- Runtime invariants verify capital ship generation, greeble rendering, and railway layouts against a fake canvas and fake `Path2D`.
- Structural tests verify dependency direction, required docs, docs indexes, and docs consistency.
- The legibility generator check ensures `docs/generated/public-api-inventory.md` and `docs/generated/playground-inventory.md` stay synchronized with the repo.

## CI

CI runs:

- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run check:legibility`

## Recovery Path

- Public API changed: update the relevant index exports, run `npm run generate:legibility`, and refresh the interface docs if the contract changed.
- New runtime page added: document it in `docs/PLAYGROUNDS.md`, then regenerate the inventories.
- Boundary test failed: move the shared type or helper to `src/shared`, or invert the dependency so the lower-level domain no longer imports upward.
