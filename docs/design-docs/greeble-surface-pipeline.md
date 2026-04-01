# Greeble Surface Pipeline

`CapitalShipSurfaceGreebles` is the high-level surface compositor used by capital ship rendering.

## Responsibilities

- choose a surface style from ship archetype and component type
- place deterministic sub-greebles using stored seeds
- render base geometry, emissive layers, and occluders in a consistent order

## Important Invariants

- Inputs are normalized-width and normalized-height units.
- All sub-greeble randomness is derived from deterministic seeds so redraws are stable.
- Trunk and trench behavior depends on `skipBaseFill` and trunk-specific flags.

## Editing Guidance

- Treat style planning and draw execution as separate concerns, even though they currently live in one file.
- When adding a new surface treatment, update both the base draw pass and any matching emissive or occlusion behavior.
- Prefer small helper extraction over broad rewrites because this file already anchors many capital ship code paths.
