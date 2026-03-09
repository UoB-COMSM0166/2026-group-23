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
let coins   = 200;
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


function setup() {
  createCanvas(GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE);
  textFont('monospace');
  // 先不初始化游戏逻辑，等难度选择后再初始化
}

// 难度选定后调用，真正初始化游戏
function initGame() {
  initMap();

  manager = new MonsterManager();
  manager.onKilled = m => { coins += m.reward; };
  manager.onReach  = m => { baseHp = max(0, baseHp - 1); };

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