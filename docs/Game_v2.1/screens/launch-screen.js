// ============================================================
//  screens/launch-screen.js
//  Launch screen: logo animation + click to enter
//  Global dependencies: gamePhase, launchAnim, launchReady, launchParticles
// ============================================================

function drawLaunchScreen() {
  launchAnim++;
  // -- Background image (if present) --
  if (!window.launchBg) {
    // Try loading the background on first run
    window.launchBg = loadImage('assert/mrrockyd0710_sci-fi_tower_defense_world_map_top-down_futuristic_7a9633b1-791f-480d-ab58-37f08c2bfe1a.png');
  }

  if (window.launchBg && window.launchBg.width) {
    image(window.launchBg, 0, 0, width, height);
  } else {
    // Use the original background color if the image is not yet loaded
    background(2, 4, 14);
  }

  // -- Flowing particle starfield --
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

  // -- Scan line & grid --
  stroke(0, 90, 160, 7); strokeWeight(1);
  for (let x = 0; x < width; x += 50) line(x, 0, x, height);
  for (let y = 0; y < height; y += 50) line(0, y, width, y);
  noStroke(); fill(0, 160, 255, 10);
  rect(0, (launchAnim * 1.4) % height, width, 2);

  textFont('monospace'); textAlign(CENTER, CENTER);
  const fadein = constrain(launchAnim / 90, 0, 1);
  const pulse  = sin(launchAnim * 0.06) * 0.25 + 0.75;

  // -- Top label --
  if (fadein > 0.2) {
    const t = constrain((fadein - 0.2) / 0.5, 0, 1);
    stroke(0, 180, 255, t * 70); strokeWeight(1);
    line(width/2 - 270*t, height/2 - 115, width/2 + 270*t, height/2 - 115);
    noStroke(); fill(0, 200, 255, t * 55); textSize(9);
    text('◈ QUANTUM DEFENSE NETWORK v5.0  |  INITIALIZED ◈', width/2, height/2 - 128);
  }

  // -- Two-line main title --
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

  // -- Subtitle --
  if (fadein > 0.55) {
    const t = constrain((fadein - 0.55) / 0.4, 0, 1);
    noStroke(); fill(160, 200, 240, t * 175); textSize(12);
    text('Quantum Drop: Defense Protocol', width/2, height/2 + 50);
  }

  // -- Decorative hexagon --
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

  // -- Bottom line --
  if (fadein > 0.65) {
    const t = constrain((fadein - 0.65) / 0.3, 0, 1);
    stroke(0, 180, 255, t * 65); strokeWeight(1);
    line(width/2 - 230*t, height/2 + 80, width/2 + 230*t, height/2 + 80);
  }

  // -- Click hint (CONTINUE) - main entry --
  if (launchAnim > 130) {
    launchReady = true;
    const blink = sin(launchAnim * 0.12) * 0.5 + 0.5;
    noStroke(); fill(0, 200, 255, blink * 210); textSize(13);
    text('[ CLICK TO CONTINUE ]', width/2, height/2 + 110);
    fill(0, 110, 175, 130); textSize(9);
    text('SELECT DIFFICULTY & MISSION TO BEGIN', width/2, height/2 + 133);
  }

  // -- Test mode entry (bottom right) --
  if (launchAnim > 80) {
    _drawTestModeBtn();
    _drawCodexBtn();
  }

  // -- Language toggle (top right) --
  _drawLangToggleBtn();

  // -- Mute toggle (left of the language button) --
  _drawMuteToggleBtn();

  // -- Bottom bar --
  noStroke(); fill(0, 80, 140, 50); rect(0, height - 22, width, 22);
  stroke(0, 130, 195, 45); strokeWeight(1); line(0, height - 22, width, height - 22);
  noStroke(); fill(0, 150, 215, 90); textSize(8); textAlign(LEFT, CENTER);
  text('QUANTUM CORE ■ STATUS: ONLINE ■ SECTORS: 5', 10, height - 11);
  textAlign(RIGHT, CENTER);
  text('FRAME:' + nf(launchAnim, 5) + '  ■  SEC-LVL: ALPHA', width - 10, height - 11);
  textAlign(LEFT, BASELINE);
}

// -- Test mode button (unlock all levels, skip animation, jump straight to map) --
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

