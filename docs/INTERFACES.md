# Interfaces

This document defines the supported import surfaces and the stable contracts agents should rely on.

## Supported Import Paths

- `ship-shape`
- `ship-shape/greebles`
- `ship-shape/capitalships`
- `ship-shape/railway`

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
- `ShipShapeGenerator`
- `ShipComponent`
- `UnifiedTrunkComponent`
- `ShipArchetype`
- `ComponentType`

Contract notes:

- `CompositeShipGenerator.generate(width, height, themeColor, rng, shipArchetype?, referenceHeight?)`
  returns components already sorted by `zIndex`.
- Output components are draw-ready and should be drawn in order.
- `UnifiedTrunkComponent` represents merged trunk hull sections and also exposes `draw(ctx, rng)`.

## Railway

Import from `ship-shape/railway` for:

- `SteamEngineGenerator`
- `SteamEngineComponent`
- `SteamEngineOptions`
- `RailCarOptions`
- `WarTrainConsistOptions`
- `RailVehicleLayout`
- `SteamEngineComponentType`
- `WheelStyle`
- `RailVehicleKind`

Contract notes:

- `generate(...)` returns a ready-to-draw engine component list.
- `generateLayout(...)` returns a single-vehicle layout with bounds and coupler metadata.
- `generateCar(...)` returns a car layout with the same metadata shape.
- `generateConsist(...)` returns ordered vehicle layouts suitable for deterministic whole-train rendering.

## Root Export

`ship-shape` re-exports the public surfaces from all three subsystems. Prefer subsystem imports when you want a narrower contract and clearer intent in examples or downstream code.
