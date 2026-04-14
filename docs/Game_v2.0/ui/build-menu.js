// ============================================================
//  ui/build-menu.js — 底部建造菜单与塔悬浮提示
//  依赖 data/towers.js (TOWER_DEFS) 与 ui/common.js
// ============================================================

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

  // 缓存 key 加入语言维度，语言切换后自动重算宽度
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
