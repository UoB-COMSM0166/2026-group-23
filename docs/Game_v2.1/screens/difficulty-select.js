// ============================================================
//  screens/difficulty-select.js
//  难度选择界面
//  迁移自：ui.js（原 drawDifficultySelect / _drawDiffCard / handleDifficultyClick）
//  依赖全局：gamePhase, gameDifficulty
// ============================================================

function drawDifficultySelect() {
  background(4, 7, 18);

  // ── 网格背景 ──
  stroke(0, 150, 220, 10); strokeWeight(1);
  for (let x = 0; x < width; x += 50) line(x, 0, x, height);
  for (let y = 0; y < height; y += 50) line(0, y, width, y);

  textFont('monospace'); textAlign(CENTER, CENTER);

  // ── 标题 ──
  const pulse = sin(frameCount * 0.07) * 0.3 + 0.7;
  noStroke();
  fill(0, 200, 255, 220 * pulse); textSize(28);
  text(t('diff.title'), width / 2, height / 2 - 155);
  fill(0, 140, 200, 160 * pulse); textSize(11);
  text(t('diff.select'), width / 2, height / 2 - 118);

  // ── 分割线 ──
  stroke(0, 180, 255, 60); strokeWeight(1);
  line(width / 2 - 200, height / 2 - 105, width / 2 + 200, height / 2 - 105);

  // ── EASY 卡片 ──
  const eX = width / 2 - 210, eY = height / 2 - 90, eW = 190, eH = 240;
  _drawDiffCard(eX, eY, eW, eH, [0, 220, 120], t('diff.easy'), t('diff.easySub'), [
    t('diff.easy.l1'),
    t('diff.easy.l2'),
    t('diff.easy.l3'),
    t('diff.easy.l4'),
  ]);

  // ── DIFFICULT 卡片 ──
  const dX = width / 2 + 20, dY = height / 2 - 90, dW = 190, dH = 240;
  _drawDiffCard(dX, dY, dW, dH, [255, 100, 40], t('diff.difficult'), t('diff.difficultSub'), [
    t('diff.difficult.l1'),
    t('diff.difficult.l2'),
    t('diff.difficult.l3'),
    t('diff.difficult.l4'),
  ]);

  // ── 返回按钮 ──
  const bkH = mouseX < 92 && mouseY < 38;
  fill(bkH ? color(0, 45, 75, 220) : color(5, 10, 24, 200));
  stroke(0, 160, 215, bkH ? 200 : 95); strokeWeight(1);
  rect(6, 6, 82, 26, 4);
  noStroke(); fill(0, 200, 255, bkH ? 240 : 175); textSize(10); textAlign(CENTER, CENTER);
  text(t('diff.back'), 47, 19);

  // ── 底部提示 ──
  noStroke(); fill(0, 140, 200, 120 * pulse); textSize(10); textAlign(CENTER, CENTER);
  text(t('diff.bottom'), width / 2, height / 2 + 175);
  textAlign(LEFT, BASELINE);
}

function _drawDiffCard(x, y, w, h, col, title, subtitle, lines) {
  const [r, g, b] = col;
  const hovered = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;

  noStroke(); fill(r, g, b, hovered ? 22 : 10);
  rect(x - 8, y - 8, w + 16, h + 16, 18);

  fill(hovered ? color(r*0.25, g*0.25, b*0.25, 230) : color(8, 14, 28, 215));
  stroke(r, g, b, hovered ? 200 : 90); strokeWeight(hovered ? 2 : 1.2);
  rect(x, y, w, h, 12);

  noStroke(); fill(r, g, b, hovered ? 200 : 140);
  rect(x, y, w, 6, 12, 12, 0, 0);

  fill(r, g, b, 230); textSize(20); textAlign(CENTER, CENTER);
  text(title, x + w / 2, y + 32);

  fill(r, g, b, 150); textSize(10);
  text(subtitle, x + w / 2, y + 54);

  stroke(r, g, b, 60); strokeWeight(1);
  line(x + 16, y + 66, x + w - 16, y + 66);

  noStroke();
  for (let i = 0; i < lines.length; i++) {
    fill(200, 220, 240, 190); textSize(10); textAlign(LEFT, CENTER);
    text('◈  ' + lines[i], x + 18, y + 88 + i * 28);
  }

  const btnY = y + h - 46;
  fill(r, g, b, hovered ? 200 : 120); noStroke();
  rect(x + 16, btnY, w - 32, 30, 8);
  fill(hovered ? color(255, 255, 255, 240) : color(r, g, b, 220));
  textSize(12); textAlign(CENTER, CENTER);
  text(hovered ? t('diff.start') : t('diff.selectBtn'), x + w / 2, btnY + 15);

  textAlign(LEFT, BASELINE);
}

function handleDifficultyClick(mx, my) {
  // 返回按钮
  if (mx < 92 && my < 38) { gamePhase = 'launch'; return; }

  // EASY
  const eX = width / 2 - 210, eY = height / 2 - 90, eW = 190, eH = 240;
  if (mx >= eX && mx <= eX + eW && my >= eY && my <= eY + eH) {
    gameDifficulty = 'easy';
    gamePhase      = 'levelmap';
    return;
  }
  // DIFFICULT
  const dX = width / 2 + 20, dY = height / 2 - 90, dW = 190, dH = 240;
  if (mx >= dX && mx <= dX + dW && my >= dY && my <= dY + dH) {
    gameDifficulty = 'difficult';
    gamePhase      = 'levelmap';
    return;
  }
}
