// ============================================================
//  tests/data-towers.test.js — 防御塔数据契约 (TOWER_DEFS)
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameSources } = require('./helpers/load');

const ctx = loadGameSources(['data/towers.js']);
const TOWER_DEFS = ctx.TOWER_DEFS;

const EXPECTED_TYPES = ['rapid','laser','nova','chain','magnet','ghost','scatter','cannon'];

test('TOWER_DEFS exposes exactly the 8 expected types', () => {
  const actual = Object.keys(TOWER_DEFS).sort();
  assert.deepEqual(actual, [...EXPECTED_TYPES].sort());
});

test('each tower has the required top-level schema', () => {
  for (const type of EXPECTED_TYPES) {
    const t = TOWER_DEFS[type];
    assert.equal(typeof t.label,    'string',  `${type}.label should be string`);
    assert.equal(typeof t.cost,     'number',  `${type}.cost should be number`);
    assert.ok(Array.isArray(t.levels), `${type}.levels should be array`);
    assert.equal(t.levels.length, 3, `${type} must have exactly 3 tiers`);
    assert.equal(typeof t.projSpd, 'number', `${type}.projSpd should be number`);
    assert.ok(Array.isArray(t.color), `${type}.color should be [r,g,b] array`);
    assert.equal(t.color.length, 3, `${type}.color should have 3 channels`);
    assert.equal(typeof t.antiAir, 'boolean', `${type}.antiAir should be boolean`);
  }
});

test('every color channel is an integer in [0,255]', () => {
  for (const type of EXPECTED_TYPES) {
    for (let i = 0; i < 3; i++) {
      const c = TOWER_DEFS[type].color[i];
      assert.ok(Number.isInteger(c) && c >= 0 && c <= 255,
        `${type}.color[${i}] out of range: ${c}`);
    }
  }
});

test('every tier has dmg/range/fireRate/upgradeCost with correct types', () => {
  for (const type of EXPECTED_TYPES) {
    TOWER_DEFS[type].levels.forEach((lv, i) => {
      assert.equal(typeof lv.dmg,         'number', `${type} L${i+1}.dmg`);
      assert.equal(typeof lv.range,       'number', `${type} L${i+1}.range`);
      assert.equal(typeof lv.fireRate,    'number', `${type} L${i+1}.fireRate`);
      assert.equal(typeof lv.upgradeCost, 'number', `${type} L${i+1}.upgradeCost`);
      // 非负
      assert.ok(lv.dmg      >= 0, `${type} L${i+1}.dmg must be >= 0`);
      assert.ok(lv.range    >  0, `${type} L${i+1}.range must be >  0`);
      assert.ok(lv.fireRate >  0, `${type} L${i+1}.fireRate must be >  0`);
      assert.ok(lv.upgradeCost >= 0, `${type} L${i+1}.upgradeCost must be >= 0`);
    });
  }
});

test('upgradeCost[L3] is 0 (Lv3 is cap, no further upgrade)', () => {
  for (const type of EXPECTED_TYPES) {
    assert.equal(TOWER_DEFS[type].levels[2].upgradeCost, 0,
      `${type} Lv3 should have upgradeCost=0 (max tier sentinel)`);
  }
});

test('damage is monotonically non-decreasing L1 → L2 → L3', () => {
  // MAGNET 例外：整条 dmg 都是 0（无伤害减速塔），用 slowFactor 表达强度
  for (const type of EXPECTED_TYPES) {
    if (type === 'magnet') continue;
    const [L1, L2, L3] = TOWER_DEFS[type].levels;
    assert.ok(L2.dmg >= L1.dmg, `${type}: L2 dmg (${L2.dmg}) should be >= L1 (${L1.dmg})`);
    assert.ok(L3.dmg >= L2.dmg, `${type}: L3 dmg (${L3.dmg}) should be >= L2 (${L2.dmg})`);
    assert.ok(L3.dmg >  L1.dmg, `${type}: L3 should strictly improve over L1 in damage`);
  }
});

test('range is monotonically non-decreasing L1 → L2 → L3', () => {
  for (const type of EXPECTED_TYPES) {
    const [L1, L2, L3] = TOWER_DEFS[type].levels;
    assert.ok(L2.range >= L1.range, `${type}: L2 range should be >= L1`);
    assert.ok(L3.range >= L2.range, `${type}: L3 range should be >= L2`);
  }
});

test('fireRate (lower = faster) is monotonically non-increasing', () => {
  // cannon / laser / ghost 都遵循这个规则：升级变快
  for (const type of EXPECTED_TYPES) {
    const [L1, L2, L3] = TOWER_DEFS[type].levels;
    assert.ok(L2.fireRate <= L1.fireRate, `${type}: L2 fireRate should be <= L1`);
    assert.ok(L3.fireRate <= L2.fireRate, `${type}: L3 fireRate should be <= L2`);
  }
});

test('MAGNET uses slowFactor[3] instead of damage', () => {
  const m = TOWER_DEFS.magnet;
  assert.ok(Array.isArray(m.slowFactor), 'magnet.slowFactor must exist as an array');
  assert.equal(m.slowFactor.length, 3, 'magnet.slowFactor must have 3 entries');
  // slowFactor 是"残速"，越小越慢；升级应严格降低
  assert.ok(m.slowFactor[1] < m.slowFactor[0], 'magnet L2 should slow more than L1');
  assert.ok(m.slowFactor[2] < m.slowFactor[1], 'magnet L3 should slow more than L2');
  for (const f of m.slowFactor) {
    assert.ok(f > 0 && f < 1, `slowFactor ${f} should be in (0, 1)`);
  }
});

test('CANNON has cannonBlastRadius[3] with strictly increasing radius', () => {
  const c = TOWER_DEFS.cannon;
  assert.ok(Array.isArray(c.cannonBlastRadius));
  assert.equal(c.cannonBlastRadius.length, 3);
  const [r1, r2, r3] = c.cannonBlastRadius;
  assert.ok(r1 < r2 && r2 < r3, 'cannon blast radius must strictly increase by tier');
});

test('SCATTER is flagged as antiAir and onlyAir (air-only tower)', () => {
  const s = TOWER_DEFS.scatter;
  assert.equal(s.antiAir, true,  'scatter.antiAir should be true');
  assert.equal(s.onlyAir, true,  'scatter.onlyAir should be true');
});

test('special flags: rapid ignoreRobotShield, chain ignoreTankBarrier', () => {
  assert.equal(TOWER_DEFS.rapid.ignoreRobotShield, true,
    'rapid should pierce MechRobot shield');
  assert.equal(TOWER_DEFS.chain.ignoreTankBarrier, true,
    'chain should pierce MechTank barrier');
});

test('base cost is sane (between 100 and 500, matches economy design)', () => {
  for (const type of EXPECTED_TYPES) {
    const cost = TOWER_DEFS[type].cost;
    assert.ok(cost >= 100 && cost <= 500,
      `${type}.cost=${cost} outside reasonable range [100, 500]`);
  }
});
