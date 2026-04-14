// ============================================================
//  ui/tower-panel.js — 选中塔后的升级/拆除浮层
//  依赖 data/towers.js (TOWER_DEFS) 与 ui/common.js
// ============================================================

// ============================================================
//  塔升级面板
// ============================================================
function drawTowerPanel() {
  if (!selectedTower) return;

  // 使用 tw 作为塔对象别名，避免遮蔽全局 i18n 的 t()
  const tw     = selectedTower;
  const panelW = 178, panelH = 158;
  const px     = constrain(tw.px + 35, 0, width  - panelW - 4);
  const py     = constrain(tw.py - 30, HUD_HEIGHT + 4, height - panelH - 4);

  fill(5, 10, 22, 225); stroke(0, 180, 255, 160); strokeWeight(1.2);
  rect(px, py, panelW, panelH, 4);

  const def     = TOWER_DEFS[tw.type];
  const [r,g,b] = tw.col;
  const isMaxed = tw.level >= 3;

  // 标题行
  fill(r, g, b, 220); noStroke(); textFont('monospace'); textSize(10);
  const towerName = t('tower.' + tw.type + '.name');
  text(towerName + '  Lv.' + tw.level + (isMaxed ? ' ★MAX' : ''), px + 8, py + 16);
  stroke(0, 140, 220, 100); strokeWeight(1);
  line(px + 6, py + 22, px + panelW - 6, py + 22);

  // 基础属性
  fill(180, 220, 255, 200); noStroke(); textSize(9);
  text(t('tower.panel.atk', tw.dmg),   px + 10, py + 36);
  text(t('tower.panel.rng', tw.range), px + 10, py + 50);

  if (tw.type === 'magnet') {
    text(t('tower.panel.magnetSlow', [50,65,80][tw.level-1]), px + 10, py + 64);
  } else {
    text(t('tower.panel.spd', Math.round(60 / tw.fireRate * 10) / 10), px + 10, py + 64);
  }

  // 特殊能力说明
  let specialY = py + 78;
  const specials = TOWER_SPECIALS[tw.type];
  if (specials) {
    for (const [label, col] of specials(tw)) {
      fill(...col); noStroke(); textSize(9);
      text(label, px + 10, specialY);
      specialY += 14;
    }
  }

  // 升级按钮
  if (!isMaxed) {
    const canUpg = coins >= tw.upgradeCost;
    fill(canUpg ? color(0, 150, 75, 200) : color(55, 55, 55, 180));
    stroke(canUpg ? color(0, 210, 95, 200) : color(95, 95, 95, 120)); strokeWeight(1);
    rect(px + 8, specialY, panelW - 16, 24, 3);
    fill(canUpg ? color(175, 255, 195, 230) : color(135, 135, 135, 180));
    noStroke(); textSize(9); textAlign(CENTER, CENTER);
    text(t('tower.panel.upgrade', tw.level + 1, tw.upgradeCost), px + panelW / 2, specialY + 12);
    tw._btnRect = { x: px + 8, y: specialY, w: panelW - 16, h: 24 };
  } else {
    fill(255, 200, 50, 155); noStroke(); textSize(9); textAlign(CENTER, CENTER);
    text(t('tower.panel.maxed'), px + panelW / 2, specialY + 8);
    tw._btnRect = null;
  }

  // 拆除按钮
  const delBtnY = py + panelH - 34;
  fill(75, 18, 18, 200); stroke(195, 55, 55, 175); strokeWeight(1);
  rect(px + 8, delBtnY, panelW - 16, 22, 3);
  fill(255, 100, 100, 230); noStroke(); textSize(9); textAlign(CENTER, CENTER);
  text(t('tower.panel.demolish', Math.floor(def.cost * 0.8)), px + panelW / 2, delBtnY + 11);
  tw._delRect = { x: px + 8, y: delBtnY, w: panelW - 16, h: 22 };

  fill(95, 135, 175, 125); noStroke(); textSize(8); textAlign(CENTER, CENTER);
  text(t('tower.panel.closeHint'), px + panelW / 2, py + panelH - 7);
  resetTextAlign();
}
