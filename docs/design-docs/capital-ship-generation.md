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

## Editing Guidance

- Keep tree-growth rules deterministic.
- Preserve the post-order traversal semantics unless the draw contract changes intentionally.
- If you add a new component type, update the renderer selection path, the relevant planner, and the docs inventory if it becomes public surface.
- Keep `CompositeShipGenerator.generate(...)` as orchestration over internal planners rather than folding stage details back into the public generator.
