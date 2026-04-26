// ============================================================
//  codex.js — Debug Codex sketch
//
//  Live grid of monster + tower previews, primarily a debugging
//  tool for the upcoming "direction-aware sprite rotation" work.
//
//  Each card runs the real monster/tower update + draw on its own
//  closed loop path, so we can visually compare the sprite's body
//  orientation against the actual heading vector.
//
//  Per-card scoping: before each card runs, we swap the shared
//  globals (`manager.monsters`, `towers`, `projectiles`, `particles`,
//  `_chainArcs`, `_cannonBlasts`, `_mortarShells`) with the card's
//  own arrays, so cross-card AOEs / particles never bleed.
// ============================================================

// ── Constants normally declared in sketch.js (which we deliberately don't
//    load — its setup/draw would clash with codex's). Tower base / variants
//    reference these at construct + draw time. ──
const CELL_SIZE        = 70;
const GRID_COLS        = 14;
const GRID_ROWS        = 12;
const HUD_HEIGHT       = 46;
const COUNTDOWN_FRAMES = 300;
const STAGE_W = GRID_COLS * CELL_SIZE;
const STAGE_H = GRID_ROWS * CELL_SIZE;

// ── Card geometry ──
const COLS      = 4;
const CARD_W    = 240;
const CARD_H    = 220;
const GAP       = 8;
const HEADER_H  = 28;
const VIEW_PAD  = 12;
const PAGE_PAD  = 0;

// ── Live toolbar state (DOM controls write into these) ──
let pathShape   = 'square';
let speedScale  = 1.0;
let showHeading = true;
let showTrail   = true;
let showGrid    = true;
let activeTab   = 'monsters';

// ── Cards ──
let cards = [];

// ── Catalog ──
// Static lookup of monster classes. Required because `class Foo {}` at the
// top level of a classic <script> creates a lexical binding (not a window
// property), so `window['MechSnake']` is undefined. Bare-name reference
// here resolves via shared script-scope, then we expose by string key.
const MONSTER_CLS = {
  MechSnake,   MechSpider,  MechTank,    MechRobot,    MechPhoenix, GhostBird,
  BossFission, BossPhantom, BossAntMech, BossCarrier,
};

const MONSTER_CATALOG = [
  { name: 'MechSnake',    cls: 'MechSnake',    tag: 'main',  desc: 'group heal'    },
  { name: 'MechSpider',   cls: 'MechSpider',   tag: 'edge',  desc: 'spawn dash'    },
  { name: 'MechTank',     cls: 'MechTank',     tag: 'main',  desc: 'shield aura'   },
  { name: 'MechRobot',    cls: 'MechRobot',    tag: 'main',  desc: 'shield @60%'   },
  { name: 'MechPhoenix',  cls: 'MechPhoenix',  tag: 'air',   desc: 'jam pulse'     },
  { name: 'GhostBird',    cls: 'GhostBird',    tag: 'air',   desc: 'cloak'         },
  { name: 'BossFission',  cls: 'BossFission',  tag: 'boss',  desc: 'splits @50%'   },
  { name: 'BossPhantom',  cls: 'BossPhantom',  tag: 'boss',  desc: 'EMP + clones'  },
  { name: 'BossAntMech',  cls: 'BossAntMech',  tag: 'boss',  desc: 'giant↔tiny'    },
  { name: 'BossCarrier',  cls: 'BossCarrier',  tag: 'boss',  desc: 'heavy'         },
];

const TOWER_CATALOG = [
  { name: 'RAPID',   type: 'rapid'   },
  { name: 'LASER',   type: 'laser'   },
  { name: 'NOVA',    type: 'nova'    },
  { name: 'CHAIN',   type: 'chain'   },
  { name: 'MAGNET',  type: 'magnet'  },
  { name: 'GHOST',   type: 'ghost'   },
  { name: 'SCATTER', type: 'scatter' },
  { name: 'CANNON',  type: 'cannon'  },
];

