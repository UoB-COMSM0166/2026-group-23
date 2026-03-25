// ============================================================
//  sketch.js — p5 引擎骨架（仅 setup / draw / 事件路由）
//
//  游戏阶段流转：
//    'launch' → 'difficulty' → 'levelmap' → 'playing' → 'endpanel'
//
//  各阶段渲染 / 点击逻辑已拆至：
//    screens/launch-screen.js
//    screens/difficulty-select.js
//    screens/level-map.js
//    screens/end-panel.js
// ============================================================

// ── 布局常量 ──
const CELL_SIZE  = 70;
const GRID_COLS  = 14;
const GRID_ROWS  = 12;
const HUD_HEIGHT = 46;

// ── 游戏阶段 ──
let gamePhase = 'launch'; // 'launch' | 'difficulty' | 'levelmap' | 'playing' | 'endpanel'

// ── 难度 ──
let gameDifficulty = null; // 'easy' | 'difficult'

// ── 关卡进度 ──
let currentLevel  = 1;
let unlockedLevel = 1;
let levelResults  = {}; // { 1: 'win'|'lose', ... }

// ── 核心数值 ──
let coins     = 2000;
let baseHp    = 50;
let baseHpMax = 50;
let waveNum   = 0;

// ── 波次 ──
let TOTAL_WAVES        = 6;
let waveState          = 'waiting';
let waveCountdownEnd   = 0;
const COUNTDOWN_FRAMES = 300;

// ── 干扰系统 ──
let jammedUntilFrame = 0;
let jamPos = { x: 0, y: 0 };

// ── 路径 & 管理器 ──
let manager      = null;
let MAIN_PATH_PX = null;
let EDGE_PATH_PX = null;
let AIR_PATH_PX  = null;
let homeTowers   = [];

// ── 启动页辅助状态（screens/launch-screen.js 读写）──
let launchAnim      = 0;
let launchReady     = false;
let launchParticles = [];

// ── 关卡地图辅助状态（screens/level-map.js 读写）──
let levelMapAnim = 0;

// ── 结算面板辅助状态（screens/end-panel.js 读写）──
let endPanelAnim  = 0;
let _endPanelWon  = false;

// ── 内部标志 ──
let _gameEndFired = false;

// ============================================================
//  p5 setup
// ============================================================
function setup() {
  createCanvas(GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE);
  textFont('monospace');

  // 初始化启动页粒子
  for (let i = 0; i < 90; i++) {
    launchParticles.push({
      x: random(width), y: random(height),
      vx: random(-0.35, 0.35), vy: random(-0.7, -0.1),
      size: random(1, 3.5), life: random(0.3, 1.0),
      col: random() > 0.5 ? [0, 200, 255] : [110, 70, 255],
    });
  }
}

// ============================================================
//  p5 draw — 阶段路由
// ============================================================
function draw() {
  switch (gamePhase) {
    case 'launch':     drawLaunchScreen();    return;
    case 'difficulty': drawDifficultySelect(); return;
    case 'levelmap':   drawLevelMap();         return;

    case 'endpanel':
      endPanelAnim++;
      drawBackground(); drawPaths();
      for (const ht of homeTowers) ht.draw();
      drawEndPanel();
      return;

    case 'playing':
      drawBackground(); drawPaths();
      updateWaveSystem();
      manager.update();
      updateAndDrawTowers();
      for (const ht of homeTowers) { ht.update(); ht.draw(); }
      updateParticles();
      updateMinigame(); drawMinigame();
      drawUI();
      if (waveState === 'complete' && manager.monsters.length === 0 && !_gameEndFired) {
        _gameEndFired = true;
        setTimeout(() => handleGameEnd(true), 1800);
      }
      return;
  }
}

// ============================================================
//  p5 mousePressed — 阶段路由
// ============================================================
function mousePressed() {
  switch (gamePhase) {
    case 'launch':
      // 测试入口优先检测
      if (launchReady && handleLaunchTestBtn(mouseX, mouseY)) {
        activateTestMode();
        return;
      }
      if (launchReady) { gamePhase = 'difficulty'; }
      return;

    case 'difficulty': handleDifficultyClick(mouseX, mouseY); return;
    case 'levelmap':   handleLevelMapClick(mouseX, mouseY);   return;
    case 'endpanel':   handleEndPanelClick(mouseX, mouseY);   return;

    case 'playing':
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
//  initGame — 按当前 currentLevel 初始化一局
// ============================================================
function initGame() {
  initMap(); // map.js：根据 currentLevel 选路径、建格子集合

  const lcfg = LEVEL_INFO[currentLevel];
  coins     = Math.floor(gameDifficulty === 'easy' ? lcfg.startCoins * 1.3 : lcfg.startCoins);
  baseHpMax = gameDifficulty === 'easy' ? 30 : 20;
  baseHp    = baseHpMax;
  TOTAL_WAVES = WAVE_CONFIGS[currentLevel].length;

  // 终点基地
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
  beginAutoWave();
}

// ============================================================
//  handleGameEnd — 胜利 / 失败后切换到结算面板
// ============================================================
function handleGameEnd(won) {
  levelResults[currentLevel] = won ? 'win' : 'lose';
  if (won && currentLevel >= unlockedLevel)
    unlockedLevel = Math.min(5, currentLevel + 1);
  endPanelAnim = 0;
  _endPanelWon = won;
  gamePhase    = 'endpanel';
}
