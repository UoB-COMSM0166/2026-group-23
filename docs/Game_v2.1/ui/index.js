// ============================================================
//  ui/index.js — UI 主绘制入口 drawUI() 与 initUI()
//  依赖上述所有 ui/*.js；必须最后加载
// ============================================================

// ============================================================
//  主绘制入口 & 初始化
// ============================================================
function drawUI() {
  const inMinigame = minigameState !== 'idle';
  if (inMinigame) {
    // 小游戏期间隐藏建造/塔面板等 UI，但保留主 HUD
    drawHUD();
    drawWaveUI();    // 保留波次间隔确认框等必要流程 UI
    drawPauseMenu(); // 暂停菜单仍可用
    return;
  }

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
    text(t('placement.clickToFire'), mouseX, mouseY - arm - 10);
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