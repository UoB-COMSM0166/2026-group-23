// ============================================================
//  tests/map-core.test.js — map/map-core.js 核心纯函数
//   · pathToPixels(path)
//   · initPathCells() + isCellBuildable(gx, gy)
//
//  map-core.js 里还有大量依赖 p5 canvas state 的绘制函数（drawBackground,
//  drawPaths, drawHexMarker…），那些留给集成/视觉测试，这里只验证可单独
//  运行的几何逻辑。
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameSources } = require('./helpers/load');

// ── 通用加载：只把 map-core 载进沙箱，并灌入画布常量 + 游戏状态占位 ──
function loadMap(currentLevel = 1) {
  return loadGameSources(['map/map-core.js'], {
    GRID_COLS: 14,
    GRID_ROWS: 12,
    CELL_SIZE: 70,
    HUD_HEIGHT: 46,
    currentLevel,
    // isCellBuildable 会读 towers 数组；默认留空
    towers: [],
    // initMap 会写这三个路径像素缓存；预声明为 null 避免 sloppy 隐式 global
    MAIN_PATH_PX: null,
    EDGE_PATH_PX: null,
    AIR_PATH_PX: null,
  });
}

// ============================================================
//  pathToPixels
// ============================================================

test('pathToPixels converts grid coords to pixel centres (CELL_SIZE=70)', () => {
  const ctx = loadMap();
  const px = ctx.pathToPixels([
    { x: 0, y: 5 },
    { x: 3, y: 5 },
    { x: 13, y: 8 },
  ]);
  // 网格 (gx, gy) → 像素 (gx*70 + 35, gy*70 + 35)
  // JSON 往返规避 vm 沙箱与测试 realm 的原型不同导致的 deepStrictEqual 报错
  assert.deepEqual(JSON.parse(JSON.stringify(px)), [
    { x: 35,  y: 385 },
    { x: 245, y: 385 },
    { x: 945, y: 595 },
  ]);
});

test('pathToPixels returns a fresh array (does not mutate input)', () => {
  const ctx = loadMap();
  const input = [{ x: 1, y: 2 }];
  const out = ctx.pathToPixels(input);
  out[0].x = 9999;
  assert.equal(input[0].x, 1, 'input node should not be mutated');
});

// ============================================================
//  isCellBuildable
// ============================================================

test('isCellBuildable rejects out-of-bounds cells', () => {
  const ctx = loadMap();
  ctx.initPathCells();
  // 四角越界
  assert.equal(ctx.isCellBuildable(-1, 5), false, 'x<0');
  assert.equal(ctx.isCellBuildable(14, 5), false, 'x >= GRID_COLS');
  assert.equal(ctx.isCellBuildable(5, -1), false, 'y<0');
  assert.equal(ctx.isCellBuildable(5, 12), false, 'y >= GRID_ROWS');
});

test('isCellBuildable rejects the HUD row (y=0)', () => {
  const ctx = loadMap();
  ctx.initPathCells();
  for (let gx = 0; gx < 14; gx++) {
    assert.equal(ctx.isCellBuildable(gx, 0), false,
      `HUD row cell (${gx}, 0) should never be buildable`);
  }
});

test('isCellBuildable rejects known path cells on level 1', () => {
  const ctx = loadMap(1);
  ctx.initPathCells();
  // level 1 MAIN 第一段 (0,5)→(3,5)，这 4 个格子必然是路径
  for (const gx of [0, 1, 2, 3]) {
    assert.equal(ctx.isCellBuildable(gx, 5), false,
      `(${gx}, 5) on level 1 MAIN should be a path cell`);
  }
});

test('isCellBuildable accepts an obvious empty cell on level 1', () => {
  const ctx = loadMap(1);
  ctx.initPathCells();
  // (1, 1) 远离 L1 所有路径——既不在 MAIN (y∈{3,5,8,9}) / EDGE (y∈{2,6,10})
  // 也不在 AIR 航线 (y=1 那段在 x=10 附近)
  assert.equal(ctx.isCellBuildable(1, 1), true,
    '(1, 1) should be a buildable empty cell on level 1');
});

test('isCellBuildable rejects a cell that is occupied by a tower', () => {
  const ctx = loadMap(1);
  ctx.initPathCells();
  // 先确认 (1, 1) 本来可建
  assert.equal(ctx.isCellBuildable(1, 1), true);
  // 放一个假塔上去
  ctx.towers.push({ gx: 1, gy: 1, type: 'rapid' });
  assert.equal(ctx.isCellBuildable(1, 1), false,
    'a cell occupied by a tower must become unbuildable');
  // 邻格不受影响
  assert.equal(ctx.isCellBuildable(2, 1), true,
    'only the exact occupied cell becomes unbuildable');
});

test('initPathCells varies with currentLevel (level 2 path set differs from level 1)', () => {
  // 不同关卡的 MAIN/EDGE/AIR 走法不同，pathCellSet 必然不同。
  // 我们用"某关卡路径集大小"作为粗粒度指标——不同关卡至少大小不完全相等。
  const ctxA = loadMap(1);
  ctxA.initPathCells();
  // 通过执行 isCellBuildable 反推路径覆盖量
  const pathCountA = countPathCells(ctxA);

  const ctxB = loadMap(2);
  ctxB.initPathCells();
  const pathCountB = countPathCells(ctxB);

  assert.ok(pathCountA > 0, 'level 1 should have some path cells');
  assert.ok(pathCountB > 0, 'level 2 should have some path cells');
  // 允许相等极小概率；这里只要求"不是完全一样的布局"，通过对比某个
  // level 1 的标志性 MAIN 格子（1,5）在 level 2 上大概率不是路径：
  // level 2 MAIN y 值为 {3, 4, 8, 10} ——(1,5) 不在上面
  assert.equal(ctxB.isCellBuildable(1, 5), true,
    'level 1 MAIN cell (1,5) should be buildable on level 2 layout');
});

// 内部工具：用 isCellBuildable 反推一下路径格数（粗粒度 sanity check）
function countPathCells(ctx) {
  let count = 0;
  for (let gx = 0; gx < 14; gx++) {
    // gy 从 1 开始，排除 HUD 行
    for (let gy = 1; gy < 12; gy++) {
      if (!ctx.isCellBuildable(gx, gy)) count++;
    }
  }
  return count;
}
