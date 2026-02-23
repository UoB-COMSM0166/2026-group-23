// ============================================================
//  minigame.js — 投球小游戏
//  负责人：于承印（小球运动、碰撞检测、落地结算）
//          朱启昊（随机门生成、数值计算、金币结算）
//  依赖：globals.js
// ============================================================

// ── 小游戏状态 ──
// 'idle'     — 未开始
// 'playing'  — 游戏进行中
// 'result'   — 展示结算结果
let minigameState = 'idle';
let minigameResult = 0; // 本局最终获得金币数

// ============================================================
//  TODO：于承印 — 小球物理系统
//  建议数据结构：
//
//  let balls = [];
//  // ball: { x, y, vx, vy, radius, alive }
//
//  function spawnBalls(count) { ... }
//  function updateBalls() {
//    // 重力、碰撞检测（与墙、与门）
//    // 小球落出底部 → 计入结算
//  }
//  function drawBalls() { ... }
// ============================================================

// ============================================================
//  TODO：朱启昊 — 门系统 & 金币结算
//  建议数据结构：
//
//  let gates = [];
//  // gate: { x, y, width, type, value }
//  // type: 'add'(+N) | 'sub'(-N) | 'mul'(×N)
//
//  function generateGates() {
//    // 随机生成若干门，布置在画面中段
//  }
//  function applyGate(ball, gate) {
//    // 根据门类型改变当前小球数量
//  }
//  function settleBalls() {
//    // 所有小球落地后 → 计算总数 → 转换为金币
//    // coins += minigameResult;
//    // minigameState = 'result';
//  }
// ============================================================

// ── 对外接口 ──

// 开始一局小游戏（由 sketch.js 在每波开始前调用）
function startMinigame() {
  minigameState = 'playing';
  minigameResult = 0;
  // TODO: 初始化小球与门
}

// 结束小游戏，把结果结算进全局金币
function endMinigame() {
  coins += minigameResult;
  minigameState = 'idle';
}

// 每帧更新（在 sketch.js draw() 中调用）
function updateMinigame() {
  if (minigameState === 'idle') return;
  // TODO: 调用 updateBalls()、碰撞检测等
}

// 每帧绘制
function drawMinigame() {
  if (minigameState === 'idle') return;
  // TODO: 绘制背景面板、小球、门
}
