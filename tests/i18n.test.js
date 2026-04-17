// ============================================================
//  tests/i18n.test.js — t(key, ...args) / setLang 行为测试
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameSources } = require('./helpers/load');

// ── 通用 fixture：加载 i18n.js，默认 currentLang='en' ──
function fixture(lang = 'en') {
  return loadGameSources(['i18n.js'], { currentLang: lang });
}

test('I18N dict has both en and zh and they share the same key set', () => {
  const ctx = fixture();
  const enKeys = Object.keys(ctx.I18N.en).sort();
  const zhKeys = Object.keys(ctx.I18N.zh).sort();
  assert.ok(enKeys.length > 50, 'expected at least 50 i18n keys');
  // 如果差集非空——说明某语言漏译了，立刻曝光
  const onlyInEn = enKeys.filter(k => !ctx.I18N.zh[k]);
  const onlyInZh = zhKeys.filter(k => !ctx.I18N.en[k]);
  assert.deepEqual(onlyInEn, [], `keys missing in zh: ${onlyInEn.join(', ')}`);
  assert.deepEqual(onlyInZh, [], `keys missing in en: ${onlyInZh.join(', ')}`);
});

test('t(key) returns English by default', () => {
  const ctx = fixture('en');
  assert.equal(ctx.t('hud.credits'), '◈ CREDITS');
  assert.equal(ctx.t('tutorial.step1.title'), 'WELCOME TO QUANTUM DROP');
});

test('t(key) returns Chinese when currentLang=zh', () => {
  const ctx = fixture('zh');
  assert.equal(ctx.t('hud.credits'), '◈ 金币');
  assert.equal(ctx.t('tutorial.step1.title'), '欢迎来到 QUANTUM DROP');
});

test('t(key, arg) substitutes {0} placeholder', () => {
  const ctx = fixture('en');
  assert.equal(ctx.t('hud.progress', 42), 'PROGRESS  42%');
  // zh 版本一样支持 {0}
  const ctxZh = fixture('zh');
  assert.equal(ctxZh.t('hud.progress', 42), '进度  42%');
});

test('t(key, a, b) substitutes both {0} and {1}', () => {
  // 找一个实际带 {0} 和 {1} 的 key —— end.hp 或 end.waves 是范例
  const ctx = fixture('en');
  const raw = ctx.I18N.en['end.hp'];
  assert.ok(raw.includes('{0}') && raw.includes('{1}'),
    'end.hp should use both {0} and {1} placeholders');
  const out = ctx.t('end.hp', 15, 20);
  assert.ok(out.includes('15') && out.includes('20'));
  assert.ok(!out.includes('{0}') && !out.includes('{1}'),
    'placeholders should be fully substituted');
});

test('t(key) falls back to English when zh dict is missing the key', () => {
  const ctx = fixture('zh');
  // 临时往 zh 里删一个 key，模拟漏译
  const victimKey = 'hud.credits';
  const savedZh = ctx.I18N.zh[victimKey];
  delete ctx.I18N.zh[victimKey];
  assert.equal(ctx.t(victimKey), '◈ CREDITS',
    'missing zh key should fall back to en');
  ctx.I18N.zh[victimKey] = savedZh;  // 恢复，避免污染后续断言
});

test('t(key) falls back to the key itself when both dicts miss it', () => {
  const ctx = fixture('en');
  assert.equal(ctx.t('nonexistent.made.up.key'), 'nonexistent.made.up.key');
});

test('setLang("zh") writes to localStorage with correct key', () => {
  const ctx = fixture('en');
  ctx.setLang('zh');
  assert.equal(ctx.localStorage.getItem('qd_lang'), 'zh');
  assert.equal(ctx.t('hud.credits'), '◈ 金币',
    'after setLang, t() should use the new language');
});

test('setLang ignores unknown languages (does not corrupt state)', () => {
  const ctx = fixture('en');
  ctx.setLang('fr');
  // 未知语言不更新 currentLang，也不写 localStorage
  assert.equal(ctx.localStorage.getItem('qd_lang'), null);
  assert.equal(ctx.t('hud.credits'), '◈ CREDITS',
    'invalid setLang should leave t() on previous language');
});
