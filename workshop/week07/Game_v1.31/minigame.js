// ============================================================
//  minigame.js — 投球小游戏
//  状态: idle → aiming → playing → result → idle
//  玩家瞄准发射小球，穿过 × 门分裂，穿过 - 门消减，落底结算金币
// ============================================================

let minigameState  = 'idle';
let minigameResult = 0;

// ── 区域边界 ──
const MG_MARGIN = 20;

// ── 小球 ──
let balls = [];        // { x, y, vx, vy, alive, lastGate }
const B_R    = 7;      // 球半径
const B_GRAV = 0.15;   // 重力
const B_DAMP = 0.995;  // 速度阻尼

// ── 发射 ──
let aimX        = 0;
let shootDone   = false;
let shootIdx    = 0;
let shootFrames = 0;
const SHOOT_TOTAL = 10;
const SHOOT_INTV  = 5;  // 每 N 帧发一个

// ── 门 ──
let gates = [];        // { x, y, w, type, value, alive, flash }
const GATE_H = 36;

// ── 结算 ──
let landedCount  = 0;
let resultFrames = 0;
const RESULT_DUR = 180;

// ── 待加球队列（避免在遍历中修改数组） ──
let spawnQueue = [];

// ============================================================
//  对外接口
// ============================================================

function startMinigame() {
  minigameState = 'aiming';
  minigameResult = 0;
  balls = []; gates = []; spawnQueue = [];
  shootDone = false; shootIdx = 0; shootFrames = 0;
  landedCount = 0; resultFrames = 0;
  aimX = width / 2;
  generateGates();
}

function endMinigame() {
  coins        += minigameResult;
  minigameState = 'idle';
}

function updateMinigame() {
  if (minigameState === 'idle' || minigameState === 'aiming') return;

  if (minigameState === 'playing') {
    doShoot();
    for (const b of spawnQueue) balls.push(b);
    spawnQueue = [];
    updateBalls();
  }

  if (minigameState === 'result') {
    resultFrames--;
    if (resultFrames <= 0) endMinigame();
  }
}

function drawMinigame() {
  if (minigameState === 'idle') return;
  drawMgBackground();
  drawGates();
  drawBalls();
  drawHUD();
  if (minigameState === 'aiming') drawAim();
  if (minigameState === 'result') drawResult();
}

function handleMinigameClick(mx, my) {
  if (minigameState === 'idle') return false;
  if (minigameState === 'aiming') {
    aimX = constrain(mx, MG_MARGIN, width - MG_MARGIN);
    minigameState = 'playing';
  }
  return true;
}

function handleMinigameMove(mx, my) {
  if (minigameState === 'aiming')
    aimX = constrain(mx, MG_MARGIN, width - MG_MARGIN);
}

// ============================================================
//  发射
// ============================================================

function doShoot() {
  if (shootDone) return;
  shootFrames++;
  if (shootFrames % SHOOT_INTV === 0 && shootIdx < SHOOT_TOTAL) {
    shootIdx++;
    const ang = random(-0.2, 0.2);
    const spd = random(1.2, 2.2);
    balls.push({
      x: aimX + random(-6, 6),
      y: HUD_HEIGHT + B_R + 5,
      vx: sin(ang) * spd,
      vy: spd * 0.3,
      alive: true, lastGate: null,
    });
  }
  if (shootIdx >= SHOOT_TOTAL) shootDone = true;
}

// ============================================================
//  物理
// ============================================================

function updateBalls() {
  const left   = MG_MARGIN;
  const right  = width  - MG_MARGIN;
  const bottom = height - MG_MARGIN;

  for (const b of balls) {
    if (!b.alive) continue;

    b.vy += B_GRAV;
    b.vx *= B_DAMP;
    b.vy *= B_DAMP;
    b.x  += b.vx;
    b.y  += b.vy;

    // 左右墙弹
    if (b.x - B_R < left)  { b.x = left  + B_R; b.vx =  abs(b.vx) * 0.5; }
    if (b.x + B_R > right) { b.x = right - B_R; b.vx = -abs(b.vx) * 0.5; }

    // 与门碰撞
    for (const g of gates) {
      if (g.type === 'sub' && !g.alive) continue;
      if (b.lastGate === g) continue;
      if (abs(b.x - g.x) < g.w / 2 + B_R && abs(b.y - g.y) < GATE_H / 2 + B_R)
        triggerGate(b, g);
    }

    // 落底
    if (b.y - B_R > bottom) {
      b.alive = false;
      landedCount++;
    }
  }

  // 全部落底且发射完毕 → 结算
  if (shootDone && spawnQueue.length === 0 && balls.every(b => !b.alive)) {
    minigameResult = floor(landedCount * 1.5);
    minigameState  = 'result';
    resultFrames   = RESULT_DUR;
  }
}

// ============================================================
//  门触发
// ============================================================

function triggerGate(ball, gate) {
  gate.flash = 30;

  if (gate.type === 'mul') {
  // ×门：原球消失，扇形生成 value 个子球
    ball.vx *= 0.6;
    ball.vy *= 0.6;
    ball.alive = false;
    ball.lastGate = gate;

    const baseAng = atan2(ball.vy, ball.vx);
    const baseSpd = max(Math.hypot(ball.vx, ball.vy), 1.5);
    const spd = baseSpd * 0.85 +0.3;
    const arc = 0.4;

    for (let i = 0; i < gate.value; i++) {

      const t = gate.value === 1
       ? 0
       : (i / (gate.value - 1) - 0.5) * 2;
       const ang = baseAng + t * arc + random(-0.04, 0.04);
        spawnQueue.push({
          x: ball.x,
          y: ball.y,
          vx: cos(ang) * spd,
          vy: sin(ang) * spd,
          alive: true,
          lastGate: gate,
      });
    }

  } else {
    // -门：一次性，消灭最近的 value 个球
    if (!gate.alive) return;
    gate.alive = false;

    const living = balls.filter(b => b.alive)
      .sort((a, b) => dist(a.x, a.y, gate.x, gate.y) - dist(b.x, b.y, gate.x, gate.y));
    for (let i = 0; i < min(gate.value, living.length); i++)
      living[i].alive = false;
  }
}

