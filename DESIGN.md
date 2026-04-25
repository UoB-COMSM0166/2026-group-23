# Design Decisions — Quantum Drop

> Companion document to `README.md`. This file records **why** the project
> looks the way it does — the trade-offs we considered and the reasons we
> picked one option over another. Intended for readers (including the grader)
> who want to understand the engineering reasoning, not just the final result.

---

## 1. Gameplay Concept

### 1.1 Tower Defense × Ball-Drop Minigame

We combined two genres that normally live in separate games:

- **Tower defense** gives long-horizon strategy (build placement, upgrade
  timing, resource management).
- **Ball-drop minigame** — think "Plinko + multiplier gates" — gives a
  short, tactile, luck-vs-aim moment before every wave.

**Why mix them?**
Pure tower defense can feel passive between waves. Adding a skill-based
minigame for the *economy* means the player is always engaged: even when
the battlefield is empty, they are actively earning coins by aiming and
watching physics. The two halves also reinforce each other — a lucky run
in the minigame feeds a better tower composition, which lets the player
survive a harder wave, which feeds back into the next minigame.

**Alternatives we considered:**
- Passive interest on idle coins (simpler but unengaging).
- A card-draft between waves (adds decision fatigue).
- Wave kill bounties only (standard TD — we wanted something more novel).

---

## 2. Technology Stack

### 2.1 Why p5.js and no build system?

- **Course constraint:** The module `COMSM0166` expects a self-hosted
  browser-runnable artefact. Zero build steps = one-click grading.
- **Team size:** Six people, varying levels of JS experience. A build
  pipeline (webpack / vite / TS) would have cost more team onboarding time
  than it saved.
- **GitHub Pages deploy:** Static file hosting works out of the box.

**Cost of this choice:** All source files share a single global scope.
We mitigated this by (1) namespacing with consistent prefixes
(`TOWER_DEFS`, `LEVEL_INFO`, `_hudSig`), (2) centralising mutable state
in `state.js`, and (3) making script load order in `index.html` the
single source of truth for dependency order.

### 2.2 Why all-code animations instead of sprite sheets?

The initial plan (inherited from `v0.3`) used sprite sheets. Mid-project
we switched to **fully programmatic JS animations** (particles, glow,
pulse, rotation, beams).

**Reasons for the switch:**
- **Visual consistency:** Six people producing pixel art in parallel
  resulted in mismatched styles. Generating visuals from code enforces
  a unified cyberpunk/neon aesthetic across every entity.
- **Asset-pipeline cost:** Sprite sheets require sizing, packing, and
  versioning. Code animations live in the same git diff as the logic.
- **Emphasis on programming:** As a CS coursework, procedural animation
  shows more computational thinking than frame-counting.

**Cost:** Programmatic animation requires more math (easing, polar
coordinates, trig for hexagon rings) and more careful performance
tuning than blitting sprites.

---

## 3. Architecture & Refactor

### 3.1 The v1.4 → v2.0 Refactor

By the end of v1.4 three files had become god-classes:

| File | Lines | Problems |
|------|------:|----------|
| `monsters.js` | 2082 | 10 entity classes + manager + particles + Boss AI all mixed |
| `towers.js`   | 1281 | 8 tower variants, all `if/else` branches inside one class |
| `ui.js`       |  934 | HUD + pause + build menu + tower panel + placement all in one |

We rewrote the project layout in `v2.0`:

```
data/      pure configuration (towers, waves, levels)
state.js   all mutable globals in one declaration file
monsters/  core.js + mobs/*.js + bosses/*.js + manager.js
towers/    base.js + variants/*.js + projectile.js + effects.js + manager.js
ui/        common.js + hud.js + pause.js + wave-ui.js + build-menu.js + ...
screens/   launch / difficulty / level-map / end-panel
```

No gameplay behaviour changed — this was a **pure refactor**, verified
by manually running all 5 levels before and after.

### 3.2 Why prototype extension for tower variants?

For the tower split we chose `Tower.prototype._updateRapid = function(){...}`
rather than `class RapidTower extends Tower {...}`.

**Why:** The call sites `new Tower(gx, gy, 'rapid')` were everywhere
(placement, upgrade, demolish, save/load). Switching to subclasses would
have required a factory function and rewriting all those call sites,
creating regression risk in code we hadn't touched. Prototype extension
lets us split the behaviour into 8 files **without changing any caller**.

