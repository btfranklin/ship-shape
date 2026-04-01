# Architecture

Ship Shape is one package with three public subsystems and one internal shared area.

## Domains

- `src/greebles`
  Generates reusable normalized-unit surface detail primitives.
- `src/capitalships`
  Composes ship components, assigns renderers, and builds draw-order output.
- `src/railway`
  Builds steam engine parts, rail car layouts, and whole consists.
- `src/shared`
  Holds internal shared taxonomy types that multiple subsystems need.

## Dependency Direction

- `shared` may not depend on other repo domains.
- `greebles` may depend on `shared` and itself only.
- `capitalships` may depend on `greebles`, `shared`, and itself.
- `railway` may depend on `greebles`, `shared`, and itself.
- Public entrypoints live in `src/index.ts`, `src/greebles/index.ts`, `src/capitalships/index.ts`, and `src/railway/index.ts`.

The structural tests enforce these boundaries so new cross-domain edges fail with actionable errors.

## Rendering Model

- Canvas rendering is deterministic when a caller reuses the same `RNG`.
- `Path2D` access goes through `getPath2D()` so browser and Node execution can share the same code paths.
- Greebles assume normalized coordinates; callers scale the canvas context before drawing.

## Large Internal Hotspots

- `src/greebles/CapitalShipSurfaceGreebles.ts`
  Central style-selection and layer-composition pipeline for capital ship surfaces.
- `src/capitalships/CompositeShipGenerator.ts`
  Tree growth, trunk merging, storage loops, and ring post-processing.
- `src/railway/SteamEngineComponent.ts`
  Shape construction and paint logic for railway components.
- `www/index.html`
  Main multi-surface runtime shell with the broadest control surface.

These areas have design docs and are tracked in the tech debt file because they carry the most cognitive load.
