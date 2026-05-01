// ============================================================
//  ui/index.js — UI main draw entry drawUI() and initUI()
//  Depends on every ui/*.js above; must load last
// ============================================================

// ============================================================
//  Main draw entry & initialization
// ============================================================
function drawUI() {
  const inMinigame = minigameState !== 'idle';
  if (inMinigame) {
    // During the minigame, hide the build / tower panel UI but keep the main HUD
    drawHUD();
    drawWaveUI();    // Keep necessary flow UI such as the wave-interval confirm box
    drawPauseMenu(); // Pause menu still works
    return;
  }

  drawBuildMenu();
  drawTowerHoverTooltip();
  drawPlacementPreview();

  // Cannon aiming crosshair
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
  drawPauseMenu(); // Always drawn last to overlay everything
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