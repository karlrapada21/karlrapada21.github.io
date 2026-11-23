# Rapada Isle

A cozy, hand-painted island portfolio for **Karl Lynuz B. Rapada** — inspired by *Animal Crossing* and
the films of Studio Ghibli. There's a cottage on a hill, a river with a little arched bridge, and six
exhibit podiums across the water. Walk up to one and press **E** to read a section of the resume.

Everything is drawn at runtime on a single `<canvas>` with the Canvas 2D API — no game engine, no
sprite sheets, no build step.

---

## Playing

| Action | Keys |
| --- | --- |
| Walk | `W` `A` `S` `D` or arrow keys |
| Interact | `E` (or the on-screen **E** button on touch) |
| Close an exhibit | `Esc` or the ✕ button |
| Mute | `M` |
| Controls card | `H` |

On phones and tablets an on-screen D-pad appears automatically.

**The route:** you start on the north bank beside the cottage. Follow the path east, cross the arched
bridge over the river, and you arrive at a stone plaza ringed with sakura trees. Six podiums stand
around it, each holding a floating emblem:

| Podium | Exhibit |
| --- | --- |
| ✦ The Villager | About Karl, links, and the real PDF resume |
| ✦ Inventory | Skills & tools |
| ✦ The Journal | Work experience |
| ✦ Project Stands | Projects |
| ✦ The Study | Education & capstone |
| ✦ Wish Board | Contact details & certificates |

You can also jump straight to a section with a deep link: `?exhibit=projects`
(`who`, `skills`, `experience`, `projects`, `education`, `contact`).

---

## The island

- **Ocean** — layered gradient with drifting wave lines, painted colour blooms, and sun glitter.
- **Terrain** — pre-rendered once to an offscreen canvas: sand, shore foam, grass with mottling and
  thousands of blades, wildflowers, winding paths with pebbles, and a tiled stone plaza.
- **River** — a cubic-bezier centreline with a varying half-width, a wobbling bank, animated flow
  bands, sparkles, lily pads, reeds, pebbles, and foam that pulses along both edges.
- **Bridge** — arched wooden deck with cross planks, railings, lanterns at each end, petals falling
  across it, and a soft reflection in the water.
- **Props** — all drawn procedurally: the cottage (roof shingles, smoking chimney, flower boxes,
  climbing vines), the windmill with turning sails, layered-tree canopies, sakura, pines, benches,
  lamps, a turnip patch, a campsite tent, a mailbox, and signposts.
- **Life** — a wandering cat, butterflies over the flowerbeds, birds circling the meadow, drifting
  petals, fireflies, footprints that fade as you walk, and water ripples.
- **Sound** — a small generative Web Audio soundscape (wind + water bed, a slow pad, a wandering
  pentatonic melody) plus UI blips. No audio files; synthesised on the fly.

## Customising your villager

The title screen has a character editor: skin tone, hair colour, hairstyle, shirt, trousers, and a hat.
The preview is drawn with the exact same renderer used in the world, so what you pick is what you get.
The villager has four facing directions, a walk cycle with squash/bounce, blinking, and idle breathing.

---

## Project layout

```
index.html            page shell
css/style.css         all styling (title screen, HUD, exhibits)
js/main.js            entry point
js/core.js            maths, colour, canvas helpers
js/resume-data.js     ← all resume content lives here
js/layout.js          world geometry: island, river, bridge, plaza, prop placement, collisions
js/world.js           ocean + baked terrain + prop culling
js/river.js           animated water, bridge, reflection
js/props.js           every drawn object (tree, house, podium, …)
js/villager.js        the player character, cat, portrait renderer
js/ui.js              title screen, customiser, HUD, resume exhibits
js/audio.js           generative audio
js/game.js            loop, camera, input, movement, interactions
assets/               Karl-Rapada-Resume.pdf
tools/                dev-only inspection scripts (not needed by the site)
```

### Updating the resume

Almost everything is data-driven. Edit `js/resume-data.js` — `PROFILE`, `SKILL_GROUPS`,
`EXPERIENCE`, `PROJECTS`, `EDUCATION`, `CERTIFICATES` — and the exhibits update. Replace
`assets/Karl-Rapada-Resume.pdf` to update the downloadable file.

### Adjusting the world

`js/layout.js` holds the island silhouette, the river control points, the bridge position, the plaza
circle, the podium ring, all path splines, and every prop's position and collider. The walkable area is
the grass polygon minus the river polygon (plus the bridge deck), which is why `isWalkable()` is just a
couple of point-in-polygon tests.

## Running it

It's a static site. Any file server works:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly from disk will not work because ES modules are blocked on `file://`.

## Deploying

The repo is `karlrapada21.github.io`, so pushing to `main` publishes it at
<https://karlrapada21.github.io/> via GitHub Pages. No build step, no dependencies.

## Dev tools (optional)

`tools/` contains the scripts used while building this, all headless-Chrome based:

| Script | Purpose |
| --- | --- |
| `shot.mjs` | screenshot the page (`SHOT_VIEW=x,y,zoom` to park the camera) |
| `eval.mjs` | run an expression inside the running page and print the result |
| `reach.mjs` | flood-fill the walkable area and assert every landmark is reachable |
| `walktest.mjs` | autopilot the villager along a route and report where it sticks |
| `sprite.mjs` | render the villager alone and print colour profiles per band |
| `inspect.py` / `probe.py` | describe a screenshot as an ASCII colour map / sample pixels |
| `lint.mjs` | report unused imports and duplicate declarations |

They need Chrome installed and a static server running on port 8099.

---

Made with a lot of bezier curves. ☁️
