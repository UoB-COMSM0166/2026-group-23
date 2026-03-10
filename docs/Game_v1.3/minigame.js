// ============================================================
//  minigame.js — 投球小游戏（门版）
//  玩法：玩家点击选择 X 位置发射小球
//        小球穿过竖排的"门"（+N / -N / ×N）改变数量
//        最终落底结算 → 金币
//  状态: 'idle' → 'aiming' → 'playing' → 'result'
// ============================================================

let minigameState     = 'idle';
let minigameResult    = 0;
let minigameInitBalls = 10;

// ── 面板区域 ──
let MG = { x:0, y:0, w:0, h:0 };

// ── 小球 ──
// { x, y, vx, vy, alive, settled }
let mgBalls = [];
const BALL_R      = 7;
const GRAVITY     = 0.13;   // 慢落
const WALL_BOUNCE = 0.42;
const FRICTION    = 0.984;

// ── 瞄准 ──
let aimX        = 0;    // 玩家选定的发射 X
let aimConfirmed = false;

// ── 发射节奏 ──
let shootTimer  = 0;
let shootCount  = 0;   // 已发射数
let shootTotal  = 0;   // 本局发射总数（随门触发动态变化）
let shootDone   = false;

// ── 门 ──
// { x, y, w, h, type:'add'|'sub'|'mul', value, label, col, triggered, flashTimer }
// 每列门横向排列，小球穿过触发
let mgGates = [];

// ── 结算 ──
let resultTimer   = 0;
const RESULT_SHOW = 200;

// ── 粒子 ──
let mgParticles = [];

// ── 落底球数 ──
let landedBalls = 0;

// ── 待添加队列（避免迭代中修改数组） ──
let spawnQueue = [];

// ============================================================
//  对外接口
// ============================================================
function startMinigame() {
  minigameState  = 'aiming';
  minigameResult = 0;
  mgBalls        = [];
  mgGates        = [];
  mgParticles    = [];
  spawnQueue     = [];
  shootTimer     = 0;
  shootCount     = 0;
  shootTotal     = minigameInitBalls;
  shootDone      = false;
  aimConfirmed   = false;
  landedBalls    = 0;

  MG.x = 0;
  MG.y = HUD_HEIGHT;
  MG.w = width;
  MG.h = height - HUD_HEIGHT;

  aimX = MG.x + MG.w / 2;

  generateGates();
}

function endMinigame() {
  coins        += minigameResult;
  minigameState = 'idle';
}

function updateMinigame() {
  if (minigameState === 'idle' || minigameState === 'aiming') return;

  if (minigameState === 'playing') {
    shootBalls();

    // 把待生成球加入（安全，不在迭代中修改）
    for (const b of spawnQueue) mgBalls.push(b);
    spawnQueue = [];

    updateMgBalls();
    updateMgGates();
    updateMgParticles();
    checkSettlement();
  }

  if (minigameState === 'result') {
    resultTimer--;
    if (resultTimer <= 0) endMinigame();
  }
}

function drawMinigame() {
  if (minigameState === 'idle') return;
  drawMgBackground();
  drawMgGates();
  drawMgBalls();
  drawMgParticles();
  drawMgHUD();
  if (minigameState === 'aiming') drawAimUI();
  if (minigameState === 'result') drawResultUI();
}

// 鼠标点击
function handleMinigameClick(mx, my) {
  if (minigameState === 'idle') return false;
  if (minigameState === 'aiming') {
    aimX          = constrain(mx, MG.x + 20, MG.x + MG.w - 20);
    aimConfirmed  = true;
    minigameState = 'playing';
  }
  return true;
}

// 鼠标移动（瞄准阶段跟随）
function handleMinigameMove(mx, my) {
  if (minigameState === 'aiming') {
    aimX = constrain(mx, MG.x + 20, MG.x + MG.w - 20);
  }
}

