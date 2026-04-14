// ============================================================
//  ui.js — 战斗期间的 HUD 与建造交互
//
//  包含：点击特效、HUD 顶栏、波次倒计时、建造菜单、
//        塔升级面板、放置预览、点击事件处理
//
//  已迁移至 screens/ 的内容（请勿在此重复定义）：
//    drawDifficultySelect / _drawDiffCard / handleDifficultyClick
//      → screens/difficulty-select.js
// ============================================================

// UI 状态变量（selectedTowerType / selectedTower / hoverTowerType / BUILD_BTN_Y /
// clickEffects / gamePaused / pauseConfirmMode / _pauseBtnRect / _mortarAiming /
// _mortarTower / waveEndPanelVisible / waveEndBtnRect）
// 已集中到 state.js 声明。本文件内的 HUD 渲染缓存（_hudHpFill / _wcDesc* 等）
// 属于模块内部实现，仍保留在下方。

// ============================================================
//  模块级常量（避免每帧重建对象）
// ============================================================

/** 建造菜单塔类型顺序 */
const TOWER_TYPES = ['rapid','laser','nova','chain','magnet','ghost','scatter','cannon'];

/** 建造菜单显示名称 */
const TOWER_DISPLAY_NAMES = {
  rapid:'RAPID', laser:'LASER', nova:'NOVA',   chain:'CHAIN',
  magnet:'MAGNET', ghost:'GHOST', scatter:'AA-FAN', cannon:'CANNON',
};

/** 悬浮提示文本 */
const TOWER_TIPS = {
  rapid:   ['RAPID',   'High fire rate, great for swarms'],
  laser:   ['LASER',   'Multi-target lock-on, piercing beam'],
  nova:    ['NOVA',    'Line pierce + impact explosion'],
  chain:   ['CHAIN',   'Chain lightning, jumps between foes'],
  magnet:  ['MAGNET',  'AOE slow support tower'],
  ghost:   ['GHOST',   'Homing missiles with explosion'],
  scatter: ['AA-FAN',  'Anti-air fan burst, fast intercept'],
  cannon:  ['CANNON',  'Map-wide strike, huge blast radius'],
};

/** 特殊能力描述（drawTowerPanel 使用） */
const TOWER_SPECIALS = {
  laser:   (t) => [['◆ 多目标锁定 ×'+t.level,          [0,255,150,210]]],
  chain:   (t) => [['◆ 跳链 ×'+t.level+'次  衰减×0.72', [100,200,255,210]]],
  magnet:  ()  => [['◆ 无伤害  范围减速辅助',            [140,100,255,210]]],
  ghost:   (t) => [['◆ 追踪导弹 ×'+t.level+'枚  爆炸',  [200,100,255,210]]],
  scatter: (t) => [['◆ 对空扇射 ×'+[3,5,7][t.level-1]+'弹', [255,80,120,210]]],
  nova:    ()  => [['◆ 穿透直线+落点爆炸',              [255,160,50,210]]],
  cannon:  (t) => {
    const br = TOWER_DEFS.cannon.cannonBlastRadius[t.level-1];
    return [
      ['◆ 全图轨道炮  空陆两用',    [255,80,80,210]],
      ['◆ 爆炸半径 '+br+'  优先打空中', [255,140,60,200]],
    ];
  },
};

/** 建造菜单布局常量 */
const BUILD_BTN_W       = 86;
const BUILD_BTN_SPACING = 5;
const BUILD_BTN_STRIDE  = BUILD_BTN_W + BUILD_BTN_SPACING;

/** 为 true 时在 HUD 左下角绘制鼠标坐标（每帧 text，生产环境建议关闭） */
const UI_SHOW_MOUSE_DEBUG = false;

// ── HUD 字符串 / 颜色缓存（数值不变时不重复 nf / lerpColor）──
const _hudStr = { credits: '', hp: '', wave: '', hostiles: '', progPct: '' };
const _hudSig = {
  coins: NaN, baseHp: NaN, baseHpMax: NaN, waveNum: NaN,
  waveState: null, totalWaves: NaN, monsters: NaN,
};
let _hudHpFill = null;
let _hudBarFill = null;
let _hudBarInnerW = 0;

// ── 波次倒计时下方说明行（同一波准备期间文案固定，避免每帧拼接）──
let _wcDescKey = '';
let _wcDescText = '';
let _wcDescBoss = false;

// ── 工具提示尺寸（仅依赖字体与文案，按塔类型缓存）──
const _tooltipBoxCache = Object.create(null);

// ── 点击热区对象复用（减少每帧 {} 分配）──
const _pauseBtnRectPool = { x: 0, y: 0, w: 0, h: 0 };
const _waveEndBtnRectPool = { x: 0, y: 0, w: 0, h: 0 };