**Trade-off:** We give up `instanceof RapidTower` checks. We don't need
those — `tower.type === 'rapid'` is the dispatch key throughout the
code. In a future refactor with more time, subclassing would be cleaner.

### 3.3 Why "centralise declarations" (Option B) for state?

When consolidating globals, we had two options:
- **A — Full namespacing:** `Game.state.coins`, requires rewriting every
  call site.
- **B — Centralise declarations only:** Move `let coins = 2000` etc. into
  `state.js`; every `coins += reward` elsewhere keeps working unchanged.

We chose B. The goal was *traceability* (any reader can open `state.js`
and see the complete set of mutable globals), not *encapsulation*
(which would require the larger rewrite).

---

## 4. User Experience

### 4.1 First-run Tutorial (Level 1 only)

A 5-step overlay that runs the first time a player enters Level 1, with
highlight boxes over the HUD and build menu. Completion is persisted in
`localStorage['qd_tutorial_l1_done']`; the user can also skip.

**Why level 1 only:** Returning players don't need it. Level 2+ assumes
the mechanics are understood.

**Why overlay instead of interactive scripted play:** A scripted forced
sequence (e.g. "click this tower now") breaks immersion and is harder to
maintain when tower stats change. An informational overlay gives the
same knowledge transfer at a fraction of the code cost.

### 4.2 Internationalisation (i18n)

Default **English**, with a toggle to 中文 on the launch screen.
Persisted in `localStorage['qd_lang']`.

**Why runtime `t(key)` instead of a build-time static replacement:**
- p5.js has no build step; a preprocessor would have broken our
  zero-tooling promise.
- Players can switch on the fly without reloading.
- Team members can contribute translations to one file in parallel.

**Implementation:** `i18n.js` exports `I18N = { en: {...}, zh: {...} }`
and `t(key, ...args)`. Missing keys fall back `zh → en → key itself`,
which makes untranslated strings immediately visible during development.
Caches that store rendered strings (HUD cache, tower tooltip cache,
wave-preview cache) include `currentLang` in their signatures so a
language switch invalidates them.

**Scope decision:** We translate descriptive text and UI buttons, but
keep short stylised codes (`RAPID`, `LASER`, `SECTOR ALPHA`, `THREAT`)
in English. This matches how other sci-fi games treat codes vs. prose.

### 4.3 Level-map description cards

In v1.4 the level description was rendered in a fixed panel on the side
of the screen. In v2.0 we anchored it **next to each level node**, with
a connecting line. This removes the "which level is this describing?"
ambiguity when the player hovers between levels.

---

## 5. Performance

### 5.1 The Perf HUD as the diagnostic tool

We built a small in-game overlay (`ui/perf-hud.js`, toggled by **F**) that
samples `deltaTime` into a 60-frame ring buffer (`Float32Array(60)`) and
prints, refreshed every 0.5s:

- **average FPS** (colour-graded: green ≥55, yellow ≥40, red <40),
- **min FPS** (worst frame in the sliding window),
- **counts**: monsters / towers / projectiles / particles /
  cannon-blasts / mortar-shells / chain-arcs.

The HUD costs nothing when off — the function returns on the first line
if `showPerfHud === false`. Its sole purpose is to make slowdowns
**numerically reproducible** so we can decide *where* to optimise, rather
than guess. The setting persists in `localStorage['qd_perf']` so a
debugging session survives a refresh.

### 5.2 Measured frame rate

Numbers below were taken on a 2020 M1 MacBook Air, Chrome 131, no CPU
throttling. Each row is the average over a 10-second window during the
named scenario.

| Scenario                                      | Monsters | Towers | Projectiles | Avg FPS | Min FPS |
|-----------------------------------------------|---------:|-------:|------------:|--------:|--------:|
| Level 1 wave 3 (baseline)                     |       12 |      5 |          ~8 |      60 |      59 |
| Level 3 wave 6 (mid-complexity, first boss)   |       28 |     11 |         ~25 |      60 |      58 |
| Level 5 final wave (worst case)               |       45 |     16 |         ~60 |    58.7 |      52 |
| Level 5 final wave + Boss3 Berserk            |       45 |     16 |         ~85 |    54.2 |      47 |
| Level 5 final wave + ≥5 CANNON volley         |       45 |     16+ |     ~120 + 500 particles |    52.1 |      41 |

The last row exposed the only sustained drop below vsync we have left,
and motivated section 5.4.

### 5.3 Hot paths we profiled and optimised

These are the four optimisations that mattered, in order of impact:

1. **HUD text caching** (`ui/common.js::_hudSig`).
   Re-rendering `text()` is, by a wide margin, the hottest single
   p5 call in our build. The HUD redrew every frame because *some*
   field (e.g. coin counter, wave timer) changed every frame. We
   key the cached string on
   `(coins, baseHp, waveNum, floor(frameCount/30), currentLang)` and
   skip the re-layout when the signature is unchanged. This alone
   moved Level 5 from ~50 → ~58 FPS.

2. **Tower tooltip cache** (`ui/build-menu.js`, `ui/tower-panel.js`).
   The build menu tooltip used to lay out 6–10 lines of stat text
   every frame the cursor hovered. Now it caches the rendered text
   block keyed on `(towerType, level, currentLang)` and reuses it
   until the key changes.

3. **Wave-preview cache** (`ui/wave-ui.js`).
   The "next wave" preview panel used to iterate `WAVE_CONFIGS`
   every frame. Now it caches the formatted preview keyed on
   `(currentLevel, waveNum, currentLang)`.

4. **`pathCellSet` build-once cache** (`map/map-core.js`).
   Tower placement validity used to do a nested loop over the path
   on every cursor move. `initPathCells()` now bakes a `Set<string>`
   of `"gx,gy"` keys at level load and `isCellBuildable()` becomes
   O(1) lookup. Visible benefit: the build phase is responsive even
   while the player drags the cursor across the whole map.

### 5.4 The CANNON-volley regression and its fix

Live testing revealed that **5+ CANNON towers firing in a window of
~1 second produced a 5–10 FPS dip**. The Perf HUD made the cause
obvious — the `FX:` (particles) counter would briefly spike to ~500.

Three patches landed together (commit `c19c16e`):

- **`MAX_PARTICLES = 400` hard cap** in `spawnParticles`.
  When the budget is exhausted, additional particles for the same
  burst are simply not emitted. Visually imperceptible at 400; the
  largest single explosion only wants ~30.
- **Pre-resolved colour fields**. The particle struct used to store
  the p5 `color` object and `updateParticles` re-parsed it via
  `red(p.col), green(p.col), blue(p.col)` *every frame for every
  particle*. We now store `r,g,b` integers directly. With 400
  particles on screen this removes ~1200 colour-accessor calls per
  frame.
- **CANNON explosion particle reduction** in
  `towers/projectile.js`: per-hit splash `8 → 4`, central burst
  `30 → 15`. The visual difference is genuinely imperceptible;
  the cumulative-load difference for a 5-shell volley is ~150
  fewer particles allocated.

After the fix, the same 5-CANNON volley scenario runs at a steady
60 FPS with `FX:` peaking around 200. The pattern (cap + pre-resolve
+ tune emit count) is now our default approach if a new effect
introduces a similar spike.

### 5.5 Systems we deliberately budgeted

Beyond the four hot paths above, three implementation patterns are
followed everywhere we have an "every-frame loop":

- **Object pooling, no in-loop splice.** Balls, particles and
  projectiles use `alive = false` + a single sweep
  `arr = arr.filter(x => x.alive)` per frame. Splicing inside an
  iteration is the kind of accidental quadratic cost that compounds
  invisibly until a big wave reveals it.
- **Pre-resolve any string / colour / signature** that will be used
  in a tight loop. (Same idea as the particle fix above —
  generalised.)
- **Cache by signature, not by frame count.** Caches that invalidate
  on `frame % N` race against the data they cache; caches that
  invalidate on a real signature (`(coins, hp, wave, lang)`) are
  always in sync.

The remaining identified-but-unfixed item is **CANNON turret
per-frame draw cost** (~30 primitives per cannon, persistent). It
is not currently a bottleneck; if a future level needed many more
cannons, the planned mitigation is a simple LOD: when
`towers.filter(t => t.type === 'cannon').length > 4`, draw the
rotating aura as a static ring. We did not ship this because the
case never arises in the shipped levels.

---

## 6. Team Workflow

### 6.1 Module ownership and shared work

Six contributors, with a single primary owner per module so that
"who is responsible for this?" was always answerable in seconds.
The split was not about isolation — every member also had a
**secondary area** (cross-cutting work) so that load stayed even
across the term and so that no module had a single point of
failure if its owner was busy in a given week.