// ============================================================
//  门生成
//  布局：6 行，每行 2~3 个门，横向错开
//  类型比例：约 2 个加/乘门、1 个减门
// ============================================================
// ── 门池配置 ──
// × 门：标准权重池（困难/默认）
const MUL_POOL_NORMAL = [
  { value:2, label:'×2', col:[255, 210,  0], weight:35 },
  { value:3, label:'×3', col:[255, 175,  0], weight:28 },
  { value:4, label:'×4', col:[255, 140,  0], weight:18 },
  { value:5, label:'×5', col:[255, 105, 10], weight: 9 },
  { value:6, label:'×6', col:[255,  75, 20], weight: 5 },
  { value:7, label:'×7', col:[255,  50, 35], weight: 3 },
  { value:8, label:'×8', col:[240,  30, 50], weight: 1 },
  { value:9, label:'×9', col:[220,  10, 60], weight: 1 },
];
// × 门：简单权重池（高倍率概率大幅提升）
const MUL_POOL_EASY = [
  { value:2, label:'×2', col:[255, 210,  0], weight:15 },
  { value:3, label:'×3', col:[255, 175,  0], weight:20 },
  { value:4, label:'×4', col:[255, 140,  0], weight:22 },
  { value:5, label:'×5', col:[255, 105, 10], weight:18 },
  { value:6, label:'×6', col:[255,  75, 20], weight:13 },
  { value:7, label:'×7', col:[255,  50, 35], weight: 7 },
  { value:8, label:'×8', col:[240,  30, 50], weight: 4 },
  { value:9, label:'×9', col:[220,  10, 60], weight: 1 },
];
// - 门：简单模式（小扣）
const SUB_POOL_EASY = [
  { value:2, label:'-2', col:[220, 55, 55] },
  { value:3, label:'-3', col:[210, 40, 40] },
];
// - 门：困难模式（大扣）
const SUB_POOL_HARD = [
  { value:4, label:'-4', col:[230, 40, 40] },
  { value:5, label:'-5', col:[220, 25, 25] },
  { value:6, label:'-6', col:[200, 10, 10] },
];

// 兼容旧引用
const MUL_POOL = MUL_POOL_NORMAL;
const SUB_POOL = SUB_POOL_EASY;

function pickMul() {
  const pool = (typeof gameDifficulty !== 'undefined' && gameDifficulty === 'easy')
    ? MUL_POOL_EASY : MUL_POOL_NORMAL;
  const total = pool.reduce((s, m) => s + m.weight, 0);
  let r = random(total);
  for (const m of pool) { r -= m.weight; if (r <= 0) return m; }
  return pool[0];
}

function pickSub() {
  const pool = (typeof gameDifficulty !== 'undefined' && gameDifficulty === 'difficult')
    ? SUB_POOL_HARD : SUB_POOL_EASY;
  return random(pool);
}

