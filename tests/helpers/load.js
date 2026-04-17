// ============================================================
//  tests/helpers/load.js
//
//  把 docs/Game_v2.1/ 下的裸浏览器脚本加载进一个 vm 沙箱用于单元测试。
//
//  核心难点：
//    · 源码用 `<script>` 加载，依赖 p5 的全局函数（color, lerp, floor…）
//      和浏览器对象（localStorage, window）—— 这里全部伪造成最小可用实现。
//    · 源码 top-level 使用 `const` / `let`（比如 `const TOWER_DEFS = {...}`）。
//      vm.runInContext 执行时，这些绑定落在"脚本作用域"，**不会**被挂到
//      contextified globalThis 上。为了让测试能从 ctx 读到它们，我们在
//      bundle 末尾追加 `globalThis.X = X` 的显式发布。
//    · 所有源码连成一段一次 runInContext —— 这样 const 之间互相可见，
//      跟浏览器里多个 <script> 共享 script scope 的行为一致。
//    · 函数内部的闭包仍然指向同一份 script scope，所以测试调用
//      `initPathCells()` 之后再调 `isCellBuildable()` 能看到刚初始化的
//      `pathCellSet`，即便我们没有把这个 let 变量 publish 出来。
// ============================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GAME_ROOT = path.join(__dirname, '..', '..', 'docs', 'Game_v2.1');

// 被测源码里最常引用的顶层标识符；loader 会在 bundle 末尾把
// 这些名字（如果已定义）拷贝到 globalThis，方便测试 require 使用。
const PUBLISH_NAMES = [
  // 数据配置
  'TOWER_DEFS', 'WAVE_CONFIGS', 'WAVE_CONFIG',
  'LEVEL_INFO', 'LEVEL_NODES', 'LEVEL_PATHS',
  // i18n
  'I18N', 'I18N_STORAGE_KEY', 't', 'setLang',
  // map-core
  'isCellBuildable', 'initPathCells', 'initMap', 'pathToPixels',
  // 画布常量
  'GRID_COLS', 'GRID_ROWS', 'CELL_SIZE', 'HUD_HEIGHT',
];

// ── p5 函数 / 常量的最小 mock（够纯数据和 map-core 的测试用）──
function createP5Mocks() {
  return {
    // 数学类
    floor: Math.floor, ceil: Math.ceil, round: Math.round, abs: Math.abs,
    min: Math.min,     max: Math.max,   sqrt: Math.sqrt,   pow: Math.pow,
    sin: Math.sin,     cos: Math.cos,   atan2: Math.atan2,
    random: (a, b) => {
      if (a === undefined) return Math.random();
      if (Array.isArray(a)) return a[Math.floor(Math.random() * a.length)];
      if (b === undefined) return Math.random() * a;
      return a + Math.random() * (b - a);
    },
    constrain: (n, lo, hi) => Math.min(hi, Math.max(lo, n)),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    map: (n, a, b, c, d) => c + (d - c) * ((n - a) / (b - a)),
    nf: (n, d) => {
      const s = String(Math.floor(n));
      return d ? s.padStart(d, '0') : s;
    },
    // 颜色——返回一个带 levels 的占位对象就够（源码里多用于 fill/stroke，不参与测试断言）
    color: (...args) => ({ _rgba: args }),
    lerpColor: (a) => a,
    // p5 常量
    TWO_PI: Math.PI * 2, PI: Math.PI, HALF_PI: Math.PI / 2,
    CLOSE: 'CLOSE', CENTER: 'CENTER', LEFT: 'LEFT', RIGHT: 'RIGHT',
    TOP: 'TOP', BOTTOM: 'BOTTOM', BASELINE: 'BASELINE', ESCAPE: 27,
    // 绘制类——全部 no-op，测试不渲染
    noStroke: () => {}, noFill: () => {}, stroke: () => {}, fill: () => {},
    strokeWeight: () => {},
    rect: () => {}, ellipse: () => {}, line: () => {}, arc: () => {},
    triangle: () => {}, quad: () => {}, point: () => {},
    beginShape: () => {}, endShape: () => {}, vertex: () => {},
    text: () => {}, textSize: () => {}, textFont: () => {},
    textAlign: () => {}, textWidth: () => 0,
    textAscent: () => 0, textDescent: () => 0,
    push: () => {}, pop: () => {}, translate: () => {}, rotate: () => {},
    scale: () => {},
    image: () => {}, loadImage: () => ({ width: 0, height: 0 }),
    background: () => {},
    createCanvas: () => {},
    // p5 全局画布尺寸（万一被引用）
    width: 980, height: 840,
    frameCount: 0, deltaTime: 16.67, millis: () => 0,
    mouseX: 0, mouseY: 0,
  };
}

// ── 浏览器环境 mock（localStorage + console）──
function createBrowserMocks() {
  const store = {};
  const storage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear:   () => { for (const k of Object.keys(store)) delete store[k]; },
  };
  return {
    localStorage: storage,
    document: {
      querySelector: () => null,
      createElement: () => ({ style: {}, getContext: () => ({}) }),
    },
    console,
    // 给源码里的 typeof 检查兜底
    p5: undefined,
  };
}

/**
 * 创建一个沙箱 context，合并 p5 mocks / 浏览器 mocks / 调用方传入的 extras。
 * extras 里可以塞画布常量（GRID_COLS, CELL_SIZE…）和任何源码顶层没有声明、
 * 但却会读取的全局（比如 currentLang / currentLevel / towers）。
 */
function createSandbox(extras = {}) {
  const sandbox = Object.assign(
    createBrowserMocks(),
    createP5Mocks(),
    extras,
  );
  // 一些脚本可能会用到 globalThis / window 自引用
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  return vm.createContext(sandbox);
}

/**
 * 把 relPaths 列出的源文件（相对 docs/Game_v2.1/）读出来连成一段脚本，
 * 在 ctx 里执行，最后追加一段 `globalThis.X = X` 把 PUBLISH_NAMES 里
 * 出现过的标识符导出到 ctx 上。
 */
function loadGameSources(relPaths, extras = {}) {
  const ctx = createSandbox(extras);

  const chunks = relPaths.map(rp => {
    const full = path.join(GAME_ROOT, rp);
    const code = fs.readFileSync(full, 'utf8');
    return `/* === ${rp} === */\n${code}`;
  });

  // 发布 top-level const/let 到 globalThis（typeof 判断 + try/catch 双保险）
  const publish = PUBLISH_NAMES.map(n =>
    `try { if (typeof ${n} !== 'undefined') globalThis.${n} = ${n}; } catch(e){}`
  ).join('\n');

  const bundle = chunks.join('\n\n') + '\n\n' + publish;
  vm.runInContext(bundle, ctx, { filename: 'bundle.js' });
  return ctx;
}

module.exports = { createSandbox, loadGameSources, GAME_ROOT };
