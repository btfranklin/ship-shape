# Ship Shape Docs

This directory is the repo-local system of record for architecture, supported interfaces, runtime surfaces, and quality expectations.

## Library Layers

- `capitalships`: capital ship composition, renderer selection, and trunk merging.
- `greebles`: low-level normalized-unit primitives and surface treatments used by capital ships.

## Canonical Commands

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run test:browser`
- `npm run generate:legibility`
- `npm run check:legibility`

## Core References

- Architecture and dependency rules: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Public APIs and generator contracts: [`INTERFACES.md`](INTERFACES.md)
- Quality gates, CI, and structural checks: [`QUALITY.md`](QUALITY.md)
- Runtime playground guide: [`PLAYGROUNDS.md`](PLAYGROUNDS.md)

## Design Docs

- Greeble surface pipeline: [`design-docs/greeble-surface-pipeline.md`](design-docs/greeble-surface-pipeline.md)
- Capital ship generation: [`design-docs/capital-ship-generation.md`](design-docs/capital-ship-generation.md)

## Generated References

- Public API inventory: [`generated/public-api-inventory.md`](generated/public-api-inventory.md)
- Playground inventory: [`generated/playground-inventory.md`](generated/playground-inventory.md)

## Execution Memory

- Exec-plan index: [`exec-plans/index.md`](exec-plans/index.md)
