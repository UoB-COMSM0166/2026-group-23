// ============================================================
//  screens/launch-screen.js
//  启动页面：Logo 动画 + 点击进入
//  依赖全局：gamePhase, launchAnim, launchReady, launchParticles
// ============================================================

function drawLaunchScreen() {
  launchAnim++;
  // ── 背景图片（如果存在）──
  if (!window.launchBg) {
    // 首次运行时尝试加载背景
    window.launchBg = loadImage('assert/mrrockyd0710_sci-fi_tower_defense_world_map_top-down_futuristic_7a9633b1-791f-480d-ab58-37f08c2bfe1a.png');
  }

  if (window.launchBg && window.launchBg.width) {
    image(window.launchBg, 0, 0, width, height);
  } else {
    // 若图片尚未加载完成则使用原背景色
    background(2, 4, 14);
  }

  // ── 流动粒子星空 ──
  noStroke();
  for (const p of launchParticles) {
    p.x += p.vx; p.y += p.vy; p.life -= 0.0025;
    if (p.life <= 0 || p.y < -10) {
      p.x = random(width); p.y = height + 5;
      p.life = random(0.4, 1.0);
      p.vx = random(-0.35, 0.35); p.vy = random(-0.7, -0.12);
    }
    fill(p.col[0], p.col[1], p.col[2], p.life * 190);
    ellipse(p.x, p.y, p.size, p.size);
  }

  // ── 扫描线 & 网格 ──
  stroke(0, 90, 160, 7); strokeWeight(1);
  for (let x = 0; x < width; x += 50) line(x, 0, x, height);
  for (let y = 0; y < height; y += 50) line(0, y, width, y);
  noStroke(); fill(0, 160, 255, 10);
  rect(0, (launchAnim * 1.4) % height, width, 2);

  textFont('monospace'); textAlign(CENTER, CENTER);
  const fadein = constrain(launchAnim / 90, 0, 1);
  const pulse  = sin(launchAnim * 0.06) * 0.25 + 0.75;

  // ── 顶部标签 ──
  if (fadein > 0.2) {
    const t = constrain((fadein - 0.2) / 0.5, 0, 1);
    stroke(0, 180, 255, t * 70); strokeWeight(1);
    line(width/2 - 270*t, height/2 - 115, width/2 + 270*t, height/2 - 115);
    noStroke(); fill(0, 200, 255, t * 55); textSize(9);
    text('◈ QUANTUM DEFENSE NETWORK v5.0  |  INITIALIZED ◈', width/2, height/2 - 128);
  }

  // ── 主标题双行 ──
  if (fadein > 0.1) {
    const t = constrain((fadein - 0.1) / 0.55, 0, 1);
    noStroke();
    fill(0, 200, 255, t * 35 * pulse); textSize(70);
    text('QUANTUM', width/2, height/2 - 68);
    text('DROP', width/2, height/2 - 2);
    fill(0, 225, 255, t * 235 * pulse); textSize(66);
    text('QUANTUM', width/2, height/2 - 70);
    fill(130, 75, 255, t * 225 * pulse);
    text('DROP', width/2, height/2 - 4);
  }

  // ── 副标题 ──
  if (fadein > 0.55) {
    const t = constrain((fadein - 0.55) / 0.4, 0, 1);
    noStroke(); fill(160, 200, 240, t * 175); textSize(12);
    text('Quantum Drop: Defense Protocol', width/2, height/2 + 50);
  }

  // ── 装饰六边形 ──
  if (fadein > 0.3) {
    const t = constrain((fadein - 0.3) / 0.5, 0, 1);
    push(); translate(width/2, height/2 + 50);
    push(); translate(-215*t, 0);
    stroke(0, 200, 255, t * 115); strokeWeight(1.2); noFill();
    beginShape();
    for (let k = 0; k < 6; k++) vertex(cos(k*PI/3)*19, sin(k*PI/3)*19);
    endShape(CLOSE);
    fill(0, 200, 255, t * 80); noStroke(); textSize(7); text('SYS.ONLINE', 0, 0);
    pop();
    push(); translate(215*t, 0);
    stroke(130, 75, 255, t * 115); strokeWeight(1.2); noFill();
    beginShape();
    for (let k = 0; k < 6; k++) vertex(cos(k*PI/3+PI/6)*19, sin(k*PI/3+PI/6)*19);
    endShape(CLOSE);
    fill(130, 75, 255, t * 80); noStroke(); textSize(7); text('READY', 0, 0);
    pop();
    pop();
  }

  // ── 底部线 ──
  if (fadein > 0.65) {
    const t = constrain((fadein - 0.65) / 0.3, 0, 1);
    stroke(0, 180, 255, t * 65); strokeWeight(1);
    line(width/2 - 230*t, height/2 + 80, width/2 + 230*t, height/2 + 80);
  }

  // ── 点击提示（CONTINUE）——主入口 ──
  if (launchAnim > 130) {
    launchReady = true;
    const blink = sin(launchAnim * 0.12) * 0.5 + 0.5;
    noStroke(); fill(0, 200, 255, blink * 210); textSize(13);
    text('[ CLICK TO CONTINUE ]', width/2, height/2 + 110);
    fill(0, 110, 175, 130); textSize(9);
    text('SELECT DIFFICULTY & MISSION TO BEGIN', width/2, height/2 + 133);
  }

  // ── 测试模式入口（右下角） ──
  if (launchAnim > 80) {
    _drawTestModeBtn();
  }

  // ── 语言切换（右上角） ──
  _drawLangToggleBtn();

  // ── 底栏 ──
  noStroke(); fill(0, 80, 140, 50); rect(0, height - 22, width, 22);
  stroke(0, 130, 195, 45); strokeWeight(1); line(0, height - 22, width, height - 22);
  noStroke(); fill(0, 150, 215, 90); textSize(8); textAlign(LEFT, CENTER);
  text('QUANTUM CORE ■ STATUS: ONLINE ■ SECTORS: 5', 10, height - 11);
  textAlign(RIGHT, CENTER);
  text('FRAME:' + nf(launchAnim, 5) + '  ■  SEC-LVL: ALPHA', width - 10, height - 11);
  textAlign(LEFT, BASELINE);
}

