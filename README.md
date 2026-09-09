# Больница №6 — LAST RESORT TOWN

Walkable Three.js mockup of **Hospital №6** (Season 1 production reference).
Metric and naming follow the V6 location bible (96 × 72 m, courtyard 36 × 28 m,
floor step 3.60 m, B1–F6 + roof). This is the web explorer used to lock
cameras, interiors and the town atlas before the Unreal port.

**Repo:** [klnkv/klnkv-hospital-tregubenko](https://github.com/klnkv/klnkv-hospital-tregubenko)

## Команда

| Роль | Кто |
|------|-----|
| Production, explorer, Unreal port path | [klnkv](https://github.com/klnkv) |
| Look-dev / art direction / исходная 3D-модель / текстуры / лица | Кристина |

Этот репозиторий и рабочий чат — продакшен. Кристине актуальная прогулка:

**https://klnkv.github.io/**

На кадре видны сборка и время правок. Инструкция: [LOOKDEV.md](./LOOKDEV.md).

## Run locally

```bash
npm install
npm run dev
```

| Key | Action |
|-----|--------|
| WASD | Walk / strafe |
| Shift | Sprint |
| Mouse | Look (click to lock) |
| E / Q | Up / down on stairs and lifts |
| 1 2 3 | Gate establishing shots |
| G | Town atlas |
| C | Orbit |
| M | Plan |
| F | Secret passage (when in a marked room) |

## Coordinate convention

Bible: X east, Y north, Z up.  
three.js: `x = X`, `y = Z`, `z = −Y`.

## Pilot (S1 «Завтрак»)

West wing, floor 1:

- `F1-DINING` — elite dining: trinity table, three guest armchairs, buffet,
  serving console, salt cellar, silver, closed curtains.
- `F1-KITCHEN` — kitchen: island, storage, knife block, pass to `F1-WX`.

## Status

See [STATUS.md](./STATUS.md).
