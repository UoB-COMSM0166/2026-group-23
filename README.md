<div align="center">

# Quantum Drop

**A 2-D browser game that fuses tower-defence with a Plinko-style ball-drop economy.**
*COMSM0166 — Software Engineering Discipline & Practice · Group 23 · 2025-26*

[![Play](https://img.shields.io/badge/▶-Play_v2.1-F96167?style=for-the-badge)](https://uob-comsm0166.github.io/2026-group-23/Game_v2.1/)
[![Demo video](https://img.shields.io/badge/🎬-Demo_video-1C7293?style=for-the-badge)](video/我的影片.mp4)
[![Slides](https://img.shields.io/badge/📊-Slides-21295C?style=for-the-badge)](video/Quantum_Drop_Group23.pptx)
[![p5.js](https://img.shields.io/badge/p5.js-zero_build-F9C74F?style=for-the-badge)](https://p5js.org/)

[![Game Screenshot](docs/screenshots/launch-screen.jpg)](https://uob-comsm0166.github.io/2026-group-23/Game_v2.1/)

</div>

---

## Quick links

- **Live build (v2.1)** — <https://uob-comsm0166.github.io/2026-group-23/Game_v2.1/>
- **Demo video** — [`video/我的影片.mp4`](video/我的影片.mp4)
- **Presentation deck** — [`video/Quantum_Drop_Group23.pptx`](video/Quantum_Drop_Group23.pptx)
- **Speaker scripts** — [`video/Quantum_Drop_Speaker_Scripts.pdf`](video/Quantum_Drop_Speaker_Scripts.pdf)
- **Older builds** — [v0.3](https://uob-comsm0166.github.io/2026-group-23/Game_v0.3/) · [v1.4](https://uob-comsm0166.github.io/2026-group-23/Game_v1.4/) · [v2.1 (latest)](https://uob-comsm0166.github.io/2026-group-23/Game_v2.1/)

## Screenshots

| Launch screen | Mission select | Mini-game (mid-salvo) |
|:---:|:---:|:---:|
| ![Launch](docs/screenshots/launch-screen.jpg) | ![Map](docs/screenshots/level-map.jpg) | ![Mini-game](docs/screenshots/minigame2.jpg) |

| Sector Alpha | Nebula Rift | Iron Citadel | Void Maze | Omega Gate |
|:---:|:---:|:---:|:---:|:---:|
| ![Lv1](docs/screenshots/level1-thumb.jpg) | ![Lv2](docs/screenshots/level2-thumb.jpg) | ![Lv3](docs/screenshots/level3-thumb.jpg) | ![Lv4](docs/screenshots/level4-thumb.jpg) | ![Lv5](docs/screenshots/level5-thumb.jpg) |

---

# Project Report

## Table of contents

1. [Introduction](#introduction)
2. [Requirements](#requirements)
3. [Design](#design)
4. [Implementation](#implementation)
5. [Evaluation](#evaluation)
6. [Process](#process)
7. [Sustainability, Ethics & Accessibility](#sustainability-ethics--accessibility)
8. [Conclusion](#conclusion)
9. [Team](#team)
10. [Build & test (developers)](#build--test-developers)
11. [Reference appendix](#reference-appendix)

---

## Introduction

**Quantum Drop** is a 2-D browser game that fuses the slow, strategic layer of a **tower-defence** with the fast, tactile feel of a **ball-drop minigame**. It is written entirely in [p5.js](https://p5js.org/) and ships as a zero-build static site, so it runs from any file host (including GitHub Pages) without a toolchain.

The player works their way through five themed sectors — *Sector Alpha*, *Nebula Rift*, *Iron Citadel*, *Void Maze* and *Omega Gate* — each with its own map, monster roster, and a tightening starting budget (in-game credits, prefixed `¥`, fall from `¥2000` at Level 1 to `¥1200` at Level 5). Eight tower variants (*Rapid*, *Laser*, *Nova*, *Chain*, *Magnet*, *Ghost*, *Scatter*, *Cannon*), three upgrade tiers each, and ten enemy types (including three multi-phase bosses) give the combat layer meaningful depth.

The **twist** is in the economy. Most tower-defence games make the player wait passively between waves while resources accumulate on a timer; we replace that dead time with a Plinko-style minigame where the player aims a launcher, watches balls fall through a lattice of `+N`, `−N` and `×N` gates, and the final ball count becomes the coin budget for the next wave. This has two design effects we wanted: the player is *always* engaged (no idle seconds), and the luck–skill mix of the minigame becomes a narrative hook — a great run genuinely changes your tower composition for the wave that follows.

A secondary novelty is that **no art assets were drawn**: every monster, tower, projectile, particle and background is generated procedurally in JS, which enforces a unified cyberpunk aesthetic across six contributors and keeps all visuals in the same git diff as the logic.

---

## Requirements

### Ideation

Week 2 was an open ideation week — each team member brought one concept (a painting app, a rhythm game, a tower defence, a Plinko-style physics toy, a typing trainer, and a puzzle-platformer). We ran a dot-vote over three criteria: *fits a 10-week schedule*, *exposes everyone to non-trivial programming*, and *would be fun to demo*. Tower defence won on criteria 1 and 2 but lost on criterion 3 because it felt "done-to-death"; the Plinko prototype lost because it was a one-minute toy with no progression. The proposal that broke the tie was to fuse the two: use the Plinko as the *economy layer* of a tower defence so the player is always interacting, even between waves. We built two paper prototypes in Week 3 — one a classic grid TD to pin down placement feel, the other a Plinko board to pin down drop speed and gate density — and the combined experience felt promising enough to commit to.

### Stakeholders

We enumerated five stakeholder roles (`workshop/week04/stakeholderslist.md`):

1. **Tower-defence players** — the primary audience; expect clean build menus, visible range indicators and a fair difficulty curve.
2. **p5.js developers (ourselves)** — care about modular files, predictable load order and low iteration cost.
3. **Art / visual designers** — care that visuals stay coherent as features land.
4. **Test engineers** — need deterministic, testable units and reproducible bugs.
5. **Experience optimisers** — watch over readability, onboarding and accessibility.

Each role deliberately overlapped with a team member's own skills, so "who cares about this?" had an obvious answer in every review.

### Use cases & user stories

The canonical stories (Week 4) are:

- *As a player, I want to play a ball-throwing minigame to earn coins, so that I can upgrade my towers.*
  **Acceptance:** when the minigame ends, coins equal to the final ball count are added to my balance.
- *As a player, I want to upgrade my towers using coins, so that I can defend against stronger enemies.*
  **Acceptance:** when I pick an upgrade and have enough coins, the tower's damage and/or range visibly increase and the coin balance decreases by the documented cost.
- *As a game designer, I want the minigame payouts to be balanced, so the tower layer stays challenging.*
  **Acceptance:** on average performance, coin income is sufficient to buy one or two towers per wave but not enough to brute-force the map.

From these three seed stories we derived eighteen secondary ones, each tied to a concrete deliverable. Four representative examples:

- *"As a first-time player I want an onboarding hint so I know what the build menu is."* → the five-step Level-1 tutorial.
- *"As a returning player I want my language and tutorial-seen flag preserved."* → `localStorage` persistence (`qd_lang`, `qd_tutorial_l1_done`).
- *"As a developer I want one-click access to all five levels."* → the `DEV: ALL LEVELS` shortcut on the launch screen.
- *"As a player on a small laptop I don't want the canvas to overflow the viewport."* → responsive CSS scaling via `windowResized()`.

### Use-case diagram (informal)

```mermaid
flowchart TD
    Player(["Player"])
    Mini["<b>Ball-Drop Economy</b><br><i>pre-wave earnings</i>"]
    Map["<b>Tower-Defence Map</b><br><i>per-wave combat</i>"]
    Phase["<b>Game-phase state machine</b><br>launch → difficulty → levelmap → playing → endpanel<br><i>playing = minigame · build · combat</i>"]

    Player -- "plays mini-game" --> Mini
    Player -- "places / upgrades towers" --> Map
    Mini == "coin payout" ==> Map
    Mini -. "reports coin balance" .-> Phase
    Map -. "reports base HP / wave" .-> Phase
```

### Requirement prioritisation (MoSCoW)

- **Must** — 5 playable levels; aim + drop + settlement minigame loop; at least four tower types; three enemy archetypes; win/lose conditions.
- **Should** — boss encounters; tower upgrade tiers; first-run tutorial; English/中文 toggle; pause menu.
- **Could** — sound; performance HUD; responsive canvas; unit tests; per-level star rating.
- **Won't (this term)** — networked multiplayer, persistent accounts, mobile touch support, sprite-based cutscenes.

Everything in *Must* and *Should* shipped; every *Could* except per-level star rating also shipped (sound, perf HUD toggled by `F`, responsive CSS scaling, and 48 `node:test` cases). *Won't* items are listed as future work.

---

## Design

### System architecture

The shipping version is **v2.1** (sound, perf HUD, responsive canvas, 48 unit tests on top of v2.0's structural refactor). The game runs as a single p5.js sketch — all source files live in one global scope and are loaded in a fixed order by `index.html`, which is the single source of truth for dependency order. The codebase is laid out by *concern*, not by *file type*:

```
docs/Game_v2.1/
├── index.html          # script load order
├── sketch.js           # p5 entry: setup(), draw(), phase router, keyPressed
├── state.js            # every mutable global, in one declaration file
├── audio.js            # HTMLAudio wrapper + mute toggle
├── data/               # pure config: TOWER_DEFS, WAVE_CONFIGS, LEVEL_INFO
├── map/                # path definitions + per-level backgrounds
├── monsters/           # base + mobs/* + bosses/* + manager
├── towers/             # base + variants/* (prototype-injected) + manager
├── ui/                 # hud + pause + build-menu + tower-panel + placement
├── screens/            # launch + difficulty + level-map + end-panel
├── minigame.js         # ball-drop economy
├── waves.js            # wave state machine
└── tutorial.js         # first-run overlay
```

At runtime the game is a **phase state machine** driven from `sketch.js::draw()`:

```mermaid
stateDiagram-v2
    direction TB
    state "playing" as mgPlay

    [*] --> launch
    launch --> difficulty
    difficulty --> levelmap
    levelmap --> playing

    state playing {
        [*] --> minigame
        state minigame {
            [*] --> idle
            idle --> aiming
            aiming --> mgPlay : click locks aim
            mgPlay --> result : all balls settled
        }
        minigame --> build : result adds coins
        build --> combat : countdown ends
        combat --> minigame : wave clear
    }

    playing --> endpanel : all waves clear (victory)
    playing --> endpanel : base HP ≤ 0 (defeat)
    endpanel --> levelmap : retry / next level
    endpanel --> [*]
```

> *State names match the literal string values of `gamePhase` (`'launch'`, `'difficulty'`, `'levelmap'`, `'playing'`, `'endpanel'`) and `minigameState` (`'idle'`, `'aiming'`, `'playing'`, `'result'`). The mini-game's `'playing'` state is shown via an alias to disambiguate it from the outer game-phase `'playing'`.*

### Class diagram (central cluster)

```mermaid
classDiagram
    direction TB

    class WaveConfig {
        <<data/waves.js>>
        spawn specs
        boss singletons
    }
    class MonsterManager {
        +monsters : Monster[]
        +damageAt(x, y, dmg)
        +inRange(cx, cy, r)
    }
    class Monster {
        <<base class>>
        +hp
        +speed
        +update()
        +takeDamage(dmg)
    }
    class Mobs_Bosses {
        <<10 subclasses>>
        MechSnake · MechSpider
        Boss1 · Boss2 · Boss3 · ...
    }
    class Tower {
        +type
        +level
        +update()
        +findTarget()
    }
    class TOWER_DEFS {
        <<data/towers.js>>
        cost · damage · range
        upgrade tiers
    }
    class TowerVariants {
        <<prototype-injected — 8 files>>
        _updateRapid()
        _updateLaser()
        _updateNova()
        _updateChain()
        _updateMagnet()
        _updateGhost()
        _updateScatter()
        _updateCannon()
    }

    WaveConfig ..> MonsterManager : spawns
    MonsterManager o-- Monster : contains *
    Monster <|-- Mobs_Bosses : extends
    Tower ..> Monster : targets
    Tower ..> TOWER_DEFS : reads
    TowerVariants ..> Tower : injected onto prototype
```

### Key design decisions (full rationale in [`DESIGN.md`](DESIGN.md))

1. **Prototype extension instead of subclassing.** Every call site already used `new Tower(gx, gy, 'rapid')`; subclassing would have forced a factory-rewrite of every caller. Instead, each variant (`towers/variants/rapid.js` …) attaches to `Tower.prototype`, so the eight files split behaviour without touching callers. Trade-off: no `instanceof RapidTower` checks — but `tower.type === 'rapid'` is already the dispatch key.

2. **Centralise state declarations, not access.** We considered full namespacing (`Game.state.coins`) but chose to only move the *declarations* into `state.js`. Every `coins += reward` elsewhere keeps working unchanged. Goal was *traceability* (one file lists every global), not encapsulation.

3. **Data tables separate from logic.** `data/towers.js`, `data/waves.js`, `data/levels.js` are pure configuration. Balancing is a one-file edit; unit tests can load configs without pulling in the renderer.

4. **Caches keyed on `(state, language)`.** HUD text, tower tooltips, wave-preview boxes all cache rendered strings. Each cache signature includes `currentLang`, so toggling EN/中 at runtime invalidates them correctly.

5. **Programmatic visuals.** No sprite sheets. Every entity is drawn from primitives + trigonometry so the aesthetic stays coherent across six contributors.

---

## Implementation

We focus this section on the **two biggest technical challenges**: the minigame physics + gate lattice, and the v1.4 → v2.0 refactor of three god-files into concern-oriented modules. Three further challenges that are more about process than implementation — the procedural-art pivot, balance drift, and onboarding — are documented in *Process › What went wrong*.

### Challenge 1 — Ball-drop minigame (`minigame.js`, 847 lines)

The minigame has to feel physical and fair while producing a coin payout that a designer can reason about. The implementation is a small state machine (`idle → aiming → playing → result`) with four coupled subsystems:

- **Aim phase.** We render a launcher that follows `mouseX`. A single click locks `aimX` and transitions to `playing`. To stop a fast mouse from teleporting mid-confirmation, we also require the click to land inside a deliberately sized target band.

- **Ball physics.** Each ball is `{x, y, vx, vy}` with gravity `0.13`, wall bounce `0.42` and friction `0.984`. The frame loop integrates Euler-style. With up to ~80 balls on screen we cap particle draws and reuse ball objects by marking them `alive=false` instead of splicing — splicing inside a 60 Hz loop is the kind of quadratic cost that compounds quickly.

- **Gates.** A gate is `{x, y, w, h, type: 'add' | 'sub' | 'mul', value, ...}`. Gates are generated column-by-column with constraints ("no two `×N` in the same column", "at least one positive-EV gate per row") so pathological boards are impossible. When a ball crosses a gate AABB with `triggered=false`, we fire the effect: `add` and `sub` push `N` synthetic balls into a `spawnQueue` (we never mutate `mgBalls` during iteration); `mul` replaces the current ball with N copies spread on a micro-arc so they separate instead of overlapping.

- **Settlement.** Balls that reach `y = floor − BALL_R` get `settled = true`; `landedBalls++`. When `shootDone && mgBalls.every(b => b.settled)`, we convert the count into coins and emit a result card. The conversion is deliberately one-to-one: the player *sees* their score equal the coin payout, which removed the "where did my coins go?" question that bit us in the first prototype.

The hard part was **balancing** without killing variance. We tune `shootTotal` (initial ball count), gate density and gate value distribution per level in `data/levels.js`. A swing of `N ∈ [min, max]` produces payouts within a ~±25 % band of the design target — wide enough to reward a great aim, narrow enough that the tower economy stays tuned.

### Challenge 2 — The v1.4 → v2.0 refactor

By the end of v1.4, three files had grown into god-classes:

| File          | Lines | What was mixed in |
|---------------|------:|-------------------|
| `monsters.js` | 2082  | 10 entity classes + manager + particle system + Boss AI |
| `towers.js`   | 1281  | 8 tower types dispatched by `if/else` inside one class |
| `ui.js`       |  934  | HUD + pause + build menu + tower panel + placement |

Merge conflicts on these three files had started to block parallel work for an entire week. The refactor had to hit three constraints simultaneously: (a) no gameplay behaviour change, (b) no call-site rewrites (too risky), (c) finish in one sprint.

**Approach.** We kept an instance of v1.4 open beside the new tree and worked top-down:

- **Extract pure data first.** `TOWER_DEFS`, `WAVE_CONFIGS`, `LEVEL_INFO` moved into `data/`. That alone removed ~400 mixed lines from the logic files.
- **Centralise state.** Every `let coins = …`, `let gamePhase = …` was moved into `state.js` declaration-only. Every `coins += reward` elsewhere stayed intact.
- **Split by concern, not by alphabet.** `monsters/` became `core.js + mobs/{snake,spider,…}.js + bosses/{fission,phantom,antmech,…}.js + manager.js`. `ui/` became `hud + pause + wave-ui + build-menu + tower-panel + placement`.
- **Towers by prototype extension.** We tried subclassing first but abandoned it after 20 minutes — every call site would have needed a factory. Switching to `Tower.prototype._updateRapid = function(){…}` meant each of the eight variants became one short file, injected on load, with zero caller changes.

Verification was manual: before-and-after playthroughs of all five levels at both difficulties, checking the same towers kill the same monsters at the same wave timing. The refactor shipped as v2.0 with identical gameplay — the only two observed behaviour deltas were latent v1.4 bugs (a tower-targeting edge case and a boss-HP lookup mismatch) that the cleaner module boundaries surfaced, and we fixed both as part of the migration.

The payoff became visible in week 9: three of us landed sound, the perf HUD, and responsive CSS *in parallel* with zero merge conflicts because the files they touched no longer overlapped.

---

## Evaluation

### Qualitative — playtest observations

We ran two informal playtest rounds with four external testers each (eight unique participants, none on the course). Round 1 used v1.4 before the tutorial landed; round 2 used v2.1 with the tutorial, sound, and the responsive canvas.

Each tester played Level 1 unprompted. We observed silently, noted where they got stuck, then ran a short semi-structured interview (five open questions, 3–5 minutes). Representative findings:

- **Round 1 pain points.** 3/4 testers didn't realise the ball count *was* the coin payout — they thought coins came from monster kills and the minigame was "just decoration". 2/4 tried to click on the battlefield before the build phase and got nothing (silent rejection). 4/4 did not know what the `CHAIN` and `MAGNET` icons did.
- **Changes we shipped in response.** (a) The settlement screen now prints `BALLS → COINS` with matching colour so the causal link is obvious. (b) Silent rejection became an explicit "Wait for Build Phase" hint. (c) Tower tooltips gained a one-line plain-English description below the stats block, localised to the selected language.
- **Round 2 results.** 4/4 testers understood the economy loop by wave 2. 0/4 triggered the silent-rejection case. 3/4 specifically mentioned the tutorial as helpful; 1/4 skipped it and still finished the level, which is the intended outcome.

The qualitative takeaway: *the mechanical systems were right in v1.4; what was wrong was that the player couldn't read the causal chain between them.* Most of our late-stage work was information design rather than new features.

### Quantitative — performance measurement

After the perf HUD landed (`ui/perf-hud.js`, toggle with `F`), we measured frame rate under three scripted stress scenarios on a 2020 M1 MacBook Air (Chrome 131, no throttling):

| Scenario                                 | Monsters on screen | Towers placed | Projectiles | FPS (avg) | Frame time p95 |
|------------------------------------------|-------------------:|--------------:|------------:|----------:|---------------:|
| Level 1 wave 3 (baseline)                |                 12 |             5 |          ~8 |        60 |        16.9 ms |
| Level 3 wave 6 (mid-complexity)          |                 28 |            11 |         ~25 |        60 |        17.4 ms |
| Level 5 final wave (worst case)          |                 45 |            16 |         ~60 |      58.7 |        22.1 ms |
| Level 5 final wave + Boss3 Berserk       |                 45 |            16 |         ~85 |      54.2 |        28.6 ms |

p5.js targets 60 FPS; we stay at vsync for ordinary play and drop to ~54 FPS only when the final boss is mid-Berserk with peak projectile count — a three-second window. The three optimisations that mattered most:

1. **Object pooling** for balls, particles and projectiles (no splicing in the hot loop).
2. **HUD text cache** keyed on `(coins, hp, wave, frame/30, currentLang)` — text re-rendering was the single hottest path before caching.
3. **`pathCellSet` build-once cache** in `map-core.js` — path containment used to be a nested loop on every placement check.

We also confirmed the refactor didn't regress performance: v1.4 and v2.1 produced statistically indistinguishable FPS on the same scenarios.

### Code testing

Because the game uses no build step, most of the source depends on p5 or browser globals. We nonetheless built a **`node:test` suite of 48 unit tests** covering the testable pure layers:

| File                              | Scope                                                                 |
|-----------------------------------|-----------------------------------------------------------------------|
| `tests/i18n.test.js`              | key parity EN/中, `{0}/{1}` substitution, zh→en→key fallback chain    |
| `tests/data-towers.test.js`       | 8 towers × 3 tiers schema, monotonic dmg/range, anti-air flags        |
| `tests/data-waves.test.js`        | per-level wave counts, spawn-spec shape, boss singleton sentinels     |
| `tests/data-levels.test.js`       | `LEVEL_INFO` ↔ `LEVEL_NODES` consistency, startCoins monotonicity     |
| `tests/map-core.test.js`          | `pathToPixels`, `isCellBuildable` (bounds/HUD/path/occupancy/levels)  |

Tests run in ~80 ms via `npm test` (Node ≥ 18, **no `npm install` needed**). The harness is a `vm.createContext` sandbox that stubs out p5 math helpers and `localStorage`. It concatenates the target source files into the sandbox, then promotes top-level `const`/`let` onto `globalThis` — so the browser game and the test runner read the *same unchanged files*, with no preprocessing step in the middle. This gave us a regression fence on every data-table edit: a typo in `WAVE_CONFIGS` used to break only the affected level silently; now the test suite catches the shape first.

Manual testing remained the backbone for animation, audio, and visual regression — none of which is worth the cost of snapshot-testing for a ten-week project.

---

## Process

### Tools & cadence

- **GitHub** for hosting, with GitHub Pages auto-deploying the `docs/` folder so every merged PR produced a playable build at a URL anyone could share.
- **Weekly workshop (Wednesdays)** for synchronous planning, demo and blocker discussion.
- **Async chat** (WeChat) for day-to-day coordination across time-zone overlaps.
- **draw.io** for early class and sequence diagrams (`workshop/week05/*.xml`); the up-to-date diagrams in this report are Mermaid blocks living next to the prose.
- **VS Code + Live Server** as the shared development environment — chosen because it has zero setup for a fresh contributor.
- **p5.js web editor** for one-off experiments (the Plinko paper prototype was first a p5 sketch in the online editor).

### Workflow

We used trunk-based development with short-lived feature branches (`feature/tower-cannon`, `feature/i18n`, `fix/wave5-boss-spawn`, …). PRs needed one reviewer; anything touching `state.js`, `data/*` or `sketch.js` needed the module owner specifically. Merges to `main` triggered the GitHub Pages redeploy, so we treated a broken build on `main` as an *"everyone stops, someone reverts"* incident. That happened twice during the term — both were script-load-order regressions after a file split — and the revert-first rule kept main shareable within minutes both times.

### What went wrong (and what we changed)

- **Art pipeline stalled early.** Our initial plan relied on hand-drawn sprites; two weeks in, the sprites didn't match across contributors and hadn't been finalised. We pivoted to fully procedural visuals (polar coordinates, particle systems, glow passes) — ugly for a week, then rapidly unified because everyone shared the same drawing primitives. This cost us ~1.5 weeks but removed an asset-versioning problem that would have dogged us to the end.

- **Three files became god-classes.** `monsters.js` (2082 L), `towers.js` (1281 L), `ui.js` (934 L) started attracting every new feature because "that's where tower-related code lives". Parallel PRs started colliding weekly. We did the v1.4 → v2.0 refactor in a dedicated sprint (detailed in *Implementation*), after which conflicts effectively stopped.

- **Balance drift.** Adding a new tower or enemy could silently break the tuning of a distant level. We responded by extracting all balance values into `data/` and later adding unit tests that assert *shape* invariants (every boss singleton uses the `interval=9999` sentinel; `startCoins` are strictly decreasing across levels). These are cheap tests that would catch 80 % of accidental balance regressions.

- **Underestimating onboarding.** Round-1 playtesters didn't understand the economy loop. We added a five-step Level-1 tutorial, tooltip prose, and the `BALLS → COINS` settlement card. The fix was narrative, not mechanical.

### What worked

- **One owner per module.** Zero "who was supposed to do this?" moments.
- **Zero-build tech stack.** New contributors were productive within an hour.
- **Script load order as the dependency graph.** A single file (`index.html`) makes the dependency DAG grep-able.
- **Live Pages preview per merge.** We could share a URL with a playtester within minutes of a merge.
- **Honest retros.** We kept a short retro every workshop ("one thing going well, one thing blocked"). That's how we caught the art-pipeline problem early enough to pivot.

---

## Sustainability, Ethics & Accessibility

We applied the **Sustainability Awareness Framework (SusAF)** to Quantum Drop after the v2.0 refactor: by then the architecture was stable enough that we could ask "what trade-offs are we *actually* shipping?" rather than projecting onto a moving target. The dimensions below cover the build as it stands in v2.1 — what holds up, where we cut corners, and what a v2.2 would prioritise.

```mermaid
---
config:
  themeVariables:
    cScale0: "#10B981"
    cScale1: "#EF4444"
---
radar-beta
  title Quantum Drop — Sustainability profile (v2.1)
  axis s["Social"], i["Individual"], v["Environmental"], c["Economic"], t["Technical"]
  curve a["Opportunities"]{4, 3, 3, 5, 5}
  curve b["Risks"]{2, 4, 4, 1, 2}

  max 5
  min 0
```

> *SusAD-style summary: green lobe = positive opportunities, red lobe = negative risks, both scored 0–5 from the prose below. Strongest in Economic (£0 stack) and Technical (refactor + tests); biggest gaps in Individual (no a11y panel yet) and Environmental (29 MB BGM payload). [Static fallback render](docs/screenshots/sus-radar.png) · [source](docs/screenshots/sus-radar.mmd)*

### Approach

Quantum Drop is a single-player **zero-build static site**: one `index.html`, a stack of `<script>` tags, no backend, no account system, no telemetry. State lives in four `localStorage` keys (`qd_lang`, `qd_muted`, `qd_perf`, `qd_tutorial_l1_done`) plus the unlocked-level number, all readable in the browser DevTools. That tech stance is the spine of every dimension below — it constrains what we *can* break (no servers to topple) and what we *can't* fix without changing platform (no native screen-reader access into a `<canvas>`).

### Social

- **Bilingual UI (EN / 中文)** with a launch-screen toggle persisted in `localStorage['qd_lang']`. Caches that store rendered text include `currentLang` in their signature, so a runtime switch invalidates them correctly. This roughly doubles who can play unaided.
- **Procedural cyberpunk aesthetic** is deliberately *not* tied to a real-world place — there is no equivalent of Group 14's London-landmark framing. It costs us specificity but removes a class of representation risk we'd rather not navigate.
- **Round-2 playtesters were strangers** drawn from each member's outside network (university friends, family) — every member ran one session, so design decisions reflect more than the team's own taste.
- *Gap:* the difficulty curve is calibrated for tower-defence-literate players. Sectors 4–5 stay hard for first-time TD players even on Easy.

### Individual (player wellbeing)

- **Pause menu** (`ui/pause.js`) interrupts at any frame and restores phase + frame counter — players in distraction-prone settings can stop without losing progress.
- **Difficulty toggle** (Easy / Difficult) widens the skill range we accommodate (Easy gives 1.3× starting credits and 30 base HP vs. 20).
- **First-run tutorial** is a five-step overlay; it is *informational, not forced* — once dismissed, returning players never see it again, persisted via `localStorage['qd_tutorial_l1_done']`.
- **No engagement-maximisation patterns**: no streaks, no daily login rewards, no FOMO timers, no IAP, no notifications, no ads.
- *Gap:* no accessibility settings UI yet. Colour-blind palettes for tower range rings, a high-contrast theme, dyslexia-friendly font option, and keyboard-only input are tracked in the future-work list — none are shipped in v2.1.

### Ethics

- **Zero analytics, zero telemetry, zero tracking.** We grepped the source for the usual suspects (`gtag`, `ga(`, Sentry, Mixpanel, Amplitude, Matomo) and found nothing. The browser network tab during a full playthrough shows only the static asset fetches.
- **No PII collected.** We do not even ask for a name. Highest-unlocked-level is the only progression record, stored locally in the browser.
- **Asset provenance.** Every monster, tower, projectile, particle and background is generated procedurally in JS — there is no visual-asset library to trace. The audio layer (6 BGM tracks + 5 SFX) is the only third-party material; `assert/audio/README.txt` lists where each track is used, but a per-track source attribution is still on the to-do list (called out in *Future actions* below).
- **Open licence.** [MIT](LICENSE) — anyone can fork, modify, redistribute.
- *Gap:* there is no in-game text explaining what `localStorage` keys are written, and no "Delete save data" button. Both are 30-minute fixes deferred to v2.2.

### Environmental

The dominant cost is asset weight, not compute:

| Asset class | Bytes (gzipped over the wire is similar — JPG/MP3 are already compressed) |
|---|---:|
| **BGM** (`assert/audio/bgm/*.mp3`, 6 tracks) | **~25.5 MB** |
| **SFX** (`assert/audio/sfx/*`, 5 files) | ~2.6 MB |
| Background art (`assert/*.png`, 1 file) | ~700 KB |
| Source code (`*.js`) | ~150 KB |
| **Total** | **~29 MB initial load** |

Because there are no sprites — every entity is drawn from primitives — the visual layer is essentially free at rest and only costs CPU when on screen. Object pooling, a `MAX_PARTICLES = 400` cap, and an HUD-text cache keep the per-frame budget flat: a Level-5 final wave sustains ~58 FPS on a 2020 M1 Air. We do not run a per-frame `redraw` when no UI state has changed inside menus.

*Gap:* a 25 MB BGM payload on first load is more than the rest of the build combined. The level-1 BGM loads eagerly so players hear something during the launch screen; levels 2–5 also currently preload. Lazy-loading levels 2–5 alongside their map data would cut first-load to ~10 MB without changing UX.

### Economic

- **Hosting cost: £0.** GitHub Pages serves the build for free as long as the repo is public, with no egress charge for the bandwidth Quantum Drop consumes.
- **Toolchain cost: £0.** No build step, no npm install required to *run* (only to test); both the game and the test runner read the same source files.
- **Operational cost: £0.** Zero servers, zero storage tier, zero account database. A new contributor's day-one cost is "install VS Code + Live Server".
- *Risk:* this depends on GitHub Pages staying free for student org repos and on `p5.js` continuing as an active project. Neither is in our control. A migration plan would be: copy `docs/Game_v2.1/` to any static host, change zero lines of code.

### Technical

The v1.4 → v2.0 refactor *was* the technical-sustainability deliverable:

- **Single source of truth for state** (`state.js`) — every shared global is declared once, with a comment saying who owns mutations.
- **Data tables separated from logic** (`data/towers.js`, `data/waves.js`, `data/levels.js`) — balance changes never touch combat code.
- **Concern-oriented modules** (`monsters/`, `towers/`, `ui/`, `screens/`) — six contributors can work in parallel without merge collisions on common files.
- **48 `node:test` cases** as a regression fence on every data-table edit (`npm test`, no install).
- **Mermaid architecture diagrams in the README** — they live next to the prose, diff cleanly when something changes, and never go out of sync with a separate diagram file.

*Gap:* tuning numbers are centralised but spread across three `data/` files; a unified balance dashboard (or even a printed cheat-sheet) would help maintainers reason about cross-level effects. Visual regression remains manual — a canvas-hash test per fixed frame is on the future-work list.

### Future actions summary

The highest-leverage v2.2 sustainability work, ordered by ROI:

1. **Lazy-load BGM** for levels 2–5 — single biggest first-load reduction (~15 MB saved).
2. **Accessibility settings panel** — colour-blind palette, high-contrast theme, larger-font option, keyboard-only input.
3. **In-game privacy text + "Delete save data" button** — closes the only remaining ethics gap.
4. **Mobile / touch layout** — opens the game to a hardware class we currently exclude.
5. **Audio-track credits** surfaced in-game (currently only in `README.txt`).

Quantum Drop's strongest sustainability wins come from saying *no* to things we never built — no accounts, no servers, no analytics, no asset pipeline. The remaining work is mostly about **explicit accommodation** (accessibility) and **honest disclosure** (privacy text), not about undoing structural choices.

---

## Conclusion

Over ten weeks we built, refactored, and shipped **Quantum Drop**: five playable levels, eight tower variants, ten enemy types (three bosses), a full ball-drop economy minigame, a first-run tutorial, bilingual UI (English + 中文), sound, a responsive canvas, a performance HUD, and a 48-case automated test suite. The game runs as a zero-build static site and is live on GitHub Pages.

### Lessons learnt

The most valuable lesson was **prefer information design to new features**. By v1.4 the mechanical systems were sound, but players could not read the causal chain between the minigame and the tower economy. Two weeks of late-stage work on tutorial, tooltips, and settlement visuals moved the player-comprehension bar more than any feature we could have added in the same time. Playtesting with four strangers per round was an order of magnitude more useful than playtesting within the team.

The second lesson was **pay down technical debt before it compounds**. The v1.4 god-files were a known problem for two weeks before we acted; we kept patching around them because the refactor felt expensive. By the time it became unavoidable, parallel work was already being serialised on merge conflicts. Next time, we would schedule a "refactor sprint" as a standing possibility the moment a single file crosses ~800 lines or blocks two concurrent PRs.

The third lesson was **constraints often liberate**. The zero-build, no-sprite-sheet, shared-global-scope stack looked limiting in Week 2 and turned out to be a quiet superpower. No build meant zero toolchain-debugging time; no sprites meant our aesthetic couldn't fracture across six contributors; shared globals meant the load-order in `index.html` became a trivially legible dependency graph. Accept the constraint, then engineer within it.

### Challenges

Three challenges stand out in retrospect — one for each of the three project axes (scope, code, comprehension):

- **Scope control** was the hardest *non-technical* challenge. Everyone wanted to add their favourite mechanic, and saying no to a teammate is uncomfortable. We answered with the MoSCoW list and a strict "nothing new after week 8" rule. Both held; the *Won't (this term)* items became the basis of the future-work list rather than late-stage scope creep.
- **Merge conflicts on the god-files** were the hardest *technical* challenge until the refactor — for two weeks they serialised parallel work and burned a workshop on triage. The v1.4 → v2.0 refactor (Implementation §2) made them stop almost overnight.
- **Player comprehension** was the hardest *design* challenge: the mechanical systems were correct in v1.4 but unreadable to a first-time player. The fix was narrative rather than mechanical (tutorial, settlement card, plain-English tooltips), and only became visible after the round-1 playtest forced us to look at the game through fresh eyes.

Performance, by contrast, was the *easiest* challenge: object pooling, text caching, and an eager `pathCellSet` kept us at vsync for the entire combat layer with very little late-stage tuning needed.

### Future work — immediate next steps for the current game

1. **Per-level star rating and best-time persistence** (localStorage key reserved; UI not yet built).
2. **Scripted tutorial interactions** — have the onboarding actually force a first build instead of describing one.
3. **Accessibility audit** — colour-blind palettes for the tower range rings; keyboard-only play; increased font sizes as an option.
4. **Mobile touch support** — `mouseX/mouseY` already works for taps; the bottleneck is the build menu sizing on narrow screens.
5. **Automated visual regression** — currently a manual check per level; a simple canvas-hash test per fixed frame would catch most rendering regressions cheaply.

### Future work — if we had a sequel

We would explore three directions. **Persistent meta-progression**: unlocks that carry across runs (a roguelite layer on top of the current level-select), so that a run that ends in defeat still contributes to a long-horizon goal. **Authored minigame boards**: right now gate boards are procedural; curated boards that are paired to a specific wave's threat profile would let us tell a tighter mechanical story ("this wave has armoured mechs — the pre-wave board gives you more `×2` gates so you can afford a Chain Arc"). **Co-op**: two players sharing an economy but owning separate halves of the map. The underlying state model is already a phase state machine over a single shared coin counter, so the engineering risk is bounded — the design risk (how do two players trade off economy vs defence without arguing?) is much more interesting and would be the main research question.

Quantum Drop proved that a six-person team, a ten-week timeline, and p5.js can produce a game that is both technically coherent and fun to demo. Every member touched every stage of the stack — from data tables, through physics, through visual polish, through testing — which was the real point of the module.

---

## Team

![Group 23](workshop/week01/微信图片_20260129151517_145.jpg)

| GitHub | Name | Email | Primary role | Secondary / cross-cutting |
|---|---|---|---|---|
| [@ycy-code](https://github.com/ycy-code) | Yu Chengyin | si25962@bristol.ac.uk | Mini-game physics — ball motion, collisions, settlement | Audio integration, launch / end screen polish |
| [@zhuqihao7-tech](https://github.com/zhuqihao7-tech) | Zhu Qihao | iy25847@bristol.ac.uk | Mini-game gate layout — random generation, payout math | Level economy tuning (`data/levels.js`) |
| [@ZhangZhenyu718](https://github.com/ZhangZhenyu718) | Zhang Zhenyu | pv25243@bristol.ac.uk | Tower combat — attack, skills, projectile management | Performance profiling (perf HUD, CANNON optimisation) |
| [@zhangxun88](https://github.com/zhangxun88) | Zhang Xun | hg25695@bristol.ac.uk | Monsters & path system — spawn, movement, wave control | Boss AI, wave-data balancing |
| [@Che-L](https://github.com/Che-L) | Liu Bowen | jt25343@bristol.ac.uk | Map layout & tower placement — cell logic, placement | HUD/tooltip/wave-preview caches, `pathCellSet` |
| [@bruce5800](https://github.com/bruce5800) | Li Zhuolun | nu25406@bristol.ac.uk | UI & state integration — `ui/`, `screens/`, `state.js` | v2.0 refactor coordination, tutorial, i18n, test harness |

Roles settled in Week 5 (`workshop/week05/LabourDivision.md`) and stayed stable through the rest of the project. We avoided "everybody does a bit of everything" because with six people it produces chaos; instead each module had a single clear owner and at least one reviewer.

---

## Build & test (developers)

### Run the game locally

Requirements:
- [Visual Studio Code](https://code.visualstudio.com/)
- VS Code extension: **Live Server**

```text
1. File → Open Folder → select this repo
2. Right-click  docs/Game_v2.1/index.html
3. Choose       Open with Live Server
4. Browser opens at http://127.0.0.1:5500
```

> 💡 **Save reloads automatically.** `Ctrl+S` reloads the browser; no rebuild needed.
> 💡 **Quick-test all levels.** Click `DEV: ALL LEVELS` in the bottom-right of the launch screen.
> 💡 **Perf HUD.** Press `F` in-game for a live FPS / entity-count overlay.
> 💡 **Codex.** Open `codex.html` (right-click → *Open with Live Server*) for a grid preview of every monster + tower with switchable path shapes.

### Run the unit tests

The **game** is zero-build, but we ship 48 `node:test` cases for the pure-data configs and pure-logic helpers — no `npm install` needed.

Requirements:
- Node.js ≥ 18 (ships with `node:test` and `node:assert`)

```bash
npm test
# or, equivalently
node --test tests/*.test.js
```

How it works in one paragraph: `tests/helpers/load.js` builds a `vm.createContext` sandbox that stubs p5 math helpers and `localStorage`, runs the requested source files into the sandbox in script-tag order, then promotes their top-level `const`/`let` bindings onto `globalThis`. Tests reach them via `ctx.TOWER_DEFS`, `ctx.t(…)`, `ctx.isCellBuildable(…)` — the browser game and the test runner read the **same unchanged files**.

---

## Reference appendix

### Game flow

```
Launch Screen
  → Difficulty Select  [EASY / DIFFICULT]
    → Level Map        [Choose Level 1–5]
      → Gameplay
          Ball-drop Minigame → Build Phase → Combat → Next Wave...
      → End Panel  [Victory / Defeat]
          → RETRY / STAGES / NEXT LEVEL
```

### Levels

| Level | Name | Theme | Waves | Starting credits | Notes |
|---|---|---|---:|---:|---|
| 1 | SECTOR ALPHA | Grassland | 6 | ¥2000 | Beginner — simple paths, infantry-focused |
| 2 | NEBULA RIFT | Ice Nebula | 7 | ¥1800 | Dual-lane, aerial enemies introduced |
| 3 | IRON CITADEL | Inferno | 8 | ¥1600 | Complex terrain, armoured enemies, first Boss |
| 4 | VOID MAZE | Void | 9 | ¥1400 | Winding paths, high-speed enemy waves |
| 5 | OMEGA GATE | Scorched Ruins | 10 | ¥1200 | Final level — elite forces + all three Bosses |

> EASY: starting credits ×1.3, base HP = 30. DIFFICULT: credits as listed, base HP = 20.

### Towers

| Tower | Label | Cost | Description | Max Level |
|---|---|---:|---|---:|
| Rapid Fire | `RAPID` | ¥110 | High-frequency single target; ignores Robot shield; 20-charge super-gun mode | Lv3 |
| Laser Cutter | `LASER` | ¥180 | Charges then fires at multiple targets simultaneously (Lv1 → Lv3: 1 → 3 targets) | Lv3 |
| Nova Cannon | `NOVA` | ¥200 | Piercing shot through all ground enemies; area explosion on impact | Lv3 |
| Chain Arc | `CHAIN` | ¥160 | Chain lightning (Lv1 → Lv3: 1 → 3 jumps); ignores Tank barrier | Lv3 |
| Magnet Tower | `MAGNET` | ¥130 | No damage; continuously slows nearby enemies (up to 80 % at Lv3) | Lv3 |
| Ghost Missile | `GHOST` | ¥190 | Homing missiles (Lv1 → Lv3: 1 → 3); near-full-map range | Lv3 |
| Scatter Cannon | `SCATTER` | ¥150 | Shotgun spread targeting aerial units only (Lv1 → Lv3: 3 → 7 pellets) | Lv3 |
| Rail Cannon | `CANNON` | ¥220 | Manual-aim rail cannon; massive single-shot damage with long reload | Lv3 |

> Each tower upgrades up to **3 times**. Demolishing refunds **80 %** of the original build cost.

### Enemies

| Enemy | Lane | Special ability |
|---|---|---|
| Mech Snake | Main | Group heal every 900 frames |
| Mech Spider | Edge | Periodic dash (3.5× speed for 20 frames) |
| Armoured Tank | Main | Barrier shield — only Chain Arc can pierce |
| Robot | Main | Shield triggers at 60 % HP — Rapid Fire ignores it |
| Mech Phoenix | Air | Jamming pulse — disables all towers for 90 frames |
| Ghost Bird | Air | High-speed flyer — only anti-air towers can target |
| Steel Carrier | Main | Massive HP, very slow |
| Boss① Fission Core | Main | Overload burst; splits into 4 Mech Snakes at 50 % HP |
| Boss② Phantom Protocol | Main | Quantum dodge every 3 hits; EMP disables towers; spawns 2 clones at 30 % HP |
| Boss③ Ant-Mech | Main | Alternates Giant (−85 % dmg taken) ↔ Tiny (×2.2 dmg taken); Berserk at 50 % HP |

### Ball-drop mini-game

Triggered automatically before each wave:

1. **Aim phase** — move the mouse to choose a launch X, then click to confirm.
2. **Drop phase** — balls fall under gravity through gates that modify their count:
   - `+N` gate adds N balls
   - `−N` gate removes N balls
   - `×N` gate multiplies the count by N
3. **Settlement** — the final ball count is converted into coins for the upcoming wave.

### Source-tree reference

```
2026-group-23/
├── docs/
│   ├── Game_v0.3/            # legacy
│   ├── Game_v1.3/            # legacy
│   ├── Game_v1.4/            # legacy (pre-refactor)
│   └── Game_v2.1/            # current shipping build
│       ├── index.html        # script load order — DO NOT REORDER
│       ├── sketch.js         # p5 entry: setup(), draw(), phase router
│       ├── state.js          # all mutable globals
│       ├── audio.js          # HTMLAudio wrapper + mute toggle
│       ├── data/             # pure config (TOWER_DEFS, WAVE_CONFIGS, LEVEL_INFO)
│       ├── map/              # paths + per-level backgrounds
│       ├── monsters/         # base + mobs/* + bosses/* + manager
│       ├── towers/           # base + variants/* (prototype-injected) + manager
│       ├── ui/               # hud + pause + build-menu + tower-panel + placement
│       ├── screens/          # launch + difficulty + level-map + end-panel
│       ├── minigame.js       # ball-drop economy
│       ├── waves.js          # wave state machine
│       └── tutorial.js       # first-run overlay
├── tests/                    # 48 node:test cases (zero-install)
├── video/                    # demo video, slides, speaker scripts
├── workshop/                 # weekly artefacts (week01 … week10)
├── DESIGN.md                 # design decisions (companion document)
├── REPORT.md                 # canonical report (mirror of this README's report section)
└── README.md                 # ← you are here
```

> **Important:** The script load order in `docs/Game_v2.1/index.html` must not be changed — later files depend on earlier ones.

### Key APIs

```js
// Coins
coins += n;   // Gain
coins -= n;   // Spend (always check coins >= cost first)

// Monster manager
manager.monsters                                      // Array of all active monsters
manager.getMonstersInRange(cx, cy, range, antiAir)    // Range query
manager.damageAt(x, y, dmg, antiAir, fromSide)        // Point damage
manager.damageInRadius(cx, cy, radius, dmg, antiAir)  // AoE damage

// Map / placement
isCellBuildable(gx, gy)   // false if cell is path / HUD / occupied
initMap()                  // Load path + background for currentLevel

// Phase transitions
gamePhase = 'playing';
initGame();                // initialise based on currentLevel + gameDifficulty

// Tower jam (e.g. Phoenix EMP)
jammedUntilFrame = frameCount + duration;  // disable all towers for `duration` frames
```

### Globals (`state.js`)

| Variable | Description | Default |
|---|---|---|
| `CELL_SIZE` | Pixels per grid cell | `70` |
| `GRID_COLS` / `GRID_ROWS` | Map dimensions | `14` / `12` |
| `HUD_HEIGHT` | Top HUD bar (px) | `46` |
| `coins` | Current coins | Set by level + difficulty |
| `baseHp` / `baseHpMax` | Current / max base HP | EASY 30, DIFFICULT 20 |
| `waveNum` / `TOTAL_WAVES` | Current / total waves | Per level (6–10) |
| `COUNTDOWN_FRAMES` | Frames between waves | `300` (5 s) |
| `currentLevel` / `unlockedLevel` | Active / highest unlocked level | `1` / `1` |
| `gameDifficulty` | `'easy'` / `'difficult'` | `'easy'` |
| `gamePhase` | `'launch'` / `'difficulty'` / `'levelmap'` / `'playing'` / `'endpanel'` | `'launch'` |
| `jammedUntilFrame` | Frame at which jam ends | `0` |
| `tutorialActive` / `tutorialStep` | First-run Level-1 tutorial state | `false` / `0` |

---

## Acknowledgements

Built for **COMSM0166 — Software Engineering Discipline & Practice** at the University of Bristol, 2025-26. Thanks to the course staff for the brief and the eight playtesters who shaped the late-stage work.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
