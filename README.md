# Jelly UI

Eight React components in three materials, on a small docs site built for screenshots and screen recordings.

- **Gooey** — soft bodies built on [`liquid-gooey`](https://www.npmjs.com/package/liquid-gooey). Every state change is liquid: pieces stretch, tear, trail and merge while the icons riding on top stay crisp.
- **Glass** — the same eight as Liquid Glass. Clear lenses that bend whatever is really behind them at the rim, with a specular that follows the cursor.
- **Console** — the same eight as hardware. Matte slabs with keys cut into them, monospace labels, faders, a slide switch, an LCD strip, LEDs — and one electric-blue backlight as the only colour (`src/consolekit.jsx`).

Components: Menu, Dock (Rail / Bar), Slider (Single / Range), Toggle, Search, Submit, Spinner (Comet / Arc / Dual), Loader. In Glass, a photograph sits on the stage under the components — drag it through them to watch the material bend it. The Glass side also has a **Material** page: one lens that follows the cursor over a photograph, black type, hairlines and a gradient, for looking at the optics on their own.

## Run it

```bash
npm install
npm run dev        # http://localhost:5183  (add ?glass to open in Glass, ?app for the phone demo)
npm run build      # dist/index.html — one self-contained file
```

`dist/index.html` is checked in, so the whole site can be opened without a build.

## How the glass works

`src/glass.jsx` — `<Glass radius depth thickness frost>`.

The material is modelled as a slab of glass with a convex bezel. For each distance from the edge, a vertical ray is refracted once at the curved surface (Snell's law, η = 1.5) and followed down to the backdrop; the lateral landing offset becomes a displacement vector. Those vectors are baked into small tiles (four corners plus stretched edge strips), assembled into an SVG `feDisplacementMap` per element and applied with `backdrop-filter`, so the lens bends the real page content — wallpaper, a slider track, a frosted tray under a clear bubble — and keeps working while an element animates its size.

On top of the refraction, in order: a cursor-following bulge added into the same displacement field (spring inertia, so the surface gives and settles), scattering that lives only in the bezel, a little of the blurred surroundings mixed in for ambient colour, slightly less light through the bezel for thickness, and `feSpecularLighting` on the bezel height field with a key light that leans toward the cursor plus a faint return light. No borders, no gradient overlays.

Refraction through `backdrop-filter: url(#…)` is Chromium-only; Safari and Firefox fall back to the plain material.

## How the goo works

`src/fab.jsx`, `src/demos.jsx`, `src/loaders.jsx` — built on `liquid-gooey`'s `<Liquid>` / `<Liquid.Item>`: `effect="move"` for indicators that chase their target, `observe` droplets for tether necks and spinners, `morph.shape` for controls that pour open. Notes on the tuning live in the comments next to each component.

## Layout

```
src/Gallery.jsx    the docs shell (sidebar, preview/code tabs, material switch)
src/demos.jsx      gooey components
src/loaders.jsx    gooey spinner + loader
src/fab.jsx        the gooey menu (also used by the ?app phone demo)
src/glass.jsx      the Liquid Glass material
src/glasskit.jsx   glass components + the Material lab
src/app.css        all styles
```
