# Playgrounds

The `www/` directory is the local runtime surface for visual debugging. Use it when static code inspection is not enough.

## Pages

- `www/index.html`
  Combined tabbed playground covering capital ship generation and its greeble library.
- `www/greeble_showcase.html`
  Gallery of low-level greeble primitives and treatments.
- `www/element_showcase.html`
  Capital ship component showcase for renderer-level debugging.

## Debugging Guidance

- Prefer deterministic seeds when reproducing a rendering bug.
- Use hue controls only after locking the seed; geometry bugs are easier to isolate when color changes are stable.
- Capital ship work usually starts in `www/index.html` or `www/element_showcase.html`.
- Greeble work usually starts in `www/greeble_showcase.html`.

## Generated Reference

See [`generated/playground-inventory.md`](generated/playground-inventory.md) for the machine-generated page inventory and companion script mapping.
