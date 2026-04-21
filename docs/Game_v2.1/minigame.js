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
let _bonusBallPending = 0;   // 触发 bonusball 门后，下一局开始时才加入 initBalls，结束后清零

// ── 问号帮助面板 ──
let _mgHelpOpen        = false;
let _mgHelpSeen        = false;   // 本次游戏会话是否已提示过
const MG_HELP_FLAG_KEY = 'qd_mg_help_seen';

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
  // 应用上一局的奖励球加成，然后立即重置（仅生效一局）
  shootTotal     = minigameInitBalls + _bonusBallPending;
  _bonusBallPending = 0;
  shootDone      = false;
  aimConfirmed   = false;
  landedBalls    = 0;

  _mgHelpOpen = false;
  // 检查是否曾经看过帮助（首次进入显示引导箭头）
  try { _mgHelpSeen = localStorage.getItem(MG_HELP_FLAG_KEY) === '1'; } catch(e) { _mgHelpSeen = false; }

  MG.x = 0;
  MG.y = HUD_HEIGHT;
  MG.w = width;
  MG.h = height - HUD_HEIGHT;

  _mgStars = null;   // 重新按实际尺寸生成星场
  aimX = MG.x + MG.w / 2;

  generateGates();
}

function endMinigame() {
  coins        += minigameResult;
  minigameState = 'idle';
}

function updateMinigame() {
  if (minigameState === 'idle') return;

  // 瞄准阶段也要更新门的滑动位置，让玩家发射前就能看到门在动
  if (minigameState === 'aiming') {
    updateMgGates();
    return;
  }

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
  drawMgHelpBtn();
  if (!_mgHelpSeen) drawMgHelpGuide();
  if (_mgHelpOpen)  drawMgHelpPanel();
  if (minigameState === 'aiming') drawAimUI();
  if (minigameState === 'result') drawResultUI();
}

