# Development

## Setup

Use Node.js 22.13.0 or later in the Node.js 22 release line, and npm. CI uses
Node.js 22. The ESLint dependency requires at least Node.js 22.13.0 on this
release line.

```sh
npm ci
npx playwright install chromium
npm run dev
```

Open the address shown by Vite. On Linux, use
`npx playwright install --with-deps chromium` if browser system libraries are
missing. See [PLAYGROUNDS.md](PLAYGROUNDS.md) for the available pages.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `src/capitalships/` | Ship composition, components, and renderers. |
| `src/greebles/` | Normalized surface primitives and drawing tools. |
| `src/shared/` | Internal taxonomy types shared by the library layers. |
| `www/` | Vite playground and galleries. |
| `tests/` | Model, browser, package, and repository checks. |
| `scripts/` | Package checks and reference generation. |
| `docs/` | Maintainer guides, design notes, and generated references. |

Start with [ARCHITECTURE.md](ARCHITECTURE.md) and
[INTERFACES.md](INTERFACES.md) before changing a library boundary.

## Change And Check

1. Make the change in its owning library layer.
2. Update the relevant interface or design guide if behavior changes.
3. Run `npm run generate:legibility` after changes to exports, documentation
   inventories, or playground pages.
4. Run `npm run validate` before preparing a commit or release.

[QUALITY.md](QUALITY.md) lists focused checks and failure recovery steps.
The full command includes native Chromium rendering and a clean installation
of the packed package. It also executes the README Node example.

## Package Inspection

```sh
npm pack --dry-run
npm run test:package
```

The `prepack` script clears build output and compiles the package. The archive
contains `dist/`, package metadata, the README, and the license. Playgrounds,
tests, and banner source files stay in the repository.

For installation in another application, use the
[README installation guide](https://github.com/btfranklin/ship-shape#installation).
It explains release URLs and how to keep a locally built archive inside the
application repository.

See [RELEASING.md](RELEASING.md) for the tag workflow. It builds and checks a
package archive, then attaches that archive to a draft GitHub Release.
