# Greeble Surface Pipeline

`CapitalShipSurfaceGreebles` is the high-level surface compositor used by capital ship rendering.

## Responsibilities

- choose a surface style from ship archetype and component type through the style-planning helper
- build a `SurfaceLayerPlan` containing base noise, layer choices, seeds, and emissive occluder metadata before paint
- render planned base geometry, emissive layers, and occluders in a consistent order, with the emissive/offscreen path isolated in its own helper

## Important Invariants

- Inputs are normalized-width and normalized-height units.
- All sub-greeble randomness is decided during planning so redraws are stable for a fixed seed.
- Trunk and trench behavior depends on `skipBaseFill` and trunk-specific flags.

## Editing Guidance

- Treat style planning, surface layer planning, draw execution, and emissive compositing as separate concerns.
- When adding a new surface treatment, update both the base draw pass and any matching emissive or occlusion behavior.
- Keep `CapitalShipSurfaceGreebles` as the public facade and put new planning or drawing behavior in internal helpers.
