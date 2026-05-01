// ============================================================
//  ui/common.js — UI shared constants, HUD render cache, utility functions, click effects
//  All other ui/*.js depend on this file (must load first)
// ============================================================

// ============================================================
//  Module-level constants (avoid rebuilding objects each frame)
// ============================================================

/** Tower types in build menu order */
const TOWER_TYPES = ['rapid','laser','nova','chain','magnet','ghost','scatter','cannon'];

/** Build menu display names */
const TOWER_DISPLAY_NAMES = {
  rapid:'RAPID', laser:'LASER', nova:'NOVA',   chain:'CHAIN',
  magnet:'MAGNET', ghost:'GHOST', scatter:'AA-FAN', cannon:'CANNON',
};

// Hover tooltip text has been moved to i18n.js (key: tower.<type>.tipName / tipDesc)
// Only the type list is kept here for build-menu.js to enumerate.

/** Special-ability description (used by drawTowerPanel). The parameter is named tw to avoid the global i18n's t(). */
const TOWER_SPECIALS = {
  laser:   (tw) => [[t('tower.laser.special',   tw.level),            [0,255,150,210]]],
  chain:   (tw) => [[t('tower.chain.special',   tw.level),            [100,200,255,210]]],
  magnet:  ()   => [[t('tower.magnet.special'),                       [140,100,255,210]]],
  ghost:   (tw) => [[t('tower.ghost.special',   tw.level),            [200,100,255,210]]],
  scatter: (tw) => [[t('tower.scatter.special', [3,5,7][tw.level-1]), [255,80,120,210]]],
  nova:    ()   => [[t('tower.nova.special'),                         [255,160,50,210]]],
  cannon:  (tw) => {
    const br = TOWER_DEFS.cannon.cannonBlastRadius[tw.level-1];
    return [
      [t('tower.cannon.special1'),     [255,80,80,210]],
      [t('tower.cannon.special2', br), [255,140,60,200]],
    ];
  },
};

/** Build menu layout constants */
const BUILD_BTN_W       = 86;
const BUILD_BTN_SPACING = 5;
const BUILD_BTN_STRIDE  = BUILD_BTN_W + BUILD_BTN_SPACING;

/** When true, draws the mouse coordinates in the bottom-left of the HUD (one text() per frame; turn off in production) */
const UI_SHOW_MOUSE_DEBUG = false;

// -- HUD string / color cache (skip nf / lerpColor when values are unchanged) --
// The lang field forces wave / progPct strings to rebuild when the language changes.
const _hudStr = { credits: '', hp: '', wave: '', hostiles: '', progPct: '' };
const _hudSig = {
  coins: NaN, baseHp: NaN, baseHpMax: NaN, waveNum: NaN,
  waveState: null, totalWaves: NaN, monsters: NaN, lang: '',
};
let _hudHpFill = null;
let _hudBarFill = null;
let _hudBarInnerW = 0;

// -- Description line below the wave countdown (text fixed during a wave's prep, avoid rebuilding each frame) --
let _wcDescKey = '';
let _wcDescText = '';
let _wcDescBoss = false;

// -- Tooltip dimensions (cached per tower type; depend only on font and text) --
const _tooltipBoxCache = Object.create(null);

// -- Click hot-area object reuse (reduce per-frame {} allocation) --
const _pauseBtnRectPool = { x: 0, y: 0, w: 0, h: 0 };
const _waveEndBtnRectPool = { x: 0, y: 0, w: 0, h: 0 };

function _resetHudTextCache() {
  _hudSig.coins = _hudSig.baseHp = _hudSig.baseHpMax = _hudSig.waveNum = NaN;
  _hudSig.waveState = null;
  _hudSig.totalWaves = _hudSig.monsters = NaN;
  _hudSig.lang = '';
  _hudHpFill = _hudBarFill = null;
  _hudBarInnerW = 0;
  _wcDescKey = '';
  _wcDescText = '';
}

// ============================================================
//  Utility functions
// ============================================================

/** Rectangle hit test (uses global mouseX/mouseY) */
function isHover(x, y, w, h) {
  return mouseX >= x && mouseX <= x + w &&
      mouseY >= y && mouseY <= y + h;
}

/** Rectangle hit test (with explicit coordinates) */
function inRect(mx, my, x, y, w, h) {
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

/**\n * Restore textAlign to defaults after p5 drawing,\n * to avoid resetting at the end of every draw function.\n */
function resetTextAlign() {
  textAlign(LEFT, BASELINE);
}

// ============================================================
//  Click effects
// ============================================================
function drawClickEffects() {
  const next = [];
  for (const e of clickEffects) {
    if (e.life <= 0) continue;
    e.life -= 0.055;
    next.push(e);
    const r = map(e.life, 1, 0, 8, 55);
    noFill();
    stroke(0, 200, 255, e.life * 170);
    strokeWeight(1.5);
    beginShape();
    for (let k = 0; k < 12; k++) {
      const angle = k * TWO_PI / 12;
      const nr = r + sin(k * 1.3) * 3.5;
      vertex(e.x + cos(angle) * nr, e.y + sin(angle) * nr);
    }
    endShape(CLOSE);
    stroke(0, 220, 255, e.life * 110);
    strokeWeight(1);
    line(e.x - 10, e.y, e.x + 10, e.y);
    line(e.x, e.y - 10, e.x, e.y + 10);
  }
  clickEffects = next;
}
