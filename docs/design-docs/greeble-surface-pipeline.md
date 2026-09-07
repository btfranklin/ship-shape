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

## Rendering Lifecycle

Call `draw(context, rng)` when base and emissive layers can render in one pass. The call creates and paints one inline layer plan.

Call `prepare(rng)` when another paint step must run between the base and emissive layers. It returns a `PreparedCapitalShipSurface` with `drawBase(context)` and `drawEmissive(context, options?)` methods. Preparation consumes all caller randomness and owns one immutable layer plan. Either paint method can run independently or repeatedly, and neither method consumes the caller's `RNG`.

Each prepared surface owns its plan. Preparing the same `CapitalShipSurfaceGreebles` instance again does not change an earlier prepared surface.

## Editing Guidance

- Treat style planning, surface layer planning, draw execution, and emissive compositing as separate concerns.
- When adding a new surface treatment, update both the base draw pass and any matching emissive or occlusion behavior.
- Keep `CapitalShipSurfaceGreebles` as the public facade and put new planning or drawing behavior in internal helpers.

For unpowered ships, call `drawBase(context, { darkWindows: true })`. This paints
dark window openings in the base layer before later equipment and pipes. It uses
the existing window seeds and adds no glow. Flat and spherical window greebles
also accept `drawPanels(context, rng, true)` to paint their dark openings.
