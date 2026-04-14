// ============================================================
//  ui/common.js — UI 共享常量、HUD 渲染缓存、工具函数、点击特效
//  所有其它 ui/*.js 均依赖本文件（须最先加载）
// ============================================================

// ============================================================
//  模块级常量（避免每帧重建对象）
// ============================================================

/** 建造菜单塔类型顺序 */
const TOWER_TYPES = ['rapid','laser','nova','chain','magnet','ghost','scatter','cannon'];

/** 建造菜单显示名称 */
const TOWER_DISPLAY_NAMES = {
  rapid:'RAPID', laser:'LASER', nova:'NOVA',   chain:'CHAIN',
  magnet:'MAGNET', ghost:'GHOST', scatter:'AA-FAN', cannon:'CANNON',
};

// 悬浮提示文本已迁移到 i18n.js（key: tower.<type>.tipName / tipDesc）
// 这里只保留类型列表供 build-menu.js 枚举。

/** 特殊能力描述（drawTowerPanel 使用）。参数命名 tw 以避开全局 i18n 的 t()。 */
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

/** 建造菜单布局常量 */
const BUILD_BTN_W       = 86;
const BUILD_BTN_SPACING = 5;
const BUILD_BTN_STRIDE  = BUILD_BTN_W + BUILD_BTN_SPACING;

/** 为 true 时在 HUD 左下角绘制鼠标坐标（每帧 text，生产环境建议关闭） */
const UI_SHOW_MOUSE_DEBUG = false;

// ── HUD 字符串 / 颜色缓存（数值不变时不重复 nf / lerpColor）──
const _hudStr = { credits: '', hp: '', wave: '', hostiles: '', progPct: '' };
const _hudSig = {
  coins: NaN, baseHp: NaN, baseHpMax: NaN, waveNum: NaN,
  waveState: null, totalWaves: NaN, monsters: NaN,
};
let _hudHpFill = null;
let _hudBarFill = null;
let _hudBarInnerW = 0;

// ── 波次倒计时下方说明行（同一波准备期间文案固定，避免每帧拼接）──
let _wcDescKey = '';
let _wcDescText = '';
let _wcDescBoss = false;

// ── 工具提示尺寸（仅依赖字体与文案，按塔类型缓存）──
const _tooltipBoxCache = Object.create(null);

// ── 点击热区对象复用（减少每帧 {} 分配）──
const _pauseBtnRectPool = { x: 0, y: 0, w: 0, h: 0 };
const _waveEndBtnRectPool = { x: 0, y: 0, w: 0, h: 0 };

function _resetHudTextCache() {
  _hudSig.coins = _hudSig.baseHp = _hudSig.baseHpMax = _hudSig.waveNum = NaN;
  _hudSig.waveState = null;
  _hudSig.totalWaves = _hudSig.monsters = NaN;
  _hudHpFill = _hudBarFill = null;
  _hudBarInnerW = 0;
  _wcDescKey = '';
  _wcDescText = '';
}

// ============================================================
//  工具函数
// ============================================================

/** 矩形碰撞检测（使用全局 mouseX/mouseY） */
function isHover(x, y, w, h) {
  return mouseX >= x && mouseX <= x + w &&
      mouseY >= y && mouseY <= y + h;
}

/** 矩形碰撞检测（指定坐标版） */
function inRect(mx, my, x, y, w, h) {
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

/**
 * 在 p5 绘制后统一将 textAlign 还原为默认值，
 * 避免在各绘制函数末尾反复调用。
 */
function resetTextAlign() {
  textAlign(LEFT, BASELINE);
}

// ============================================================
//  点击特效
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
