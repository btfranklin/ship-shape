# Capital Ship Generation

`CompositeShipGenerator` builds the main capital ship output.

## Pipeline

1. Create the engine root.
2. Grow a forward tree of hull sections and side branches.
3. Add archetype-sensitive nose and storage details.
4. Traverse into draw order.
5. Merge trunk hull sections into `UnifiedTrunkComponent`.
6. Add post-processing such as rings.
7. Return output sorted by `zIndex`.

## Stable Expectations

- The returned array is draw-ready and already sorted by `zIndex`.
- The same `RNG` input yields deterministic structure for a given seed and archetype.
- Trunk hulls are merged only after the generator finishes building the component tree.

## Editing Guidance

- Keep tree-growth rules deterministic.
- Preserve the post-order traversal semantics unless the draw contract changes intentionally.
- If you add a new component type, update the renderer selection path and the docs inventory if it becomes public surface.
