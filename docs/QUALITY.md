# Quality

## Full Gate

- `npm run validate`

This is the single full local and CI validation gate. Install Chromium once with `npx playwright install chromium` before you run it locally.

## Focused Commands

- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run test:package`
- `npm run test:browser`
- `npm run check:legibility`
- `npm audit --audit-level=high`

Use `npm run generate:legibility` after changing public entrypoints, docs inventories, or runtime pages.

## What The Checks Enforce

- ESLint covers TypeScript hygiene.
- TypeScript compilation builds the package and declaration files.
- The package test installs the generated archive in a clean consumer project. It checks all runtime entrypoints and the documented TypeScript configuration. It also runs the README Node example with `@napi-rs/canvas` and checks visible output for all three ship conditions.
- Pure model invariants verify deterministic capital ship generation, greeble planning, bounds, ordering, and structural relationships without treating test doubles as browser-rendering evidence.
- Real Chromium rendering tests exercise representative capital ship and greeble scenarios against native Canvas 2D and `Path2D`. Unexpected console errors, page errors, request failures, invalid drawing arguments, unbalanced canvas state, transform leakage, and empty or uniform pixel output fail the suite. Semantic instrumentation is the primary oracle; coarse pixel assertions avoid brittle cross-platform screenshot baselines.
- Structural tests use the TypeScript compiler and module resolver to enforce dependency direction across static imports, re-exports, type-only imports, side-effect imports, import-equals declarations, and string-literal dynamic imports. They also verify required docs, docs indexes, and docs consistency.
- The legibility generator check ensures `docs/generated/public-api-inventory.md` and `docs/generated/playground-inventory.md` stay synchronized with the repo.

## CI

CI installs dependencies and Chromium, then runs:

- `npm run validate`

## Recovery Path

- Public API changed: update the relevant index exports, run `npm run generate:legibility`, and refresh the interface docs if the contract changed.
- New runtime page added: document it in `docs/PLAYGROUNDS.md`, then regenerate the inventories.
- Boundary test failed: move the shared type or helper to `src/shared`, or invert the dependency so the lower-level domain no longer imports upward.
- Browser rendering test failed: inspect the reported scenario, browser console or page error, and drawing-contract violation; capture a screenshot only when visual inspection is needed.
