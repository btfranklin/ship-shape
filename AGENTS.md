# Agent Notes

This repo contains two main libraries:

- `src/greebler`: low-level greeble generators for Canvas 2D.
- `src/ship-shape`: procedural ship generator built on greebler.

## Workflow Expectations

- Use `rg` for searching (`rg --files` when listing files).
- Prefer `apply_patch` for small, single-file edits.
- Keep edits ASCII unless the file already uses Unicode.

## Rendering and Path2D

Do not instantiate `new Path2D()` directly. Always call `getPath2D()` from
`src/greebler/common.ts`, or initialize via `setPath2D()` for Node use.
Server-side rendering is expected.

## Greebler Conventions

- Greebles use normalized units. Callers should scale the context, e.g.
  `ctx.scale(height, height)`.
- Trunk greebles require both `skipBaseFill` and `isTrunk` set to `true` when
  constructing `CapitalShipSurfaceGreebles`.
- Trench greebles should pass `skipBaseFill: true` to keep the recessed look.

## Ship Shape Conventions

- `CompositeShipGenerator.generate(...)` returns components already sorted by
  `zIndex`. Draw in order.
- Use the shared `RNG` instance for deterministic output.

## Build and Tests

- `npm run build` runs TypeScript compilation.
- `npm run dev` starts the Vite playground in `www/`.
- No automated tests are currently set up.
