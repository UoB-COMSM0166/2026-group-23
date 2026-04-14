// ============================================================
//  ui/hud.js — 顶部 HUD（金币 / 基地HP / 波次 / 敌人数 / 进度 / 暂停按钮）
//  依赖 ui/common.js
// ============================================================


// ============================================================
//  HUD 顶栏
// ============================================================
function drawHUD() {
  const nMon = manager.monsters.length;

  if (_hudSig.coins !== coins) {
    _hudSig.coins = coins;
    _hudStr.credits = nf(coins, 5);
  }
  if (_hudSig.baseHp !== baseHp || _hudSig.baseHpMax !== baseHpMax) {
    _hudSig.baseHp = baseHp;
    _hudSig.baseHpMax = baseHpMax;
    _hudStr.hp = nf(baseHp, 2) + '/' + baseHpMax;
    _hudHpFill = lerpColor(color(220, 30, 30), color(0, 220, 140), baseHp / baseHpMax);
  }
  if (_hudSig.waveState !== waveState || _hudSig.waveNum !== waveNum || _hudSig.totalWaves !== TOTAL_WAVES) {
    _hudSig.waveState = waveState;
    _hudSig.waveNum = waveNum;
    _hudSig.totalWaves = TOTAL_WAVES;
    const prog = waveNum / TOTAL_WAVES;
    _hudStr.wave = waveState === 'complete'
        ? 'DONE'
        : ('W-' + nf(min(waveNum, TOTAL_WAVES), 2) + '/' + nf(TOTAL_WAVES, 2));
    _hudStr.progPct = 'PROGRESS  ' + floor(prog * 100) + '%';
    _hudBarFill = lerpColor(color(0, 160, 255), color(0, 255, 180), prog);
    _hudBarInnerW = max(0, 198 * prog);
  }
  if (_hudSig.monsters !== nMon) {
    _hudSig.monsters = nMon;
    _hudStr.hostiles = nf(nMon, 3);
  }

  // 背景与边框
  noStroke(); fill(5, 8, 18, 225);
  rect(0, 0, width, HUD_HEIGHT);
  stroke(0, 180, 255, 180); strokeWeight(1.5);
  line(0, HUD_HEIGHT, width, HUD_HEIGHT);

  textFont('monospace'); noStroke();

  fill(0, 160, 255); textSize(13); text('◈ CREDITS', 12, 15);
  fill(255, 210, 40); textSize(18); text(_hudStr.credits, 12, 34);

  fill(0, 160, 255); textSize(13); text('◈ BASE HP', 145, 15);
  fill(_hudHpFill);
  textSize(18); text(_hudStr.hp, 145, 34);

  fill(0, 160, 255); textSize(13); text('◈ WAVE', 285, 15);
  fill(waveState === 'complete' ? color(0, 255, 120) : color(140, 80, 255));
  textSize(18); text(_hudStr.wave, 285, 34);

  fill(0, 160, 255); textSize(13); text('◈ HOSTILES', 395, 15);
  fill(220, 50, 50); textSize(18); text(_hudStr.hostiles, 395, 34);

  const barX = 520, barY = 10, barW = 200, barH = 26;
  fill(10, 20, 40, 180); stroke(0, 140, 220, 120); strokeWeight(1);
  rect(barX, barY, barW, barH, 3);
  fill(_hudBarFill); noStroke();
  rect(barX + 1, barY + 1, _hudBarInnerW, barH - 2, 2);
  fill(0, 200, 255, 180); textSize(13); textAlign(CENTER, CENTER);
  text(_hudStr.progPct, barX + barW / 2, barY + barH / 2);

  if (frameCount < jammedUntilFrame) {
    const jp = sin(frameCount * 0.3) * 0.5 + 0.5;  // 重命名避免遮蔽 i18n t()
    noStroke(); fill(255, 80, 0, 140 + jp * 80);
    rect(0, HUD_HEIGHT, width, 20);
    fill(255, 220, 180, 230); textSize(13); textAlign(CENTER, CENTER);
    text(t('hud.jammed'), width / 2, HUD_HEIGHT + 10);
  }

  if (UI_SHOW_MOUSE_DEBUG) {
    noStroke(); fill(0, 140, 220, 65); textSize(10);
    textAlign(LEFT, BASELINE);
    text(nf(mouseX, 4) + ',' + nf(mouseY, 4), width - 80, height - 8);
  }

  const pbx = width - 46, pby = 8, pbw = 36, pbh = 30;
  const pbHov = isHover(pbx, pby, pbw, pbh);
  fill(pbHov ? color(0, 60, 100, 230) : color(8, 16, 36, 200));
  stroke(0, 180, 255, pbHov ? 220 : 100); strokeWeight(1);
  rect(pbx, pby, pbw, pbh, 4);
  noStroke(); fill(0, 200, 255, pbHov ? 255 : 180);
  rect(pbx + 9,  pby + 8, 5, 14, 1);
  rect(pbx + 22, pby + 8, 5, 14, 1);
  _pauseBtnRectPool.x = pbx;
  _pauseBtnRectPool.y = pby;
  _pauseBtnRectPool.w = pbw;
  _pauseBtnRectPool.h = pbh;
  _pauseBtnRect = _pauseBtnRectPool;
}
