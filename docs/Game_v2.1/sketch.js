// ============================================================
//  sketch.js — p5 engine skeleton (only setup / draw / event routing)
//
//  Game phase flow:
//    'launch' → 'difficulty' → 'levelmap' → 'playing' → 'endpanel'
//
//  Per-phase rendering / click logic has been split into:
//    screens/launch-screen.js
//    screens/difficulty-select.js
//    screens/level-map.js
//    screens/end-panel.js
// ============================================================

// -- Layout constants --
const CELL_SIZE  = 70;
const GRID_COLS  = 14;
const GRID_ROWS  = 12;
const HUD_HEIGHT = 46;

// -- Wave constants --
const COUNTDOWN_FRAMES = 300;

// Global mutable state (gamePhase / coins / baseHp / manager / paths / launch and end animations etc.)
// is centralised in state.js; this file just reads/writes by the same names.

// ============================================================
//  p5 setup
// ============================================================
// Canvas 'design resolution' (always 980x840 internally), CSS scales it to the window size
const STAGE_W = GRID_COLS * CELL_SIZE;  // 980
const STAGE_H = GRID_ROWS * CELL_SIZE;  // 840

function setup() {
  createCanvas(STAGE_W, STAGE_H);
  textFont('monospace');
  _fitCanvasToWindow();

  // Initialize launch-page particles
  for (let i = 0; i < 90; i++) {
    launchParticles.push({
      x: random(width), y: random(height),
      vx: random(-0.35, 0.35), vy: random(-0.7, -0.1),
      size: random(1, 3.5), life: random(0.3, 1.0),
      col: random() > 0.5 ? [0, 200, 255] : [110, 70, 255],
    });
  }

  // Menu BGM (browser blocks autoplay before the first user click;
  // audio.js will queue the name and start playing when unlockAudio() fires)
  setBgm('launch');
}

// ============================================================
//  p5 draw - phase routing
// ============================================================
function draw() {
  switch (gamePhase) {
    case 'launch':     drawLaunchScreen();     drawPerfHud(); return;
    case 'difficulty': drawDifficultySelect(); drawPerfHud(); return;
    case 'levelmap':   drawLevelMap();         drawPerfHud(); return;

    case 'endpanel':
      endPanelAnim++;
      drawBackground(); drawPaths();
      for (const ht of homeTowers) ht.draw();
      drawEndPanel();
      drawPerfHud();
      return;

    case 'playing':
      drawBackground(); drawPaths();
      // While paused / in the tutorial, skip all updates and only draw the still frame
      const _frozen = gamePaused || tutorialActive;
      if (!_frozen) {
        updateWaveSystem();
        manager.update();
        updateAndDrawTowers();
        for (const ht of homeTowers) { ht.update(); ht.draw(); }
        updateParticles();
        updateMinigame(); drawMinigame();
      } else {
        // Continue drawing monsters and towers (frozen) so the screen does not go black
        for (const m of manager.monsters) m.draw();
        for (const ht of homeTowers) ht.draw();
        drawTowersOnly(); // Draw only, do not update
      }
      drawUI(); // drawUI internally calls drawPauseMenu()
      drawTutorial(); // If the tutorial is active, draw its overlay (always on top of UI)
      drawPerfHud();  // Always topmost; the menu / pause / tutorial do not block it
      if (!_frozen && waveState === 'complete' && manager.monsters.length === 0 && !_gameEndFired) {
        _gameEndFired = true;
        setTimeout(() => handleGameEnd(true), 1800);
      }
      return;
  }
}

// ============================================================
//  p5 mousePressed - phase routing
// ============================================================
function mousePressed() {
  // First click unlocks browser autoplay; subsequent calls are no-ops
  unlockAudio();
  switch (gamePhase) {
    case 'launch':
      // Mute toggle button has top priority: just toggles audio state without entering the next screen
      if (typeof handleLaunchMuteBtn === 'function' && handleLaunchMuteBtn(mouseX, mouseY)) return;
      // Language toggle button has next priority: just switches language without entering the next screen
      if (handleLaunchLangBtn(mouseX, mouseY)) return;
      // Codex entry (opens in a new tab; does not enter the next screen)
      if (launchReady && typeof handleLaunchCodexBtn === 'function'
          && handleLaunchCodexBtn(mouseX, mouseY)) return;
      // Test entry has next-highest priority
      if (launchReady && handleLaunchTestBtn(mouseX, mouseY)) {
        activateTestMode();
        return;
      }
      if (launchReady) { playSfx('click'); gamePhase = 'difficulty'; }
      return;

    case 'difficulty': handleDifficultyClick(mouseX, mouseY); return;
    case 'levelmap':   handleLevelMapClick(mouseX, mouseY);   return;
    case 'endpanel':   handleEndPanelClick(mouseX, mouseY);   return;

    case 'playing':
      // Tutorial has top priority: intercepts all other clicks
      if (tutorialActive) { handleTutorialClick(mouseX, mouseY); return; }
      // Pause button and pause menu are handled first
      if (handlePauseClick(mouseX, mouseY)) return;
      // While paused, consume all other clicks
      if (gamePaused) return;
      if (typeof handleWaveEndClick === 'function' && handleWaveEndClick(mouseX, mouseY)) return;
      if (minigameState !== 'idle') { handleMinigameClick(mouseX, mouseY); return; }
      const consumed = handlePlacementClick(mouseX, mouseY);
      if (!consumed) clickEffects.push({ x: mouseX, y: mouseY, life: 1.0 });
      return;
  }
}

