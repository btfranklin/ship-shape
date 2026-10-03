# Ship Shape

![Ship Shape banner](https://raw.githubusercontent.com/btfranklin/ship-shape/main/.github/social%20preview/ship_shape_social_preview.jpg "Ship Shape")

Ship Shape is a TypeScript library that generates capital spaceships and draws
them with Canvas 2D. Use it to build complete ships or draw individual hull
details. It runs in a browser or with a compatible Node canvas renderer.

## Features

- Five ship types: freight, science, industry, passenger, and combat.
- Hulls, engines, weapons, sensors, storage modules, rings, and towers.
- Surface detail such as panels, pipes, windows, equipment, and lights.
- Normal, ghost, and derelict ship conditions.
- Seeded generation and rendering for repeatable output.
- ES modules and TypeScript declarations, with no runtime package dependencies.

## Installation

The npm package is not yet published. Build an archive from the public source:

```sh
git clone https://github.com/btfranklin/ship-shape.git
cd ship-shape
npm ci
npm pack
```

Then install the archive from an application directory next to the clone:

```sh
npm install ../ship-shape/ship-shape-0.1.0.tgz
```

Use one of the public import paths:

- `ship-shape`: all public exports.
- `ship-shape/capitalships`: complete ship generation and rendering.
- `ship-shape/greebles`: surface detail primitives and shared drawing tools.

Deep imports from `src/...` are internal. TypeScript applications must include
`DOM` in their compiler `lib` setting for the Canvas 2D types.

## Browser Quick Start

Use this example in a browser application with an ES module build tool:

```ts
import { HSBAColor, RNG } from 'ship-shape/greebles';
import { CompositeShipGenerator, drawCapitalShip } from 'ship-shape/capitalships';

const canvas = document.createElement('canvas');
canvas.width = 1200;
canvas.height = 800;
document.body.append(canvas);

const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D is not available.');

const theme = new HSBAColor(0.6, 0.1, 0.6);
const components = new CompositeShipGenerator().generate(
  canvas.width,
  canvas.height,
  theme,
  new RNG(12345),
  'science',
  600
);

drawCapitalShip(ctx, components, new RNG(67890));
```

The generator returns components in drawing order. Reuse the same generation
seed, render seed, and settings to repeat a ship. For a sequence of ships, keep
one generation RNG and one render RNG for the sequence. Do not share these RNGs
with unrelated work. Output can change between package releases.

## Ship Conditions

Use the components from the quick start to draw a ship with its power off or
its hull damaged:

```ts
ctx.clearRect(0, 0, canvas.width, canvas.height);
drawCapitalShip(ctx, components, new RNG(67890), { condition: 'ghost' });

ctx.clearRect(0, 0, canvas.width, canvas.height);
drawCapitalShip(ctx, components, new RNG(67890), {
  condition: 'derelict',
  damageSeed: 42,
  cutAway: 0.5,
  cutFromRear: false,
});
```

The default condition is `normal`. A ghost ship keeps its hull and surface
detail with its lights and engines off. A derelict adds torn ends, holes,
plates, beams, and wires. Holes show the existing canvas background.

Start each comparison with a new render RNG with the same seed. Damage uses a
separate seed and does not change the generated components.

`cutAway` is the fraction of ship length to remove. Its range is `0` through
`0.95`, and its default is `0.5`. Set it to `0` for holes only. Set
`cutFromRear: true` to cut from the engine end.

## Low-Level Greebles

Greebles draw in normalized units. Scale the context to the required pixel size:

```ts
import { HSBAColor, PanelGreebles, RNG } from 'ship-shape/greebles';

const size = 200;
const theme = HSBAColor.fromRGBA(150, 155, 160);

ctx.save();
ctx.scale(size, size);
new PanelGreebles(1, 1, theme, 8, true).draw(ctx, new RNG(123));
ctx.restore();
```

See the [interface guide](https://github.com/btfranklin/ship-shape/blob/main/docs/INTERFACES.md) for separate base and light
passes, canvas clipping, and component construction.

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

The package test runs this example against the packed library and checks
visible output for all three ship conditions. A Node renderer must supply
compatible canvas and `Path2D` implementations at runtime.

## Playgrounds

To try the ship controls and greeble galleries locally:

```sh
npm ci
npm run dev
```

Open the address shown by Vite. The main page has tabs for ships and greebles.
See the [playground guide](https://github.com/btfranklin/ship-shape/blob/main/docs/PLAYGROUNDS.md) for the component and greeble
showcases.

## Development And Documentation

Install Chromium once, then run the full validation command:

```sh
npx playwright install chromium
npm run validate
```

After changes to public exports or playground pages, update the generated
references with `npm run generate:legibility`.

The maintainer and agent guides start at [docs/index.md](https://github.com/btfranklin/ship-shape/blob/main/docs/index.md):

- [Development](https://github.com/btfranklin/ship-shape/blob/main/docs/DEVELOPMENT.md): setup, repository layout, and changes.
- [Architecture](https://github.com/btfranklin/ship-shape/blob/main/docs/ARCHITECTURE.md): library layers and dependency rules.
- [Interfaces](https://github.com/btfranklin/ship-shape/blob/main/docs/INTERFACES.md): supported APIs and rendering contracts.
- [Quality](https://github.com/btfranklin/ship-shape/blob/main/docs/QUALITY.md): validation, browser tests, and CI.
- [Releasing](https://github.com/btfranklin/ship-shape/blob/main/docs/RELEASING.md): publication preparation and release workflow.

## License

MIT. See [LICENSE](https://github.com/btfranklin/ship-shape/blob/main/LICENSE).
