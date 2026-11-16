# People of Panvel · पनवेलची माणसं

A Panvel you can walk through, built from the town's real streets and buildings, where the people you meet are real.

The site does two things. It lets anyone roam the town. And it lets members see each other there and talk to whoever is nearby. That is all, on purpose.

It runs entirely in the browser. There is no build step, no server and no account.

![Title screen: Vadale Talav at dusk](docs/title.jpg)

## How it works for a visitor

- **Everyone arrives as a ghost.** A ghost can walk anywhere, sees the members who are in town, and hears what they say nearby. Nobody sees a ghost, and a ghost cannot talk.
- **Members come in by invite.** Follow @peopleofpanvel on Instagram and send a DM. A reviewer sends back a link that is yours alone. One tap on it and you walk in under your own name.
- **Members see and hear each other.** A member's name floats above their head. What a member types is heard by people within about 60 metres, as a line on screen and a bubble over the speaker.
- **Three ways to talk.** The button beside the typing bar chooses who hears you: people nearby, everyone in Panvel, or one person privately. Tap a member and choose **Message privately** to start a private conversation.
- **Meeting is one tap.** The pill at the top shows who is in town. Pick someone and a rickshaw takes you to them. Two members who come face to face fold their hands in a namaskar.
- **Getting around.** Tap or click a spot on the ground and your character walks there. Or walk with the left thumb or `W` `A` `S` `D`. Tap the round map, then tap anywhere on the big map to be walked there, or tap a rickshaw stand to ride there. A picture of all this is shown on the first visit, and again from the menu.

Nothing else is on screen: the name of the place you are in, who is around, a place to type, and the map.

## The town