| Member            | Primary module                                    | Secondary / cross-cutting contribution                          |
|-------------------|---------------------------------------------------|-----------------------------------------------------------------|
| **Yu Chengyin**   | Minigame physics (`minigame.js` ball system)      | Audio integration (`audio.js`), launch / end screen polish      |
| **Zhu Qihao**     | Minigame gate layout & coin balancing             | Level economy tuning (`data/levels.js` start coins, payout target) |
| **Zhang Zhenyu**  | Tower combat logic (`towers/variants/*.js`)       | **Performance profiling** (perf HUD design, CANNON optimisation) |
| **Zhang Xun**     | Monsters & path system (`monsters/`, `waves.js`)  | Boss AI for the three boss encounters; wave-data balancing       |
| **Liu Bowen**     | Map layout & tower placement (`map/`, `ui/placement.js`) | **Performance profiling** (HUD / tooltip / wave-preview caches), `pathCellSet` cache |
| **Li Zhuolun**    | UI & state integration (`ui/`, `screens/`, `state.js`) | v2.0 refactor coordination, first-run tutorial, i18n scaffold, unit-test harness |

Cross-cutting work was split deliberately:

- **The v1.4 → v2.0 refactor** was scoped by Li Zhuolun but executed
  collectively over one workshop and the following week. Each owner
  migrated their own module into the new layout — Zhang Xun pulled
  monsters into `monsters/`, Zhang Zhenyu pulled towers into
  `towers/`, Liu Bowen split `ui.js` together with Li Zhuolun. The
  pure-data extraction into `data/` was a joint review.
- **i18n** was scaffolded by Li Zhuolun; **all six members translated
  the keys touching their own module**, which is why the EN/中 string
  tables stayed in sync without one person owning translation.
- **Performance work** (section 5) was a two-person rotation:
  Liu Bowen wrote the four cache layers (HUD / tooltip /
  wave-preview / `pathCellSet`); Zhang Zhenyu designed the perf HUD
  and led the CANNON-volley diagnosis and patch.
- **Playtesting and unit tests** were team-wide. Each member ran
  the Round-2 playtest with one external tester from their own
  network; Li Zhuolun consolidated the testing harness and authored
  the 48-case `node:test` suite, but the data-table tests were
  reviewed and added to by each module's owner.

### 6.2 Tools

| Tool                       | Used for                                                 |
|----------------------------|----------------------------------------------------------|
| **GitHub** (private repo)  | Source hosting; each merge to `main` auto-publishes via GitHub Pages, so every PR produces a shareable URL within a minute |
| **VS Code + Live Server**  | Shared development environment — zero-setup for new contributors; a save reloads the browser instantly |
| **p5.js Web Editor**       | One-off prototypes (the original Plinko sketch and several boss-AI sketches were prototyped here before being copied in) |
| **draw.io**                | Class and sequence diagrams (`workshop/week05/*.xml`)   |
| **WeChat group**           | Day-to-day async coordination, screenshots of bugs, voice notes for design discussion |
| **Weekly workshop (Wed)**  | Synchronous demo, blocker triage, retrospective         |
| **Node.js `node:test`**    | The unit-test suite — chosen specifically because it has zero install, matching the game's zero-build promise |

### 6.3 Git workflow

We used **trunk-based development with short-lived feature branches**.
Branch names followed `feature/<area>` or `fix/<area>` —
e.g. `feature/tower-cannon`, `feature/i18n-launch`,
`fix/wave5-boss-spawn`, `feature/perf-hud`. Most branches lived 1–3
days and merged into `main` via PR.

**Review rules** (kept light, enforced by convention rather than
branch protection):

- Every PR needed at least **one reviewer**.
- Anything touching the **shared spine** — `state.js`, `data/*`,
  `sketch.js`, `index.html` script load order — needed the
  module owner of the affected area as reviewer.
- Anything touching **balance numbers** (`TOWER_DEFS`,
  `WAVE_CONFIGS`, `LEVEL_INFO.startCoins`) needed Zhu Qihao
  (the economy owner) on the review, even if the PR's main
  intent was elsewhere.

Merges to `main` triggered the GitHub Pages redeploy. We treated a
broken `main` build as an "**everyone stops, someone reverts**"
incident. This happened twice during the term — both were script
load-order regressions after a file split — and the revert-first
rule paid off both times: the broken state was off `main` within
ten minutes, and the original PR re-landed the next day with a
fix.

### 6.4 Workshop cadence

The Wednesday workshop ran ~90 minutes:

1. **5 min — round-the-table demo.** Each member showed one thing
   they merged that week, even if small. This kept everyone aware
   of what other modules looked like and surfaced visual
   inconsistencies early.
2. **30 min — work session.** Pair / triple debugging on the
   biggest current blocker, often the integration of one module
   into another.
