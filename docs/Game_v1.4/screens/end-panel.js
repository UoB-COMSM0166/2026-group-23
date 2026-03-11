// ============================================================
//  screens/end-panel.js
//  关卡结算面板（胜利 / 失败）
//  迁移自：sketch.js（原 drawEndPanel / handleEndPanelClick）
//  依赖全局：endPanelAnim, _endPanelWon, currentLevel, unlockedLevel,
//            coins, baseHp, baseHpMax, waveNum, TOTAL_WAVES,
//            LEVEL_INFO, gamePhase, _gameEndFired
// ============================================================

function drawEndPanel() {
  // 半透明遮罩
  noStroke(); fill(0, 0, 0, 165); rect(0, 0, width, height);

  const won = _endPanelWon;
  const t   = constrain(endPanelAnim / 40, 0, 1);
  const pw = 388, ph = 285;
  const px = (width - pw) / 2, py = (height - ph) / 2;
  const [r, g, b] = won ? [0, 220, 140] : [255, 60, 60];
  const pulse = sin(endPanelAnim * 0.08) * 0.2 + 0.8;

  // ── 面板框 ──
  fill(4, 8, 22, 230 * t); stroke(r, g, b, 180 * t); strokeWeight(2);
  rect(px, py, pw, ph, 10);
  noStroke(); fill(r, g, b, 160 * t); rect(px, py, pw, 6, 10, 10, 0, 0);

  // ── 标题 ──
  textFont('monospace'); textAlign(CENTER, CENTER);
  fill(r, g, b, 240 * t * pulse); textSize(28);
  text(won ? 'MISSION COMPLETE' : 'MISSION FAILED', px + pw/2, py + 46);
  fill(r, g, b, 145 * t); textSize(11);
  text(won ? '量子基地成功守卫' : '基地已被攻陷，重新部署', px + pw/2, py + 72);

  // ── 分割线 ──
  stroke(r, g, b, 60 * t); strokeWeight(1); line(px + 20, py + 88, px + pw - 20, py + 88);

  // ── 统计 ──
  noStroke(); fill(178, 210, 240, 200 * t); textSize(10);
  const lname = LEVEL_INFO[currentLevel] ? LEVEL_INFO[currentLevel].name : '-';
  text('关卡: ' + lname,              px + pw/2, py + 108);
  text('剩余金币: ¥' + coins,          px + pw/2, py + 124);
  text('基地HP: ' + baseHp + ' / ' + baseHpMax, px + pw/2, py + 140);
  text('完成波次: ' + waveNum + ' / ' + TOTAL_WAVES, px + pw/2, py + 156);

  // ── 按钮行 1：RETRY / STAGES ──
  const b1y = py + ph - 70, b2y = py + ph - 36;

  const h1 = mouseX >= px+20 && mouseX <= px+pw/2-10 && mouseY >= b1y && mouseY <= b1y + 26;
  fill(h1 ? color(r*0.5, g*0.5, b*0.5, 220) : color(20, 35, 60, 200));
  stroke(r, g, b, h1 ? 200 : 115); strokeWeight(1); rect(px + 20, b1y, pw/2 - 30, 26, 5);
  noStroke(); fill(255, 255, 255, 220 * t); textSize(11);
  text('↺ RETRY', px + 20 + (pw/2 - 30)/2, b1y + 13);

  const h2 = mouseX >= px+pw/2+10 && mouseX <= px+pw-20 && mouseY >= b1y && mouseY <= b1y + 26;
  fill(h2 ? color(20, 75, 115, 220) : color(10, 20, 40, 200));
  stroke(0, 180, 255, h2 ? 200 : 115); strokeWeight(1); rect(px + pw/2 + 10, b1y, pw/2 - 30, 26, 5);
  noStroke(); fill(0, 200, 255, 220 * t); textSize(11);
  text('⊞ STAGES', px + pw/2 + 10 + (pw/2 - 30)/2, b1y + 13);

  // ── 按钮行 2：NEXT LEVEL（胜利且有下一关）──
  if (won && currentLevel < 5) {
    const h3 = mouseX >= px+20 && mouseX <= px+pw-20 && mouseY >= b2y && mouseY <= b2y + 26;
    fill(h3 ? color(0, 135, 75, 230) : color(0, 55, 32, 200));
    stroke(0, 220, 130, h3 ? 220 : 135); strokeWeight(1.5); rect(px + 20, b2y, pw - 40, 26, 5);
    noStroke(); fill(0, 255, 148, 230 * t * pulse); textSize(12);
    const nn = LEVEL_INFO[currentLevel + 1] ? LEVEL_INFO[currentLevel + 1].name : '';
    text('▶▶ NEXT: ' + nn, px + pw/2, b2y + 13);
  }
}

function handleEndPanelClick(mx, my) {
  const pw = 388, ph = 285;
  const px = (width - pw) / 2, py = (height - ph) / 2;
  const b1y = py + ph - 70, b2y = py + ph - 36;

  // RETRY
  if (mx >= px+20 && mx <= px+pw/2-10 && my >= b1y && my <= b1y + 26) {
    endPanelAnim  = 0;
    _gameEndFired = false;
    gamePhase     = 'playing';
    initGame();
    return;
  }
  // STAGES
  if (mx >= px+pw/2+10 && mx <= px+pw-20 && my >= b1y && my <= b1y + 26) {
    endPanelAnim = 0;
    gamePhase    = 'levelmap';
    return;
  }
  // NEXT LEVEL
  if (_endPanelWon && currentLevel < 5) {
    if (mx >= px+20 && mx <= px+pw-20 && my >= b2y && my <= b2y + 26) {
      endPanelAnim  = 0;
      currentLevel++;
      _gameEndFired = false;
      gamePhase     = 'playing';
      initGame();
      return;
    }
  }
}
