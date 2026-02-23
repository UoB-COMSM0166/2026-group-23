// Gloable Values

// ── 地图尺寸 ──
const CELL_SIZE  = 70;  // 每个格子的像素大小
const GRID_COLS  = 14;  // 地图列数（横向格子数）
const GRID_ROWS  = 12;  // 地图行数（纵向格子数）
const HUD_HEIGHT = 46;  // 顶部HUD栏高度（px），此区域内不可建塔

// ── 游戏核心数值 ──
let coins   = 200;  // 当前金币数（初始值，也是每局起始金币）
let baseHp        = 50;  // 当前生命值
let baseHpMax     = 50;  // 最大生命值（初始值）
let waveNum = 0;    // 当前波次编号（0 = 游戏尚未开始）

// ── 波次系统 ──
const TOTAL_WAVES      = 10;        // 总波数
let waveState          = 'waiting'; // 波次状态：'waiting'|'countdown'|'fighting'|'complete'
let waveCountdownEnd   = 0;         // 倒计时结束的帧号（frameCount）
const COUNTDOWN_FRAMES = 300;       // 每波之间的倒计时长度（帧），60fps下约5秒

// ── 干扰系统（烈焰鸟技能：令塔暂停攻击）──
let jammedUntilFrame = 0;           // 干扰持续到第几帧，frameCount 小于此值时塔无法攻击
let jamPos = { x: 0, y: 0 };       // 触发干扰的位置（用于特效显示）

// ── 核心管理器与路径（由各模块初始化，其他模块只读）──
let manager      = null;  // MonsterManager 实例，由 monsters.js 创建
let MAIN_PATH_PX = null;  // 主路径像素坐标数组（蛇/机器人路线）
let EDGE_PATH_PX = null;  // 边路径像素坐标数组（蜘蛛路线）
let AIR_PATH_PX  = null;  // 空中路径像素坐标数组（烈焰鸟路线）


function setup() {
  createCanvas(GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE);
  textFont('monospace');

  // 初始化地图（路径像素坐标 + 格子判定集合）
  initMap();

  // 初始化怪物管理器
  manager = new MonsterManager();
  manager.onKilled = m => { coins += m.reward; };
  manager.onReach  = m => { baseHp = max(0, baseHp - 1); };

  // 初始化塔系统
  initTowers();

  // 初始化UI
  initUI();

  // 启动第一波倒计时
  beginAutoWave();
}

function draw() {
  // 1. 背景 & 路径
  drawBackground();
  drawPaths();

  // 2. 波次推进
  updateWaveSystem();

  // 3. 怪物更新
  manager.update();

  // 4. 塔 & 子弹
  updateAndDrawTowers();

  // 5. 粒子
  updateParticles();

  // 6. 全部UI（建造菜单、面板、HUD、波次提示、扫描线）
  drawUI();
}

function mousePressed() {
  // 优先给放置系统处理
  const consumed = handlePlacementClick(mouseX, mouseY);
  if (consumed) return;

  // 未消费 → 点击特效（可按需保留或删除）
  clickEffects.push({ x: mouseX, y: mouseY, life: 1.0 });
}
