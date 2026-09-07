# Capital Ship Generation

`CompositeShipGenerator` builds the main capital ship output.

## Pipeline

1. Create the engine root through the root planner.
2. Grow a forward tree of hull sections, side branches, and tower sensor attachments through the growth planner.
3. Add archetype-sensitive nose and storage details through internal planners.
4. Traverse into draw order.
5. Merge trunk hull sections into `UnifiedTrunkComponent`.
6. Add ring post-processing through the ring planner.
7. Return output sorted by `zIndex`.

## Stable Expectations

- The returned array is draw-ready and already sorted by `zIndex`.
- The same `RNG` input yields deterministic structure for a given seed and archetype.
- Trunk hulls are merged only after the generator finishes building the component tree.
- Storage rows use one storage variant for each row. Row orientation changes the component bounds and does not change the variant name.

## Editing Guidance

- Keep tree-growth rules deterministic.
- Keep planner choices as type and variant pairs so TypeScript can check each component configuration.
- Preserve the post-order traversal semantics unless the draw contract changes intentionally.
- If you add a new component type, update the renderer selection path, the relevant planner, and the docs inventory if it becomes public surface.
- Keep `CompositeShipGenerator.generate(...)` as orchestration over internal planners rather than folding stage details back into the public generator.

## Ship Conditions

`drawCapitalShip` applies the selected condition after generation. Normal and ghost
ships use the same component shapes and surface plans. A scoped power state turns
off light passes and engine heat without changing the surface RNG sequence.

`shipDamage` plans damage from a separate seed. It places irregular holes in hull
sections and can remove the forward end along a jagged line. The renderer clips
all components against the damage paths before it draws torn edges, plates, beams,
and wires. It does not erase the caller's background or change component geometry.

Set `cutAway` to the fraction of ship length to remove from the forward end.
The default is `0.5` (half the ship). The range is `0` through `0.95`; `0` makes
holes only. The jagged edge varies around this cut position. Holes can cross the
top or bottom hull edge or stay inside the hull. The playground has a percentage
control for the cut.

### Damage depth

The main cut slopes in either direction, with an overall angle of 15 to 42 degrees
from vertical. Larger local bends and small tears interrupt the diagonal.

Each breach has separate edges for the facing hull, interior machinery, and far
hull. Their offsets can extend into the opening or break behind the facing edge.
The renderer paints the dark far hull first, then open framing, pipes, and equipment,
then the original facing hull and its torn edge. Each layer uses its own damage
mask. Gaps through all layers still show the caller's background.

The solid interior and edge shading stay inside the original hull. Fragment roots
must touch that hull, but plates, beams, and wires can bend beyond it. Their reach
is limited and scales down for small ships. This applies to all three depth layers.
