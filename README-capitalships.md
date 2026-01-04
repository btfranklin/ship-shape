# Ship Shape

Procedural ship generator built on top of the greebles surface library. It
creates ship components, orders them by z-index, and renders them into a Canvas
2D context.

## Quick Start (Browser)

```ts
import { RNG, HSBAColor } from './src/greebles/index.js';
import { CompositeShipGenerator } from './src/capitalships/index.js';

const rng = new RNG(12345);
const theme = new HSBAColor(0.6, 0.1, 0.6);
const generator = new CompositeShipGenerator();

const components = generator.generate(
  canvas.width,
  canvas.height,
  theme,
  rng,
  'science',   // optional archetype
  600          // optional reference height for scale consistency
);

for (const comp of components) {
  comp.draw(ctx, rng);
}
```

## Node / Server-Side Rendering

The renderers use `Path2D`. In Node, set a `Path2D` implementation before
rendering:

```ts
import { setPath2D } from './src/greebles/common.js';
import { Path2D } from 'canvas';

setPath2D(Path2D);
```

## Concepts

- `CompositeShipGenerator.generate(...)` returns a mix of `ShipComponent` and
  `UnifiedTrunkComponent`. Both have `draw(ctx, rng)` methods.
- `ShipComponent` types are defined in `src/capitalships/shipTypes.ts` and include
  `hull`, `engine`, `weapon`, `sensor`, `storage`, `sphere`, `ring`, `trench`,
  and `tower`.
- `UnifiedTrunkComponent` merges multiple trunk hulls into a single silhouette
  and applies trunk-specific greebles and optional trenches.
- All randomness should be derived from the shared `RNG` to keep output
  deterministic per seed.

## Demo Entry Points

- `www/main.ts` is the interactive ship playground (Vite dev server).
- `src/index.ts` is a Node entry point that writes a PNG with `canvas`.