// ============================================================
//  Boot — set up globals the game code expects
// ============================================================
function bootGameGlobals() {
  // manager singleton (a stub object is enough — only .monsters is read)
  if (typeof manager === 'undefined' || manager === null) {
    manager = {
      monsters: [],
      // Expose getMonstersInRange / damageAt / damageInRadius so towers can fire on the dummy
      getMonstersInRange(cx, cy, range, antiAir) {
        const out = [];
        for (const m of this.monsters) {
          if (!m.alive || m.reached) continue;
          if (Math.hypot(m.pos.x - cx, m.pos.y - cy) <= range + (m.radius || 14)) out.push(m);
        }
        return out;
      },
      damageAt(x, y, dmg, antiAir, fromSide, _, ignoreShield) {
        for (const m of this.monsters) {
          if (!m.alive || m.reached) continue;
          if (Math.hypot(m.pos.x - x, m.pos.y - y) <= (m.radius || 14) + 6) {
            if (typeof m.takeDamage === 'function') m.takeDamage(dmg, fromSide, ignoreShield);
            return true;
          }
        }
        return false;
      },
      damageInRadius(cx, cy, radius, dmg) {
        for (const m of this.monsters) {
          if (!m.alive || m.reached) continue;
          if (Math.hypot(m.pos.x - cx, m.pos.y - cy) <= radius) {
            if (typeof m.takeDamage === 'function') m.takeDamage(dmg);
          }
        }
      },
    };
  }
  if (typeof towers === 'undefined') towers = [];
  if (typeof projectiles === 'undefined') projectiles = [];
  if (typeof gamePhase === 'undefined') gamePhase = 'playing';
  if (typeof gamePaused === 'undefined') gamePaused = false;
}

// ============================================================
//  Path shapes — local to a card viewport (w × h)
// ============================================================
function buildPath(shape, w, h) {
  const m  = 30;
  const cx = w / 2, cy = h / 2;

  if (shape === 'square') {
    return [
      { x: m,     y: m     },
      { x: w - m, y: m     },
      { x: w - m, y: h - m },
      { x: m,     y: h - m },
      { x: m,     y: m     },     // close loop (path[0] == path[end])
    ];
  }

  if (shape === 'circle') {
    const pts = [];
    const N = 32;
    const r = Math.min(w, h) / 2 - m;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
  }

  if (shape === 'fig8') {
    const pts = [];
    const N = 64;
    const ax = w / 2 - m;
    const ay = h / 2 - m;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      // Lemniscate of Gerono: (sin t, sin t cos t)
      pts.push({
        x: cx + Math.sin(t) * ax,
        y: cy + Math.sin(t) * Math.cos(t) * ay,
      });
    }
    return pts;
  }

  if (shape === 'hline') {
    return [
      { x: m,     y: cy },
      { x: w - m, y: cy },
      { x: m,     y: cy },        // back
    ];
  }

  if (shape === 'vline') {
    return [
      { x: cx, y: m     },
      { x: cx, y: h - m },
      { x: cx, y: m     },
    ];
  }

  return [{ x: m, y: cy }, { x: w - m, y: cy }];
}

// ============================================================
//  Card factories
// ============================================================
function makeMonsterCard(def) {
  const viewW = CARD_W - VIEW_PAD * 2;
  const viewH = CARD_H - HEADER_H - VIEW_PAD * 2;
  const path  = buildPath(pathShape, viewW, viewH);
  const Cls   = MONSTER_CLS[def.cls];

  if (typeof Cls !== 'function') {
    return { kind: 'monster', def, viewW, viewH, error: `class ${def.cls} not found` };
  }

  let monster;
  try {
    monster = new Cls(path);
    // Boss / large mob spd is fine; nothing to override
    // Shield-style Boss states tend to start active — we leave them in their natural cycle.
  } catch (e) {
    return { kind: 'monster', def, viewW, viewH, error: e.message };
  }

  return {
    kind: 'monster',
    def,
    monster,
    path,
    viewW,
    viewH,
    trail:    [],
    lastPos:  { x: monster.pos.x, y: monster.pos.y },
    heading:  0,
    particles: [],
    x: 0, y: 0,
  };
}