// ── 测试模式按钮（解锁全关卡，跳过动画直接进地图）──
function _drawTestModeBtn() {
  const bx = width - 138, by = height - 54, bw = 128, bh = 26;
  const hov = mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh;
  noStroke(); fill(hov ? color(80, 30, 0, 220) : color(18, 8, 2, 190));
  stroke(255, 140, 20, hov ? 200 : 90); strokeWeight(hov ? 1.5 : 1);
  rect(bx, by, bw, bh, 4);
  noStroke(); fill(255, 160, 30, hov ? 240 : 160);
  textFont('monospace'); textAlign(CENTER, CENTER); textSize(10);
  text('⚙  DEV: ALL LEVELS', bx + bw / 2, by + bh / 2);
  textAlign(LEFT, BASELINE);
}

// 检测测试按钮点击
function handleLaunchTestBtn(mx, my) {
  const bx = width - 138, by = height - 54, bw = 128, bh = 26;
  return mx >= bx && mx <= bx + bw && my >= by && my <= by + bh;
}

// ── 语言切换按钮（右上角，EN / 中 两段式）──
function _langBtnRects() {
  const bw = 34, bh = 22, gap = 4, rx = width - 10 - bw;
  const enRect = { x: rx - bw - gap, y: 10, w: bw, h: bh };
  const zhRect = { x: rx,            y: 10, w: bw, h: bh };
  return { enRect, zhRect };
}

function _drawLangToggleBtn() {
  const { enRect, zhRect } = _langBtnRects();
  textFont('monospace'); textAlign(CENTER, CENTER); textSize(11);

  for (const [r, lang, label] of [[enRect, 'en', 'EN'], [zhRect, 'zh', '中']]) {
    const active = currentLang === lang;
    const hov = mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h;
    noStroke();
    fill(active ? color(0, 80, 140, 220) : (hov ? color(20, 40, 70, 200) : color(8, 16, 30, 170)));
    stroke(0, 200, 255, active ? 230 : (hov ? 180 : 110)); strokeWeight(1);
    rect(r.x, r.y, r.w, r.h, 4);
    noStroke();
    fill(active ? color(220, 245, 255, 250) : color(130, 180, 220, hov ? 230 : 170));
    text(label, r.x + r.w / 2, r.y + r.h / 2);
  }
  textAlign(LEFT, BASELINE);
}

// 检测语言按钮点击；命中则切换并返回 true
function handleLaunchLangBtn(mx, my) {
  const { enRect, zhRect } = _langBtnRects();
  const inRect = (r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
  if (inRect(enRect)) { setLang('en'); return true; }
  if (inRect(zhRect)) { setLang('zh'); return true; }
  return false;
}

// 激活测试模式：解锁全部关卡，直接跳地图
function activateTestMode() {
  unlockedLevel = 5;
  // 同步到 levels.js 的数组（二者并存时都要更新）
  if (typeof levelUnlocked !== 'undefined') {
    for (let i = 0; i < levelUnlocked.length; i++) levelUnlocked[i] = true;
  }
  gamePhase = 'difficulty';
}
