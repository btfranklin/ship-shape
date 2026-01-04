# Agent Notes

This repo contains two main libraries:

- `src/greebles`: low-level greeble generators for Canvas 2D.
- `src/capitalships`: procedural ship generator built on greebles.

## Workflow Expectations

- Use `rg` for searching (`rg --files` when listing files).
- Prefer `apply_patch` for small, single-file edits.
- Keep edits ASCII unless the file already uses Unicode.
- Absolutely never "comment out" code. If code is not needed, delete it. Do not leave a comment explaining that the code was removed. All comments should be in terms of what is present, not what was present before.
- Always run linter after making changes: `npm run lint`.
- Always run tests after making changes: `npm run test`.

## Rendering and Path2D

Do not instantiate `new Path2D()` directly. Always call `getPath2D()` from
`src/greebles/common.ts`, or initialize via `setPath2D()` for Node use.
Server-side rendering is expected.

## Greebles Conventions

- Greebles use normalized units. Callers should scale the context, e.g.
  `ctx.scale(height, height)`.
- Trunk greebles require both `skipBaseFill` and `isTrunk` set to `true` when
  constructing `CapitalShipSurfaceGreebles`.
- Trench greebles should pass `skipBaseFill: true` to keep the recessed look.

## Capital Ships Conventions

- `CompositeShipGenerator.generate(...)` returns components already sorted by
  `zIndex`. Draw in order.
- Use the shared `RNG` instance for deterministic output.

## Build and Tests

- `npm run build` runs TypeScript compilation.
- `npm run dev` starts the Vite playground in `www/`.
- No automated tests are currently set up.
