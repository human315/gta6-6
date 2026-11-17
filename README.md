# Solano Bay

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/human315/gta6-6/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/human315/gta6-6/reward.svg)](https://make.fun/bounty/gta6-01)

**Solano Bay** is an original open-world crime game: a sun-soaked coastal city you explore on foot and by car, with traffic and pedestrians, cars to steal, a wanted level with police who chase, ram and bust you, five story missions for the fixer Mara Voss, on-foot combat, a HUD with a minimap, and a save that carries your money and progress between sessions.

Rook Calloway is back in Solano Bay. Five jobs stand between him and the last score — if the Bay PD doesn't catch him first.

## How to play

- **Move / drive** with WASD or arrow keys. **Mouse** aims, **click** shoots.
- **E** — enter or leave a car, or grab a package, case or cash on foot. Stealing a parked car is quiet unless a cop is watching; carjacking a driven car brings the heat at once.
- **R** — reload. **P** — pause. **M** — mute.
- **Wanted stars** rise when you steal cars, run people over, shoot at cops or trip an alarm. Stay clean and out of sight and the heat cools off — hiding in Mara's garage cools it twice as fast.
- **Missions:** five jobs, each with its own steps and payout, from stealing your first wheels to the Bay Central vault. The gold marker on the map and the minimap always points at the current objective.
- **Save:** your money and mission progress save automatically after every job. The title screen offers Continue when a save exists. Getting wasted or busted costs $200 and drops you at the hospital.

## Run it locally

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. The game is plain static files under `game/` — no build step, no network requests, no external assets. All art is drawn on a 2D canvas and all sound and music is synthesized with WebAudio.

## Layout

- `game/index.html` — the page; `game/src/` holds one job per file: `config.js` (tuning and city layout), `input.js` (keyboard/mouse), `audio.js` (synth SFX and music), `world.js` (city, traffic, pedestrians, police, combat, wanted system), `missions.js` (the five-job story), `render.js` (canvas drawing), `ui.js` (HUD, minimap, menus), `shots.js` (deterministic screenshot scenes), `main.js` (loop, state machine, save/load), `random.js` (seeded RNG).
- `main.ts` — the make.fun entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — four real renders of the game: title, driving in traffic, a three-star police chase, and the final score.

Built for the [gta6-01](https://make.fun/bounty/gta6-01) bounty on make.fun. Licensed MIT. Referral: https://make.fun/r/nyf6tb46
