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
let balls = [];
let minigameBounds = null;  // { left, right, top, bottom }
const BALL_RADIUS = 8;
const GRAVITY = 0.4;
const DAMPING = 0.998;
const WALL_BOUNCE = 0.6;
const GATE_HEIGHT = 40;     // 约定：门的高度到时候改

function spawnBalls(count) {
  balls = [];

  // 根据当前画布尺寸和预设边界生成起始位置
  const cx = (minigameBounds.left + minigameBounds.right) / 2;
  const startY = minigameBounds.top + BALL_RADIUS + 10;

  for (let i = 0; i < count; i++) {
    balls.push({
      x: cx + random(-10, 10), // 稍微散一点
      y: startY - i * (BALL_RADIUS * 2 + 4),
      vx: random(-1, 1),
      vy: 0,
      radius: BALL_RADIUS,
      alive: true
    });
  }
}

function updateBalls() {
  if (!minigameBounds) return;
  if (balls.length === 0) return;

  let allDead = true;

  for (let b of balls) {
    if (!b.alive) continue;
    allDead = false;

    // 1) 基础物理：重力 + 阻尼
    b.vy += GRAVITY;
    b.vx *= DAMPING;
    b.vy *= DAMPING;

    b.x += b.vx;
    b.y += b.vy;

    // 2) 与左右/顶部墙体碰撞（封闭）
    if (b.x - b.radius < minigameBounds.left) {
      b.x = minigameBounds.left + b.radius;
      b.vx *= -WALL_BOUNCE;
    }
    if (b.x + b.radius > minigameBounds.right) {
      b.x = minigameBounds.right - b.radius;
      b.vx *= -WALL_BOUNCE;
    }
    if (b.y - b.radius < minigameBounds.top) {
      b.y = minigameBounds.top + b.radius;
      b.vy *= -WALL_BOUNCE;
    }

    // 3) 与“门”碰撞检测（几何 + 回调给朱启昊）
    if (typeof gates !== 'undefined' && Array.isArray(gates)) {
      for (let gate of gates) {
        // 约定 gate: { x, y, width, type, value }
        const gx1 = gate.x;
        const gx2 = gate.x + gate.width;
        const gy1 = gate.y;
        const gy2 = gate.y + GATE_HEIGHT;

        // 简单矩形碰撞：球心进门矩形即可
        if (
          b.x > gx1 &&
          b.x < gx2 &&
          b.y > gy1 &&
          b.y < gy2 &&
          b.alive
        ) {
          if (typeof applyGate === 'function') {
            applyGate(b, gate); // 由老朱实现内部数值逻辑
          }
        }
      }
    }

    // 4) 落出底部：视为“本球结束”
    if (b.y - b.radius > minigameBounds.bottom) {
      b.alive = false;
    }
  }

  // 所有球都结束 → 结算 & 退出小游戏
  if (!allDead) return;

  // 优先交给老朱的 settleBalls() 写入 minigameResult
  if (typeof settleBalls === 'function') {
    settleBalls();
  }
  endMinigame();
}

function drawBalls() {
  if (!minigameBounds) return;

  noStroke();
  fill(255, 200, 0);
  for (let b of balls) {
    if (!b.alive) continue;
    circle(b.x, b.y, b.radius * 2);
  }
}
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
  // 初始化小游戏边界（根据当前画布尺寸）
  const marginX = 80;
  const marginTop = 80;
  const marginBottom = 100;
  minigameBounds = {
    left: marginX,
    right: width - marginX,
    top: marginTop,
    bottom: height - marginBottom
  };

  // 先简单写死为 1 个球；之后可以让老朱根据波次/数值决定 count
  spawnBalls(1);

  // 看着调用 generateGates()
  if (typeof generateGates === 'function') {
    generateGates(minigameBounds, GATE_HEIGHT);
  }
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
  updateBalls();
}

// 每帧绘制
function drawMinigame() {
  if (minigameState === 'idle') return;
  // TODO: 绘制背景面板、小球、门
  // 背景面板
  push();
  rectMode(CORNERS);
  noStroke();
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);

  // 小游戏区域边框
  noFill();
  stroke(255);
  strokeWeight(2);
  if (minigameBounds) {
    rect(
      minigameBounds.left,
      minigameBounds.top,
      minigameBounds.right,
      minigameBounds.bottom
    );
  }

  // 画门
  if (typeof drawGates === 'function') {
   // drawGates(GATE_HEIGHT);
  }

  // 画球（
  drawBalls();

  pop();
}
