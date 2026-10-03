# Agent Notes

Start with the docs map, not random source files:

- Repo map: [`docs/index.md`](docs/index.md)
- Architecture and dependency rules: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Public entrypoints and generator contracts: [`docs/INTERFACES.md`](docs/INTERFACES.md)
- Runtime pages and visual debugging surfaces: [`docs/PLAYGROUNDS.md`](docs/PLAYGROUNDS.md)
- Quality gates and legibility checks: [`docs/QUALITY.md`](docs/QUALITY.md)
- Publication preparation and releases: [`docs/RELEASING.md`](docs/RELEASING.md)

## Repo Shape

- `src/greebles`: low-level normalized-unit Canvas 2D greeble primitives.
- `src/capitalships`: capital ship composition and renderers built on greebles.
- `src/shared`: internal shared taxonomy types. This is not a public import surface.
- `www/`: Vite playground and gallery entrypoints.
- `tests/`: runtime invariants plus structural legibility checks.

## Task Routing

- Library API work: start in [`README.md`](README.md), [`docs/INTERFACES.md`](docs/INTERFACES.md), and [`docs/generated/public-api-inventory.md`](docs/generated/public-api-inventory.md).
- Generator internals: read [`docs/design-docs/capital-ship-generation.md`](docs/design-docs/capital-ship-generation.md) or [`docs/design-docs/greeble-surface-pipeline.md`](docs/design-docs/greeble-surface-pipeline.md) before editing the large source files.
- Rendering/runtime work: review [`docs/PLAYGROUNDS.md`](docs/PLAYGROUNDS.md) and [`docs/generated/playground-inventory.md`](docs/generated/playground-inventory.md).
- Quality or repo-shape work: use [`docs/QUALITY.md`](docs/QUALITY.md) and the repository contract tests in [`tests/repository-contracts.test.ts`](tests/repository-contracts.test.ts).

## Commands

- `npm run dev`
- `npm run validate`
- `npm run generate:legibility`

See [`docs/QUALITY.md`](docs/QUALITY.md) for focused validation commands and recovery guidance.

## Key Rules

- Public imports use `ship-shape`, `ship-shape/greebles`, or `ship-shape/capitalships`. Treat deep `src/...` imports as internal-only.
- Do not instantiate `new Path2D()` directly from global scope. Use `getPath2D()` and configure Node with `setPath2D()` when needed.
- Greebles use normalized units. Callers scale the context before drawing.
- After changing public entrypoints, docs inventories, or playground pages, run `npm run generate:legibility`.
