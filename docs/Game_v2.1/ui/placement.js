// ============================================================
//  ui/placement.js — Build preview and battlefield click handling
//  Depends on data/towers.js, map/map-core.js (isCellBuildable), towers.js
// ============================================================

// ============================================================
//  Placement preview
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

  // Cell border + fill
  const okColor  = ok ? color(0, 255, 120, 200) : color(255, 60, 60, 200);
  const okFill   = ok ? color(0, 255, 120, 30)  : color(255, 60, 60, 30);
  noFill(); stroke(okColor); strokeWeight(2);
  rect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 3);
  fill(okFill); noStroke();
  rect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 3);

  // Tower icon
  fill(r, g, b, ok ? 120 : 60); noStroke();
  ellipse(px + CELL_SIZE / 2, py + CELL_SIZE / 2, CELL_SIZE * 0.55, CELL_SIZE * 0.55);

  // Range circle
  noFill(); stroke(r, g, b, ok ? 50 : 25); strokeWeight(1);
  ellipse(px + CELL_SIZE / 2, py + CELL_SIZE / 2, def.range * 2, def.range * 2);

  // Error hint
  if (!ok) {
    fill(255, 80, 80, 220); noStroke();
    textFont('monospace'); textSize(9); textAlign(CENTER, CENTER);
    text(canAfford ? t('placement.cantBuild') : t('placement.noCoins'), px + CELL_SIZE / 2, py + CELL_SIZE + 10);
    resetTextAlign();
  }
}

// ============================================================
//  Click handler (returns true = consumed)
// ============================================================
function handlePlacementClick(mx, my) {
  // Click on the build menu bar
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

    // Cancel button
    const cancelX = 6 + TOWER_TYPES.length * BUILD_BTN_STRIDE;
    if (selectedTowerType && inRect(mx, my, cancelX, BUILD_BTN_Y, 44, 48)) {
      selectedTowerType = null;
    }
    return true;
  }

  // Aiming mode: click on the map to fire a shell
  if (_mortarAiming && _mortarTower) {
    if (my > HUD_HEIGHT) {
      _mortarTower.fireMortar(mx, my);
      _mortarAiming = false;
      _mortarTower  = null;
    }
    return true;
  }

  // Upgrade button
  if (selectedTower?._btnRect) {
    const b = selectedTower._btnRect;
    if (inRect(mx, my, b.x, b.y, b.w, b.h)) {
      selectedTower.upgrade();
      return true;
    }
  }

  // Sell button
  if (selectedTower?._delRect) {
    const d = selectedTower._delRect;
    if (inRect(mx, my, d.x, d.y, d.w, d.h)) {
      demolishTower(selectedTower);
      selectedTower = null;
      return true;
    }
  }

  // Click a tower
  const clicked = towers.find(t => dist(mx, my, t.px, t.py) < CELL_SIZE * 0.45);
  if (clicked) {
    // Scatter tower aiming mode
    if (clicked.type === 'scatter' && clicked.mortarReady) {
      _mortarAiming     = true;
      _mortarTower      = clicked;
      selectedTower     = clicked;
      selectedTowerType = null;
      return true;
    }
    // Rapid tower overload activation
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

  // Build a tower
  if (selectedTowerType) {
    const gx = Math.floor(mx / CELL_SIZE);
    const gy = Math.floor(my / CELL_SIZE);
    const placeDef = TOWER_DEFS[selectedTowerType];
    if (isCellBuildable(gx, gy) && coins >= placeDef.cost) {
      coins -= placeDef.cost;
      towers.push(new Tower(gx, gy, selectedTowerType));
      playSfx('place');
      selectedTowerType = null;
    } else if (my > HUD_HEIGHT) {
      selectedTower = null;
    }
    return true;
  }

  if (selectedTower) { selectedTower = null; return true; }
  return false;
}
