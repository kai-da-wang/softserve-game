# 冰淇淋模拟器

A portrait soft-serve game modeled on https://softserve.nog.cc/. Its credits identify the reference and this independent implementation. No original application bundle or remote game assets are included.

Hold anywhere in the lower 30% of the screen to extrude. Drag to move the cone directly; one screen width moves it 2.1 world units. Release to finish, then drag the finished cone to inspect it. The gameplay screen retains the minimal reference layout. Leaderboard and skin entrances appear only below the result controls.

## Scores and skins

One centimeter earns ten points, rounded to the nearest integer. Both successful and failed rounds contribute to the highest score; interruptions do not. A failure uses the peak height before falling. Local progress persists immediately. Signed-in players also save a verified score in shared D1 storage.

| Skin | Best score required |
| --- | ---: |
| 原味香草 | 0 |
| 草莓奶霜 | 50 |
| 宇治抹茶 | 100 |
| 浓醇可可 | 200 |
| 绵云芋泥 | 350 |
| 极光双旋 | 500 |

Skins change the actual cream material in both renderers, including a two-color aurora twist. The selection persists between rounds and reloads. The skin sheet shows remaining height for the next unlock.

The all-time board keeps each player's best score. The daily board keeps each player's best for the Beijing day (UTC+8, midnight reset). Equal scores favor the earlier achievement. The top 50 and the current player's position are shown. No sample users or scores are inserted. Default nicknames are pseudonymous and editable; account IDs and emails are not returned by the API.

## Runtime

Vinext on a Sites Worker serves the game in `public/game/` and the `/api/` endpoints. D1 binding `DB` stores players, rounds, and daily bests. `db/schema.ts` and `drizzle/` define the schema; deployment packaging includes the migration. Sites supplies authenticated identity through its trusted header. Anonymous users can play locally and read rankings; cloud writes require sign-in. The existing Site audience is preserved.

The server replays recorded input with the shared fixed-step simulation and calculates the score itself. It validates the engine, input shape, bounds, completed outcome, elapsed time, and round ownership. Completed submissions are idempotent. This is basic score integrity, not a full competitive anti-cheat system.

The interface supports Chinese, Japanese, English, and Korean, native image/file sharing, image downloads, and video recording when MediaRecorder is available. Landscape play is blocked in the same manner as the reference.

The independent fixed-step model uses delayed flow, flattened strand contact, cone contact, stationary piling, and mass-driven flexible joints. All mesh assets are procedural. Three.js r170 is vendored under MIT; its license header is retained. A shaded Canvas 2D renderer uses the same model when WebGL2 is unavailable. No original application bundle or remote game asset is included.

## Validation

```sh
npm run check
npm run test:api
npx tsc --noEmit
npm run build
```

Checks cover input behavior, balance and spills, frame-rate consistency, mesh winding, bounded buffers, material colors, skin thresholds, Beijing midnight, and shared replay verification. An ephemeral Worker/D1 integration test covers authentication, actual score writes, both rankings, equal-score ordering, daily isolation, failed rounds, ownership, nickname validation, locked skins, and duplicate submissions. It creates no production test data.

Browser QA covers 390×844 and 360×640 screens, failure results, unlocks, skin changes in the next round, refresh persistence, and both leaderboard tabs. The QA browser has WebGL disabled, so visual checks use Canvas; Three.js geometry and material colors are checked separately. Physics is an independent approximation of the reference.