function makeTowerCard(def) {
  const viewW = CARD_W - VIEW_PAD * 2;
  const viewH = CARD_H - HEADER_H - VIEW_PAD * 2;
  const cx = viewW / 2, cy = viewH / 2;

  // Tower is also a class binding (not a window property), use bare reference
  if (typeof Tower !== 'function' || typeof TOWER_DEFS === 'undefined') {
    return { kind: 'tower', def, viewW, viewH, error: 'Tower / TOWER_DEFS missing' };
  }

  let tower;
  try {
    tower = new Tower(0, 0, def.type);
    tower.px = cx;
    tower.py = cy;
    // Cap range so the dummy stays within the orbit
    tower.range = Math.min(viewW, viewH) / 2 - 6;
    tower.buildAnim = 0;     // skip build pop-in
  } catch (e) {
    return { kind: 'tower', def, viewW, viewH, error: e.message };
  }

  // Dummy target orbits the tower so it has someone to fire at
  const orbitR = Math.min(viewW, viewH) / 2 - 22;
  const orbitN = 32;
  const orbitPath = [];
  for (let i = 0; i <= orbitN; i++) {
    const a = (i / orbitN) * Math.PI * 2;
    orbitPath.push({
      x: cx + Math.cos(a) * orbitR,
      y: cy + Math.sin(a) * orbitR,
    });
  }

  const towerDef  = TOWER_DEFS[def.type];
  const isAirOnly = !!(towerDef && towerDef.onlyAir);
  const DummyCls  = isAirOnly ? MONSTER_CLS.GhostBird : MONSTER_CLS.MechSpider;
  const dummy = new DummyCls(orbitPath);
  // Keep the dummy alive forever and harmless
  dummy.maxHp = 1e9;
  dummy.hp    = 1e9;
  dummy.takeDamage = function () {};
  if ('spawnDash' in dummy) {
    dummy.spawnDash = false;
    dummy.spawnDashFrames = 0;
    dummy.spawnDashInvincible = false;
  }
  if ('isGhost' in dummy) dummy.isGhost = false;

  return {
    kind: 'tower',
    def,
    tower,
    dummy,
    viewW, viewH,
    cx, cy,
    projectiles:  [],
    particles:    [],
    chainArcs:    [],
    cannonBlasts: [],
    mortarShells: [],
    x: 0, y: 0,
  };
}

// ============================================================
//  Layout
// ============================================================
function layoutCards() {
  const totalCols = COLS;
  const rowsNeeded = Math.max(1, Math.ceil(cards.length / totalCols));
  for (let i = 0; i < cards.length; i++) {
    const r = Math.floor(i / totalCols);
    const c = i % totalCols;
    cards[i].x = PAGE_PAD + c * (CARD_W + GAP);
    cards[i].y = PAGE_PAD + r * (CARD_H + GAP);
  }
  return {
    w: PAGE_PAD * 2 + totalCols * CARD_W + (totalCols - 1) * GAP,
    h: PAGE_PAD * 2 + rowsNeeded * CARD_H + (rowsNeeded - 1) * GAP,
  };
}

function rebuildCards() {
  cards = [];
  if (activeTab === 'monsters') {
    for (const def of MONSTER_CATALOG) cards.push(makeMonsterCard(def));
  } else {
    for (const def of TOWER_CATALOG)  cards.push(makeTowerCard(def));
  }
  const { w, h } = layoutCards();
  resizeCanvas(w, h);
}

// ============================================================
//  DOM controls
// ============================================================
function bindControls() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      rebuildCards();
    });
  });

  const pathSel = document.getElementById('path-shape');
  pathSel.addEventListener('change', e => {
    pathShape = e.target.value;
    rebuildCards();
  });

  const speedInput = document.getElementById('speed');
  const speedVal   = document.getElementById('speed-val');
  speedInput.addEventListener('input', e => {
    speedScale = parseFloat(e.target.value);
    speedVal.textContent = speedScale.toFixed(2) + '×';
  });

  document.getElementById('show-heading').addEventListener('change', e => showHeading = e.target.checked);
  document.getElementById('show-trail').addEventListener('change',   e => showTrail   = e.target.checked);
  document.getElementById('show-grid').addEventListener('change',    e => showGrid    = e.target.checked);
}

// ============================================================
//  p5 entry
// ============================================================
function setup() {
  bootGameGlobals();
  const c = createCanvas(100, 100);
  c.parent('canvas-mount');
  textAlign(LEFT, TOP);
  noSmooth();
  bindControls();
  rebuildCards();
}