// Detect test button click
function handleLaunchTestBtn(mx, my) {
  const bx = width - 138, by = height - 54, bw = 128, bh = 26;
  return mx >= bx && mx <= bx + bw && my >= by && my <= by + bh;
}

// -- Codex entry button (left of the DEV button) --
function _codexBtnRect() {
  const bw = 100, bh = 26;
  // Sit right next to the DEV button with an 8px gap
  const bx = width - 138 - 8 - bw;
  const by = height - 54;
  return { x: bx, y: by, w: bw, h: bh };
}

function _drawCodexBtn() {
  const r = _codexBtnRect();
  const hov = mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h;
  noStroke(); fill(hov ? color(0, 50, 80, 220) : color(2, 12, 22, 190));
  stroke(0, 200, 255, hov ? 220 : 110); strokeWeight(hov ? 1.5 : 1);
  rect(r.x, r.y, r.w, r.h, 4);
  noStroke(); fill(0, 220, 255, hov ? 245 : 175);
  textFont('monospace'); textAlign(CENTER, CENTER); textSize(10);
  text('📖  CODEX', r.x + r.w / 2, r.y + r.h / 2);
  textAlign(LEFT, BASELINE);
}

// Detect codex button click; on hit, open codex.html in a new tab and return true
function handleLaunchCodexBtn(mx, my) {
  const r = _codexBtnRect();
  if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
    try { window.open('codex.html', '_blank'); }
    catch (e) { /* Silently ignore when the popup is blocked */ }
    return true;
  }
  return false;
}

// -- Language toggle button (top right, two-segment EN / CN) --
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

// Detect language button click; on hit, switch language and return true
function handleLaunchLangBtn(mx, my) {
  const { enRect, zhRect } = _langBtnRects();
  const inRect = (r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
  if (inRect(enRect)) { setLang('en'); return true; }
  if (inRect(zhRect)) { setLang('zh'); return true; }
  return false;
}

// -- Mute toggle button (square left of the language button) --
function _muteBtnRect() {
  // Leave another 8px gap to the left of the EN button
  const { enRect } = _langBtnRects();
  const bw = 28, bh = 22, gap = 8;
  return { x: enRect.x - gap - bw, y: enRect.y, w: bw, h: bh };
}

function _drawMuteToggleBtn() {
  const r = _muteBtnRect();
  const hov = mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h;
  noStroke();
  fill(audioMuted ? color(60, 14, 20, 220) : color(8, 16, 30, 170));
  stroke(audioMuted ? color(255, 80, 80, 220) : color(0, 200, 255, hov ? 180 : 110));
  strokeWeight(1);
  rect(r.x, r.y, r.w, r.h, 4);
  // Icon: speaker + (slash when muted)
  noStroke();
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  fill(audioMuted ? color(255, 140, 140, 235) : color(180, 230, 255, hov ? 240 : 200));
  // Speaker body: simplified trapezoid + three sound waves
  rect(cx - 7, cy - 3, 4, 6, 1);
  triangle(cx - 3, cy - 6, cx + 2, cy - 9, cx + 2, cy + 9);
  triangle(cx - 3, cy + 6, cx + 2, cy - 9, cx + 2, cy + 9);
  if (!audioMuted) {
    stroke(180, 230, 255, hov ? 240 : 200); strokeWeight(1); noFill();
    arc(cx + 3, cy, 6, 10, -PI / 3, PI / 3);
    arc(cx + 3, cy, 10, 14, -PI / 4, PI / 4);
  } else {
    stroke(255, 120, 120, 240); strokeWeight(1.5);
    line(cx - 8, cy - 7, cx + 8, cy + 7);
  }
  noStroke();
}

// Return true on hit (toggles mute, does not consume the subsequent click)
function handleLaunchMuteBtn(mx, my) {
  const r = _muteBtnRect();
  if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
    toggleAudioMuted();
    return true;
  }
  return false;
}

// Activate test mode: unlock all levels and jump straight to the map
function activateTestMode() {
  unlockedLevel = 5;
  // Sync with the levels.js array (when both exist, both must be updated)
  if (typeof levelUnlocked !== 'undefined') {
    for (let i = 0; i < levelUnlocked.length; i++) levelUnlocked[i] = true;
  }
  gamePhase = 'difficulty';
}
