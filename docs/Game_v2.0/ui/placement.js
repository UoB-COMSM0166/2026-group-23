// ============================================================
//  ui/placement.js — 建造预览与战场点击事件处理
//  依赖 data/towers.js、map/map-core.js (isCellBuildable)、towers.js
// ============================================================

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