// ============================================================
//  门生成
// ============================================================

// 倍率权重 [value, weight]，高倍率稀有
const MUL_WEIGHTS = [[2,35],[3,28],[4,18],[5,9],[6,5],[7,3],[8,2]];

function pickMulValue() {
  const total = MUL_WEIGHTS.reduce((s, [,w]) => s + w, 0);
  let r = random(total);
  for (const [v, w] of MUL_WEIGHTS) { r -= w; if (r <= 0) return v; }
  return 2;
}

function generateGates() {
  gates = [];
  const innerL    = MG_MARGIN;
  const innerW    = width - MG_MARGIN * 2;
  const minGW     = floor(width / 7);
  const maxGW     = floor(width / 4);
  const rows      = 5;
  const stepY     = (height - HUD_HEIGHT - 100) / (rows + 1);
  const targetMul = floor(random(3, 7)); // 本局 × 门数量 3~6
  let mulCount    = 0;

  for (let row = 0; row < rows; row++) {
    const y     = HUD_HEIGHT + 50 + stepY * (row + 1);
    const rr    = random();
    const count = rr < 0.25 ? 1 : rr < 0.75 ? 2 : 3;

    // 随机宽度
    const ws   = Array.from({length: count}, () => floor(random(minGW, maxGW)));
    const used = ws.reduce((a, b) => a + b, 0);
    const free = max(innerW - used, 10);

    // 随机不等距间隔
    const rawGaps = Array.from({length: count + 1}, () => random(1, 3));
    const gsum    = rawGaps.reduce((a, b) => a + b, 0);
    const gn      = rawGaps.map(g => (g / gsum) * free);

    let curX = innerL + gn[0];
    for (let c = 0; c < count; c++) {
      // 是否放 × 门
      const remaining = (rows - row) * count;
      const mustMul   = (targetMul - mulCount) >= remaining;
      const bias      = row < 3 ? 0.65 : 0.35;
      const isMul     = mulCount < targetMul && (mustMul || random() < bias);

      const value = isMul ? (mulCount++, pickMulValue()) : (random() < 0.5 ? 2 : 3);

      gates.push({
        x: curX + ws[c] / 2,
        y,
        w: ws[c],
        type:  isMul ? 'mul' : 'sub',
        value,
        alive: true,
        flash: 0,
      });
      curX += ws[c] + gn[c + 1];
    }
  }
}

// ============================================================
//  绘制
// ============================================================

function drawMgBackground() {
  noStroke();
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);
}

function drawGates() {
  textFont('monospace');
  for (const g of gates) {
    if (g.type === 'sub' && !g.alive) continue;

    const isMul = g.type === 'mul';
    const col   = isMul ? color(255, 180, 0) : color(220, 50, 50);

    // 闪光光晕
    if (g.flash > 0) {
      fill(red(col), green(col), blue(col), 70);
      noStroke();
      rect(g.x - g.w/2 - 6, g.y - GATE_H/2 - 6, g.w + 12, GATE_H + 12, 8);
      g.flash--;
    }

    // 门体
    fill(col); noStroke();
    rect(g.x - g.w/2, g.y - GATE_H/2, g.w, GATE_H, 6);

    // 标签
    fill(255);
    textSize(g.w < 80 ? 11 : 14);
    textAlign(CENTER, CENTER);
    text((isMul ? '×' : '-') + g.value, g.x, g.y);
  }
  textAlign(LEFT, BASELINE);
}

function drawBalls() {
  fill(0, 200, 255); noStroke();
  for (const b of balls) {
    if (!b.alive) continue;
    circle(b.x, b.y, B_R * 2);
  }
}

function drawHUD() {
  noStroke(); fill(0, 0, 0, 180);
  rect(0, 0, width, HUD_HEIGHT);

  fill(220); textFont('monospace'); textSize(13);
  text(`在途: ${balls.filter(b => b.alive).length + spawnQueue.length}`, 14, 30);
  text(`落底: ${landedCount}`, 140, 30);
  text(`预计: ¥${floor(landedCount * 1.5)}`, 270, 30);
}

function drawAim() {
  stroke(255, 255, 0, 70); strokeWeight(1);
  line(aimX, HUD_HEIGHT, aimX, height);

  noStroke(); fill(255, 220, 0, 200);
  textFont('monospace'); textSize(14); textAlign(CENTER, CENTER);
  text('移动鼠标瞄准，点击发射', width / 2, height / 2);
  textAlign(LEFT, BASELINE);
}

function drawResult() {
  const cx = width / 2, cy = height / 2;
  noStroke(); fill(0, 0, 0, 200);
  rect(cx - 160, cy - 80, 320, 160, 10);

  fill(255); textFont('monospace'); textAlign(CENTER, CENTER);
  textSize(14); text(`落底 ${landedCount} 个小球`, cx, cy - 28);
  textSize(28); fill(255, 220, 40); text(`+ ¥${minigameResult}`, cx, cy + 16);

  // 倒计时进度条
  const t = resultFrames / RESULT_DUR;
  noStroke(); fill(50); rect(cx - 100, cy + 52, 200, 6, 3);
  fill(0, 180, 255); rect(cx - 100, cy + 52, 200 * t, 6, 3);

  textAlign(LEFT, BASELINE);
}