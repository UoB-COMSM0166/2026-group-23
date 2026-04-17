// ============================================================
//  tests/data-waves.test.js — 波次数据契约 (WAVE_CONFIGS)
//
//  格式约定: [type, count, interval, delay]
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameSources } = require('./helpers/load');

const ctx = loadGameSources(['data/waves.js']);
const WAVE_CONFIGS = ctx.WAVE_CONFIGS;

const VALID_MONSTER_TYPES = new Set([
  'snake', 'spider', 'tank', 'robot', 'phoenix', 'ghostbird',
  'boss1', 'boss2', 'boss3', 'fission', 'carrier',
]);

// 各关卡设计波数（来自 README / data/waves.js 注释）
const EXPECTED_WAVES_PER_LEVEL = { 1: 6, 2: 7, 3: 8, 4: 9, 5: 10 };

test('WAVE_CONFIGS has keys 1..5', () => {
  assert.deepEqual(Object.keys(WAVE_CONFIGS).sort(), ['1','2','3','4','5']);
});

test('each level has the documented number of waves', () => {
  for (const [lv, expected] of Object.entries(EXPECTED_WAVES_PER_LEVEL)) {
    assert.equal(WAVE_CONFIGS[lv].length, expected,
      `level ${lv} should have ${expected} waves`);
  }
});

test('every wave is an array of at least one spawn spec', () => {
  for (const lv of Object.keys(WAVE_CONFIGS)) {
    WAVE_CONFIGS[lv].forEach((wave, wi) => {
      assert.ok(Array.isArray(wave), `L${lv} W${wi+1} must be an array`);
      assert.ok(wave.length >= 1, `L${lv} W${wi+1} must have at least 1 spawn group`);
    });
  }
});

test('every spawn spec has shape [type, count, interval, delay]', () => {
  for (const lv of Object.keys(WAVE_CONFIGS)) {
    WAVE_CONFIGS[lv].forEach((wave, wi) => {
      wave.forEach((spec, si) => {
        const label = `L${lv} W${wi+1} spec#${si+1}`;
        assert.ok(Array.isArray(spec), `${label} must be an array`);
        assert.equal(spec.length, 4, `${label} must have 4 entries`);
        assert.equal(typeof spec[0], 'string',
          `${label} type must be a string, got ${typeof spec[0]}`);
        assert.equal(typeof spec[1], 'number',
          `${label} count must be a number`);
        assert.equal(typeof spec[2], 'number',
          `${label} interval must be a number`);
        assert.equal(typeof spec[3], 'number',
          `${label} delay must be a number`);
      });
    });
  }
});

test('every spawn type is in the monster whitelist', () => {
  for (const lv of Object.keys(WAVE_CONFIGS)) {
    WAVE_CONFIGS[lv].forEach((wave, wi) => {
      wave.forEach((spec, si) => {
        const type = spec[0];
        assert.ok(VALID_MONSTER_TYPES.has(type),
          `L${lv} W${wi+1} spec#${si+1}: unknown monster type "${type}"`);
      });
    });
  }
});

test('count and interval are positive; delay is non-negative', () => {
  for (const lv of Object.keys(WAVE_CONFIGS)) {
    WAVE_CONFIGS[lv].forEach((wave, wi) => {
      wave.forEach((spec, si) => {
        const [type, count, interval, delay] = spec;
        const label = `L${lv} W${wi+1} ${type}`;
        assert.ok(Number.isInteger(count) && count > 0,
          `${label}: count must be positive integer, got ${count}`);
        assert.ok(interval > 0, `${label}: interval must be > 0, got ${interval}`);
        assert.ok(delay >= 0,   `${label}: delay must be >= 0, got ${delay}`);
      });
    });
  }
});

test('boss-like types (boss1/2/3, carrier) only appear with count=1', () => {
  const singletonTypes = new Set(['boss1', 'boss2', 'boss3', 'carrier']);
  for (const lv of Object.keys(WAVE_CONFIGS)) {
    WAVE_CONFIGS[lv].forEach((wave, wi) => {
      wave.forEach((spec) => {
        const [type, count] = spec;
        if (singletonTypes.has(type)) {
          assert.equal(count, 1,
            `L${lv} W${wi+1}: ${type} should spawn as count=1, got ${count}`);
        }
      });
    });
  }
});

test('boss waves use interval=9999 sentinel (so count=1 ends the wave instantly)', () => {
  // 源码约定：count=1 且 interval=9999 表示"一发即止"，避免等到下一发才判定波结束
  const singletonTypes = new Set(['boss1', 'boss2', 'boss3', 'carrier', 'fission']);
  for (const lv of Object.keys(WAVE_CONFIGS)) {
    WAVE_CONFIGS[lv].forEach((wave, wi) => {
      wave.forEach((spec) => {
        const [type, count, interval] = spec;
        if (singletonTypes.has(type) && count === 1) {
          assert.equal(interval, 9999,
            `L${lv} W${wi+1}: singleton ${type} should use interval=9999 sentinel, got ${interval}`);
        }
      });
    });
  }
});

test('difficulty ramps: level 5 final wave spawns more monsters than level 1 final wave', () => {
  const totalMonsters = (wave) => wave.reduce((sum, spec) => sum + spec[1], 0);
  const L1_last = totalMonsters(WAVE_CONFIGS['1'].at(-1));
  const L5_last = totalMonsters(WAVE_CONFIGS['5'].at(-1));
  assert.ok(L5_last > L1_last,
    `L5 final wave (${L5_last} monsters) should be more intense than L1 final (${L1_last})`);
});

test('WAVE_CONFIG (legacy export) is an alias to level 3', () => {
  // 兼容老 UI 代码的回退值
  assert.equal(ctx.WAVE_CONFIG, WAVE_CONFIGS[3],
    'WAVE_CONFIG legacy export should point to WAVE_CONFIGS[3]');
});