function generateGates() {
  mgGates = [];

  const rows    = 5;
  const usableH = MG.h - 130;
  const stepY   = usableH / (rows + 1);
  const gateH   = 34;
  const innerL  = MG.x + 28;
  const innerW  = MG.w - 56;

  const minGW = floor(MG.w / 7);
  const maxGW = floor(MG.w / 4);

  const TARGET_MUL = floor(random(3, 7));
  let mulCount = 0;

  // 弹跳门：0~2 个，记录哪些行/列位置已放置，后面插入
  const bounceCount  = floor(random(3));   // 0, 1, 2
  const bounceSlots  = [];   // { row, col } 记录坑位

  for (let row = 0; row < rows; row++) {
    const y = MG.y + 80 + stepY * (row + 1);
    const rCount = random();
    const count = rCount < 0.25 ? 1 : rCount < 0.75 ? 2 : 3;

    const widths = Array.from({length: count}, () => floor(random(minGW, maxGW)));
    const rawTotal = widths.reduce((a, b) => a + b, 0);
    const maxTotal = innerW - 16 * (count + 1);
    const scale    = rawTotal > maxTotal ? maxTotal / rawTotal : 1;
    const finalW   = widths.map(w => floor(w * scale));

    const usedW = finalW.reduce((a, b) => a + b, 0);
    const freeW = innerW - usedW;
    const gaps  = Array.from({length: count + 1}, () => random(0.5, 1.5));
    const gapSum = gaps.reduce((a, b) => a + b, 0);
    const gaps_n = gaps.map(g => (g / gapSum) * freeW);

    let curX = innerL + gaps_n[0];

    for (let c = 0; c < count; c++) {
      const remaining = rows - row;
      const mulLeft   = TARGET_MUL - mulCount;
      const mustMul   = mulLeft >= remaining * count;
      const mulBias   = row < 3 ? 0.60 : 0.35;
      const placeMul  = mulCount < TARGET_MUL && (mustMul || random() < mulBias);

      let def;
      if (placeMul) {
        const m = pickMul();
        def = { type:'mul', value: m.value, label: m.label, col: [...m.col] };
        mulCount++;
      } else {
        const s = pickSub();
        def = { type:'sub', value: s.value, label: s.label, col: [...s.col] };
      }

      mgGates.push({
        x: curX + finalW[c] / 2,
        y,
        w: finalW[c],
        h: gateH,
        type: def.type, value: def.value,
        label: def.label, col: def.col,
        triggered: false,
        flashTimer: 0,
      });
      bounceSlots.push({ gateIdx: mgGates.length - 1, row, col: c });

      curX += finalW[c] + gaps_n[c + 1];
    }
  }

  // ── 随机替换 bounceCount 个普通门为弹跳门 ──
  if (bounceCount > 0 && bounceSlots.length > 0) {
    // 打乱并取前 bounceCount 个
    for (let i = bounceSlots.length - 1; i > 0; i--) {
      const j = floor(random(i + 1));
      [bounceSlots[i], bounceSlots[j]] = [bounceSlots[j], bounceSlots[i]];
    }
    for (let k = 0; k < min(bounceCount, bounceSlots.length); k++) {
      const idx = bounceSlots[k].gateIdx;
      const g   = mgGates[idx];
      g.type      = 'bounce';
      g.value     = 0;
      g.label     = '↯';
      g.col       = [180, 60, 255];
      g.triggered = false;   // 弹跳门可多次触发（每球触发一次）
    }
  }
}

// ============================================================
//  发射小球
// ============================================================
function shootBalls() {
  if (shootDone) return;
  shootTimer++;
  // 每 4 帧发射 1 个，模拟连发
  if (shootTimer % 4 === 0 && shootCount < shootTotal) {
    shootCount++;
    const ang = random(-0.22, 0.22);
    const spd = random(1.2, 2.2);
    mgBalls.push({
      x:  aimX + random(-6, 6),
      y:  MG.y + 28,
      vx: sin(ang) * spd,
      vy: cos(ang) * spd * 0.25 + 0.5,
      alive: true, settled: false,
    });
  }
  if (shootCount >= shootTotal) {
    shootDone = true;
  }
}

// ============================================================
//  物理更新
// ============================================================
function updateMgBalls() {
  const wallL  = MG.x + 20;
  const wallR  = MG.x + MG.w - 20;
  const floorY = MG.y + MG.h - 20;

  for (const b of mgBalls) {
    if (!b.alive) continue;

    b.vy += GRAVITY;
    b.vx *= FRICTION;
    b.x  += b.vx;
    b.y  += b.vy;

    // 左右墙弹
    if (b.x - BALL_R < wallL) {
      b.x  = wallL + BALL_R;
      b.vx = abs(b.vx) * WALL_BOUNCE + random(0.1, 0.4);
    }
    if (b.x + BALL_R > wallR) {
      b.x  = wallR - BALL_R;
      b.vx = -(abs(b.vx) * WALL_BOUNCE + random(0.1, 0.4));
    }

    // 落底
    if (b.y - BALL_R > floorY) {
      b.alive   = false;
      b.settled = true;
      landedBalls++;
      spawnMgPart(b.x, floorY, color(0, 200, 255), 3);
    }
  }
}

// ============================================================
//  门碰撞 & 触发
//  × 门：每个球穿过时独立分裂（原球消失 → 生成 N 个子球扇形散射）
//  - 门：一次性，消灭 N 个在场球
// ============================================================
function updateMgGates() {
  for (const g of mgGates) {
    if (g.flashTimer > 0) g.flashTimer--;

    for (const b of mgBalls) {
      if (!b.alive || b.settled) continue;

      const hw = g.w / 2 + BALL_R;
      const hh = g.h / 2 + BALL_R;
      if (abs(b.x - g.x) < hw && abs(b.y - g.y) < hh) {
        triggerGate(g, b);
      }
    }
  }
}

