// ============================================================
//  tutorial.js — Onboarding tutorial (only on the player's first entry to level 1)
//
//  How it works:
//    . While active, sketch.js skips all combat updates (similar to pause) but
//      keeps drawing; mouse clicks are owned by this module to prevent misclicks.
//    . On completion, writes localStorage['qd_tutorial_l1_done']; will not appear again.
//    . The user can also press 'Skip' (top right) to end immediately.
//
//  Dependencies: state.js (tutorialActive / tutorialStep), p5 globals,
//        HUD_HEIGHT, BUILD_BTN_Y (available after ui/index.js initializes)
// ============================================================

const TUTORIAL_FLAG_KEY = 'qd_tutorial_l1_done';

// Each step:
//   title     - panel title
//   body      - body text (\\n line break supported)
//   highlight - optional; screen region {x,y,w,h} highlighted with a glowing rect
//   panelAt   - panel position relative to the highlight: 'below' | 'above' | 'center'
//   btn       - button text
// Each step's structure is unchanged; only title/body/btn became i18n keys, resolved through t() at draw time.
const TUTORIAL_STEPS = [
  { key: 'step1', panelAt: 'center' },
  { key: 'step2', panelAt: 'below',  highlight: () => ({ x: 0, y: 0, w: width, h: HUD_HEIGHT }) },
  { key: 'step3', panelAt: 'below',  highlight: () => ({ x: 0, y: BUILD_BTN_Y, w: 8 * 91 + 4, h: 48 }) },
  { key: 'step4', panelAt: 'center' },
  { key: 'step5', panelAt: 'center' },
];


// ============================================================
//  Public entry: called at the end of sketch.js initGame()
// ============================================================
function startTutorialIfNeeded() {
  if (currentLevel !== 1) return;
  try {
    if (localStorage.getItem(TUTORIAL_FLAG_KEY) === '1') return;
  } catch (e) { /* Ignored if localStorage is unavailable; the tutorial pops up as usual */ }
  tutorialActive = true;
  tutorialStep   = 0;
}

function _finishTutorial() {
  tutorialActive = false;
  tutorialStep   = 0;
  try { localStorage.setItem(TUTORIAL_FLAG_KEY, '1'); } catch (e) {}

  // On first level entry, run the opening minigame after the tutorial finishes to avoid the tutorial and minigame UIs overlapping
  if (waveState === 'countdown' && minigameState === 'idle' && typeof startMinigame === 'function') {
    startMinigame();
  }
}


// ============================================================
//  Click handling - sketch.js mousePressed calls this first in 'playing'
//  Returns true to mean 'consumed'; sketch.js stops dispatching
// ============================================================
function handleTutorialClick(mx, my) {
  if (!tutorialActive) return false;

  const r = _tutorialSkipBtnRect();
  if (_inRect(mx, my, r)) { _finishTutorial(); return true; }

  const b = _tutorialNextBtnRect();
  if (_inRect(mx, my, b)) {
    tutorialStep++;
    if (tutorialStep >= TUTORIAL_STEPS.length) _finishTutorial();
  }
  return true; // Consume all other clicks while the tutorial is active
}


