// ============================================================
//  screens/level-map.js
//  关卡选择地图
//  迁移自：sketch.js（原 drawLevelMap / handleLevelMapClick）
//  依赖全局：gamePhase, gameDifficulty, currentLevel, unlockedLevel,
//            levelResults, launchParticles, levelMapAnim,
//            LEVEL_INFO, LEVEL_NODES, WAVE_CONFIGS, _gameEndFired
// ============================================================

// 当前帧鼠标悬停的关卡编号（0 = 无）
let levelHovered = 0;

// LEVEL_INFO / LEVEL_NODES 已抽离到 data/levels.js

// ============================================================
//  悬浮信息卡位置计算
//  根据节点坐标把卡片放在节点旁边：
//    - 节点在左半屏 → 卡片在节点右侧
//    - 节点在右半屏 → 卡片在节点左侧
//    - 垂直居中于节点，并裁剪到画布内
// ============================================================
const LEVEL_CARD_W = 200;
const LEVEL_CARD_H = 185;
const LEVEL_CARD_GAP = 58;   // 节点中心到卡片的横向距离

function _levelCardRect(lv) {
  const nd = LEVEL_NODES[lv - 1];
  const nx = nd.x * width, ny = nd.y * (height - 100) + 70;
  const pw = LEVEL_CARD_W, ph = LEVEL_CARD_H;
  // 节点在左半屏则卡片右侧，否则放左侧
  let px = (nx < width / 2) ? nx + LEVEL_CARD_GAP : nx - LEVEL_CARD_GAP - pw;
  // 夹到画布内
  px = constrain(px, 8, width  - pw - 8);
  let py = constrain(ny - ph / 2, 62, height - ph - 8);
  return { px, py, pw, ph, nx, ny };
}