function triggerGate(g, ball) {
  if (g.type === 'bounce') {
    // 每个球维护一个已弹跳过的门的 Set，弹过的门永远不再重复触发
    if (!ball._bouncedGates) ball._bouncedGates = new Set();
    if (ball._bouncedGates.has(g)) return;
    ball._bouncedGates.add(g);
    g.flashTimer = 35;

    // 强力弹飞：反转 vy，随机偏转 vx
    const spd = Math.max(Math.hypot(ball.vx, ball.vy), 2.2);
    const ang  = random(-PI * 0.35, PI * 0.35);
    ball.vx = sin(ang) * spd * random(1.1, 1.6);
    ball.vy = -abs(cos(ang)) * spd * random(1.0, 1.4);  // 向上弹

    spawnMgPart(g.x, g.y, color(...g.col), 10);
    return;
  }

  if (g.type === 'mul') {
    // × 门：每个球独立分裂，不限制触发次数
    // 用 ball 身上的标记防止同一帧重复触发同一门
    if (ball._lastGate === g) return;
    ball._lastGate = g;

    g.flashTimer = 40;

    // 原球消失，在门出口生成 value 个子球
    ball.alive = false;
    const exitY  = g.y + g.h / 2 + BALL_R + 2;
    const baseSpd = Math.max(Math.hypot(ball.vx, ball.vy), 1.5);

    for (let i = 0; i < g.value; i++) {
      const totalArc = PI * 0.24;
      const ang = -totalArc / 2 + (i / (g.value - 1 || 1)) * totalArc + random(-0.06, 0.06);
      const spd = baseSpd * random(0.85, 1.15);
      spawnQueue.push({
        x:  ball.x + sin(ang) * (BALL_R * 1.2),
        y:  exitY,
        vx: sin(ang) * spd,
        vy: abs(cos(ang)) * spd * 0.5 + 0.6,
        alive: true, settled: false,
        _lastGate: g,
        // 子球继承父球已弹跳过的门集合（拷贝一份，避免共享引用）
        _bouncedGates: ball._bouncedGates ? new Set(ball._bouncedGates) : new Set(),
      });
    }
    spawnMgPart(g.x, g.y, color(...g.col), 16);

  } else {
    // - 门：一次性，消灭 N 个活跃球
    if (g.triggered) return;
    g.triggered  = true;
    g.flashTimer = 45;

    let killed = 0;
    // 优先消灭离门最近的球
    const alive = mgBalls.filter(b => b.alive && !b.settled)
      .sort((a, b) => dist(a.x, a.y, g.x, g.y) - dist(b.x, b.y, g.x, g.y));
    for (const b of alive) {
      if (killed >= g.value) break;
      spawnMgPart(b.x, b.y, color(...g.col), 8);
      b.alive = false;
      killed++;
    }
    spawnMgPart(g.x, g.y, color(...g.col), 12);
  }
}

// ============================================================
//  结算检测
// ============================================================
function checkSettlement() {
  if (!shootDone) return;
  if (spawnQueue.length > 0) return;
  const alive = mgBalls.filter(b => b.alive).length;
  if (alive === 0) {
    minigameResult = Math.floor(landedBalls * 1.5);
    minigameState  = 'result';
    resultTimer    = RESULT_SHOW;
  }
}

// ============================================================
//  绘制：背景（保持游戏科幻风格，用深蓝半透明遮罩）
// ============================================================
function drawMgBackground() {
  noStroke();
  fill(2, 5, 18, 225);
  rect(MG.x, MG.y, MG.w, MG.h);

  // 网格
  stroke(0, 150, 220, 14); strokeWeight(1);
  for (let x = MG.x; x < MG.x + MG.w; x += 40) line(x, MG.y, x, MG.y + MG.h);
  for (let y = MG.y; y < MG.y + MG.h; y += 40) line(MG.x, y, MG.x + MG.w, y);

  // 底部落地线
  stroke(0, 200, 255, 100); strokeWeight(1.5);
  line(MG.x, MG.y + MG.h - 20, MG.x + MG.w, MG.y + MG.h - 20);
}