function _resetHudTextCache() {
  _hudSig.coins = _hudSig.baseHp = _hudSig.baseHpMax = _hudSig.waveNum = NaN;
  _hudSig.waveState = null;
  _hudSig.totalWaves = _hudSig.monsters = NaN;
  _hudHpFill = _hudBarFill = null;
  _hudBarInnerW = 0;
  _wcDescKey = '';
  _wcDescText = '';
}

// ============================================================
//  工具函数
// ============================================================

/** 矩形碰撞检测（使用全局 mouseX/mouseY） */
function isHover(x, y, w, h) {
  return mouseX >= x && mouseX <= x + w &&
      mouseY >= y && mouseY <= y + h;
}

/** 矩形碰撞检测（指定坐标版） */
function inRect(mx, my, x, y, w, h) {
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

/**
 * 在 p5 绘制后统一将 textAlign 还原为默认值，
 * 避免在各绘制函数末尾反复调用。
 */
function resetTextAlign() {
  textAlign(LEFT, BASELINE);
}

// ============================================================
//  点击特效
// ============================================================
function drawClickEffects() {
  const next = [];
  for (const e of clickEffects) {
    if (e.life <= 0) continue;
    e.life -= 0.055;
    next.push(e);
    const r = map(e.life, 1, 0, 8, 55);
    noFill();
    stroke(0, 200, 255, e.life * 170);
    strokeWeight(1.5);
    beginShape();
    for (let k = 0; k < 12; k++) {
      const angle = k * TWO_PI / 12;
      const nr = r + sin(k * 1.3) * 3.5;
      vertex(e.x + cos(angle) * nr, e.y + sin(angle) * nr);
    }
    endShape(CLOSE);
    stroke(0, 220, 255, e.life * 110);
    strokeWeight(1);
    line(e.x - 10, e.y, e.x + 10, e.y);
    line(e.x, e.y - 10, e.x, e.y + 10);
  }
  clickEffects = next;
}

// ============================================================
//  HUD 顶栏
// ============================================================
function drawHUD() {
  const nMon = manager.monsters.length;

  if (_hudSig.coins !== coins) {
    _hudSig.coins = coins;
    _hudStr.credits = nf(coins, 5);
  }
  if (_hudSig.baseHp !== baseHp || _hudSig.baseHpMax !== baseHpMax) {
    _hudSig.baseHp = baseHp;
    _hudSig.baseHpMax = baseHpMax;
    _hudStr.hp = nf(baseHp, 2) + '/' + baseHpMax;
    _hudHpFill = lerpColor(color(220, 30, 30), color(0, 220, 140), baseHp / baseHpMax);
  }
  if (_hudSig.waveState !== waveState || _hudSig.waveNum !== waveNum || _hudSig.totalWaves !== TOTAL_WAVES) {
    _hudSig.waveState = waveState;
    _hudSig.waveNum = waveNum;
    _hudSig.totalWaves = TOTAL_WAVES;
    const prog = waveNum / TOTAL_WAVES;
    _hudStr.wave = waveState === 'complete'
        ? 'DONE'
        : ('W-' + nf(min(waveNum, TOTAL_WAVES), 2) + '/' + nf(TOTAL_WAVES, 2));
    _hudStr.progPct = 'PROGRESS  ' + floor(prog * 100) + '%';
    _hudBarFill = lerpColor(color(0, 160, 255), color(0, 255, 180), prog);
    _hudBarInnerW = max(0, 198 * prog);
  }
  if (_hudSig.monsters !== nMon) {
    _hudSig.monsters = nMon;
    _hudStr.hostiles = nf(nMon, 3);
  }

  // 背景与边框
  noStroke(); fill(5, 8, 18, 225);
  rect(0, 0, width, HUD_HEIGHT);
  stroke(0, 180, 255, 180); strokeWeight(1.5);
  line(0, HUD_HEIGHT, width, HUD_HEIGHT);

  textFont('monospace'); noStroke();

  fill(0, 160, 255); textSize(13); text('◈ CREDITS', 12, 15);
  fill(255, 210, 40); textSize(18); text(_hudStr.credits, 12, 34);

  fill(0, 160, 255); textSize(13); text('◈ BASE HP', 145, 15);
  fill(_hudHpFill);
  textSize(18); text(_hudStr.hp, 145, 34);

  fill(0, 160, 255); textSize(13); text('◈ WAVE', 285, 15);
  fill(waveState === 'complete' ? color(0, 255, 120) : color(140, 80, 255));
  textSize(18); text(_hudStr.wave, 285, 34);

  fill(0, 160, 255); textSize(13); text('◈ HOSTILES', 395, 15);
  fill(220, 50, 50); textSize(18); text(_hudStr.hostiles, 395, 34);

  const barX = 520, barY = 10, barW = 200, barH = 26;
  fill(10, 20, 40, 180); stroke(0, 140, 220, 120); strokeWeight(1);
  rect(barX, barY, barW, barH, 3);
  fill(_hudBarFill); noStroke();
  rect(barX + 1, barY + 1, _hudBarInnerW, barH - 2, 2);
  fill(0, 200, 255, 180); textSize(13); textAlign(CENTER, CENTER);
  text(_hudStr.progPct, barX + barW / 2, barY + barH / 2);

  if (frameCount < jammedUntilFrame) {
    const t = sin(frameCount * 0.3) * 0.5 + 0.5;
    noStroke(); fill(255, 80, 0, 140 + t * 80);
    rect(0, HUD_HEIGHT, width, 20);
    fill(255, 220, 180, 230); textSize(13); textAlign(CENTER, CENTER);
    text('⚠  DEFENSE JAMMED — TOWERS OFFLINE  ⚠', width / 2, HUD_HEIGHT + 10);
  }

  if (UI_SHOW_MOUSE_DEBUG) {
    noStroke(); fill(0, 140, 220, 65); textSize(10);
    textAlign(LEFT, BASELINE);
    text(nf(mouseX, 4) + ',' + nf(mouseY, 4), width - 80, height - 8);
  }

  const pbx = width - 46, pby = 8, pbw = 36, pbh = 30;
  const pbHov = isHover(pbx, pby, pbw, pbh);
  fill(pbHov ? color(0, 60, 100, 230) : color(8, 16, 36, 200));
  stroke(0, 180, 255, pbHov ? 220 : 100); strokeWeight(1);
  rect(pbx, pby, pbw, pbh, 4);
  noStroke(); fill(0, 200, 255, pbHov ? 255 : 180);
  rect(pbx + 9,  pby + 8, 5, 14, 1);
  rect(pbx + 22, pby + 8, 5, 14, 1);
  _pauseBtnRectPool.x = pbx;
  _pauseBtnRectPool.y = pby;
  _pauseBtnRectPool.w = pbw;
  _pauseBtnRectPool.h = pbh;
  _pauseBtnRect = _pauseBtnRectPool;
}

// ============================================================
//  波次结束面板
// ============================================================
function showWaveEndPanel() {
  waveEndPanelVisible = true;
  waveEndBtnRect      = null;
  selectedTowerType   = null;
  selectedTower       = null;
  _mortarAiming       = false;
  _mortarTower        = null;
}

/**
 * 处理波次结束面板点击。
 * 面板可见时会拦截所有点击（防止穿透），返回 true。
 * 点击确认按钮后隐藏面板并尝试启动小游戏。
 */
function handleWaveEndClick(mx, my) {
  if (!waveEndPanelVisible) return false;

  if (waveEndBtnRect && inRect(mx, my,
      waveEndBtnRect.x, waveEndBtnRect.y,
      waveEndBtnRect.w, waveEndBtnRect.h)) {
    waveEndPanelVisible = false;
    waveEndBtnRect      = null;
    if (typeof startMinigame === 'function' && minigameState === 'idle') {
      startMinigame();
    }
  }

  // 面板可见时始终拦截点击，避免穿透到地图
  return true;
}

// ============================================================
//  暂停菜单
// ============================================================
const pauseMenuState = {
  btns:     [],
  confirmY: 0,
  cancelY:  0,
  px:       0,
  pw:       0,
};

function drawPauseMenu() {
  if (!gamePaused) return;

  push();

  // 半透明遮罩
  noStroke(); fill(0, 0, 0, 175);
  rect(0, 0, width, height);

  const pw = 400;
  const ph = pauseConfirmMode ? 260 : 360;
  const px = (width  - pw) / 2;
  const py = (height - ph) / 2;
  // pulse 值域 [0.6, 1.0]，乘以 230 最大值 ≤ 230，无需 constrain
  const pulse = sin(frameCount * 0.07) * 0.2 + 0.8;

  // 面板框
  fill(4, 8, 22, 235);
  stroke(0, 180, 255, 180); strokeWeight(2);
  rect(px, py, pw, ph, 12);
  noStroke(); fill(0, 180, 255, 150);
  rect(px, py, pw, 8, 12, 12, 0, 0);

  textFont('monospace'); textAlign(CENTER, CENTER);

  if (!pauseConfirmMode) {
    _drawPauseNormal(px, py, pw, ph, pulse);
  } else {
    _drawPauseConfirm(px, py, pw, ph, pulse);
  }

  pop();
}

/** 普通暂停菜单内容 */
function _drawPauseNormal(px, py, pw, ph, pulse) {
  fill(0, 200, 255, 230 * pulse); textSize(32);
  text('PAUSED', px + pw / 2, py + 60);

  fill(0, 140, 200, 180); textSize(14);
  text('Game has been paused', px + pw / 2, py + 100);

  stroke(0, 160, 255, 80); strokeWeight(1.5);
  line(px + 30, py + 120, px + pw - 30, py + 120);

  const btns = [
    { label: '▶ CONTINUE',    col: [0, 200, 255],   y: py + 140 },
    { label: '↺ RESTART',     col: [255, 160, 30],  y: py + 200 },
    { label: '⊞ LEVEL SELECT', col: [180, 80, 255],  y: py + 260 },
  ];

  btns.forEach(btn => {
    const [r, g, b] = btn.col;
    const hov = isHover(px + 30, btn.y, pw - 60, 40);
    fill(hov ? color(r * 0.3, g * 0.3, b * 0.3, 230) : color(10, 20, 40, 210));
    stroke(r, g, b, hov ? 220 : 110); strokeWeight(1.5);
    rect(px + 30, btn.y, pw - 60, 40, 8);
    noStroke(); fill(r, g, b, hov ? 255 : 220);
    textSize(16); text(btn.label, px + pw / 2, btn.y + 20);
  });

  noStroke(); fill(0, 140, 180, 140); textSize(12);
  text('Press ESC to Continue', px + pw / 2, py + ph - 20);

  // 存储按钮区域供点击检测
  pauseMenuState.btns = btns.map(b => ({ ...b, x: px + 30, w: pw - 60, h: 40 }));
}

/** 二次确认退出内容 */
function _drawPauseConfirm(px, py, pw, ph, pulse) {
  fill(255, 100, 60, 230 * pulse); textSize(28);
  text('Confirm Exit?', px + pw / 2, py + 70);

  fill(180, 210, 240, 200); textSize(14);
  text('Current progress will not be saved', px + pw / 2, py + 110);

  stroke(255, 80, 40, 80); strokeWeight(1.5);
  line(px + 30, py + 130, px + pw - 30, py + 130);

  // 确认按钮
  const confirmY = py + 150;
  const hov1 = isHover(px + 30, confirmY, pw - 60, 44);
  fill(hov1 ? color(140, 20, 20, 240) : color(60, 10, 10, 220));
  stroke(220, 50, 50, hov1 ? 230 : 130); strokeWeight(1.5);
  rect(px + 30, confirmY, pw - 60, 44, 8);
  noStroke(); fill(255, 100, 100, hov1 ? 255 : 220);
  textSize(16); text('Confirm Exit to Level Select', px + pw / 2, confirmY + 22);

  // 取消按钮
  const cancelY = py + 210;
  const hov2 = isHover(px + 30, cancelY, pw - 60, 40);
  fill(hov2 ? color(0, 50, 80, 230) : color(8, 18, 36, 210));
  stroke(0, 160, 220, hov2 ? 210 : 100); strokeWeight(1.5);
  rect(px + 30, cancelY, pw - 60, 40, 8);
  noStroke(); fill(0, 200, 255, hov2 ? 255 : 200);
  textSize(16); text('Cancel, Back to Pause Menu', px + pw / 2, cancelY + 20);

  pauseMenuState.confirmY = confirmY;
  pauseMenuState.cancelY  = cancelY;
  pauseMenuState.px = px;
  pauseMenuState.pw = pw;
}

// ============================================================
//  处理暂停菜单点击
// ============================================================
function handlePauseClick(mx, my) {
  // 点击 HUD 暂停按钮（使用传入坐标，与全局 mouseX/Y 解耦）
  if (_pauseBtnRect && inRect(mx, my, _pauseBtnRect.x, _pauseBtnRect.y, _pauseBtnRect.w, _pauseBtnRect.h)) {
    gamePaused = !gamePaused;
    pauseConfirmMode = false;
    return true;
  }

  if (!gamePaused) return false;

  if (!pauseConfirmMode) {
    const [b0, b1, b2] = pauseMenuState.btns;
    if (b0 && inRect(mx, my, b0.x, b0.y, b0.w, b0.h)) {
      gamePaused = false;
      return true;
    }
    if (b1 && inRect(mx, my, b1.x, b1.y, b1.w, b1.h)) {
      gamePaused = false;
      pauseConfirmMode = false;
      _gameEndFired = false;
      initGame();
      return true;
    }
    if (b2 && inRect(mx, my, b2.x, b2.y, b2.w, b2.h)) {
      pauseConfirmMode = true;
      return true;
    }
  } else {
    const { px, pw, confirmY, cancelY } = pauseMenuState;
    // 与 _drawPauseConfirm 中 rect(px + 30, …, pw - 60, …) 一致
    if (confirmY && inRect(mx, my, px + 30, confirmY, pw - 60, 44)) {
      gamePaused = false;
      pauseConfirmMode = false;
      gamePhase = 'levelmap';
      return true;
    }
    if (cancelY && inRect(mx, my, px + 30, cancelY, pw - 60, 40)) {
      pauseConfirmMode = false;
      return true;
    }
  }

  return false;
}

// ============================================================
//  ESC 键切换暂停
// ============================================================
function handlePauseKey() {
  if (gamePhase !== 'playing') return;
  if (pauseConfirmMode) { pauseConfirmMode = false; return; }
  gamePaused = !gamePaused;
}

// ============================================================
//  波次倒计时 & 通关提示
// ============================================================
function drawWaveUI() {
  textFont('monospace');

  if (waveEndPanelVisible && waveState === 'countdown' && minigameState === 'idle') {
    _drawWaveEndPanel();
    return;
  }

  if (waveState === 'countdown' && minigameState === 'idle') {
    _drawWaveCountdown();
  }

  if (waveState === 'complete') {
    _drawWaveComplete();
  }
}

function _drawWaveEndPanel() {
  noStroke(); fill(0, 0, 0, 165);
  rect(0, 0, width, height);

  const R = 0, G = 200, B = 255;
  const pw = 336, ph = 178;
  const px = (width  - pw) / 2;
  const py = (height - ph) / 2;
  const pulse = sin(frameCount * 0.08) * 0.2 + 0.8;

  fill(4, 8, 22, 230); stroke(R, G, B, 180); strokeWeight(2);
  rect(px, py, pw, ph, 10);
  noStroke(); fill(R, G, B, 160);
  rect(px, py, pw, 6, 10, 10, 0, 0);

  textAlign(CENTER, CENTER);
  fill(R, G, B, 240 * pulse); textSize(22);
  text('WAVE BREAK', px + pw / 2, py + 48);
  fill(178, 210, 240, 200); textSize(11);
  text('Prepare for the next wave.', px + pw / 2, py + 78);

  stroke(R, G, B, 60); strokeWeight(1);
  line(px + 28, py + 100, px + pw - 28, py + 100);

  const bY = py + ph - 48;
  const bhov = isHover(px + 28, bY, pw - 56, 28);
  fill(bhov ? color(20, 75, 115, 220) : color(10, 20, 40, 200));
  stroke(0, 180, 255, bhov ? 200 : 115); strokeWeight(1);
  rect(px + 28, bY, pw - 56, 28, 5);
  noStroke(); fill(0, 200, 255, 230); textSize(12);
  text('CONTINUE', px + pw / 2, bY + 14);

  _waveEndBtnRectPool.x = px + 28;
  _waveEndBtnRectPool.y = bY;
  _waveEndBtnRectPool.w = pw - 56;
  _waveEndBtnRectPool.h = 28;
  waveEndBtnRect = _waveEndBtnRectPool;
  resetTextAlign();
}

function _drawWaveCountdown() {
  const nextW = waveNum + 1;
  const pulse = sin(frameCount * 0.15) * 0.3 + 0.7;
  const remaining = ceil((waveCountdownEnd - frameCount) / 60);

  noStroke(); fill(5, 10, 25, 170);
  rect(0, height / 2 - 36, width, 72);
  stroke(0, 180, 255, 120 * pulse); strokeWeight(1);
  line(0, height / 2 - 36, width, height / 2 - 36);
  line(0, height / 2 + 36, width, height / 2 + 36);

  textAlign(CENTER, CENTER);
  fill(0, 200, 255, 230 * pulse); textSize(13);
  text('— INCOMING WAVE ' + nextW + ' OF ' + TOTAL_WAVES + ' —', width / 2, height / 2 - 18);
  fill(255, 220, 60, 240); textSize(26);
  text(remaining + 's', width / 2, height / 2 + 10);

  const wc  = WAVE_CONFIGS[currentLevel] || [];
  const cfg = wc[nextW - 1];
  const descKey = currentLevel + '\0' + nextW;
  if (cfg && descKey !== _wcDescKey) {
    _wcDescKey = descKey;
    let hasBoss = false;
    const parts = [];
    for (let i = 0; i < cfg.length; i++) {
      const [t, c] = cfg[i];
      if (t.startsWith('boss')) hasBoss = true;
      if (t === 'boss1') parts.push('⚠ BOSS: FISSION CORE');
      else if (t === 'boss2') parts.push('⚠ BOSS: PHANTOM PROTOCOL');
      else if (t === 'boss3') parts.push('☠ FINAL BOSS: ANT-MECH');
      else parts.push(c + 'x ' + t.toUpperCase());
    }
    _wcDescText = parts.join('  |  ');
    _wcDescBoss = hasBoss;
  } else if (!cfg) {
    _wcDescKey = '';
    _wcDescText = '';
  }
  if (_wcDescText) {
    fill(_wcDescBoss ? color(255, 120, 20, 220) : color(0, 180, 220, 160));
    textSize(9); text(_wcDescText, width / 2, height / 2 + 30);
  }

  resetTextAlign();
}

function _drawWaveComplete() {
  noStroke(); fill(5, 15, 30, 200);
  rect(0, height / 2 - 50, width, 100);
  textAlign(CENTER, CENTER);
  fill(0, 255, 160, 230); textSize(22);
  text('ALL WAVES CLEARED', width / 2, height / 2 - 18);
  fill(255, 220, 60, 200); textSize(13);
  text('TOTAL CREDITS: ' + coins, width / 2, height / 2 + 14);
  resetTextAlign();
}

// ============================================================
//  建造菜单
// ============================================================
function drawBuildMenu() {
  textFont('monospace'); noStroke();
  const menuWidth = TOWER_TYPES.length * BUILD_BTN_STRIDE + 4;

  fill(5, 10, 22, 220); stroke(0, 130, 200, 120); strokeWeight(1.5);
  rect(0, BUILD_BTN_Y, menuWidth, 48, 0, 0, 6, 0);

  hoverTowerType = null;

  for (let i = 0; i < TOWER_TYPES.length; i++) {
    const type = TOWER_TYPES[i];
    const def  = TOWER_DEFS[type];
    if (!def) continue;

    const [r, g, b] = def.color;
    const bx = 6 + i * BUILD_BTN_STRIDE;
    const by = BUILD_BTN_Y + 6;
    const selected  = selectedTowerType === type;
    const canAfford = coins >= def.cost;

    // 按钮背景
    if (selected)        { fill(r, g, b, 80); stroke(r, g, b, 255); strokeWeight(2); }
    else if (!canAfford) { fill(15, 15, 25, 150); stroke(60, 60, 70, 100); strokeWeight(1); }
    else                 { fill(10, 20, 40, 200); stroke(r, g, b, 120); strokeWeight(1); }
    rect(bx, by, BUILD_BTN_W, 36, 4);

    noStroke();
    if (canAfford) fill(r, g, b);
    else fill(120);
    textSize(12); textAlign(LEFT, TOP);
    text(TOWER_DISPLAY_NAMES[type], bx + 6, by + 4);

    if (canAfford) fill(255, 215, 0);
    else fill(150, 80, 80);
    textSize(11); textAlign(LEFT, BOTTOM);
    text('¥' + def.cost, bx + 6, by + 33);

    fill(r, g, b, canAfford ? 200 : 80);
    rect(bx + BUILD_BTN_W - 12, by + 8, 4, 20, 1);

    // 悬浮检测（合并进同一循环，避免二次遍历）
    if (isHover(bx, by, BUILD_BTN_W, 36)) {
      hoverTowerType = type;
    }
  }

  // 取消按钮
  if (selectedTowerType) {
    const cancelX = 6 + TOWER_TYPES.length * BUILD_BTN_STRIDE;
    const by = BUILD_BTN_Y + 6;
    fill(80, 20, 20, 200); stroke(255, 60, 60, 180); strokeWeight(1.2);
    rect(cancelX, by, 44, 36, 4);
    fill(255, 100, 100); noStroke(); textAlign(CENTER, CENTER); textSize(14);
    text('✕', cancelX + 22, by + 18);
  }

  resetTextAlign();
}

// ============================================================
//  鼠标悬停塔简介
// ============================================================
function drawTowerHoverTooltip() {
  if (!hoverTowerType) return;

  let box = _tooltipBoxCache[hoverTowerType];
  if (!box) {
    const tip = TOWER_TIPS[hoverTowerType];
    if (!tip) return;
    const [name, desc] = tip;
    const padding = 12;
    textFont('monospace');
    textSize(14);
    const titleW = textWidth(name);
    textSize(12);
    const descW = textWidth(desc);
    box = { name, desc, w: Math.max(titleW, descW) + padding * 2, h: 44, pad: padding };
    _tooltipBoxCache[hoverTowerType] = box;
  }

  const { name, desc, w, h, pad: padding } = box;
  textFont('monospace');

  // 防止超出屏幕边界
  let x = mouseX + 20;
  let y = mouseY + 20;
  if (x + w > width)  x = width  - w - 8;
  if (y + h > height) y = height - h - 8;

  fill(8, 12, 24, 230); stroke(0, 180, 255, 150); strokeWeight(1);
  rect(x, y, w, h, 6);

  noStroke();
  fill(0, 200, 255); textSize(14);
  text(name, x + padding, y + 14);

  fill(180, 220, 255); textSize(12);
  text(desc, x + padding, y + 32);
}

// ============================================================
//  塔升级面板
// ============================================================
function drawTowerPanel() {
  if (!selectedTower) return;

  const t      = selectedTower;
  const panelW = 178, panelH = 158;
  const px     = constrain(t.px + 35, 0, width  - panelW - 4);
  const py     = constrain(t.py - 30, HUD_HEIGHT + 4, height - panelH - 4);

  fill(5, 10, 22, 225); stroke(0, 180, 255, 160); strokeWeight(1.2);
  rect(px, py, panelW, panelH, 4);

  const def     = TOWER_DEFS[t.type];
  const [r,g,b] = t.col;
  const isMaxed = t.level >= 3;

  // 标题行
  fill(r, g, b, 220); noStroke(); textFont('monospace'); textSize(10);
  text(def.name + '  Lv.' + t.level + (isMaxed ? ' ★MAX' : ''), px + 8, py + 16);
  stroke(0, 140, 220, 100); strokeWeight(1);
  line(px + 6, py + 22, px + panelW - 6, py + 22);

  // 基础属性
  fill(180, 220, 255, 200); noStroke(); textSize(9);
  text('ATK  ' + t.dmg,   px + 10, py + 36);
  text('RNG  ' + t.range, px + 10, py + 50);

  if (t.type === 'magnet') {
    text('减速  最高-' + [50,65,80][t.level-1] + '%', px + 10, py + 64);
  } else {
    text('SPD  ' + Math.round(60 / t.fireRate * 10) / 10 + '/s', px + 10, py + 64);
  }

  // 特殊能力说明
  let specialY = py + 78;
  const specials = TOWER_SPECIALS[t.type];
  if (specials) {
    for (const [label, col] of specials(t)) {
      fill(...col); noStroke(); textSize(9);
      text(label, px + 10, specialY);
      specialY += 14;
    }
  }

  // 升级按钮
  if (!isMaxed) {
    const canUpg = coins >= t.upgradeCost;
    fill(canUpg ? color(0, 150, 75, 200) : color(55, 55, 55, 180));
    stroke(canUpg ? color(0, 210, 95, 200) : color(95, 95, 95, 120)); strokeWeight(1);
    rect(px + 8, specialY, panelW - 16, 24, 3);
    fill(canUpg ? color(175, 255, 195, 230) : color(135, 135, 135, 180));
    noStroke(); textSize(9); textAlign(CENTER, CENTER);
    text('升级至 Lv.' + (t.level + 1) + '  ¥' + t.upgradeCost, px + panelW / 2, specialY + 12);
    t._btnRect = { x: px + 8, y: specialY, w: panelW - 16, h: 24 };
  } else {
    fill(255, 200, 50, 155); noStroke(); textSize(9); textAlign(CENTER, CENTER);
    text('★ 已达满级 MAX', px + panelW / 2, specialY + 8);
    t._btnRect = null;
  }

  // 拆除按钮
  const delBtnY = py + panelH - 34;
  fill(75, 18, 18, 200); stroke(195, 55, 55, 175); strokeWeight(1);
  rect(px + 8, delBtnY, panelW - 16, 22, 3);
  fill(255, 100, 100, 230); noStroke(); textSize(9); textAlign(CENTER, CENTER);
  text('拆除  退还 ¥' + Math.floor(def.cost * 0.8), px + panelW / 2, delBtnY + 11);
  t._delRect = { x: px + 8, y: delBtnY, w: panelW - 16, h: 22 };

  fill(95, 135, 175, 125); noStroke(); textSize(8); textAlign(CENTER, CENTER);
  text('[ 点击其他处关闭 ]', px + panelW / 2, py + panelH - 7);
  resetTextAlign();
}

// ============================================================
//  放置预览
// ============================================================
function drawPlacementPreview() {
  if (!selectedTowerType) return;

  const def = TOWER_DEFS[selectedTowerType];
  const gx       = Math.floor(mouseX / CELL_SIZE);
  const gy       = Math.floor(mouseY / CELL_SIZE);
  const canBuild = isCellBuildable(gx, gy);
  const canAfford = coins >= def.cost;
  const ok = canBuild && canAfford;

  const px  = gx * CELL_SIZE, py = gy * CELL_SIZE;
  const [r, g, b] = def.color;

  // 格子边框 + 填充
  const okColor  = ok ? color(0, 255, 120, 200) : color(255, 60, 60, 200);
  const okFill   = ok ? color(0, 255, 120, 30)  : color(255, 60, 60, 30);
  noFill(); stroke(okColor); strokeWeight(2);
  rect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 3);
  fill(okFill); noStroke();
  rect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 3);

  // 塔图标
  fill(r, g, b, ok ? 120 : 60); noStroke();
  ellipse(px + CELL_SIZE / 2, py + CELL_SIZE / 2, CELL_SIZE * 0.55, CELL_SIZE * 0.55);

  // 射程圆
  noFill(); stroke(r, g, b, ok ? 50 : 25); strokeWeight(1);
  ellipse(px + CELL_SIZE / 2, py + CELL_SIZE / 2, def.range * 2, def.range * 2);

  // 错误提示
  if (!ok) {
    fill(255, 80, 80, 220); noStroke();
    textFont('monospace'); textSize(9); textAlign(CENTER, CENTER);
    text(canAfford ? '无法建造' : '金币不足', px + CELL_SIZE / 2, py + CELL_SIZE + 10);
    resetTextAlign();
  }
}

