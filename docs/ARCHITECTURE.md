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

## Large Internal Structures

- `src/greebles/CapitalShipSurfaceGreebles.ts`
  Public facade for capital ship surface rendering. Style, layer planning, draw execution, and emissive/offscreen rendering live in internal helpers.
- `src/capitalships/CompositeShipGenerator.ts`
  Public orchestration for staged ship generation. Root setup, tree growth, storage loops, rings, light colors, and traversal live in internal helpers.
- `src/railway/SteamEngineComponent.ts`
  Public railway component facade. Shape construction and paint families live in internal helpers.
- `www/index.html`
  Main multi-surface runtime shell. Repeated controls and styles live in companion files.

These areas have design docs because they carry the most cognitive load.
