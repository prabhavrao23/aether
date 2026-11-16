# ÆTHER

An interactive, school-friendly galaxy experience with 88 constellation patterns, selectable atmosphere colors, animated constellation journeys, and looping audio.

## Run locally

Requires Node.js and Python 3. No third-party package installation is needed.

```sh
npm start
```

Open http://localhost:8000. Alternatively, run `npm run build` and open `dist/index.html` directly in a browser.

## Project layout

- `src/` — editable HTML, styles, and application JavaScript.
- `assets/audio/` — default soundtrack provided by the user.
- `assets/reference/` — M82 visual reference; not a rendered galaxy backdrop.
- `data/` — original astronomical catalogs used to construct the embedded application data.
- `licenses/` — third-party data license.
- `scripts/` — dependency-free build script.
- `dist/` — generated, runnable site; excluded from Git.
- `.openai/hosting.json` — existing Sites project identity, preserved for future publishing. No deployment is performed by the build.

The runtime data is currently embedded in `src/app.js` for offline compatibility. Changing the raw catalogs alone does not change the runtime data.

## Controls

Choose a constellation and press GO. Drag to orbit, scroll to zoom, and Shift-drag to pan. Whole Galaxy zooms out; Go Back to Constellation returns to its viewing angle. Back or Escape returns to the main screen. Soundtrack playback begins after user interaction and loops; Pause stops animation and audio. Settings contains atmosphere choices and a local audio file picker.

## Checks

```sh
npm run check
npm run build
```

## Scientific context and credits

This is an artistic 3D representation, not a measured simulation. Particle counts, scale, motion, and constellation placement within the galaxy are illustrative. Constellation patterns use catalog coordinates projected stereographically; their embedded locations are a teaching aid, not the physical locations of those stars.

- Galaxy structure reference: https://science.nasa.gov/resource/the-milky-way-galaxy/
- Constellation and stellar data: https://github.com/ofrohn/d3-celestial — see `licenses/d3-celestial.txt`.
- M82 reference image and soundtrack supplied by the user. Their inclusion does not establish redistribution rights.

GitHub repository: https://github.com/prabhavrao23/aether

[Play ÆTHER on GitHub Pages](https://prabhavrao23.github.io/aether/). The site is served from the `gh-pages` branch.
