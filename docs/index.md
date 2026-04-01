# Ship Shape Docs

This directory is the repo-local system of record for architecture, supported interfaces, runtime surfaces, and quality expectations.

## Subsystems

- `greebles`: low-level normalized-unit Canvas 2D primitives and surface treatments.
- `capitalships`: ship composition, renderer selection, and trunk merging built on greebles.
- `railway`: steam engine, car, and consist generation built on the shared rendering utilities.

## Canonical Commands

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run test`
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
- Railway layout generation: [`design-docs/railway-layout.md`](design-docs/railway-layout.md)

## Generated References

- Public API inventory: [`generated/public-api-inventory.md`](generated/public-api-inventory.md)
- Playground inventory: [`generated/playground-inventory.md`](generated/playground-inventory.md)

## Execution Memory

- Exec-plan index: [`exec-plans/index.md`](exec-plans/index.md)
- Tech debt tracker: [`exec-plans/tech-debt-tracker.md`](exec-plans/tech-debt-tracker.md)
