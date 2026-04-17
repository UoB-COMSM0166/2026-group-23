// ============================================================
//  tests/data-levels.test.js — 关卡元数据契约
//  （LEVEL_INFO + LEVEL_NODES）
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameSources } = require('./helpers/load');

const ctx = loadGameSources(['data/levels.js']);
const LEVEL_INFO = ctx.LEVEL_INFO;
const LEVEL_NODES = ctx.LEVEL_NODES;

test('LEVEL_INFO has 5 levels keyed 1..5', () => {
  assert.deepEqual(Object.keys(LEVEL_INFO).sort(), ['1','2','3','4','5']);
});

test('LEVEL_NODES has exactly 5 entries matching LEVEL_INFO', () => {
  assert.equal(LEVEL_NODES.length, 5,
    'LEVEL_NODES should have 5 entries (one per level)');
});

test('every LEVEL_INFO entry has name/threat/color/startCoins/icon', () => {
  for (let lv = 1; lv <= 5; lv++) {
    const info = LEVEL_INFO[lv];
    assert.equal(typeof info.name, 'string',      `L${lv}.name`);
    assert.equal(typeof info.threat, 'number',    `L${lv}.threat`);
    assert.ok(Array.isArray(info.color) && info.color.length === 3,
      `L${lv}.color should be [r,g,b]`);
    assert.equal(typeof info.startCoins, 'number', `L${lv}.startCoins`);
    assert.equal(typeof info.icon, 'string',       `L${lv}.icon`);
  }
});

test('threat is 1..5 and matches level number (strictly increasing)', () => {
  for (let lv = 1; lv <= 5; lv++) {
    assert.equal(LEVEL_INFO[lv].threat, lv,
      `L${lv}.threat should equal level number`);
  }
});

test('startCoins decrease strictly as levels get harder (design: less economy, more danger)', () => {
  let prev = Infinity;
  for (let lv = 1; lv <= 5; lv++) {
    const sc = LEVEL_INFO[lv].startCoins;
    assert.ok(sc < prev, `L${lv}.startCoins (${sc}) should be < L${lv-1} (${prev})`);
    assert.ok(sc >= 1000, `L${lv}.startCoins=${sc} — sanity check, should stay >= 1000`);
    prev = sc;
  }
});

test('color channels are integers in [0,255]', () => {
  for (let lv = 1; lv <= 5; lv++) {
    LEVEL_INFO[lv].color.forEach((c, i) => {
      assert.ok(Number.isInteger(c) && c >= 0 && c <= 255,
        `L${lv}.color[${i}] out of range: ${c}`);
    });
  }
});

test('LEVEL_NODES coordinates are normalised to [0,1]', () => {
  for (const node of LEVEL_NODES) {
    assert.equal(typeof node.x, 'number');
    assert.equal(typeof node.y, 'number');
    assert.ok(node.x >= 0 && node.x <= 1, `node.x out of [0,1]: ${node.x}`);
    assert.ok(node.y >= 0 && node.y <= 1, `node.y out of [0,1]: ${node.y}`);
  }
});

test('level names are unique (no duplicate codenames)', () => {
  const names = Object.values(LEVEL_INFO).map(i => i.name);
  const unique = new Set(names);
  assert.equal(unique.size, names.length,
    `duplicate level names: ${names.join(', ')}`);
});
