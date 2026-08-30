# Ship Shape

Ship Shape is a procedural Canvas 2D capital ship rendering toolkit. It has two public layers:

- `ship-shape/capitalships`: procedural capital ship composition and rendering.
- `ship-shape/greebles`: low-level surface primitives used by capital ships.

The package is deterministic when you keep a shared `RNG` instance for a single run.

## Install And Import Surface

Use the package entrypoints:

- `ship-shape`
- `ship-shape/greebles`
- `ship-shape/capitalships`

Deep imports from `src/...` are internal-only and should not be treated as supported API.

## Quick Start

```ts
import { RNG, HSBAColor } from 'ship-shape/greebles';
import { CompositeShipGenerator } from 'ship-shape/capitalships';

const rng = new RNG(12345);
const theme = new HSBAColor(0.6, 0.1, 0.6);
const generator = new CompositeShipGenerator();

const components = generator.generate(
  canvas.width,
  canvas.height,
  theme,
  rng,
  'science',
  600
);

for (const component of components) {
  component.draw(ctx, rng);
}
```

## Low-Level Greebles

Greebles draw in normalized units. Scale the context to the desired pixel size first.

```ts
import { RNG, HSBAColor, PanelGreebles } from 'ship-shape/greebles';

const rng = new RNG(123);
const theme = HSBAColor.fromRGBA(150, 155, 160);

ctx.save();
ctx.scale(size, size);
new PanelGreebles(1, 1, theme, 8, true).draw(ctx, rng);
ctx.restore();
```

## Node / Server-Side Rendering

Rendering uses `Path2D`. In Node, configure the implementation before drawing:

```ts
import { setPath2D } from 'ship-shape/greebles';
import { Path2D } from 'canvas';

setPath2D(Path2D);
```

## Stable Contracts

- `CompositeShipGenerator.generate(...)` returns components sorted by `zIndex`.
- `UnifiedTrunkComponent` groups trunk hull sections for capital ships.
- Callers should keep using the same `RNG` instance within a single render.

## Developer Commands

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run test:browser`
- `npm run generate:legibility`
- `npm run check:legibility`

## Docs

- Repo map: [`docs/index.md`](docs/index.md)
- Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Interfaces: [`docs/INTERFACES.md`](docs/INTERFACES.md)
- Quality gates: [`docs/QUALITY.md`](docs/QUALITY.md)
- Playgrounds: [`docs/PLAYGROUNDS.md`](docs/PLAYGROUNDS.md)
- Public API inventory: [`docs/generated/public-api-inventory.md`](docs/generated/public-api-inventory.md)
- Playground inventory: [`docs/generated/playground-inventory.md`](docs/generated/playground-inventory.md)