// ============================================================
//  点击事件处理（返回 true = 已消费）
// ============================================================
function handlePlacementClick(mx, my) {
  // 点击建造菜单栏
  if (my >= BUILD_BTN_Y && my < BUILD_BTN_Y + 48) {
    _mortarAiming = false;
    _mortarTower  = null;

    for (let i = 0; i < TOWER_TYPES.length; i++) {
      const bx = 6 + i * BUILD_BTN_STRIDE;
      if (inRect(mx, my, bx, BUILD_BTN_Y, BUILD_BTN_W, 48)) {
        const type = TOWER_TYPES[i];
        selectedTowerType = (selectedTowerType === type) ? null : type;
        if (selectedTowerType) selectedTower = null;
        return true;
      }
    }

    // 取消按钮
    const cancelX = 6 + TOWER_TYPES.length * BUILD_BTN_STRIDE;
    if (selectedTowerType && inRect(mx, my, cancelX, BUILD_BTN_Y, 44, 48)) {
      selectedTowerType = null;
    }
    return true;
  }

  // 瞄准模式：点击地图发射炮弹
  if (_mortarAiming && _mortarTower) {
    if (my > HUD_HEIGHT) {
      _mortarTower.fireMortar(mx, my);
      _mortarAiming = false;
      _mortarTower  = null;
    }
    return true;
  }

  // 升级按钮
  if (selectedTower?._btnRect) {
    const b = selectedTower._btnRect;
    if (inRect(mx, my, b.x, b.y, b.w, b.h)) {
      selectedTower.upgrade();
      return true;
    }
  }

  // 拆除按钮
  if (selectedTower?._delRect) {
    const d = selectedTower._delRect;
    if (inRect(mx, my, d.x, d.y, d.w, d.h)) {
      demolishTower(selectedTower);
      selectedTower = null;
      return true;
    }
  }

  // 点击塔
  const clicked = towers.find(t => dist(mx, my, t.px, t.py) < CELL_SIZE * 0.45);
  if (clicked) {
    // 散弹塔瞄准模式
    if (clicked.type === 'scatter' && clicked.mortarReady) {
      _mortarAiming     = true;
      _mortarTower      = clicked;
      selectedTower     = clicked;
      selectedTowerType = null;
      return true;
    }
    // 快速塔超载激活
    if (clicked.type === 'rapid' && clicked.rapidReady) {
      clicked.activateOverdrive();
      selectedTower     = clicked;
      selectedTowerType = null;
      return true;
    }
    selectedTower = (selectedTower === clicked) ? null : clicked;
    if (selectedTower) selectedTowerType = null;
    return true;
  }

  // 建造塔
  if (selectedTowerType) {
    const gx = Math.floor(mx / CELL_SIZE);
    const gy = Math.floor(my / CELL_SIZE);
    const placeDef = TOWER_DEFS[selectedTowerType];
    if (isCellBuildable(gx, gy) && coins >= placeDef.cost) {
      coins -= placeDef.cost;
      towers.push(new Tower(gx, gy, selectedTowerType));
      selectedTowerType = null;
    } else if (my > HUD_HEIGHT) {
      selectedTower = null;
    }
    return true;
  }

  if (selectedTower) { selectedTower = null; return true; }
  return false;
}