function mouseMoved() {
  if (minigameState !== 'idle') handleMinigameMove(mouseX, mouseY);
}

// ============================================================
//  Screen adaptation: keep the internal STAGE_W x STAGE_H resolution unchanged,
//  use CSS to scale the canvas to fit the window (letterbox / pillarbox).
//  mouseX / mouseY are p5 canvas coords (auto-converted), so all
//  pixel-based hit tests in the game don't need changes.
// ============================================================
function windowResized() {
  _fitCanvasToWindow();
}

function _fitCanvasToWindow() {
  const cvs = (typeof canvas !== 'undefined' && canvas && canvas.canvas) ? canvas.canvas
            : document.querySelector('canvas');
  if (!cvs) return;
  // Leave an 8px margin so the glow box-shadow is not clipped when the window is at the edge
  const availW = Math.max(200, windowWidth  - 16);
  const availH = Math.max(200, windowHeight - 16);
  const s = Math.min(availW / STAGE_W, availH / STAGE_H);
  cvs.style.width  = Math.floor(STAGE_W * s) + 'px';
  cvs.style.height = Math.floor(STAGE_H * s) + 'px';
}

// Keyboard events: ESC pauses, F toggles the perf HUD
function keyPressed() {
  if (keyCode === ESCAPE) {
    if (tutorialActive) return;
    handlePauseKey();
    return;
  }
  // F: toggle perf HUD (any phase; allowed during the tutorial too, useful for grabbing fps in demos)
  if (key === 'f' || key === 'F') {
    togglePerfHud();
    return;
  }
}

// While paused, only draw towers; do not run attack logic
function drawTowersOnly() {
  for (const t of towers) t.draw();
}

// ============================================================
//  initGame - initialise a level run based on the current currentLevel
// ============================================================
function initGame() {
  initMap(); // map.js: pick the path and build the cell set based on currentLevel

  const lcfg = LEVEL_INFO[currentLevel];
  coins     = Math.floor(gameDifficulty === 'easy' ? lcfg.startCoins * 1.3 : lcfg.startCoins);
  baseHpMax = gameDifficulty === 'easy' ? 30 : 20;
  baseHp    = baseHpMax;
  TOTAL_WAVES = WAVE_CONFIGS[currentLevel].length;

  // Endpoint base
  homeTowers = [];
  if (MAIN_PATH_PX && MAIN_PATH_PX.length > 0) {
    const ep = MAIN_PATH_PX[MAIN_PATH_PX.length - 1];
    homeTowers.push(new HomeTower(ep.x, ep.y));
  }
  if (EDGE_PATH_PX && EDGE_PATH_PX.length > 0) {
    const ep2 = EDGE_PATH_PX[EDGE_PATH_PX.length - 1];
    const ep1 = MAIN_PATH_PX[MAIN_PATH_PX.length - 1];
    if (Math.hypot(ep2.x - ep1.x, ep2.y - ep1.y) > 40)
      homeTowers.push(new HomeTower(ep2.x, ep2.y));
  }

  manager = new MonsterManager();
  manager.onKilled = m => { coins += m.reward; };
  manager.onReach  = (m, dmg) => {
    baseHp = max(0, baseHp - (dmg || 1));
    if (baseHp <= 0 && !_gameEndFired) {
      _gameEndFired = true;
      setTimeout(() => handleGameEnd(false), 600);
    }
  };

  initTowers();
  initUI();
  // Decide tutorial state first, then enter the wave system;
  // otherwise beginAutoWave() may start the minigame before the tutorial flag is set, hiding the tower panel / build bar during the tutorial.
  startTutorialIfNeeded(); // Show the tutorial on the first entry of level 1
  beginAutoWave();

  // Switch BGM for this level (launch -> level{N})
  setBgm('level' + currentLevel);
}

// ============================================================
//  handleGameEnd - switch to the end panel after victory / defeat
// ============================================================
function handleGameEnd(won) {
  levelResults[currentLevel] = won ? 'win' : 'lose';
  if (won && currentLevel >= unlockedLevel)
    unlockedLevel = Math.min(5, currentLevel + 1);
  endPanelAnim = 0;
  _endPanelWon = won;
  gamePhase    = 'endpanel';
  // Stop BGM, let the win/lose SFX play out cleanly
  stopBgm();
  playSfx(won ? 'win' : 'lose');
}