function drawLevelMap() {
  levelMapAnim++;
  background(3, 6, 18);

  // ── 星空粒子 ──
  noStroke();
  for (const p of launchParticles) {
    p.x += p.vx * 0.25; p.y += p.vy * 0.25;
    if (p.y < -10) { p.x = random(width); p.y = height; p.life = random(0.5, 1); }
    fill(p.col[0], p.col[1], p.col[2], p.life * 120);
    ellipse(p.x, p.y, p.size * 0.65, p.size * 0.65);
  }

  // ── 网格 ──
  stroke(0, 75, 135, 8); strokeWeight(1);
  for (let x = 0; x < width; x += 60) line(x, 0, x, height);
  for (let y = 0; y < height; y += 60) line(0, y, width, y);

  // ── 标题 ──
  textFont('monospace'); textAlign(CENTER, CENTER);
  const pulse = sin(levelMapAnim * 0.05) * 0.2 + 0.8;
  noStroke(); fill(0, 200, 255, 220 * pulse); textSize(20);
  text(t('levelmap.title'), width / 2, 30);
  fill(0, 140, 200, 150); textSize(9);
  text(t('levelmap.difficulty', gameDifficulty ? gameDifficulty.toUpperCase() : '---'), width / 2, 52);

  // ── 关卡连线 ──
  for (let i = 0; i < LEVEL_NODES.length - 1; i++) {
    const a = LEVEL_NODES[i], b = LEVEL_NODES[i + 1];
    const ax = a.x * width, ay = a.y * (height - 100) + 70;
    const bx = b.x * width, by = b.y * (height - 100) + 70;
    const unlocked = (i + 2) <= unlockedLevel;
    stroke(unlocked ? color(0, 180, 255, 75) : color(55, 75, 100, 55));
    strokeWeight(unlocked ? 2.2 : 1.2); noFill();
    const steps = 18;
    for (let s = 0; s < steps; s += 2)
      line(lerp(ax,bx,s/steps), lerp(ay,by,s/steps),
           lerp(ax,bx,(s+1)/steps), lerp(ay,by,(s+1)/steps));
    if (unlocked) {
      const ft = (levelMapAnim * 0.016 + i * 0.3) % 1;
      noStroke(); fill(0, 215, 255, 190);
      ellipse(lerp(ax, bx, ft), lerp(ay, by, ft), 5, 5);
    }
  }

  // ── 关卡节点 ──
  levelHovered = 0;
  for (let i = 0; i < 5; i++) {
    const lv   = i + 1;
    const nd   = LEVEL_NODES[i];
    const nx   = nd.x * width, ny = nd.y * (height - 100) + 70;
    const info = LEVEL_INFO[lv];
    const [r, g, b] = info.color;
    const locked = lv > unlockedLevel;
    const result = levelResults[lv];
    const hov    = !locked && Math.hypot(mouseX - nx, mouseY - ny) < 38;
    if (hov) levelHovered = lv;

    if (!locked) {
      noStroke(); fill(r, g, b, hov ? 38 : 12); ellipse(nx, ny, 100, 100);
      fill(r, g, b, hov ? 18 : 6); ellipse(nx, ny, 145, 145);
    }
    const rr = 36 + (hov ? sin(levelMapAnim * 0.13) * 3 : 0);
    strokeWeight(hov ? 2.5 : 1.8);
    stroke(locked ? color(48, 60, 80, 140) : color(r, g, b, hov ? 230 : 145));
    noFill();
    beginShape();
    for (let k = 0; k < 6; k++)
      vertex(nx + cos(k*PI/3 + levelMapAnim*0.007)*rr, ny + sin(k*PI/3 + levelMapAnim*0.007)*rr);
    endShape(CLOSE);
    if (!locked) {
      strokeWeight(1); stroke(r, g, b, 55);
      beginShape();
      for (let k = 0; k < 6; k++)
        vertex(nx + cos(k*PI/3 - levelMapAnim*0.014)*(rr*0.72), ny + sin(k*PI/3 - levelMapAnim*0.014)*(rr*0.72));
      endShape(CLOSE);
    }
    noStroke();
    fill(locked ? color(7, 11, 20, 200) : color(r*0.14, g*0.14, b*0.14, 200));
    beginShape();
    for (let k = 0; k < 6; k++) vertex(nx + cos(k*PI/3)*rr, ny + sin(k*PI/3)*rr);
    endShape(CLOSE);

    textAlign(CENTER, CENTER);
    if (locked)            { fill(75, 95, 130, 175);  textSize(20); text('🔒', nx, ny); }
    else if (result==='win')  { fill(0, 255, 140, 220);  textSize(22); text('★', nx, ny); }
    else if (result==='lose') { fill(255, 80, 80, 200);  textSize(22); text('✕', nx, ny); }
    else                   { fill(r, g, b, hov?255:200); textSize(20); text(info.icon, nx, ny); }

    const ny2 = ny + 52;
    fill(locked ? color(58,76,108,145) : color(r,g,b, hov?240:185));
    textSize(hov ? 11 : 10); text(info.name, nx, ny2);
    fill(locked ? color(48,62,88,115) : color(200,218,238, hov?175:125));
    textSize(8); text(t('level.' + lv + '.subtitle'), nx, ny2 + 15);
    if (!locked) {
      fill(r, g, b, 120); textSize(7);
      text('THREAT ' + '█'.repeat(info.threat) + '░'.repeat(5 - info.threat), nx, ny2 + 28);
    }
  }

  // ── 悬浮信息卡（紧贴悬停节点旁）──
  if (levelHovered > 0) {
    const info    = LEVEL_INFO[levelHovered];
    const [r,g,b] = info.color;
    const { px, py: py2, pw, ph, nx, ny } = _levelCardRect(levelHovered);

    // 从节点到卡片的连接线，视觉上提示"这段描述属于这个关卡"
    stroke(r, g, b, 110); strokeWeight(1);
    const cardCX = px + pw / 2, cardCY = py2 + ph / 2;
    const toRight = px > nx;
    const anchorX = toRight ? px : px + pw;
    const anchorY = constrain(ny, py2 + 10, py2 + ph - 10);
    line(nx + (toRight ? 34 : -34), ny, anchorX, anchorY);

    fill(4, 8, 22, 220); stroke(r, g, b, 145); strokeWeight(1.5);
    rect(px, py2, pw, ph, 6);
    noStroke(); fill(r, g, b, 190); textSize(13); textAlign(CENTER, CENTER);
    text(info.name, px + pw/2, py2 + 20);
    fill(r, g, b, 125); textSize(9); text(t('level.' + levelHovered + '.subtitle'), px + pw/2, py2 + 36);
    stroke(r, g, b, 55); strokeWeight(1); line(px + 10, py2 + 48, px + pw - 10, py2 + 48);
    noStroke(); fill(178, 208, 238, 185); textSize(9); textAlign(LEFT, CENTER);
    text(t('level.' + levelHovered + '.desc'), px + 12, py2 + 64, pw - 22, 40);
    fill(r, g, b, 135); textSize(8);
    const wc = WAVE_CONFIGS[levelHovered] ? WAVE_CONFIGS[levelHovered].length : '?';
    text(t('levelmap.waves', wc), px + 12, py2 + 110);
    text(t('levelmap.threat', info.threat), px + 12, py2 + 124);
    const cs = gameDifficulty === 'easy' ? Math.floor(info.startCoins * 1.3) : info.startCoins;
    text(t('levelmap.startCoins', cs), px + 12, py2 + 138);
    const btnY = py2 + ph - 42;
    fill(r*0.55, g*0.55, b*0.55, 195); stroke(r, g, b, 190); strokeWeight(1.2);
    rect(px + 12, btnY, pw - 24, 28, 5);
    noStroke(); fill(255, 255, 255, 225); textSize(12); textAlign(CENTER, CENTER);
    text(t('levelmap.start'), px + pw/2, btnY + 14);
  }

  // ── 返回按钮 ──
  const bkH = mouseX < 92 && mouseY < 38;
  fill(bkH ? color(0, 45, 75, 220) : color(5, 10, 24, 200));
  stroke(0, 160, 215, bkH ? 200 : 95); strokeWeight(1); rect(6, 6, 82, 26, 4);
  noStroke(); fill(0, 200, 255, bkH ? 240 : 175); textSize(10); textAlign(CENTER, CENTER);
  text(t('levelmap.back'), 47, 19);
  textAlign(LEFT, BASELINE);
}

function handleLevelMapClick(mx, my) {
  // 返回
  if (mx < 92 && my < 38) { gamePhase = 'difficulty'; return; }

  // 节点直接点击
  for (let i = 0; i < 5; i++) {
    const lv = i + 1;
    if (lv > unlockedLevel) continue;
    const nd = LEVEL_NODES[i];
    const nx = nd.x * width, ny = nd.y * (height - 100) + 70;
    if (Math.hypot(mx - nx, my - ny) < 38) {
      currentLevel = lv;
      gamePhase    = 'playing';
      _gameEndFired = false;
      initGame();
      return;
    }
  }

  // 悬浮卡片「START MISSION」按钮
  if (levelHovered > 0) {
    const { px, py: py2, pw, ph } = _levelCardRect(levelHovered);
    const btnY = py2 + ph - 42;
    if (mx >= px+12 && mx <= px+pw-12 && my >= btnY && my <= btnY + 28) {
      currentLevel  = levelHovered;
      gamePhase     = 'playing';
      _gameEndFired = false;
      initGame();
    }
  }
}
