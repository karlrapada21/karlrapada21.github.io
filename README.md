# Rapada Isle

A cozy, low-poly **3D island portfolio** for **Karl Lynuz B. Rapada** — inspired by *Animal Crossing* and
the films of Studio Ghibli. There's a cottage on a hill, a river with an arched wooden bridge, and six
exhibit podiums around a stone plaza across the water. Walk up to one and press **E** to read a section
of the resume.

Everything is rendered in real time with **three.js** on a single `<canvas>`: procedural low-poly models,
a heightfield island, animated water shaders, and a third-person camera. No build step, no sprite sheets,
and only one dependency (three.js, vendored locally).

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

- **Terrain** — a 236×164 heightfield with a shoreline slope, rolling hills, a graded plaza, and a
  river channel carved through the middle. The ground is painted once into a 2048×1420 canvas
  (grass mottling, 5k grass blades, wildflowers, paths with pebbles, the stone plaza) and mapped over
  the mesh, so the detail costs nothing per frame.
- **Ocean** — a 2400-unit plane with a vertex wave shader and a banded shimmer in the fragment stage,
  kept centred on the camera so the sea always reaches the horizon.
- **River** — a ribbon built from the river centreline with an animated flow/ripple/foam shader. The
  waterline sits below the grass so the banks read as banks.
- **Bridge** — an arched plank deck with segmented railings, balusters, support posts, four glowing
  lanterns, and instanced petals drifting over it.
- **Props** — every model is procedural low-poly, assembled from primitives and baked into two merged
  vertex-coloured meshes (one static, one foliage). Foliage uses a wind shader so the whole forest sways
  in a single draw call. The cottage has a shingled roof, smoking chimney, flower boxes, and climbing
  vines; the windmill's sails turn; podiums float rotating emblems and glowing halos.
- **Light** — hemisphere + shadow-casting sun + bounce fill, ACES tone mapping, soft PCF shadows, and
  distance fog.
- **Sound** — a small generative Web Audio soundscape (wind + water bed, a slow pad, a wandering
  pentatonic melody) plus UI blips. No audio files; synthesised on the fly.

## The villager

There is **no character customiser** — the villager has one fixed, hand-tuned look: straw hat, scarf,
satchel, and chibi proportions. The rig is built from jointed groups (hips, torso, shoulders, head), so
he has a proper walk cycle with arm/leg swing and body bounce, idle breathing, a head that looks around,
and turns smoothly toward the direction of travel.

---

## Project layout

```
index.html            page shell
css/style.css         all styling (title screen, HUD, exhibits)
js/main.js            entry point
js/core.js            maths, colour, and canvas helpers
js/resume-data.js     ← all resume content lives here
js/layout.js          world geometry: island, river, bridge, plaza, prop placement, collisions
js/geo.js             geometry builder: merged vertex-coloured meshes, materials
js/terrain.js         heightfield, painted ground texture, ocean, sky, river, lights
js/props3d.js         every prop model + the wind shader
js/bridge3d.js        the arched bridge, lanterns, and instanced petals
js/villager3d.js      the player character, the cat, and the 2D exhibit portrait
js/ui.js              title screen, HUD, resume exhibits
js/audio.js           generative audio
js/game.js            loop, camera, input, movement, interactions
js/vendor/            three.js (vendored, so the site works offline)
assets/               Karl-Rapada-Resume.pdf
tools/                dev-only inspection scripts (not needed by the site)
```

### Coordinates

World units are the old 2D pixel space (`WORLD` is 2600×1900). One three.js unit is `WU = 27` world
units, so `toX(wx)` / `toZ(wy)` convert. Collision (`isWalkable`) still runs on the original 2D polygons,
which is why movement stays cheap.

### Updating the resume

Almost everything is data-driven. Edit `js/resume-data.js` — `PROFILE`, `SKILL_GROUPS`,
`EXPERIENCE`, `PROJECTS`, `EDUCATION`, `CERTIFICATES` — and the exhibits update. Replace
`assets/Karl-Rapada-Resume.pdf` to update the downloadable file.

### Adjusting the world

`js/layout.js` holds the island silhouette, the river control points, the bridge position, the plaza
circle, the podium ring, all path splines, and every prop's position and collider. The walkable area is
the grass polygon minus the river polygon (plus the bridge deck), so `isWalkable()` is just a couple of
point-in-polygon tests.

## Running it

It's a static site. Any file server works:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly from disk will not work because ES modules are blocked on `file://`.

## Deploying

The repo is `karlrapada21.github.io`, so pushing to `main` publishes it at
<https://karlrapada21.github.io/> via GitHub Pages. No build step, no dependencies to install —
three.js is committed under `js/vendor/`.

## Dev tools (optional)

`tools/` contains the headless-Chrome scripts used while building this. They need Chrome installed and a
static server on port 8099.

| Script | Purpose |
| --- | --- |
| `shot3d.mjs` | screenshot the scene (`play`, `start`, or `orbit:x,y,yaw,pitch,dist`) |
| `describe.mjs` / `png.mjs` | decode a PNG and describe it as colour bands, palette, and a class map |
| `probe.mjs` | run an expression inside the running game and print the result |
| `inspect3d.mjs` | project every object to screen space and report sizes |
| `smoke3d.mjs` | boot, open all six exhibits, walk, and assert no console errors |
| `layout.mjs` | check the title screen fits at a given viewport |
| `reach.mjs` | flood-fill the walkable area and assert every landmark is reachable |
| `walktest.mjs` | autopilot the villager along a route and report where it sticks |
| `lint.mjs` | report unused imports and duplicate declarations |

---

Made with a lot of low-poly triangles and one very good straw hat. ☁️
