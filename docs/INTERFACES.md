# Interfaces

This document defines the supported import surfaces and the stable contracts agents should rely on.

## Supported Import Paths

- `ship-shape`
- `ship-shape/greebles`
- `ship-shape/capitalships`

Deep `src/...` imports are internal-only, even when they work inside local development.

## Greebles

Import from `ship-shape/greebles` for:

- `RNG`, `HSBAColor`, `setPath2D`, `getPath2D`
- low-level greebles such as `PanelGreebles`, `PipeGreebles`, `LightPanelGreebles`, `EquipmentGreebles`, `EquipmentTrenchGreebles`, `CapitalShipWindowsGreebles`, and `CapitalShipSurfaceGreebles`

Contract notes:

- Greebles use normalized units.
- Most drawables expose `draw(ctx, rng)`.
- In Node, call `setPath2D()` before any rendering path that creates a `Path2D`.

## Capital Ships

Import from `ship-shape/capitalships` for:

- `CompositeShipGenerator`
- `ShipComponent`
- `ShipComponentOptions`, `ShipBounds`, and `ComponentVariant`
- `UnifiedTrunkComponent`
- `ShipArchetype`
- `ComponentType`

Contract notes:

- `CompositeShipGenerator.generate(width, height, themeColor, rng, shipArchetype?, referenceHeight?)`
  returns components already sorted by `zIndex`.
- Output components are draw-ready and should be drawn in order.
- Direct `ShipComponent` construction uses one `ShipComponentOptions` object. Construction creates the initial shape, so the component is draw-ready when the constructor returns.
- `UnifiedTrunkComponent` represents merged trunk hull sections and also exposes `draw(ctx, rng)`.

## Root Export

`ship-shape` re-exports the capital ship and greeble surfaces. Prefer a layer import when you want a narrower contract and clearer intent in examples or downstream code.
