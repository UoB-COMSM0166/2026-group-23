// ============================================================
//  ui/wave-ui.js — 波次结束面板、倒计时、全部通关提示
//  依赖 ui/common.js；与 minigame.js 通过全局函数交互
// ============================================================

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