// ============================================================
//  Drawing - called last in sketch.js draw() 'playing' branch (after drawUI)
// ============================================================
function drawTutorial() {
  if (!tutorialActive) return;
  const step = TUTORIAL_STEPS[tutorialStep];
  if (!step) { _finishTutorial(); return; }

  // Overall darkening mask
  push();
  noStroke(); fill(0, 0, 0, 170);
  rect(0, 0, width, height);

  // Highlight region (if any) - 'cut out' brightness on the mask + glowing border
  let hl = null;
  if (step.highlight) {
    hl = step.highlight();
    // Add a subtle highlight inside the region
    fill(0, 180, 255, 22);
    rect(hl.x, hl.y, hl.w, hl.h);
    // Pulsing border
    const pulse = sin(frameCount * 0.12) * 0.25 + 0.75;
    noFill();
    stroke(0, 220, 255, 220 * pulse); strokeWeight(2.5);
    rect(hl.x + 1, hl.y + 1, hl.w - 2, hl.h - 2, 4);
    stroke(0, 220, 255, 90 * pulse); strokeWeight(6);
    rect(hl.x + 1, hl.y + 1, hl.w - 2, hl.h - 2, 4);
  }

  // Panel
  const PW = 520, PH = 190;
  let px = (width - PW) / 2;
  let py;
  if (step.panelAt === 'below' && hl) {
    py = hl.y + hl.h + 18;
  } else if (step.panelAt === 'above' && hl) {
    py = hl.y - PH - 18;
  } else {
    py = (height - PH) / 2;
  }
  py = constrain(py, 12, height - PH - 12);

  // Panel background
  noStroke(); fill(4, 10, 24, 240);
  rect(px, py, PW, PH, 10);
  stroke(0, 200, 255, 200); strokeWeight(2); noFill();
  rect(px, py, PW, PH, 10);
  noStroke(); fill(0, 200, 255, 175);
  rect(px, py, PW, 6, 10, 10, 0, 0);

  // Step indicator
  const total = TUTORIAL_STEPS.length;
  const dotGap = 14, dotY = py + PH - 18;
  const dotStartX = px + PW / 2 - (total - 1) * dotGap / 2;
  for (let i = 0; i < total; i++) {
    const active = i === tutorialStep;
    fill(active ? color(0, 220, 255, 230) : color(0, 120, 180, 120));
    ellipse(dotStartX + i * dotGap, dotY, active ? 8 : 5, active ? 8 : 5);
  }

  // Text (resolved dynamically through i18n)
  textFont('monospace');
  fill(0, 220, 255, 240); textSize(18); textAlign(LEFT, TOP);
  text(t('tutorial.' + step.key + '.title'), px + 22, py + 20);

  stroke(0, 180, 255, 80); strokeWeight(1);
  line(px + 22, py + 50, px + PW - 22, py + 50);
  noStroke();

  fill(210, 230, 250, 220); textSize(12);
  text(t('tutorial.' + step.key + '.body'), px + 22, py + 64, PW - 44, 100);

  // Next button
  const b = _tutorialNextBtnRect(px, py, PW, PH);
  const hov = _inRect(mouseX, mouseY, b);
  fill(hov ? color(0, 80, 140, 230) : color(10, 30, 60, 210));
  stroke(0, 220, 255, hov ? 230 : 140); strokeWeight(1.5);
  rect(b.x, b.y, b.w, b.h, 5);
  noStroke(); fill(hov ? 255 : 220, 255, 255, 240);
  textSize(13); textAlign(CENTER, CENTER);
  text(t('tutorial.' + step.key + '.btn'), b.x + b.w / 2, b.y + b.h / 2);

  // 'Skip' (top right)
  const s = _tutorialSkipBtnRect();
  const shov = _inRect(mouseX, mouseY, s);
  fill(shov ? color(60, 20, 20, 210) : color(15, 10, 20, 180));
  stroke(255, 120, 100, shov ? 220 : 110); strokeWeight(1);
  rect(s.x, s.y, s.w, s.h, 4);
  noStroke(); fill(255, 150, 130, shov ? 240 : 180);
  textSize(11); textAlign(CENTER, CENTER);
  text(t('tutorial.btn.skip'), s.x + s.w / 2, s.y + s.h / 2);

  textAlign(LEFT, BASELINE);
  pop();
}


// ============================================================
//  Internal helpers
// ============================================================
function _tutorialNextBtnRect(px, py, PW, PH) {
  // If panel coordinates were not passed (e.g. on click), recompute for the current frame
  if (px === undefined) {
    const step = TUTORIAL_STEPS[tutorialStep];
    PW = 520; PH = 190;
    px = (width - PW) / 2;
    if (step && step.panelAt === 'below' && step.highlight) {
      const hl = step.highlight();
      py = hl.y + hl.h + 18;
    } else if (step && step.panelAt === 'above' && step.highlight) {
      const hl = step.highlight();
      py = hl.y - PH - 18;
    } else {
      py = (height - PH) / 2;
    }
    py = constrain(py, 12, height - PH - 12);
  }
  const bw = 140, bh = 34;
  return { x: px + PW - bw - 18, y: py + PH - bh - 14, w: bw, h: bh };
}

function _tutorialSkipBtnRect() {
  return { x: width - 92, y: 56, w: 82, h: 22 };
}

function _inRect(mx, my, r) {
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}
