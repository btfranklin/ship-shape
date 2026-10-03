# Ship Shape Docs

This directory is the repo-local system of record for architecture, supported interfaces, runtime surfaces, and quality expectations.

## Library Layers

- `capitalships`: capital ship composition, renderer selection, and trunk merging.
- `greebles`: low-level normalized-unit primitives and surface treatments used by capital ships.

## Canonical Commands

- `npm run dev`
- `npm run validate`
- `npm run generate:legibility`

See [`QUALITY.md`](QUALITY.md) for focused validation commands and recovery guidance.

## Core References

- Development setup and package checks: [`DEVELOPMENT.md`](DEVELOPMENT.md)
- Architecture and dependency rules: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Public APIs and generator contracts: [`INTERFACES.md`](INTERFACES.md)
- Quality gates, CI, and structural checks: [`QUALITY.md`](QUALITY.md)
- Runtime playground guide: [`PLAYGROUNDS.md`](PLAYGROUNDS.md)
- Publication preparation and releases: [`RELEASING.md`](RELEASING.md)

## Design Docs

- Greeble surface pipeline: [`design-docs/greeble-surface-pipeline.md`](design-docs/greeble-surface-pipeline.md)
- Capital ship generation: [`design-docs/capital-ship-generation.md`](design-docs/capital-ship-generation.md)

## Generated References

- Public API inventory: [`generated/public-api-inventory.md`](generated/public-api-inventory.md)
- Playground inventory: [`generated/playground-inventory.md`](generated/playground-inventory.md)
