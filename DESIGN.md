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

<!-- TODO (Zhang Zhenyu / Liu Bowen): fill in measured numbers -->
<!-- Example topics:
     - Typical frame rate with N monsters and M projectiles
     - Hot paths we profiled and optimised (HUD text caching, tooltip
       size caching, wave-preview caching)
     - Any systems we had to budget (e.g. particle count cap) -->

---

## 6. Team Workflow

<!-- TODO (Li Zhuolun): fill in -->
<!-- Suggested content:
     - Git branching strategy (feature branches? trunk?)
     - How we divided work — module ownership table is in README
     - What we did in weekly workshops
     - Code review process (if any) -->

---

## 7. Known Limitations & Future Work

- **Canvas size is fixed at 980×840.** Non-responsive to small screens.
  A `windowResized()` handler with CSS scaling is tracked for v2.2.
- **No sound yet.** Planned for v2.1.
- **No per-level score persistence.** Only the highest unlocked level
  is stored; adding star ratings and best times is planned for v2.1.
- **Tutorial localisation.** The 5 tutorial steps are bilingual, but
  the onboarding would benefit from a scripted "try it now" flow.
- **No automated tests.** `data/` config and `map/map-core.js` pure
  functions are good candidates for Jest; deferred due to course timeline.

---

## 8. References

- p5.js API reference — https://p5js.org/reference/
- Course brief — COMSM0166 Games and Media Design Project
- Visual inspiration — generic cyberpunk / sci-fi TD (no direct asset
  reuse; all art is code-generated).
