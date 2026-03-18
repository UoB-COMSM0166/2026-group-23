# Quantum Drop — Weekly Task Assignment

> Sprint Plan | Week 2

---

## Task Overview

| # | Task | Assigned To | Priority |
|---|------|-------------|----------|
| 1 | UI Tutorial / Onboarding | Liu Bowen + Li Zhuolun | 🔴 High |
| 2 | Pause & Exit | Liu Bowen + Li Zhuolun | 🔴 High |
| 3 | Tower Hover Tooltip | Liu Bowen + Li Zhuolun | 🟡 Medium |
| 4 | Performance Optimization | Liu Bowen + Li Zhuolun | 🟡 Medium |
| 5 | Minigame Feature Expansion | Zhu Qihao + Yu Chengyin | 🔴 High |
| 6 | Monster & Tower Balancing | Zhang Zhenyu + Zhang Xun | 🟡 Medium |

---

## Task Details

---

### Liu Bowen + Li Zhuolun

#### Task 1: UI Tutorial / Onboarding
**Goal:** Provide a concise onboarding experience to help new players quickly understand the core mechanics.

Suggested implementation:
- Auto-trigger the tutorial on the first playthrough, or add a "Tutorial" entry in the main menu
- Step-by-step highlights: ball-drop minigame controls → build towers → start wave
- Each step shows a description and directional arrow indicator; click anywhere to advance
- Allow players to replay the tutorial from the settings menu

Files involved: `ui.js` / `screens/` (consider creating a new `tutorial.js`)

---

#### Task 2: Pause & Exit
**Goal:** Allow players to pause the game during combat and safely return to the main menu.

Suggested implementation:
- Trigger pause via `ESC` key or an on-screen pause button
- While paused, freeze all updates (`manager.update()` and tower logic) and display a semi-transparent overlay
- Pause menu options: **Resume** / **Restart** / **Return to Level Select**
- Require a confirmation step before exiting to prevent accidental clicks

Files involved: `sketch.js` (pause state control), `ui.js` (pause menu rendering)

---

#### Task 3: Tower Hover Tooltip
**Goal:** Display a detailed info tooltip when the mouse hovers over a placed tower.

Suggested implementation:
- Show on hover: tower name, current level, damage, range, fire rate, and special ability description
- Tooltip follows the mouse and auto-adjusts position to stay within screen bounds
- Distinguish from the existing click panel: hover = read-only info, click = upgrade / demolish
- Reuse styling from the existing `drawTowerPanel()` where possible

Files involved: `ui.js` (near the `drawTowerPanel()` section)

---

#### Task 4: Performance Optimization
**Goal:** Improve frame rate stability during high-enemy-count and heavy-effect scenarios.

Suggested areas to investigate:
- `monsters.js`: Frequency of `beginShape/endShape` calls in monster rendering; skip drawing for off-screen monsters
- `map-lv*.js`: Per-frame redraw cost of background decorations; consider caching static layers with `createGraphics()`
- `minigame.js`: Cap the maximum number of particles to prevent particle-explosion frame drops
- `towers.js`: Performance of per-frame `filter` on the projectile array; consider using a flag-based approach instead

Files involved: `monsters.js`, `map-core.js`, `towers.js`, `minigame.js`

---

### Zhu Qihao + Yu Chengyin

#### Task 5: Minigame Feature Expansion
**Goal:** Enrich the ball-drop minigame with more depth, strategy, and visual feedback.

Suggested new features (implement any subset):

- **Obstacles:** Place bumpers or deflectors randomly in the play area to alter ball trajectories
- **Combo Bonus:** Reward extra coins when balls pass through the same gate type consecutively (e.g. 3 `×` gates in a row)
- **Special Gates:**
  - `?` Random Gate — effect is unknown until triggered; could be a big gain or a big loss
  - `MAX` Gate — sets the current ball count to the session maximum instantly
- **Launch Angle:** Allow slight angle adjustment on launch (not just X position) for more player control
- **Coin Fly Animation:** After settlement, animate coins flying up into the HUD bar

Files involved: `minigame.js`

---

### Zhang Zhenyu + Zhang Xun

#### Task 6: Monster & Tower Balancing
**Goal:** Adjust difficulty curves and numerical balance across all levels based on playtesting feedback.

Suggested areas to review:

**Monsters:**
- Check whether enemy HP / speed / coin rewards match the pacing of each level
- Evaluate Boss skill trigger frequency — too fast feels unfair, too slow feels irrelevant
- Verify that wave intervals and enemy density give players enough time to build between waves

**Towers:**
- Compare cost-effectiveness across all 7 towers — identify any that are always or never picked
- Review the upgrade cost curve: does the Lv1 → Lv2 → Lv3 price increase feel proportional to the power gain?
- Validate special-mechanic towers in actual combat (MAGNET slow, GHOST homing) — are they useful enough?

Please output a **before/after comparison table** of any values changed, so the team can review the adjustments easily.

Files involved: `monsters.js` (HP / speed / reward), `towers.js` (`TOWER_DEFS` values), `waves.js` (wave configs)

---

## Weekly Goals Checklist

- [ ] Tutorial flow is functional and playable
- [ ] Pause menu can be opened and closed correctly
- [ ] Tower hover tooltip displays accurate information
- [ ] Frame rate remains stable in late waves (W5+)
- [ ] At least 1 new minigame feature implemented
- [ ] Balance changes submitted with a before/after comparison

---

## Collaboration Notes

- Develop on separate branches; run a full local playthrough before merging into main
- Anyone modifying `TOWER_DEFS` in `towers.js` — coordinate with Liu Bowen first to avoid merge conflicts
- Performance changes touch low-level systems; the whole team should do a full run-through after merging to confirm no side effects
- For cross-module interface questions, discuss in the group chat before making changes