// ============================================================
//  绘制：门
// ============================================================
function drawMgGates() {
  textFont('monospace');

  for (const g of mgGates) {
    const [r, gn, b] = g.col;
    const flash  = g.flashTimer / 45;
    const faded  = g.triggered && g.type === 'sub';   // -门触发后变暗
    const alpha  = faded ? 55 : 215;
    const isMul  = g.type === 'mul';

    // ── 弹跳门专属外观 ──
    if (g.type === 'bounce') {
      const [r2, g2, b2] = g.col;
      const t2 = sin(frameCount * 0.22) * 0.5 + 0.5;
      // 外发光
      noStroke(); fill(r2, g2, b2, 18 + t2 * 28);
      rect(g.x - g.w/2 - 10, g.y - g.h/2 - 10, g.w + 20, g.h + 20, 14);
      // 门底色
      fill(r2 * 0.2, g2 * 0.2, b2 * 0.3, 220);
      rect(g.x - g.w/2, g.y - g.h/2, g.w, g.h, 8);
      // 门面渐变（紫到蓝紫）
      fill(r2, g2, b2, 180 + t2 * 60);
      rect(g.x - g.w/2, g.y - g.h/2, g.w, g.h - 5, 8);
      // 高光
      fill(220, 180, 255, 80 + t2 * 80);
      rect(g.x - g.w/2 + 5, g.y - g.h/2 + 4, g.w - 10, 4, 3);
      // 闪电锯齿线
      stroke(220, 160, 255, 160 + t2 * 80); strokeWeight(1.8);
      const zx1 = g.x - g.w/2 + 10, zx2 = g.x + g.w/2 - 10;
      const zy  = g.y;
      const segs = 5;
      beginShape();
      for (let s = 0; s <= segs; s++) {
        const tx = lerp(zx1, zx2, s / segs);
        const ty = zy + (s % 2 === 0 ? -6 : 6) * t2;
        vertex(tx, ty);
      }
      endShape();
      // 角落闪电小图标
      noStroke(); fill(255, 220, 255, 140 + t2 * 100);
      textSize(9); textAlign(CENTER, CENTER);
      text('⚡', g.x - g.w/2 + 9, g.y - g.h/2 + 10);
      text('⚡', g.x + g.w/2 - 9, g.y - g.h/2 + 10);
      // 标签
      fill(255, 240, 255, 230 + t2 * 25);
      textSize(g.w < 70 ? 13 : g.w < 95 ? 16 : 18);
      text('↯ BOUNCE', g.x, g.y);
      // 触发闪光
      if (g.flashTimer > 0) {
        const fv = g.flashTimer / 35;
        noFill(); stroke(r2, g2, b2, fv * 240); strokeWeight(2 + fv * 6);
        rect(g.x - g.w/2 - (1-fv)*12, g.y - g.h/2 - (1-fv)*12,
             g.w + (1-fv)*24, g.h + (1-fv)*24, 12);
      }
      textAlign(LEFT, BASELINE);
      continue;   // 跳过后面的通用绘制
    }


    if (!faded) {
      noStroke();
      fill(r, gn, b, isMul ? 28 + flash * 35 : 18 + flash * 20);
      rect(g.x - g.w/2 - 8, g.y - g.h/2 - 8, g.w + 16, g.h + 16, 12);
      // ×6以上：稀有金边脉冲
      if (isMul && g.value >= 6) {
        const pulse = sin(frameCount * 0.18) * 0.5 + 0.5;
        noFill(); stroke(255, 230, 80, 120 * pulse); strokeWeight(2);
        rect(g.x - g.w/2 - 4, g.y - g.h/2 - 4, g.w + 8, g.h + 8, 10);
      }
    }

    // ── 门底色（深） ──
    noStroke();
    fill(r * 0.35, gn * 0.35, b * 0.35, alpha);
    rect(g.x - g.w/2, g.y - g.h/2, g.w, g.h, 8);

    // ── 门面 ──
    fill(r, gn, b, alpha + flash * 40);
    rect(g.x - g.w/2, g.y - g.h/2, g.w, g.h - 5, 8);

    // ── 高光条 ──
    fill(255, 255, 255, faded ? 15 : 55 + flash * 55);
    rect(g.x - g.w/2 + 5, g.y - g.h/2 + 4, g.w - 10, 4, 3);

    // ── -门专属斜纹 ──
    if (!isMul && !faded) {
      stroke(255, 130, 110, 100); strokeWeight(1.5);
      for (let tx = g.x - g.w/2 + 8; tx < g.x + g.w/2 - 4; tx += 13) {
        line(tx, g.y - g.h/2 + 3, tx - 9, g.y + g.h/2 - 3);
      }
    }

    // ── ×门专属闪烁菱形角标 ──
    if (isMul && !faded) {
      const ps = sin(frameCount * 0.15) * 0.4 + 0.6;
      noStroke(); fill(255, 255, 180, 120 * ps);
      const mx = g.x + g.w/2 - 10, my = g.y - g.h/2 + 10;
      beginShape();
      vertex(mx, my - 5); vertex(mx + 4, my);
      vertex(mx, my + 5); vertex(mx - 4, my);
      endShape(CLOSE);
    }

    // ── 标签（字号随门宽自适应）──
    noStroke();
    fill(255, 255, 255, faded ? 80 : 232 + flash * 23);
    const labelSize = g.w < 70 ? 11 : g.w < 95 ? 13 : 15;
    textSize(labelSize); textAlign(CENTER, CENTER);
    text(g.label, g.x, g.y);

    // ── 触发闪光环 ──
    if (g.flashTimer > 0) {
      noFill();
      stroke(r, gn, b, flash * 230);
      strokeWeight(2 + flash * 5);
      rect(g.x - g.w/2 - (1-flash)*14, g.y - g.h/2 - (1-flash)*14,
           g.w + (1-flash)*28, g.h + (1-flash)*28, 12);
    }
  }
  textAlign(LEFT, BASELINE);
}

