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
- `CapitalShipSurfaceGreebles` and `PreparedCapitalShipSurface`
- low-level greebles such as `PanelGreebles`, `PipeGreebles`, `LightPanelGreebles`, `EquipmentGreebles`, `EquipmentTrenchGreebles`, and `CapitalShipWindowsGreebles`

Contract notes:

- Greebles use normalized units.
- `HSBAColor.adjustBrightness(adjustment)` returns a new color with brightness changed by the delta and clamped to `0..1`.
- `HSBAColor.adjustSaturation(adjustment)` returns a new color with saturation changed by the delta and clamped to `0..1`.
- `HSBAColor.shiftHue(shift)` wraps the hue after applying the delta. `HSBAColor.withAlpha(alpha)` replaces alpha with the supplied value.
- Most drawables expose `draw(ctx, rng)`.
- `CapitalShipSurfaceGreebles.prepare(rng)` returns a `PreparedCapitalShipSurface`. Use `drawBase(ctx)` and then `drawEmissive(ctx, { clipPath? })` when base and emissive rendering need separate passes.
- In Node, call `setPath2D()` before any rendering path that creates a `Path2D`.

## Capital Ships

Import from `ship-shape/capitalships` for:

- `CompositeShipGenerator`
- `ShipComponent`
- `ShipComponentOptions` and `ShipBounds`
- `HullVariant`, `SensorVariant`, `WeaponVariant`, `SphereVariant`, and `StorageVariant`
- `EngineStyle`
- `UnifiedTrunkComponent`
- `ShipArchetype`
- `ComponentType`

Contract notes:

- `CompositeShipGenerator.generate(width, height, themeColor, rng, shipArchetype?, referenceHeight?)`
  returns components already sorted by `zIndex`.
- Output components are draw-ready and should be drawn in order.
- Direct `ShipComponent` construction uses one `ShipComponentOptions` object. Its `type` selects the valid `variant` values and type-specific fields. `engineStyle` is valid only for engines, and `storageBands` is valid only for storage components.
- Construction creates the initial shape, so the component is draw-ready when the constructor returns.
- `UnifiedTrunkComponent` represents merged trunk hull sections and also exposes `draw(ctx, rng)`.

## Root Export

`ship-shape` re-exports the capital ship and greeble surfaces. Prefer a layer import when you want a narrower contract and clearer intent in examples or downstream code.

## Ship Conditions

`drawCapitalShip(ctx, components, rng, options?)` draws generated components in order.
Set `options.condition` to `normal` (default), `ghost`, or `derelict`.
A ghost ship keeps its hull and surface detail with its lights and engines off.
A derelict uses that unpowered hull with torn ends, holes, beams, plates, and wires.
Set `options.damageSeed` to repeat a damage pattern (default: `0`).
Damage uses a separate RNG and does not change the components or the surface RNG sequence.
Reuse the generation seed and render RNG state to compare conditions of the same ship.
The caller's canvas state is restored after drawing. Holes expose the existing background.

Set `cutAway` to the fraction of ship length to remove from the forward end.
The default is `0.5` (half the ship). The range is `0` through `0.95`; `0` makes
holes only. The jagged edge varies around this cut position. Holes can cross the
top or bottom hull edge or stay inside the hull. The playground has a percentage
control for the cut.
