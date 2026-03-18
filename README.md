# Quantum Drop — Number Defense

> Course Project | p5.js 2D Web Game

---

## Overview

*Quantum Drop* is a 2D web game combining **tower defense strategy** with a **math-based ball-drop minigame**.  
Before each wave, players earn coins through the minigame, then spend them to build and upgrade towers to fend off enemies.  
The game features **5 levels**, each with a unique map layout, path design, and visual theme, with increasing difficulty.

---

## How to Run

### Requirements
- [Visual Studio Code](https://code.visualstudio.com/)
- VSCode Extension: **Live Server** (search and install from the Extensions Marketplace)

### Steps

1. Open the project folder in VSCode: `File` → `Open Folder`
2. In the file explorer, right-click `index.html`
3. Select `Open with Live Server`
4. Your browser will open automatically at `http://127.0.0.1:5500`

> **Tip:** After editing any file, press `Ctrl+S` to save — the browser reloads automatically.  
> **Debugging:** Press `F12` to open DevTools; check the `Console` tab for errors.  
> **Quick Test:** Click the `DEV: ALL LEVELS` button in the bottom-right of the launch screen to unlock all levels instantly.

---

## Game Flow

```
Launch Screen
  → Difficulty Select  [EASY / DIFFICULT]
    → Level Map        [Choose Level 1–5]
      → Gameplay
          Ball-drop Minigame → Build Phase → Combat → Next Wave...
      → End Panel  [Victory / Defeat]
          → RETRY / STAGES / NEXT LEVEL
```

---

## File Structure

```
project/
├── index.html                   # Entry point — controls script load order (do not reorder)
├── sketch.js                    # Main loop: globals, setup(), draw(), initGame()
│
├── map/
│   ├── map-core.js              # Path definitions (5 levels), cell validation, drawPaths, shared utils
│   ├── map-lv1.js               # Level 1 background: Grassland
│   ├── map-lv2.js               # Level 2 background: Nebula Ice Fields
│   ├── map-lv3.js               # Level 3 background: Inferno Core
│   ├── map-lv4.js               # Level 4 background: Void Maze
│   └── map-lv5.js               # Level 5 background: Scorched Ruins
│
├── monsters.js                  # All monster classes, MonsterManager, particle system
├── towers.js                    # Tower class, Projectile class, placement / upgrade / demolish
├── waves.js                     # Wave configs for all 5 levels, wave state machine
├── minigame.js                  # Ball-drop minigame (fully implemented)
├── ui.js                        # Combat HUD, build menu, tower panel, placement preview
│
├── screens/
│   ├── launch-screen.js         # Launch screen + DEV test entry
│   ├── difficulty-select.js     # Difficulty selection screen
│   ├── level-map.js             # Level selection map screen
│   └── end-panel.js             # End panel (victory / defeat)
│
└── assert/
    └── *.png                    # Static assets (launch screen background, etc.)
```

> **Important:** The script load order in `index.html` must not be changed — later files depend on earlier ones.

---

## Team & Completion Status

| Module | Files | Member | Status |
|--------|-------|--------|--------|
| Monster & Path System | `monsters.js` `waves.js` `map/map-core.js` (paths) | Zhang Xun | ✅ Done |
| Map Layout & Tower Placement | `towers.js` `map/map-core.js` (cell logic) `ui.js` (menus/panels) | Liu Bowen | ✅ Done |
| Ball-drop Minigame | `minigame.js` | Yu Chengyin + Zhu Qihao | ✅ Done |
| Tower Combat Logic | `towers.js` | Zhang Zhenyu | ✅ Done |
| UI & State Integration | `ui.js` `screens/` | Li Zhuolun | ✅ Done |

---

## Level Overview

| Level | Name | Theme | Waves | Starting Coins | Notes |
|-------|------|-------|-------|----------------|-------|
| 1 | SECTOR ALPHA | Grassland | 6 | ¥2000 | Beginner — simple paths, infantry-focused |
| 2 | NEBULA RIFT | Ice Nebula | 7 | ¥1800 | Dual-lane, aerial enemies introduced |
| 3 | IRON CITADEL | Inferno | 8 | ¥1600 | Complex terrain, armored enemies and first Boss |
| 4 | VOID MAZE | Void | 9 | ¥1400 | Winding paths, high-speed enemy waves |
| 5 | OMEGA GATE | Scorched Ruins | 10 | ¥1200 | Final level — elite forces + all three Bosses |

> EASY mode: starting coins ×1.3, base HP = 30.  
> DIFFICULT mode: coins as listed, base HP = 20.

---

## Tower Reference

| Tower | Label | Cost | Description | Max Level |
|-------|-------|------|-------------|-----------|
| Rapid Fire | `RAPID` | ¥110 | High-frequency single target; ignores Robot shield; 20-charge super-gun mode | Lv3 |
| Laser Cutter | `LASER` | ¥180 | Charges then fires at multiple targets simultaneously (Lv1: 1 → Lv3: 3 targets) | Lv3 |
| Nova Cannon | `NOVA` | ¥200 | Piercing shot through all ground enemies; area explosion on impact | Lv3 |
| Chain Arc | `CHAIN` | ¥160 | Chain lightning (Lv1: 1 jump → Lv3: 3 jumps); ignores Tank barrier | Lv3 |
| Magnet Tower | `MAGNET` | ¥130 | No damage; continuously slows nearby enemies (up to 80% slow at Lv3) | Lv3 |
| Ghost Missile | `GHOST` | ¥190 | Homing missiles (Lv1: 1 → Lv3: 3); near-full-map range | Lv3 |
| Scatter Cannon | `SCATTER` | ¥150 | Shotgun spread targeting aerial units only (Lv1: 3 pellets → Lv3: 7 pellets) | Lv3 |

> Each tower can be upgraded up to **3 times**. Upgrade costs are defined in `towers.js` under each tower's `levels` array.  
> Demolishing a tower refunds **80%** of its original build cost.

---

## Enemy Reference

| Enemy | Lane | Special Ability |
|-------|------|----------------|
| Mech Snake | Main | Group heal every 900 frames |
| Mech Spider | Edge | Periodic dash (3.5× speed for 20 frames) |
| Armored Tank | Main | Barrier shield — only Chain Arc can pierce it |
| Robot | Main | Shield triggered at 60% HP — Rapid Fire ignores it |
| Mech Phoenix | Air | Jamming pulse — disables all towers for 90 frames |
| Ghost Bird | Air | High-speed flyer — only anti-air towers can target it |
| Steel Carrier | Main | Massive HP, very slow |
| Boss① Fission Core | Main | Overload burst; splits into 4 Mech Snakes at 50% HP |
| Boss② Phantom Protocol | Main | Quantum dodge every 3 hits; EMP disables all towers; spawns 2 clones at 30% HP |
| Boss③ Ant-Mech | Main | Alternates Giant (−85% dmg taken) ↔ Tiny (×2.2 dmg taken); Berserk mode at 50% HP |

---

## Ball-Drop Minigame

Triggered automatically before each wave:

1. **Aim Phase** — Move your mouse to select a launch X position, then click to confirm
2. **Drop Phase** — Balls fall under gravity and pass through **gates** that modify their count:
   - `+N` gate: adds N balls
   - `−N` gate: removes N balls
   - `×N` gate: multiplies ball count by N
3. **Settlement Phase** — Final ball count is converted into coins for the upcoming wave

---

## Key API Reference

### Coins
```js
coins += n;   // Gain coins
coins -= n;   // Spend coins (always check coins >= cost first)
```

### Monster Manager
```js
manager.monsters                                      // Array of all active monsters
manager.getMonstersInRange(cx, cy, range, antiAir)    // Get monsters within range
manager.damageAt(x, y, dmg, antiAir, fromSide)        // Point damage
manager.damageInRadius(cx, cy, radius, dmg, antiAir)  // Area-of-effect damage
```

### Map & Cell Validation
```js
isCellBuildable(gx, gy)   // Returns false if cell is on a path, in HUD area, or already has a tower
initMap()                  // Load path and background for currentLevel
```

### Game Phase Transitions
```js
// Always call initGame() when switching to 'playing'
gamePhase = 'playing';
initGame();   // Initializes a new game session based on currentLevel and gameDifficulty
```

### Jam System
```js
jammedUntilFrame = frameCount + duration;  // Disable all towers for [duration] frames
```

---

## Global Variables Quick Reference (defined in `sketch.js`)

| Variable | Description | Default |
|----------|-------------|---------|
| `CELL_SIZE` | Pixels per grid cell | `70` |
| `GRID_COLS / GRID_ROWS` | Map dimensions (columns / rows) | `14 / 12` |
| `HUD_HEIGHT` | Top HUD bar height (px) | `46` |
| `coins` | Current coins | Set by level + difficulty |
| `baseHp / baseHpMax` | Current / max base HP | EASY: 30, DIFFICULT: 20 |
| `waveNum / TOTAL_WAVES` | Current wave / total waves | Depends on level (6–10) |
| `COUNTDOWN_FRAMES` | Frames between waves | `300` (5 seconds) |
| `currentLevel` | Active level number (1–5) | `1` |
| `unlockedLevel` | Highest unlocked level | `1` |
| `gameDifficulty` | Selected difficulty | `'easy'` / `'difficult'` |
| `gamePhase` | Current game phase | `'launch'` |
| `jammedUntilFrame` | Frame at which jam effect ends | `0` |
