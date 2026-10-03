# Ship Shape

Ship Shape is a procedural Canvas 2D capital ship rendering toolkit. It has two public layers:

- `ship-shape/capitalships`: procedural capital ship composition and rendering.
- `ship-shape/greebles`: low-level surface primitives used by capital ships.

The package is deterministic when you keep a shared `RNG` instance for a single run.

## Setup

Install the project dependencies and the Chromium browser used by the runtime tests:

```sh
npm ci
npx playwright install chromium
```

Run the full local validation gate:

```sh
npm run validate
```

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

Install the Node canvas renderer:

```sh
npm install @napi-rs/canvas
```

Configure `Path2D` before generating or drawing a ship. Save this JavaScript
example in an `.mjs` file and run it with Node:

```js
import { writeFileSync } from 'node:fs';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import { HSBAColor, RNG, setPath2D } from 'ship-shape/greebles';
import { CompositeShipGenerator, drawCapitalShip } from 'ship-shape/capitalships';

setPath2D(Path2D);
const canvas = createCanvas(1200, 800);
const ctx = canvas.getContext('2d');
const rng = new RNG(12345);
const theme = new HSBAColor(0.6, 0.1, 0.6);
const components = new CompositeShipGenerator().generate(1200, 800, theme, rng, 'science', 600);
drawCapitalShip(ctx, components, rng);
writeFileSync('ship.png', canvas.toBuffer('image/png'));
```

TypeScript consumers must include the `DOM` library because the public drawing APIs use the standard Canvas 2D types. A Node renderer must supply compatible canvas and `Path2D` implementations at runtime.

## Stable Contracts

- `CompositeShipGenerator.generate(...)` returns components sorted by `zIndex`.
- `UnifiedTrunkComponent` groups trunk hull sections for capital ships.
- `ShipComponentOptions` uses `type` to select valid variants and type-specific settings.
- Callers should keep using the same `RNG` instance within a single render.

## Developer Commands

- `npm run dev`
- `npm run validate`
- `npm run generate:legibility`

See [`docs/QUALITY.md`](docs/QUALITY.md) for focused validation commands and recovery guidance.

## Docs

- Repo map: [`docs/index.md`](docs/index.md)
- Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Interfaces: [`docs/INTERFACES.md`](docs/INTERFACES.md)
- Quality gates: [`docs/QUALITY.md`](docs/QUALITY.md)
- Playgrounds: [`docs/PLAYGROUNDS.md`](docs/PLAYGROUNDS.md)
- Public API inventory: [`docs/generated/public-api-inventory.md`](docs/generated/public-api-inventory.md)
- Playground inventory: [`docs/generated/playground-inventory.md`](docs/generated/playground-inventory.md)

### Ghost ships and derelicts

Use the same generated components to draw a ship with its power off or its hull damaged:

```ts
import { drawCapitalShip } from 'ship-shape/capitalships';

drawCapitalShip(ctx, components, rng, { condition: 'ghost' });
// Or draw a damaged hull with a repeatable damage pattern:
drawCapitalShip(ctx, components, rng, { condition: 'derelict', damageSeed: 42 });
```

Restore the same render RNG state before each draw to keep the surface detail the same.
The `normal` condition is the default. Ghost ships keep their structure with lights
and engine glow off. Derelicts add jagged breaks, holes, torn plates, beams, and wires.
Damage does not change the components. Holes show the background behind the ship.
The playground includes **Ghost Ship** and **Ruined Derelict** in its Mode control.

Set `cutAway` to the fraction of ship length to remove from the forward end.
The default is `0.5` (half the ship). The range is `0` through `0.95`; `0` makes
holes only. The jagged edge varies around this cut position. Holes can cross the
top or bottom hull edge or stay inside the hull. The playground has a percentage
control for the cut.

Set `cutFromRear: true` to cut from the rear engine end toward the front.
The percentage keeps the same meaning. The default is a cut from the front.
Hull holes stay in the same places when the direction changes. The playground
provides a **Cut from Rear** checkbox for derelicts.
