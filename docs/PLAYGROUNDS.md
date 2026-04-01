# Playgrounds

The `www/` directory is the local runtime surface for visual debugging. Use it when static code inspection is not enough.

## Pages

- `www/index.html`
  Combined tabbed playground covering the main ship, greeble, and railway surfaces.
- `www/greeble_showcase.html`
  Gallery of low-level greeble primitives and treatments.
- `www/element_showcase.html`
  Capital ship component showcase for renderer-level debugging.
- `www/steam_engine_showcase.html`
  Steam engine and consist playground.
- `www/steam_engine_element_gallery.html`
  Railway element gallery for isolated component tuning.

## Debugging Guidance

- Prefer deterministic seeds when reproducing a rendering bug.
- Use hue controls only after locking the seed; geometry bugs are easier to isolate when color changes are stable.
- Capital ship work usually starts in `www/index.html` or `www/element_showcase.html`.
- Greeble work usually starts in `www/greeble_showcase.html`.
- Railway work usually starts in `www/steam_engine_showcase.html` and then narrows to `www/steam_engine_element_gallery.html` if the issue is component-specific.

## Generated Reference

See [`generated/playground-inventory.md`](generated/playground-inventory.md) for the machine-generated page inventory and companion script mapping.