- About 4,600 building footprints, the full street network, Vadale Talav and the other lakes, the river, the flyover, the rail lines and the platforms of Panvel Junction, all from OpenStreetMap and placed where they really are.
- Street nameboards, signboards on hospitals, banks, schools and shops that the map records, and housing-society name plates.
- Traffic that keeps left, and a local train that pulls in and out of the junction. There are no computer-run people: everyone you see walking is a real member.
- The sun follows the real solar path for Panvel at the current time in India. The monsoon months bring rain.
- With an imagery key, the ground and rooftops are drawn from aerial photographs. See [Satellite imagery](#satellite-imagery).

## Run it

Any static file server works. From the repository root:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Opening `index.html` straight from disk will not work, because browsers block module and data loading from `file://`.

The live site is <https://peopleofpanvel.com>. The `CNAME` file ties that domain to GitHub Pages, which serves the repository root as it is.

Before publishing a change, run `node tools/stamp.mjs`. It gives every script and the stylesheet a new version number in `index.html`, so a browser holding yesterday's files never mixes them with today's.

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` | Walk |
| `Shift` | Run |
| Click on the ground | Walk there |
| Mouse | Look around (click once to capture the mouse, `Esc` to release) |
| `Enter` | Type something (members) |
| `M` | The map |
| `P` | Who is in town |
| `E` | Open the card of the member in front of you |
| `V` | See through your own eyes, or from behind |

On a phone, the left thumb walks on the joystick, the right thumb looks, and a tap on the ground walks you there. The ☰ menu holds language, view, sound and graphics.

## Invites

There is no server to keep a list of members, so membership is carried by signatures.

- A **reviewer** has a private signing key. It is made on the page `/reviewer.html` the first time that page is opened, and it stays in the reviewer's browser.
- The reviewer's **public key** is listed in `js/config.js` under `invite.reviewers`. Only invites signed by a listed reviewer work.
- For each person, the reviewer page makes a fresh key pair and signs a small pass: a member id, the name, the date, and the person's public key. The **invite code** is that pass plus the person's private key. It travels as a link in an email.
- A member's browser announces itself with the pass and signs every announcement and every message with the member's own key. Every other browser checks both signatures. So nobody can pose as a member, copy a pass off the network, or put words in a member's mouth.
- **One invite, one person at a time.** If the same invite is opened on a second device, the first one steps back to a ghost and offers to take it back.
- To **withdraw** an invite, add the member id (eight letters and digits, shown on the reviewer page) to `invite.revoked` in `js/config.js`.

### For the reviewer

1. Open `/reviewer.html` and press **Make my reviewer key**. Download the key backup and keep it private.
2. Copy the public key shown there into `invite.reviewers` in `js/config.js`. The page says when the site knows the key.
3. For each person: type their name as it should appear, their email, and press **Make invite**. **Open email to send it** opens a ready-written email with their link.
4. To see what is being said, press **Start watching** under **Watch the town**. Nearby talk, messages to everyone and private messages all appear there as they are said, with who wrote to whom. The record can be downloaded.

The page keeps a list of who was invited, in that browser only.

People ask for an invite by following [@peopleofpanvel](https://www.instagram.com/peopleofpanvel/) on Instagram and sending a DM. The reviewer makes their link and pastes it into the DM. The site's **Come in** panel says so and links there; the address is `invite.requestUrl` in `js/config.js` (an email address in `invite.requestEmail` works too).

## What is sent, and to whom

Browsers meet on a public MQTT relay (`broker.emqx.io`, with `broker.hivemq.com` as a fallback, set in `js/net/live.js`).

- A **ghost** connects only to listen. It sends nothing about itself.
- A **member's** name, look and position, and what they say nearby or to everyone, pass through the relay in the clear. Anyone connected to the relay can read them. It is a public square, not a private room.
- A **private message** is sealed twice: once for the person it is sent to, and once for each reviewer. Other members and outsiders cannot read it. Reviewers can, on the reviewer page, so that harassment can be dealt with. Before walking in, every member is told that nothing they write is secret and that messages can be checked for safety.
- Nothing is stored on the internet. A reviewer sees only what is said while their page is open and watching, and that record stays in their browser. When no reviewer is watching, messages are gone once they are read.
- Movement between announcements is not signed. Someone with their own software could make a member appear to jump about. They could not speak as that member.
- Incoming text is filtered for abuse, links and phone numbers, and floods are rate-limited. A member can hide any other member on their own device, and report them to the reviewer by email.

The relays are free public test brokers with no guarantee of uptime. For a busier town, point `RELAYS` at a broker of your own.

## Satellite imagery

By default the ground is painted by the game. With an imagery key, the ground and the flat rooftops are drawn from aerial photographs. Seen from behind and zoomed out, the town looks like a satellite map with buildings standing on it.

1. Create a free account at [location.arcgis.com](https://location.arcgis.com/) (ArcGIS Location Platform).
2. Create an API key with the **Location services > Basemaps** privilege. Under referrers, allow only your own site address.
3. Paste the key between the quotes after `key:` in `js/config.js`.

The free tier covers two million map tiles a month. A visit uses a few hundred. The key is visible to anyone who views the page source, which is why the referrer restriction matters. Imagery © Esri and its data providers, credited on screen.

## The map data

`data/panvel.json` is generated from OpenStreetMap by `tools/build-map.mjs`.

```sh
node tools/build-map.mjs --fetch   # download fresh extracts, needs network
node tools/build-map.mjs           # rebuild data/panvel.json from the cache
```

The script projects the data to metres around the ST depot, splits streets into a graph, guesses building heights where the map has none, and marks which walls face a street. If a building, street or name is wrong in the game, the best fix is usually to correct it on [OpenStreetMap](https://www.openstreetmap.org/) and regenerate.

## Not built yet

- Meeting offline. The site is the first step: people who feel they belong to the same town.
- A record of messages while no reviewer is watching. That needs somewhere on the internet to keep them.
- Anything else that needs a server: accounts, a shared list of members, messages that are still there tomorrow.

Earlier versions had fictional residents, computer-run passers-by, landmark stamps, drivable rickshaws, tea-stall circles, gestures and street games. They were removed to keep the site about roaming and real people. They remain in the git history.

## Project layout

```
index.html            the town
reviewer.html         the reviewer's page for making invites
css/style.css         interface styles
data/panvel.json      generated map
tools/build-map.mjs   OpenStreetMap converter
tools/stamp.mjs       stamps a release so browsers never mix old and new files
js/main.js            game loop
js/config.js          site settings: reviewers, where requests go, imagery key
js/ui.js              interface
js/net/               the live layer: relay client, invites, signatures and sealed messages, input safety
js/gfx/               renderer, sky, procedural textures and materials
js/world/             town builder: streets, rail, buildings, props, landmarks, names, imagery
js/entities/          player, camera, passers-by, traffic, members seen live
js/data/              places and street names
vendor/               three.js r170 and the add-ons used (MIT)
```

## Credits and licence

- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, available under the Open Database Licence. `data/panvel.json` is a derived database and is shared under the same licence.
- [three.js](https://threejs.org/) is used under the MIT licence.
- Fonts: Baloo 2 and Mukta, from Google Fonts, under the SIL Open Font Licence.
- The code and writing in this repository are released under the MIT licence. See `LICENSE`.
