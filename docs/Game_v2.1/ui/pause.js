// ============================================================
//  ui/pause.js — 暂停菜单（含二次确认退出）
//  依赖 ui/common.js
// ============================================================

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
  text(t('pause.title'), px + pw / 2, py + 60);

  fill(0, 140, 200, 180); textSize(14);
  text(t('pause.subtitle'), px + pw / 2, py + 100);

  stroke(0, 160, 255, 80); strokeWeight(1.5);
  line(px + 30, py + 120, px + pw - 30, py + 120);

  const btns = [
    { label: t('pause.continue'),    col: [0, 200, 255],   y: py + 140 },
    { label: t('pause.restart'),     col: [255, 160, 30],  y: py + 200 },
    { label: t('pause.levelSelect'), col: [180, 80, 255],  y: py + 260 },
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
  text(t('pause.hint'), px + pw / 2, py + ph - 20);

  // 存储按钮区域供点击检测
  pauseMenuState.btns = btns.map(b => ({ ...b, x: px + 30, w: pw - 60, h: 40 }));
}

/** 二次确认退出内容 */
function _drawPauseConfirm(px, py, pw, ph, pulse) {
  fill(255, 100, 60, 230 * pulse); textSize(28);
  text(t('pause.confirmTitle'), px + pw / 2, py + 70);

  fill(180, 210, 240, 200); textSize(14);
  text(t('pause.confirmSubtitle'), px + pw / 2, py + 110);

  stroke(255, 80, 40, 80); strokeWeight(1.5);
  line(px + 30, py + 130, px + pw - 30, py + 130);

  // 确认按钮
  const confirmY = py + 150;
  const hov1 = isHover(px + 30, confirmY, pw - 60, 44);
  fill(hov1 ? color(140, 20, 20, 240) : color(60, 10, 10, 220));
  stroke(220, 50, 50, hov1 ? 230 : 130); strokeWeight(1.5);
  rect(px + 30, confirmY, pw - 60, 44, 8);
  noStroke(); fill(255, 100, 100, hov1 ? 255 : 220);
  textSize(16); text(t('pause.confirmExit'), px + pw / 2, confirmY + 22);

  // 取消按钮
  const cancelY = py + 210;
  const hov2 = isHover(px + 30, cancelY, pw - 60, 40);
  fill(hov2 ? color(0, 50, 80, 230) : color(8, 18, 36, 210));
  stroke(0, 160, 220, hov2 ? 210 : 100); strokeWeight(1.5);
  rect(px + 30, cancelY, pw - 60, 40, 8);
  noStroke(); fill(0, 200, 255, hov2 ? 255 : 200);
  textSize(16); text(t('pause.confirmCancel'), px + pw / 2, cancelY + 20);

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
    playSfx('click');
    gamePaused = !gamePaused;
    pauseConfirmMode = false;
    return true;
  }

  if (!gamePaused) return false;

  if (!pauseConfirmMode) {
    const [b0, b1, b2] = pauseMenuState.btns;
    if (b0 && inRect(mx, my, b0.x, b0.y, b0.w, b0.h)) {
      playSfx('click');
      gamePaused = false;
      return true;
    }
    if (b1 && inRect(mx, my, b1.x, b1.y, b1.w, b1.h)) {
      playSfx('click');
      gamePaused = false;
      pauseConfirmMode = false;
      _gameEndFired = false;
      initGame();
      return true;
    }
    if (b2 && inRect(mx, my, b2.x, b2.y, b2.w, b2.h)) {
      playSfx('click');
      pauseConfirmMode = true;
      return true;
    }
  } else {
    const { px, pw, confirmY, cancelY } = pauseMenuState;
    // 与 _drawPauseConfirm 中 rect(px + 30, …, pw - 60, …) 一致
    if (confirmY && inRect(mx, my, px + 30, confirmY, pw - 60, 44)) {
      playSfx('click');
      gamePaused = false;
      pauseConfirmMode = false;
      gamePhase = 'levelmap';
      setBgm('launch');  // 回到菜单音乐
      return true;
    }
    if (cancelY && inRect(mx, my, px + 30, cancelY, pw - 60, 40)) {
      playSfx('click');
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