function draw() {
  background(10, 16, 28);

  for (const card of cards) {
    push();
    translate(card.x, card.y);
    drawCardChrome(card);

    if (!card.error) {
      push();
      translate(VIEW_PAD, HEADER_H + VIEW_PAD);

      drawCardViewport(card);
      if (showGrid) drawCardGrid(card.viewW, card.viewH);
      drawCardPath(card);

      if (card.kind === 'monster') runMonsterCard(card);
      else if (card.kind === 'tower') runTowerCard(card);

      pop();
    }
    pop();
  }
}

// ============================================================
//  Card chrome
// ============================================================
function drawCardChrome(card) {
  const def = card.def;

  noFill();
  stroke(31, 58, 94);
  strokeWeight(1);
  rect(0, 0, CARD_W, CARD_H, 4);

  noStroke();
  fill(15, 26, 42);
  rect(0, 0, CARD_W, HEADER_H, 4, 4, 0, 0);

  fill(120, 200, 255);
  textSize(12);
  textStyle(BOLD);
  text(def.name, 8, 8);
  textStyle(NORMAL);

  if (def.tag) {
    fill(80, 140, 180);
    textSize(9);
    textAlign(RIGHT, TOP);
    text(def.tag.toUpperCase(), CARD_W - 8, 11);
    textAlign(LEFT, TOP);
  }

  if (card.error) {
    fill(255, 100, 100);
    textSize(10);
    text('error: ' + card.error, 8, HEADER_H + 8);
  }
}

function drawCardViewport(card) {
  noStroke();
  fill(5, 10, 18);
  rect(0, 0, card.viewW, card.viewH, 3);
}

function drawCardGrid(w, h) {
  stroke(20, 40, 70, 180);
  strokeWeight(0.5);
  const step = 24;
  for (let x = 0; x <= w; x += step) line(x, 0, x, h);
  for (let y = 0; y <= h; y += step) line(0, y, w, y);
  noStroke();
}

function drawCardPath(card) {
  const path = card.path || (card.dummy && card.dummy.path);
  if (!path || path.length < 2) return;
  noFill();
  stroke(60, 90, 130, 180);
  strokeWeight(1.2);
  beginShape();
  for (const p of path) vertex(p.x, p.y);
  endShape();
  fill(80, 140, 200, 200);
  noStroke();
  for (const p of path) ellipse(p.x, p.y, 3, 3);
}

// ============================================================
//  Monster card runner
// ============================================================
function runMonsterCard(card) {
  if (!card.monster) return;
  const m = card.monster;

  // Scope swap: only this card's monster is "in the world"
  const savedMon       = manager.monsters;
  const savedParticles = particles;
  manager.monsters = [m];
  particles        = card.particles;

  // Apply speed scale by temporarily multiplying spd. We sub-step so
  // moveAlongPath doesn't skip a corner at high scales.
  const sub = Math.max(1, Math.ceil(speedScale));
  const origSpd = m.spd;
  const origBaseSpd = m.baseSpd;
  m.spd = origSpd * speedScale / sub;
  if (m.baseSpd !== undefined) m.baseSpd = origBaseSpd * speedScale / sub;

  for (let i = 0; i < sub; i++) {
    if (m.reached || m.seg >= m.path.length - 1) {
      // wrap to start of closed loop — pos[0] == pos[end] for our shapes
      m.seg = 0;
      m.pos = { x: m.path[0].x, y: m.path[0].y };
      m.reached = false;
    }
    m.update();
  }

  m.spd = origSpd;
  if (m.baseSpd !== undefined) m.baseSpd = origBaseSpd;

  // Heading: prefer the monster's own smoothed heading (set by base
  // _updateHeading) so the debug arrow shows EXACTLY the angle that
  // drives any rotate() in the sprite. Fallback to a local recompute
  // for any future class that disables the base heading.
  if (typeof m.heading === 'number') {
    card.heading = m.heading;
  } else {
    const dx = m.pos.x - card.lastPos.x;
    const dy = m.pos.y - card.lastPos.y;
    if (Math.hypot(dx, dy) > 0.05) {
      const newH = Math.atan2(dy, dx);
      let diff = newH - card.heading;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      card.heading += diff * 0.25;
    }
  }
  card.lastPos = { x: m.pos.x, y: m.pos.y };

  // Trail
  card.trail.push({ x: m.pos.x, y: m.pos.y });
  if (card.trail.length > 30) card.trail.shift();

  if (showTrail)   drawTrail(card.trail);
  updateParticles();
  if (showHeading) drawHeadingArrow(m.pos.x, m.pos.y, card.heading, m.radius || 14);

  // Capture the filtered arrays back (updateParticles reassigns, doesn't mutate)
  card.particles = particles;

  // Restore
  particles = savedParticles;
  manager.monsters = savedMon;
}