// ============================================================
//  绘制：小球
// ============================================================
function drawMgBalls() {
  for (const b of mgBalls) {
    if (!b.alive) continue;
    noStroke();
    fill(0, 160, 255, 35);
    ellipse(b.x, b.y, BALL_R * 4.2, BALL_R * 4.2);
    fill(0, 200, 255, 210);
    ellipse(b.x, b.y, BALL_R * 2, BALL_R * 2);
    fill(180, 235, 255, 200);
    ellipse(b.x - BALL_R * 0.28, b.y - BALL_R * 0.28, BALL_R * 0.7, BALL_R * 0.7);
  }
}

// ============================================================
//  绘制：HUD 顶条
// ============================================================
function drawMgHUD() {
  noStroke(); fill(3, 7, 20, 220);
  rect(MG.x, MG.y, MG.w, 46);
  stroke(0, 140, 220, 80); strokeWeight(1);
  line(MG.x, MG.y + 46, MG.x + MG.w, MG.y + 46);

  textFont('monospace'); noStroke();
  fill(0, 160, 255); textSize(10); text('◈ 在途', MG.x + 16, MG.y + 16);
  fill(0, 220, 255); textSize(15);
  text(mgBalls.filter(b => b.alive).length + spawnQueue.length, MG.x + 16, MG.y + 35);

  fill(0, 160, 255); textSize(10); text('◈ 已落底', MG.x + 110, MG.y + 16);
  fill(0, 255, 170); textSize(15); text(landedBalls, MG.x + 110, MG.y + 35);

  fill(0, 160, 255); textSize(10); text('◈ 预计金币', MG.x + 210, MG.y + 16);
  fill(255, 225, 30); textSize(15); text('¥' + Math.floor(landedBalls * 1.5), MG.x + 210, MG.y + 35);

  if (minigameState === 'playing') {
    fill(0, 180, 255, 130); textSize(10);
    textAlign(RIGHT, BASELINE);
    text(shootDone ? '发射完毕' : ('已发 ' + shootCount + '/' + shootTotal), MG.x + MG.w - 16, MG.y + 35);
    textAlign(LEFT, BASELINE);
  }
}

