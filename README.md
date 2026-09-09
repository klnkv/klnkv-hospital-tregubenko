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
| Look-dev / art direction / исходная 3D-модель / текстуры / лица | супруга проекта — имя в титрах по её выбору |

Look-dev ходит по сборке, а не по репозиторию. Инструкция: [LOOKDEV.md](./LOOKDEV.md).

## Ссылка для прогулки (бесплатно)

Не Vercel. Не отдельный аккаунт. Не карта.

Прогулка публикуется **GitHub Pages** с этого же репозитория (бесплатно для
публичного кода):

**https://klnkv.github.io/klnkv-hospital-tregubenko/**

Эту ссылку и отправляй look-dev. После пуша в `main` страница сама обновится.

KPI/проценты готовности — внутренняя таблица в [STATUS.md](./STATUS.md), не
сервис и не подписка.

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
