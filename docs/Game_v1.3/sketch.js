// ── 地图尺寸 ──
const CELL_SIZE  = 70;
const GRID_COLS  = 14;
const GRID_ROWS  = 12;
const HUD_HEIGHT = 46;

// ── 难度系统 ──
// 'easy' | 'difficult'  (在难度选择界面设定)
let gameDifficulty = null;
// 游戏阶段：'select'（难度选择）→ 'playing'
let gamePhase = 'select';

// ── 游戏核心数值 ──
let coins   = 20000000;
let baseHp        = 50;
let baseHpMax     = 50;
let waveNum = 0;

// ── 波次系统 ──
const TOTAL_WAVES      = 10;
let waveState          = 'waiting';
let waveCountdownEnd   = 0;
const COUNTDOWN_FRAMES = 300;

// ── 干扰系统 ──
let jammedUntilFrame = 0;
let jamPos = { x: 0, y: 0 };

// ── 核心管理器与路径 ──
let manager      = null;
let MAIN_PATH_PX = null;
let EDGE_PATH_PX = null;
let AIR_PATH_PX  = null;
let homeTowers   = []; // 科幻基地（路径终点）


function setup() {
  createCanvas(GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE);
  textFont('monospace');
  // 先不初始化游戏逻辑，等难度选择后再初始化
}

// 难度选定后调用，真正初始化游戏
function initGame() {
  initMap();

  // 在路径终点放置科幻基地
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
  };

  initTowers();
  initUI();

  // 启动第一波倒计时
  beginAutoWave();
}

function draw() {
  // ── 难度选择阶段 ──
  if (gamePhase === 'select') {
    drawDifficultySelect();
    return;
  }

  // ── 正式游戏阶段 ──
  // 1. 背景 & 路径
  drawBackground();
  drawPaths();

  // 2. 波次推进（始终运行，小游戏与波次倒计时并行）
  updateWaveSystem();

  // 3. 怪物更新
  manager.update();

  // 4. 塔 & 子弹
  updateAndDrawTowers();

  // 4.5 Home基地
  for (const ht of homeTowers) { ht.update(); ht.draw(); }

  // 5. 粒子
  updateParticles();

  // 6. 小游戏（叠加在游戏画面上）
  updateMinigame();
  drawMinigame();

  // 7. 全部UI
  drawUI();
}

function mousePressed() {
  // 难度选择阶段
  if (gamePhase === 'select') {
    handleDifficultyClick(mouseX, mouseY);
    return;
  }

  // 小游戏优先消费点击
  if (minigameState !== 'idle') {
    handleMinigameClick(mouseX, mouseY);
    return;
  }

  const consumed = handlePlacementClick(mouseX, mouseY);
  if (consumed) return;

  clickEffects.push({ x: mouseX, y: mouseY, life: 1.0 });
}

function mouseMoved() {
  if (minigameState !== 'idle') {
    handleMinigameMove(mouseX, mouseY);
  }
}