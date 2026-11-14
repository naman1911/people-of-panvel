# People of Panvel · पनवेलची माणसं

Walk through a 3D Panvel built from the town's real streets and buildings, and meet the people who make it what it is.

It runs entirely in the browser. There is no build step, no server and no account.

## What's in it

- **The real town.** About 4,600 building footprints, the full street network, Vadale Talav and the other lakes, the river, the flyover, the rail lines and the platforms of Panvel Junction, all taken from OpenStreetMap and placed where they really are.
- **Real names.** Street nameboards, signboards on hospitals, banks, schools and shops that the map records, housing-society name plates, and a live map with street names.
- **Walking pace.** First-person view by default, at a real walking speed, with footsteps and street sound. Press `V` for a view from behind.
- **People.** 26 residents with profiles in English and Marathi. They are fictional (see below).
- **Things to do.** Collect Panvel Darshan stamps at 16 landmarks, drive a rickshaw, sit for a cutting chai, read and pin notices, take a stray along, and hop between neighbourhoods by share rickshaw.
- **Weather and time.** The sun follows the real solar path for Panvel at the current time in India. The monsoon months bring rain, wet streets and low cloud. Both can be changed from the HUD.

## Run it

Any static file server works. From the repository root:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Opening `index.html` straight from disk will not work, because browsers block module and data loading from `file://`.

To publish it, enable GitHub Pages for the repository and serve from the root of the branch.

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` | Walk |
| `Shift` | Jog |
| Mouse | Look around (click once to capture the mouse, `Esc` to release) |
| `E` | Interact |
| `V` | First person / third person |
| `N` | Map |
| `F` | Find someone |
| `T` | Share rickshaw |
| `B` | Darshan card |
| `C` | My katta |
| `M` | My character |
| `H` | Help and settings |

On a phone, the left thumb walks and the right thumb looks.

## Graphics

Three tiers are available under Help: low, medium and high. High adds ambient occlusion and mirror reflections on the lakes and needs a dedicated graphics card. The game picks a tier on first load and steps effects down by itself if the frame rate stays low.

## The people are fictional

Every resident in `js/data/people.js` is a composite written for this project. None of them is a portrait of a real person.

To add a real Panvelkar, with their consent:

1. Make your character in the game (`M`), then use **Add me to Panvel for real**. This opens a GitHub issue containing your character card.
2. Or add an entry to `js/data/people.js` in a pull request. Each entry has a name, a role, a spot on the map, a look, a status line, a short story and a few things they say, in English and Marathi.

Please do not add anyone without their permission.

## The map data

`data/panvel.json` is generated from OpenStreetMap by `tools/build-map.mjs`.

```sh
node tools/build-map.mjs --fetch   # download fresh extracts, needs network
node tools/build-map.mjs           # rebuild data/panvel.json from the cache
```

The script projects the data to metres around the ST depot, splits streets into a graph, guesses building heights where the map has none, and marks which walls face a street. If a building, street or name is wrong in the game, the best fix is usually to correct it on [OpenStreetMap](https://www.openstreetmap.org/) and regenerate.

Landmark facts live in `js/data/places.js`. Corrections are welcome.

## Not built yet

- Kharghar and Karnala, which appear in the rickshaw menu as coming soon.
- Other players. Nothing you do leaves your browser, so you will not see anyone else walking around.

## Project layout

```
index.html            page shell
css/style.css         interface styles
data/panvel.json      generated map
tools/build-map.mjs   OpenStreetMap converter
js/main.js            game loop
js/gfx/               renderer, sky, procedural textures and materials
js/world/             town builder: streets, rail, buildings, props, landmarks, names
js/entities/          player, camera, residents, crowd, traffic
js/data/              residents, places, street names
js/ui.js              interface
vendor/               three.js r170 and the add-ons used (MIT)
```

## Credits and licence

- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, available under the Open Database Licence. `data/panvel.json` is a derived database and is shared under the same licence.
- [three.js](https://threejs.org/) is used under the MIT licence.
- Fonts: Baloo 2 and Mukta, from Google Fonts, under the SIL Open Font Licence.
- The code and writing in this repository are released under the MIT licence. See `LICENSE`.
