// ============================================================
//  ui/build-menu.js — Bottom build menu and tower hover tooltip
//  Depends on data/towers.js (TOWER_DEFS) and ui/common.js
// ============================================================

// ============================================================
//  Build menu
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

    // Button background
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

    // Hover detection (merged into the same loop to avoid a second pass)
    if (isHover(bx, by, BUILD_BTN_W, 36)) {
      hoverTowerType = type;
    }
  }

  // Cancel button
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
//  Tower hover tooltip
// ============================================================
function drawTowerHoverTooltip() {
  if (!hoverTowerType) return;

  // Cache key includes the language so widths are recomputed when the language changes
  const cacheKey = hoverTowerType + '|' + currentLang;
  let box = _tooltipBoxCache[cacheKey];
  if (!box) {
    const name = t('tower.' + hoverTowerType + '.tipName');
    const desc = t('tower.' + hoverTowerType + '.tipDesc');
    const padding = 12;
    textFont('monospace');
    textSize(14);
    const titleW = textWidth(name);
    textSize(12);
    const descW = textWidth(desc);
    box = { name, desc, w: Math.max(titleW, descW) + padding * 2, h: 44, pad: padding };
    _tooltipBoxCache[cacheKey] = box;
  }

  const { name, desc, w, h, pad: padding } = box;
  textFont('monospace');

  // Prevent overflow off the screen edges
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