// ============================================================
//  Tower card runner
// ============================================================
function runTowerCard(card) {
  if (!card.tower) return;

  // Scope swap: ALL relevant globals
  const savedMon       = manager.monsters;
  const savedTow       = towers;
  const savedProj      = projectiles;
  const savedParticles = particles;
  const savedArcs      = (typeof _chainArcs    !== 'undefined') ? _chainArcs    : null;
  const savedBlasts    = (typeof _cannonBlasts !== 'undefined') ? _cannonBlasts : null;
  const savedShells    = (typeof _mortarShells !== 'undefined') ? _mortarShells : null;
  const savedJamUntil  = (typeof jammedUntilFrame !== 'undefined') ? jammedUntilFrame : 0;

  manager.monsters = [card.dummy];
  towers           = [card.tower];
  projectiles      = card.projectiles;
  particles        = card.particles;
  if (savedArcs   !== null) _chainArcs    = card.chainArcs;
  if (savedBlasts !== null) _cannonBlasts = card.cannonBlasts;
  if (savedShells !== null) _mortarShells = card.mortarShells;
  jammedUntilFrame = 0;   // never jam in codex

  // Dummy moves
  if (card.dummy.reached || card.dummy.seg >= card.dummy.path.length - 1) {
    card.dummy.seg = 0;
    card.dummy.pos = { x: card.dummy.path[0].x, y: card.dummy.path[0].y };
    card.dummy.reached = false;
  }
  card.dummy.update();

  // Tower update + draw + projectiles + effects
  card.tower.update();
  card.tower.draw();

  if (typeof _drawChainArcs        === 'function') _drawChainArcs();
  if (typeof _drawCannonBlasts     === 'function') _drawCannonBlasts();
  if (typeof _updateDrawMortarShells === 'function') _updateDrawMortarShells();

  card.projectiles = card.projectiles.filter(p => p.alive);
  for (const p of card.projectiles) { p.update(); p.draw(); }
  projectiles = card.projectiles;

  updateParticles();

  // Capture the (possibly reassigned) filtered arrays back into the card.
  // updateParticles + _drawChainArcs + _drawCannonBlasts + _updateDrawMortarShells
  // all do `xs = xs.filter(...)` which rebinds the global, NOT card.xs.
  card.particles    = particles;
  if (savedArcs   !== null) card.chainArcs    = _chainArcs;
  if (savedBlasts !== null) card.cannonBlasts = _cannonBlasts;
  if (savedShells !== null) card.mortarShells = _mortarShells;
  card.projectiles  = projectiles;

  // Restore
  manager.monsters = savedMon;
  towers           = savedTow;
  projectiles      = savedProj;
  particles        = savedParticles;
  if (savedArcs   !== null) _chainArcs    = savedArcs;
  if (savedBlasts !== null) _cannonBlasts = savedBlasts;
  if (savedShells !== null) _mortarShells = savedShells;
  jammedUntilFrame = savedJamUntil;
}

// ============================================================
//  Overlays
// ============================================================
function drawTrail(trail) {
  noStroke();
  for (let i = 0; i < trail.length; i++) {
    const t = i / trail.length;
    fill(90, 200, 255, 30 + t * 90);
    ellipse(trail[i].x, trail[i].y, 2.6, 2.6);
  }
}

function drawHeadingArrow(x, y, ang, radius) {
  push();
  translate(x, y);
  rotate(ang);
  const L = (radius || 14) + 18;
  stroke(255, 90, 130, 230);
  strokeWeight(1.6);
  noFill();
  line(0, 0, L, 0);
  fill(255, 90, 130);
  noStroke();
  triangle(L, 0, L - 6, -3.5, L - 6, 3.5);
  pop();

  push();
  noStroke();
  fill(255, 130, 160, 220);
  textSize(9);
  textAlign(LEFT, TOP);
  const deg = Math.round(ang * 180 / Math.PI);
  text(`h:${deg}°`, x + (radius || 14) + 4, y + (radius || 14) + 2);
  pop();
}