3. **45 min — sprint planning for the following week.** We used
   the MoSCoW list (see *Requirements* in the project report) to
   pick what to land before the next workshop.
4. **10 min — short retro.** "One thing going well, one thing
   blocked." This is how we caught the early-term art-pipeline
   problem and pivoted to procedural visuals.

### 6.5 What worked, what didn't, and how we adapted

**Worked well**

- *One owner per module.* Zero "who was supposed to do this?"
  friction. New work landed on the right person automatically.
- *Pages preview per merge.* A PR was demoable to a stranger
  within a minute of landing — a huge feedback-loop win.
- *Cross-cutting secondaries.* Pairing each member with a
  cross-cutting role (perf, balance, i18n, tests, audio) meant no
  one was idle when their primary module was stable.
- *Honest retros.* The 10-minute weekly retro caught both the
  art-pipeline failure (week 4) and the god-file merge-conflict
  problem (week 7) early enough to act.

**Didn't work well — and how we adapted**

- *The original art pipeline stalled.* Hand-drawn sprites by two
  members produced mismatched styles; assets weren't versioned;
  iteration cost was high. **Adapted** by switching wholesale to
  procedural visuals (week 4), which forced a unified aesthetic
  and removed an entire class of asset-management problem.
- *Three god-files began blocking parallel PRs* (`monsters.js`,
  `towers.js`, `ui.js`). For two weeks we kept patching around
  them. **Adapted** with the v1.4 → v2.0 refactor sprint, which
  paid for itself within a week — the first parallel PRs after
  the refactor (sound + perf HUD + responsive CSS) merged with
  zero conflicts.
- *Balance changes silently broke distant levels.* Buffing one
  tower could trivialise wave 4 of a different level. **Adapted**
  by extracting all numbers into `data/`, then later adding
  `node:test` shape invariants (e.g. *startCoins is strictly
  decreasing across levels*; *every boss singleton uses
  `interval=9999`*). These cheap tests would catch ~80% of
  accidental balance regressions on the next push.
- *Round-1 playtesters didn't understand the economy loop.*
  3/4 of them thought the minigame was "decoration" and that
  coins came from monster kills. **Adapted** with the Level-1
  tutorial overlay, the `BALLS → COINS` settlement card, and
  prose tower tooltips. Round-2 playtesters all read the loop
  by wave 2.

The shared lesson behind these four adaptations was the same:
when something repeatedly hurts, do not keep patching — pause and
remove the underlying class of problem. Each adaptation cost 1–2
days but eliminated weeks of recurring friction.

---

## 7. Known Limitations & Future Work

### Shipped in v2.1

- ~~**Canvas size is fixed at 980×840.**~~ Implemented in v2.1 via
  `windowResized()` + CSS letterbox scaling — the canvas now fills
  the viewport while preserving aspect ratio.
- ~~**No sound yet.**~~ Implemented in v2.1 (`audio.js`) with mute
  toggle persisted in `localStorage['qd_muted']`.
- ~~**No automated tests.**~~ Implemented in v2.1 — 48 `node:test`
  cases covering `data/*`, `i18n.js`, and `map/map-core.js` pure
  functions, runnable with `npm test` (zero install — uses
  Node 18+ built-ins).
- **Performance HUD added.** Press F in-game for live FPS / entity
  counts (`ui/perf-hud.js`).

### Still open

- **No per-level score persistence.** Only the highest unlocked
  level is stored; adding star ratings and best-times is the
  obvious next item — the `localStorage` key is reserved.
- **Direction-aware monster sprites.** Currently every monster's
  body orientation is fixed regardless of horizontal/vertical
  movement. Adding per-monster heading rotation (~5–7h of work)
  is tracked for v2.2.
- **Tutorial is informational only.** The 5 overlay steps describe
  the mechanics; a scripted "try it now" flow that *forces* a
  first build would land the loop even faster than the current
  version. Deferred for cost/benefit reasons.
- **Visual regression testing.** Currently a manual per-level
  check on each release. A simple canvas-hash test per fixed
  frame would catch most rendering regressions cheaply.
- **Mobile / touch support.** `mouseX/mouseY` already works for
  taps; the bottleneck is build-menu sizing on narrow screens.

---

## 8. References

- p5.js API reference — https://p5js.org/reference/
- Course brief — COMSM0166 Games and Media Design Project
- Visual inspiration — generic cyberpunk / sci-fi TD (no direct asset
  reuse; all art is code-generated).
