# Tech Debt Tracker

## Current Hotspots

### `src/greebles/CapitalShipSurfaceGreebles.ts`

- Very large orchestration file that mixes style selection, layer generation, emissive passes, and occluder handling.
- Best next cleanup: split style planning from draw execution so tests can target each phase independently.

### `src/capitalships/CompositeShipGenerator.ts`

- Central generator contains tree growth, post-processing, and storage loop generation in one file.
- Best next cleanup: extract the trunk-growth and post-processing stages into smaller collaborators.

### `src/railway/SteamEngineComponent.ts`

- Geometry construction and draw logic live together for many component variants.
- Best next cleanup: separate shape builders from paint passes so individual variants are easier to reason about and test.

### `www/index.html`

- Main runtime shell has the broadest control surface and mixes layout, styling, and page structure.
- Best next cleanup: move repeated UI shell patterns into smaller partials or simpler companion modules without breaking the current Vite workflow.