// ============================================================
//  主绘制入口 & 初始化
// ============================================================
function drawUI() {
  drawBuildMenu();
  drawTowerHoverTooltip();
  drawPlacementPreview();

  // 加农炮瞄准准星
  if (_mortarAiming && _mortarTower) {
    const displayRadius = 28;
    const pulse = sin(frameCount * 0.18) * 0.4 + 0.6;
    const arm   = displayRadius + 8;

    noFill(); stroke(255, 180, 30, 150 * pulse); strokeWeight(1.5);
    ellipse(mouseX, mouseY, displayRadius * 2, displayRadius * 2);

    stroke(255, 200, 50, 180 * pulse); strokeWeight(1.2);
    line(mouseX - arm,             mouseY, mouseX - displayRadius - 2, mouseY);
    line(mouseX + displayRadius + 2, mouseY, mouseX + arm,            mouseY);
    line(mouseX, mouseY - arm,             mouseX, mouseY - displayRadius - 2);
    line(mouseX, mouseY + displayRadius + 2, mouseX, mouseY + arm);

    noStroke(); fill(255, 220, 50, 200 * pulse);
    ellipse(mouseX, mouseY, 4, 4);

    fill(255, 220, 60, 220); noStroke();
    textFont('monospace'); textSize(10); textAlign(CENTER, CENTER);
    text('点击发射炮弹', mouseX, mouseY - arm - 10);
    resetTextAlign();
  }

  drawTowerPanel();
  drawClickEffects();
  drawScanlines();
  drawWaveUI();
  drawHUD();
  drawPauseMenu(); // 始终最后绘制，覆盖所有内容
}

function initUI() {
  selectedTowerType   = null;
  selectedTower       = null;
  clickEffects        = [];
  BUILD_BTN_Y         = HUD_HEIGHT + 2;
  _mortarAiming       = false;
  _mortarTower        = null;
  waveEndPanelVisible = false;
  waveEndBtnRect      = null;
  gamePaused          = false;
  pauseConfirmMode    = false;
  _resetHudTextCache();
}