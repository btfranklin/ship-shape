# Ship Shape

Procedural ship rendering toolkit for Canvas 2D. The package combines:

- Low-level greeble generators (panels, pipes, windows, trenches, lights).
- A capital ship generator that composes components and renders them by z-index.

Everything is deterministic when you use the shared `RNG`.

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
  'science', // optional archetype
  600        // optional reference height for scale consistency
);

for (const comp of components) {
  comp.draw(ctx, rng);
}
```

## Low-Level Greebles

Greebles use normalized units. You scale the context to match your pixel size
and then draw.

```ts
import { RNG, HSBAColor, PanelGreebles } from './src/greebles/index.js';

const rng = new RNG(123);
const theme = HSBAColor.fromRGBA(150, 155, 160);

ctx.save();
ctx.scale(size, size); // size in pixels, normalized to 0..1
new PanelGreebles(1, 1, theme, 8, true).draw(ctx, rng);
ctx.restore();
```

## Node / Server-Side Rendering

Rendering uses `Path2D`. In Node, provide a `Path2D` implementation before
drawing. One option is the `canvas` package:

```ts
import { setPath2D } from './src/greebles/common.js';
import { Path2D } from 'canvas';

setPath2D(Path2D);
```

## Concepts

- `CompositeShipGenerator.generate(...)` returns components already sorted by
  `zIndex`. Draw them in order.
- Components are either `ShipComponent` or `UnifiedTrunkComponent`; both expose
  `draw(ctx, rng)`.
- Use the shared `RNG` instance to keep output deterministic per seed.

## Key Exports

From `src/greebles/index.ts`:

- `RNG`, `HSBAColor`, `setPath2D`, `getPath2D`
- `CapitalShipSurfaceGreebles`, `CapitalShipWindowsGreebles`
- `PanelGreebles`, `LightPanelGreebles`, `PipeGreebles`, `HoseGreebles`,
  `WireGreebles`, `CutawaySectionGreebles`, `EquipmentGreebles`,
  `ElectronicsPanelGreebles`, `SphereWindowsGreebles`, `SphereLightGreebles`

From `src/capitalships/index.ts`:

- `ShipShapeGenerator`, `CompositeShipGenerator`, `ShipComponent`

## Dev Commands

- `npm run build` - compile TypeScript
- `npm run dev` - Vite playground in `www/`
- `npm test` - compile tests and run node test runner
- `npm run lint` - run ESLint

## Demo Entry Points

- `www/main.ts` - interactive playground