// 鼠标点击
function handleMinigameClick(mx, my) {
  if (minigameState === 'idle') return false;

  // 问号帮助按钮
  const hb = _mgHelpBtnRect();
  if (_mgInRect(mx, my, hb)) {
    _mgHelpOpen = !_mgHelpOpen;
    if (!_mgHelpSeen) {
      _mgHelpSeen = true;
      try { localStorage.setItem(MG_HELP_FLAG_KEY, '1'); } catch(e) {}
    }
    return true;
  }
  // 面板打开时点任意处关闭
  if (_mgHelpOpen) { _mgHelpOpen = false; return true; }

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

function _getMinigameProfile() {
  const lv = constrain((typeof currentLevel !== 'undefined' ? currentLevel : 1), 1, 5);
  const info = (typeof LEVEL_INFO !== 'undefined' && LEVEL_INFO[lv]) ? LEVEL_INFO[lv] : null;
  const threat = info ? constrain(info.threat || lv, 1, 5) : lv;
  const hard = (typeof gameDifficulty !== 'undefined' && gameDifficulty === 'difficult');

  // 基础布局参数：困难更密、行更多；高关卡再逐步提升复杂度
  const rows = constrain((hard ? 5 : 4) + (threat >= 3 ? 1 : 0), 4, 6);
  // 困难模式提高 mulBias，减少减法门比例
  const targetMulMin = hard ? max(3, 4 - floor(threat / 3)) : 4;
  const targetMulMax = hard ? 6 : 6;
  const bounceMin = hard ? 1 : 1;   // 简单也保底1个
  const bounceMax = hard ? (threat >= 4 ? 3 : 2) : 2;  // 略微提高上限

  return {
    lv,
    threat,
    hard,
    rows,
    targetMulMin,
    targetMulMax,
    bounceMin,
    bounceMax,
    // row 门数量概率（1~3门）
    rowCountWeights: hard ? [0.12, 0.48, 0.40] : [0.26, 0.54, 0.20],
    // 困难模式提高乘法门偏置，变相减少减法门数量
    mulBiasTop: hard ? 0.68 : 0.68,
    mulBiasBottom: hard ? 0.42 : 0.40,
    // 难度越高门越窄
    minGateDiv: hard ? 8.8 : 7.4,
    maxGateDiv: hard ? 4.7 : 4.2,
    // 奖励球门出现概率（每局最多 1 个，约 40% 概率出现）
    bonusBallProb: 0.40,
  };
}

function _pickRowGateCount(weights) {
  const r = random();
  if (r < weights[0]) return 1;
  if (r < weights[0] + weights[1]) return 2;
  return 3;
}

function _calcScoreBalanced(landed, profile) {
  // 平衡版：收益更稳定，波动小
  const difficultyMul = profile.hard ? 1.08 : 1.0;
  const levelMul = 1 + (profile.threat - 1) * 0.10;
  const perBall = 1.5;
  const raw = floor(landed * perBall * difficultyMul * levelMul);
  const floorScore = 3 + profile.threat + (profile.hard ? 1 : 0);
  return max(raw, floorScore);
}

function _calcScoreClassicJackpot(landed, profile) {
  // 单一平滑公式：score = 2000 * (1 - exp(-k * x^p))
  // 拟合锚点 50→250, 500→1500，后续极缓慢趋近 2000
  // p=1.0163, k=0.002506（由两点联立方程解得）
  const P = 1.0163, K = 0.002506;
  const base = 2000 * (1 - Math.exp(-K * Math.pow(Math.max(landed, 0), P)));

  const levelMul = 1 + (profile.threat - 1) * 0.08;
  const difficultyMul = profile.hard ? 1.08 : 1.0;
  const raw = floor(base * levelMul * difficultyMul);

  const floorScore = 3 + profile.threat + (profile.hard ? 1 : 0);
  return max(raw, floorScore);
}

function _calcMinigameScore(landed) {
  const profile = _getMinigameProfile();
  const scoreMode = 'stable_balanced';

  if (scoreMode === 'stable_balanced') return _calcScoreBalanced(landed, profile);
  if (scoreMode === 'classic_jackpot') return _calcScoreClassicJackpot(landed, profile);
  return _calcScoreClassicJackpot(landed, profile);
}

function generateGates() {
  mgGates = [];
  const profile = _getMinigameProfile();
  const rows    = profile.rows;
  const usableH = MG.h - 130;
  const stepY   = usableH / (rows + 1);
  const gateH   = 34;
  const innerL  = MG.x + 28;
  const innerW  = MG.w - 56;

  const minGW = floor(MG.w / profile.minGateDiv);
  const maxGW = floor(MG.w / profile.maxGateDiv);

  const TARGET_MUL = floor(random(profile.targetMulMin, profile.targetMulMax + 1));
  let mulCount = 0;

  // 弹跳门数量按难度/关卡决定，记录可替换坑位（仍禁止上两层）
  const bounceCount  = floor(random(profile.bounceMin, profile.bounceMax + 1));
  const bounceSlots  = [];   // { row, col } 记录坑位

  for (let row = 0; row < rows; row++) {
    const y = MG.y + 80 + stepY * (row + 1);
    const count = _pickRowGateCount(profile.rowCountWeights);

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
      const rowT      = rows <= 1 ? 0 : row / (rows - 1);
      const mulBias   = lerp(profile.mulBiasTop, profile.mulBiasBottom, rowT);
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

      // ── 滑动门：行 ≥ 1 时约 30% 概率变为左右滑动 ──
      const isSliding = row >= 1 && random() < 0.30;
      const gateBaseX = curX + finalW[c] / 2;
      // 滑动范围：感知两侧空闲空间，空间越大范围越大
      let slideRange = 0;
      if (isSliding) {
        const spaceL = gateBaseX - finalW[c] / 2 - innerL;
        const spaceR = (innerL + innerW) - (gateBaseX + finalW[c] / 2);
        const freeSpace = min(spaceL, spaceR);
        slideRange = constrain(freeSpace * 0.55, 18, 120);

        // 防止与同行已有的滑动门运动区间重叠
        // 同行门列表：当前 row 中已生成的门
        const rowGates = mgGates.filter(gg => gg.row === row);
        for (const gg of rowGates) {
          if (!gg.sliding) continue;
          // gg 的运动区间：[gg.slideBaseX - gg.slideRange - gg.w/2, gg.slideBaseX + gg.slideRange + gg.w/2]
          const ggLeft  = gg.slideBaseX - gg.slideRange - gg.w / 2;
          const ggRight = gg.slideBaseX + gg.slideRange + gg.w / 2;
          const myLeft  = gateBaseX - finalW[c] / 2;
          const myRight = gateBaseX + finalW[c] / 2;

          // 如果当前门在已有门右侧，左边界不能越过 ggRight；反之同理
          if (myLeft >= gg.slideBaseX) {
            // 当前门在右边：左端 + slideRange 不能碰到 ggRight
            const maxR = myLeft - ggRight - 4;   // 4px 安全间距
            slideRange = constrain(slideRange, 0, max(0, maxR));
          } else {
            // 当前门在左边：右端 + slideRange 不能碰到 ggLeft
            const maxR = ggLeft - myRight - 4;
            slideRange = constrain(slideRange, 0, max(0, maxR));
          }
        }
        // 裁剪后如果范围过小就取消滑动
        if (slideRange < 10) slideRange = 0;
      }
      // 滑动速度（每帧像素）：随机方向，困难模式更快
      const finalSliding = isSliding && slideRange >= 10;
      const slideSpeed = finalSliding
        ? random(profile.hard ? 0.8 : 0.5, profile.hard ? 1.6 : 1.1) * (random() < 0.5 ? 1 : -1)
        : 0;

      mgGates.push({
        x: gateBaseX,
        y,
        w: finalW[c],
        h: gateH,
        row,
        type: def.type, value: def.value,
        label: def.label, col: def.col,
        triggered: false,
        flashTimer: 0,
        // 滑动属性
        sliding:    finalSliding,
        slideBaseX: gateBaseX,
        slideRange,
        slideSpeed,
        slidePhase: random(TWO_PI),   // 初始相位错开，避免所有门同步运动
      });
      // 弹力板不允许出现在最上两层（row 0 / 1）
      if (row >= 2) bounceSlots.push({ gateIdx: mgGates.length - 1, row, col: c });

      curX += finalW[c] + gaps_n[c + 1];
    }
  }

  // 保证下半区至少有一个 × 门，避免全负门导致体验过硬
  const lowerRow = floor(rows / 2);
  const hasLowerMul = mgGates.some(g => g.row >= lowerRow && g.type === 'mul');
  if (!hasLowerMul) {
    const candidates = mgGates.filter(g => g.row >= lowerRow && g.type !== 'bounce');
    if (candidates.length > 0) {
      const g = random(candidates);
      const m = pickMul();
      g.type = 'mul';
      g.value = m.value;
      g.label = m.label;
      g.col = [...m.col];
      g.triggered = false;
      g.flashTimer = 0;
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

  // ── 随机插入奖励球门（每局最多 1 个，约 bonusBallProb 概率出现）──
  // 从中间行中随机挑一个普通门替换，不覆盖 bounce 门
  if (random() < profile.bonusBallProb) {
    const midStart = floor(rows * 0.3);
    const candidates = mgGates.filter(g => g.row >= midStart && g.type !== 'bounce');
    if (candidates.length > 0) {
      const g = random(candidates);
      g.type      = 'bonusball';
      g.value     = 10;          // 下一局 +10 初始球
      g.label     = '+10🎱';
      g.col       = [50, 230, 120];
      g.triggered = false;
      g.flashTimer = 0;
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

    // ── 滑动门位置更新 ──
    if (g.sliding) {
      g.slidePhase += g.slideSpeed * 0.045;
      g.x = g.slideBaseX + sin(g.slidePhase) * g.slideRange;
      // 硬夹边：门不能超出可用区域
      const halfW = g.w / 2 + 8;
      const minX  = MG.x + 28 + halfW;
      const maxX  = MG.x + MG.w - 28 - halfW;
      g.x = constrain(g.x, minX, maxX);
    }
  }

  // ── 同行滑动门互斥推开（防止快速移动时重叠）──
  const GATE_PAD = 4;  // 最小间距
  // 按行分组处理
  const rowMap = {};
  for (const g of mgGates) {
    if (!rowMap[g.row]) rowMap[g.row] = [];
    rowMap[g.row].push(g);
  }
  for (const rowGates of Object.values(rowMap)) {
    // 只对含滑动门的行处理
    const sliding = rowGates.filter(g => g.sliding);
    if (sliding.length === 0) continue;
    // 按 x 排序，逐对推开
    rowGates.sort((a, b) => a.x - b.x);
    for (let i = 0; i < rowGates.length - 1; i++) {
      const a = rowGates[i], b = rowGates[i + 1];
      const minDist = a.w / 2 + b.w / 2 + GATE_PAD;
      const overlap = minDist - (b.x - a.x);
      if (overlap > 0) {
        // 只推开滑动的那个（或各推一半）
        const aMoves = a.sliding, bMoves = b.sliding;
        if (aMoves && bMoves) {
          a.x -= overlap / 2;
          b.x += overlap / 2;
        } else if (aMoves) {
          a.x -= overlap;
        } else if (bMoves) {
          b.x += overlap;
        }
        // 推开后再夹边
        const clamp = (g) => {
          const hw = g.w / 2 + 8;
          g.x = constrain(g.x, MG.x + 28 + hw, MG.x + MG.w - 28 - hw);
        };
        clamp(a); clamp(b);
      }
    }
  }

  // ── 球碰门触发 ──
  for (const g of mgGates) {
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

  } else if (g.type === 'bonusball') {
    // 奖励球门：一次性触发，仅下一局 +10，之后恢复原值
    if (g.triggered) return;
    g.triggered  = true;
    g.flashTimer = 55;
    _bonusBallPending += g.value;   // 存入待用池，下局 startMinigame 时消费
    spawnMgPart(g.x, g.y, color(...g.col), 20);

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
    minigameResult = _calcMinigameScore(landedBalls);
    minigameState  = 'result';
    resultTimer    = RESULT_SHOW;
  }
}

// ============================================================
//  绘制：背景（科幻量子空间风格）
// ============================================================
let _mgStars = null;
function _initMgStars() {
  _mgStars = [];
  for (let i = 0; i < 110; i++) {
    _mgStars.push({
      x: random(MG.w), y: random(MG.h),
      r: random(0.5, 2.2),
      spd: random(0.003, 0.012),
      phase: random(TWO_PI),
    });
  }
}

function drawMgBackground() {
  if (!_mgStars || _mgStars.length === 0) _initMgStars();
  push();
  // 深空底色渐变：上深蓝 -> 下深紫
  noStroke();
  for (let y = 0; y < MG.h; y += 3) {
    const t = y / MG.h;
    fill(lerp(2,8,t), lerp(5,4,t), lerp(22,16,t), 255);
    rect(MG.x, MG.y + y, MG.w, 3);
  }
  // 星场（闪烁）
  for (const s of _mgStars) {
    const bri = sin(frameCount * s.spd + s.phase) * 0.45 + 0.55;
    noStroke(); fill(180, 210, 255, bri * 155);
    ellipse(MG.x + s.x, MG.y + s.y, s.r * 2, s.r * 2);
  }
  // 横向扫描光带（慢速下移）
  const scanY = ((frameCount * 0.4) % (MG.h + 60)) - 30;
  noStroke();
  for (let dy = 0; dy < 28; dy++) {
    fill(0, 160, 255, sin(dy / 28 * PI) * 18);
    rect(MG.x, MG.y + scanY + dy, MG.w, 1);
  }
  // 网格（轻量）
  stroke(0, 130, 210, 10); strokeWeight(1);
  for (let x = MG.x; x < MG.x + MG.w; x += 52) line(x, MG.y, x, MG.y + MG.h);
  for (let y = MG.y; y < MG.y + MG.h; y += 52) line(MG.x, y, MG.x + MG.w, y);
  // 扫描线纹理
  noStroke(); fill(0, 0, 0, 14);
  for (let y = MG.y; y < MG.y + MG.h; y += 4) rect(MG.x, y, MG.w, 2);
  // 边缘内框
  noFill(); stroke(0, 180, 255, 65); strokeWeight(1.2);
  rect(MG.x + 8, MG.y + 8, MG.w - 16, MG.h - 16, 8);
  // 底部落地线
  stroke(0, 200, 255, 120); strokeWeight(1.6);
  line(MG.x + 10, MG.y + MG.h - 20, MG.x + MG.w - 10, MG.y + MG.h - 20);
  // 四边渐暗压边
  noStroke();
  for (let i = 0; i < 32; i++) {
    fill(0, 0, 0, lerp(40, 0, i / 32));
    rect(MG.x, MG.y + i, MG.w, 1);
    rect(MG.x, MG.y + MG.h - i - 1, MG.w, 1);
    rect(MG.x + i, MG.y, 1, MG.h);
    rect(MG.x + MG.w - i - 1, MG.y, 1, MG.h);
  }
  pop();
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

    // ── 奖励球门专属外观 ──
    if (g.type === 'bonusball') {
      const [r3, g3, b3] = g.col;
      const t3 = sin(frameCount * 0.18) * 0.5 + 0.5;
      const faded3 = g.triggered;
      const alpha3 = faded3 ? 60 : 215;
      // 外光晕（绿色）
      noStroke(); fill(r3, g3, b3, faded3 ? 8 : 20 + t3 * 30);
      rect(g.x - g.w/2 - 12, g.y - g.h/2 - 12, g.w + 24, g.h + 24, 16);
      // 底色
      fill(r3 * 0.15, g3 * 0.25, b3 * 0.15, alpha3);
      rect(g.x - g.w/2, g.y - g.h/2, g.w, g.h, 8);
      // 门面
      fill(r3, g3, b3, faded3 ? 55 : 170 + t3 * 45);
      rect(g.x - g.w/2, g.y - g.h/2, g.w, g.h - 5, 8);
      // 高光
      fill(200, 255, 220, faded3 ? 10 : 70 + t3 * 60);
      rect(g.x - g.w/2 + 5, g.y - g.h/2 + 4, g.w - 10, 4, 3);
      // 稀有脉冲边框
      if (!faded3) {
        noFill(); stroke(100, 255, 180, 140 * t3); strokeWeight(2);
        rect(g.x - g.w/2 - 4, g.y - g.h/2 - 4, g.w + 8, g.h + 8, 10);
      }
      // 标签
      noStroke(); fill(faded3 ? 120 : 220, 255, faded3 ? 120 : 200, faded3 ? 100 : 235);
      textSize(g.w < 80 ? 11 : 13); textAlign(CENTER, CENTER);
      text(faded3 ? '✓ +10🎱' : '+10🎱', g.x, g.y);
      // 触发闪光
      if (g.flashTimer > 0) {
        const fv = g.flashTimer / 55;
        noFill(); stroke(r3, g3, b3, fv * 240); strokeWeight(2 + fv * 7);
        rect(g.x - g.w/2 - (1-fv)*16, g.y - g.h/2 - (1-fv)*16,
             g.w + (1-fv)*32, g.h + (1-fv)*32, 14);
      }
      textAlign(LEFT, BASELINE);
      continue;
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

    // ── 滑动门专属：运动轨道线 + 箭头 ──
    if (g.sliding && !faded) {
      const trackL = g.slideBaseX - g.slideRange;
      const trackR = g.slideBaseX + g.slideRange;
      const midY   = g.y;
      // 轨道虚线
      stroke(0, 220, 255, 55); strokeWeight(1.2);
      drawingContext.setLineDash([4, 6]);
      line(trackL, midY, trackR, midY);
      drawingContext.setLineDash([]);
      // 两端箭头（三角形）
      const arrSize = 5;
      noStroke(); fill(0, 220, 255, 90);
      triangle(trackL - arrSize, midY, trackL + arrSize, midY - arrSize, trackL + arrSize, midY + arrSize);
      triangle(trackR + arrSize, midY, trackR - arrSize, midY - arrSize, trackR - arrSize, midY + arrSize);
      // 移动门外框发光（蓝白细边）
      const slPulse = sin(frameCount * 0.16 + g.slidePhase) * 0.4 + 0.6;
      noFill();
      stroke(160, 230, 255, 120 * slPulse); strokeWeight(1.5);
      rect(g.x - g.w/2 - 3, g.y - g.h/2 - 3, g.w + 6, g.h + 6, 10);
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
  fill(0, 160, 255); textSize(10); text(t('mg.inFlight'), MG.x + 16, MG.y + 16);
  fill(0, 220, 255); textSize(15);
  text(mgBalls.filter(b => b.alive).length + spawnQueue.length, MG.x + 16, MG.y + 35);

  fill(0, 160, 255); textSize(10); text(t('mg.landed'), MG.x + 110, MG.y + 16);
  fill(0, 255, 170); textSize(15); text(landedBalls, MG.x + 110, MG.y + 35);

  fill(0, 160, 255); textSize(10); text(t('mg.estCoins'), MG.x + 210, MG.y + 16);
  fill(255, 225, 30); textSize(15); text('¥' + _calcMinigameScore(landedBalls), MG.x + 210, MG.y + 35);

  if (minigameState === 'playing') {
    fill(0, 180, 255, 130); textSize(10);
    textAlign(RIGHT, BASELINE);
    text(shootDone ? t('mg.shootDone') : t('mg.shootProgress', shootCount, shootTotal), MG.x + MG.w - 16, MG.y + 35);
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

  // 提示文字改为底部小字，不再遮挡中央
  fill(0, 200, 255, 140); textSize(11);
  textAlign(CENTER, CENTER);
  text('← click anywhere to launch →', MG.x + MG.w / 2, MG.y + MG.h - 36);
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

// ============================================================
//  小游戏帮助系统
// ============================================================

// 问号按钮矩形（暂停键正下方）
function _mgHelpBtnRect() {
  // _pauseBtnRect 由 ui/pause.js 在每帧绘制时填入，优先使用
  const pb = (typeof _pauseBtnRect !== 'undefined' && _pauseBtnRect)
    ? _pauseBtnRect
    : { x: width - 46, y: 6, w: 36, h: 36 };   // 退回估算值
  const GAP = 6;
  return { x: pb.x, y: pb.y + pb.h + GAP, w: pb.w, h: pb.h };
}

function _mgInRect(mx, my, r) {
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}

// ── 问号按钮 ──
function drawMgHelpBtn() {
  const r = _mgHelpBtnRect();
  const hov = _mgInRect(mouseX, mouseY, r);
  const pulse = sin(frameCount * 0.12) * 0.3 + 0.7;

  push();
  // 外发光（首次未看时更显眼）
  if (!_mgHelpSeen) {
    noFill(); stroke(0, 220, 255, 90 * pulse); strokeWeight(4);
    rect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 10);
  }
  // 按钮底色
  noStroke();
  fill(hov ? color(0, 60, 120, 230) : color(5, 20, 50, 210));
  rect(r.x, r.y, r.w, r.h, 7);
  // 边框
  noFill();
  stroke(hov ? color(0, 240, 255, 240) : color(0, 180, 255, 160));
  strokeWeight(1.5);
  rect(r.x, r.y, r.w, r.h, 7);
  // 问号文字
  noStroke();
  fill(hov ? color(255, 255, 255, 255) : color(0, 210, 255, 220));
  textFont('monospace'); textSize(18); textAlign(CENTER, CENTER);
  text('?', r.x + r.w / 2, r.y + r.h / 2 + 1);
  pop();
  textAlign(LEFT, BASELINE);
}

// ── 首次进入：箭头引导 ──
function drawMgHelpGuide() {
  if (_mgHelpSeen || _mgHelpOpen) return;
  const r  = _mgHelpBtnRect();
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const pulse = sin(frameCount * 0.14) * 0.4 + 0.6;

  push();
  // 高亮圆环
  noFill(); stroke(0, 220, 255, 180 * pulse); strokeWeight(2.5);
  ellipse(cx, cy, r.w + 18 + pulse * 6, r.h + 18 + pulse * 6);

  // 箭头（从按钮左下方指向按钮）
  const ax = cx - 68, ay = cy + 52;
  stroke(0, 220, 255, 200 * pulse); strokeWeight(2);
  // 弯曲感用折线模拟：起点 → 转折 → 终点
  line(ax, ay, cx - 14, cy + 14);
  // 箭头头
  const ang = atan2(cy - (ay), cx - 14 - ax) ; // 指向右上
  const hs = 10;
  line(cx - 14, cy + 14, cx - 14 - cos(ang + 0.4) * hs, cy + 14 - sin(ang + 0.4) * hs);
  line(cx - 14, cy + 14, cx - 14 - cos(ang - 0.4) * hs, cy + 14 - sin(ang - 0.4) * hs);

  // 提示文字
  noStroke(); fill(0, 220, 255, 210 * pulse);
  textFont('monospace'); textSize(11); textAlign(CENTER, TOP);
  text('How to play?', ax, ay + 8);
  pop();
  textAlign(LEFT, BASELINE);
}

// ── 帮助面板 ──
function drawMgHelpPanel() {
  const PW = min(520, width - 32), PH = 390;
  const px = (width - PW) / 2;
  const py = MG.y + (MG.h - PH) / 2;

  push();
  // 遮罩
  noStroke(); fill(0, 0, 0, 160);
  rect(MG.x, MG.y, MG.w, MG.h);

  // 面板背景
  fill(3, 8, 22, 248);
  rect(px, py, PW, PH, 12);
  stroke(0, 200, 255, 200); strokeWeight(2); noFill();
  rect(px, py, PW, PH, 12);
  // 顶部色条
  noStroke(); fill(0, 200, 255, 190);
  rect(px, py, PW, 6, 12, 12, 0, 0);

  // 标题
  textFont('monospace');
  fill(0, 220, 255, 240); textSize(16); textAlign(LEFT, TOP);
  text('HOW TO PLAY — MINIGAME', px + 20, py + 18);

  stroke(0, 180, 255, 70); strokeWeight(1);
  line(px + 20, py + 46, px + PW - 20, py + 46);
  noStroke();

  // ── 基本操作 ──
  fill(180, 210, 255, 200); textSize(11);
  text('① Move mouse to aim  ·  Click to launch all balls', px + 20, py + 58);

  // ── 门类型说明 ──
  const entries = [
    { col: [255, 175, 0],  label: '× Multiply', desc: 'Each ball splits into N copies — chain for big combos!' },
    { col: [220, 55, 55],  label: '− Subtract',  desc: 'One-shot trap: destroys N balls nearest to the gate.' },
    { col: [180, 60, 255], label: '↯ BOUNCE',    desc: 'Launches ball upward — great for extra gate hits.' },
    { col: [50, 230, 120], label: '+10 🎱 Bonus', desc: 'Next round starts with 10 extra balls (one time only).' },
    { col: [160, 230, 255],label: '⇄ Sliding',   desc: 'Some gates slide left/right — time your shot!' },
  ];

  let ey = py + 82;
  for (const e of entries) {
    const [er, eg, eb] = e.col;
    // 色块
    noStroke(); fill(er, eg, eb, 200);
    rect(px + 20, ey, 10, 10, 2);
    // 标签
    fill(er, eg, eb, 230); textSize(12);
    text(e.label, px + 38, ey);
    // 描述
    fill(180, 205, 240, 185); textSize(10);
    text(e.desc, px + 38, ey + 15);
    ey += 48;
  }

  // ── 分数说明 ──
  stroke(0, 180, 255, 55); strokeWeight(1);
  line(px + 20, ey + 4, px + PW - 20, ey + 4);
  noStroke();
  fill(255, 220, 60, 210); textSize(11);
  text('Score  ≈  50 balls → ¥250  ·  200 → ¥800  ·  500 → ¥1500  ·  1000 → ¥2000+', px + 20, ey + 16);

  // ── 关闭提示 ──
  fill(0, 160, 200, 140); textSize(10); textAlign(CENTER, TOP);
  text('[ click anywhere to close ]', px + PW / 2, py + PH - 20);

  pop();
  textAlign(LEFT, BASELINE);
}