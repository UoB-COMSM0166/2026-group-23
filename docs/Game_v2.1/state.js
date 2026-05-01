// ============================================================
//  state.js — Centralised declaration of global game / UI state
//
//  Mutable globals previously scattered at the top of sketch.js / ui.js / waves.js
//  are gathered here so the team can quickly see 'what state actually exists in the game'.
//
//  Variable names are kept the same; every other file continues to read/write by the same names without changes.
//  index.html loads this file before any business script to guarantee init order.
//
//  State that stays in its original module (since it is internal implementation detail):
//    - map/map-core.js   : _floorCache / _decoCache / _pathFlowPts /
//                          CURRENT_LEVEL_PATHS / pathCellSet
//    - ui.js             : _hudHpFill / _hudBarFill / _wcDesc* and other HUD render caches
//    - towers.js         : towers / projectiles / jamRadius /
//                          _chainArcs / _cannonBlasts / _mortarShells
//    - monsters.js       : particles
//    - minigame.js       : the minigame's internal variables
//    - screens/*         : per-screen animation / hover temporary variables
// ============================================================


// -- Game phase --
// 'launch' | 'difficulty' | 'levelmap' | 'playing' | 'endpanel'
let gamePhase      = 'launch';
let gameDifficulty = null;  // 'easy' | 'difficult'


// -- Language (default English; toggleable on launch screen; written to localStorage) --
let currentLang = (() => {
  try {
    const v = localStorage.getItem('qd_lang');
    return (v === 'zh' || v === 'en') ? v : 'en';
  } catch (e) { return 'en'; }
})();


// -- Audio mute (sound on by default; toggle with launch-screen top-right button; written to localStorage) --
let audioMuted = (() => {
  try { return localStorage.getItem('qd_muted') === '1'; }
  catch (e) { return false; }
})();


// -- Perf HUD (off by default; F key toggles; written to localStorage) --
let showPerfHud = (() => {
  try { return localStorage.getItem('qd_perf') === '1'; }
  catch (e) { return false; }
})();


// -- Level progression --
let currentLevel   = 1;
let unlockedLevel  = 1;
let levelResults   = {};    // { 1: 'win'|'lose', ... }


// -- Core values --
let coins     = 2000;
let baseHp    = 50;
let baseHpMax = 50;
let waveNum   = 0;


// -- Wave system --
let TOTAL_WAVES         = 6;
let waveState           = 'waiting';
let waveCountdownEnd    = 0;
let waveCountdownActive = false;  // (originally in waves.js)


// -- Disruption system (boss skill) --
let jammedUntilFrame = 0;
let jamPos           = { x: 0, y: 0 };


// -- Path & manager --
let manager      = null;
let MAIN_PATH_PX = null;
let EDGE_PATH_PX = null;
let AIR_PATH_PX  = null;
let homeTowers   = [];


// -- Launch screen helper state (read/write by screens/launch-screen.js) --
let launchAnim      = 0;
let launchReady     = false;
let launchParticles = [];


// -- Level map helper state (read/write by screens/level-map.js) --
let levelMapAnim = 0;


// -- End panel helper state (read/write by screens/end-panel.js) --
let endPanelAnim = 0;
let _endPanelWon = false;


// -- Game-over flag --
let _gameEndFired = false;


// -- Tutorial (only on first entry to level 1) --
let tutorialActive = false;
let tutorialStep   = 0;


// ============================================================
//  UI state (originally at the top of ui.js)
// ============================================================

// -- Build / select --
let selectedTowerType = null;
let selectedTower     = null;
let hoverTowerType    = null;
let BUILD_BTN_Y;
let clickEffects;

// -- Pause system --
let gamePaused       = false;
let pauseConfirmMode = false;
let _pauseBtnRect    = null;

// -- Cannon aiming --
let _mortarAiming = false;
let _mortarTower  = null;

// -- Wave end panel --
let waveEndPanelVisible = false;
let waveEndBtnRect      = null;