// ============================================================
//  绘制：瞄准 UI
// ============================================================
function drawAimUI() {
  // 竖线瞄准线
  stroke(0, 200, 255, 55); strokeWeight(1.5);
  drawingContext.setLineDash([5, 9]);
  line(aimX, MG.y + 46, aimX, MG.y + MG.h - 24);
  drawingContext.setLineDash([]);

  // 准星
  const pulse = sin(frameCount * 0.14) * 0.4 + 0.6;
  noFill(); stroke(0, 220, 255, 180 * pulse); strokeWeight(2);
  ellipse(aimX, MG.y + 28, 28 + pulse * 4, 28 + pulse * 4);
  stroke(0, 220, 255, 130 * pulse); strokeWeight(1.5);
  line(aimX - 16, MG.y + 28, aimX + 16, MG.y + 28);
  line(aimX, MG.y + 28 - 16, aimX, MG.y + 28 + 16);
  // 球数
  fill(255, 220, 50, 220); noStroke(); textFont('monospace');
  textSize(10); textAlign(CENTER, CENTER);
  text('×' + shootTotal, aimX, MG.y + 28 + 24);

  // 提示
  fill(0, 200, 255, 200); textSize(13);
  text('Click to launch', MG.x + MG.w / 2, MG.y + MG.h / 2);
  text('Click to launch', MG.x + MG.w / 2, MG.y + MG.h / 2);
  textAlign(LEFT, BASELINE);
}

// ============================================================
//  绘制：结算面板
// ============================================================
function drawResultUI() {
  const t  = resultTimer / RESULT_SHOW;
  const cx = MG.x + MG.w / 2;
  const cy = MG.y + MG.h / 2;

  noStroke(); fill(2, 6, 20, 205);
  rect(cx - 172, cy - 98, 344, 196, 14);
  stroke(0, 180, 255, 160); strokeWeight(2); noFill();
  rect(cx - 170, cy - 96, 340, 192, 13);

  textFont('monospace'); textAlign(CENTER, CENTER); noStroke();
  fill(0, 200, 255, 225); textSize(13);
  text('— MINIGAME SETTLEMENT —', cx, cy - 68);

  fill(0, 255, 175, 220); textSize(14);
  text('LandedBalls：' + landedBalls + ' ', cx, cy - 32);

  fill(255, 215, 40, 240); textSize(34);
  text('+ ¥' + minigameResult, cx, cy + 12);

  fill(100, 175, 255, 175); textSize(10);
  text('CREDITS ADDED TO RESERVES', cx, cy + 50);

  noStroke(); fill(8, 20, 44);
  rect(cx - 112, cy + 70, 224, 8, 4);
  fill(0, 180, 255, 200);
  rect(cx - 112, cy + 70, 224 * t, 8, 4);

  textAlign(LEFT, BASELINE);
}

// ============================================================
//  粒子系统
// ============================================================
function spawnMgPart(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    const a = random(TWO_PI), s = random(1.2, 4.5);
    mgParticles.push({
      x, y, vx: cos(a)*s, vy: sin(a)*s - 0.8,
      life: 1.0, col, r: random(2, 5),
    });
  }
}

function updateMgParticles() {
  mgParticles = mgParticles.filter(p => p.life > 0);
  for (const p of mgParticles) {
    p.x  += p.vx; p.y += p.vy;
    p.vx *= 0.90; p.vy = p.vy * 0.90 + 0.12;
    p.life -= 0.036;
  }
}

function drawMgParticles() {
  for (const p of mgParticles) {
    noStroke();
    fill(red(p.col), green(p.col), blue(p.col), p.life * 215);
    ellipse(p.x, p.y, p.r * p.life * 2.4, p.r * p.life * 2.4);
  }
}

// ============================================================
//  拆除塔（供 ui.js 调用）
// ============================================================
function demolishTower(t) {
  const refund = Math.floor(TOWER_DEFS[t.type].cost * 0.8);
  coins += refund;
  towers = towers.filter(tower => tower !== t);
}