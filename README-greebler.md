# Greebler

Procedural "greeble" generators for Canvas 2D. These classes draw panels, pipes,
windows, hoses, lights, and other surface detail onto a
`CanvasRenderingContext2D`.

The API is intentionally low-level: you create a greeble instance, then call
`draw(ctx, rng)`.

## Coordinate System

Greebles expect normalized units. Most generators assume `xUnits` and `yUnits`
are in a 0..1 space, then rely on the caller to scale the context:

```ts
import { RNG, HSBAColor, PanelGreebles } from './src/greebler/index.js';

const rng = new RNG(123);
const theme = HSBAColor.fromRGBA(150, 155, 160);

ctx.save();
ctx.scale(size, size); // size in pixels, normalized to 0..1
new PanelGreebles(1, 1, theme, 8, true).draw(ctx, rng);
ctx.restore();
```

## Node / Server-Side Rendering

These generators use `Path2D`. In Node, you must provide a `Path2D`
implementation before rendering:

```ts
import { setPath2D } from './src/greebler/common.js';
import { Path2D } from 'canvas';

setPath2D(Path2D);
```

## Key Exports

- `RNG` and `HSBAColor` from `src/greebler/common.ts`
- Surface detail: `PanelGreebles`, `PipeGreebles`, `LightPanelGreebles`,
  `CapitalShipWindowsGreebles`, `EquipmentGreebles`, `HoseGreebles`,
  `WireGreebles`, `CutawaySectionGreebles`
- Higher-level surface: `CapitalShipSurfaceGreebles`

Most classes take `(xUnits, yUnits, themeColor, ...)` and implement
`draw(ctx, rng)`.
