# Railway Layout

The railway subsystem has two main layers:

- `SteamEngineGenerator` for vehicle and consist layout
- `SteamEngineComponent` as the public drawable facade, with internal helpers for geometry and paint families

## Layout Contracts

- `generate(...)` returns engine components only.
- `generateLayout(...)` and `generateCar(...)` return a `RailVehicleLayout` with bounds and coupler positions.
- `generateConsist(...)` returns ordered vehicle layouts laid out left-to-right with consistent coupler heights.

## Important Invariants

- Coupler alignment must remain consistent across a consist.
- Returned components are sorted by `zIndex`.
- Layout generation should stay deterministic for a fixed seed and options set.

## Editing Guidance

- Change `SteamEngineGenerator` when spacing, coupler placement, or vehicle sequencing changes.
- Keep `SteamEngineComponent` as the public facade. Change the internal shape builder for geometry and the body, running-gear, or accessory painters for paint/detail changes.
- Use the railway playgrounds for visual validation and the consist invariant test for mechanical validation.
