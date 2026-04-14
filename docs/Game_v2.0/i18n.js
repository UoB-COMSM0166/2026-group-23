// ============================================================
//  i18n.js — 多语言字典与 t(key) 查询函数
//
//  · 默认 English；玩家可在启动页右上角切换中/英，选项写入 localStorage。
//  · 翻译 key 采用 "模块.场景.用途" 分层，例如 tutorial.step1.title。
//  · 缺失 key 时自动回退到英文，再回退显示 key 本身（便于发现漏译）。
//  · 数据文件里的英文代号（SECTOR ALPHA / RAPID / LASER …）保留原样，
//    只翻译描述性文字与 UI 按钮。
//
//  依赖：state.js 中声明的 currentLang。
// ============================================================

const I18N_STORAGE_KEY = 'qd_lang';

const I18N = {
  en: {
    // ── launch ──
    'launch.lang.toggle': 'EN | 中',

    // ── tutorial ──
    'tutorial.btn.skip':  'Skip tutorial',

    'tutorial.step1.title': 'WELCOME TO QUANTUM DROP',
    'tutorial.step1.body':  'As commander, build defense towers to stop the mech army from reaching your base.\nTake 20 seconds to learn the basics.',
    'tutorial.step1.btn':   'Start  ▶',

    'tutorial.step2.title': '① Read the Battlefield',
    'tutorial.step2.body':  'Top bar: coins ¥, base HP, wave number, remaining enemies, progress.\nBase HP = 0 means defeat. Click ⏸ (top-right) or press ESC to pause.',
    'tutorial.step2.btn':   'Next  ▶',

    'tutorial.step3.title': '② Build Towers',
    'tutorial.step3.body':  'Click a tower button at the bottom (make sure you can afford it),\nthen click an empty cell on the map to place it. Click the same button again to cancel.',
    'tutorial.step3.btn':   'Next  ▶',

    'tutorial.step4.title': '③ Upgrade & Demolish',
    'tutorial.step4.body':  'Click a placed tower to open its panel:\n  · Green button → upgrade to next level (max Lv.3)\n  · Red button   → demolish and refund 80% of the cost',
    'tutorial.step4.btn':   'Next  ▶',

    'tutorial.step5.title': '④ Ready for Battle!',
    'tutorial.step5.body':  'Enemies advance along ground / air paths toward your base.\nPlace towers wisely, cover anti-air, and hold until the final wave.\n\nGood luck, Commander.',
    'tutorial.step5.btn':   'Launch  ▶',

    // ── level map ──
    'levelmap.title':       '— MISSION SELECT —',
    'levelmap.difficulty':  'DIFFICULTY: {0}',
    'levelmap.back':        '◀ BACK',
    'levelmap.start':       '▶ START MISSION',
    'levelmap.waves':       '◈ WAVES: {0}',
    'levelmap.threat':      '◈ THREAT: {0} / 5',
    'levelmap.startCoins':  '◈ START ¥: {0}',

    'level.1.subtitle': 'Recruit Training',
    'level.1.desc':     'Entry-level map. Simple paths, mostly infantry.',
    'level.2.subtitle': 'Nebula Rift',
    'level.2.desc':     'Dual lanes — airborne enemies appear for the first time.',
    'level.3.subtitle': 'Iron Citadel',
    'level.3.desc':     'Complex terrain, heavily armored foes and a boss.',
    'level.4.subtitle': 'Void Maze',
    'level.4.desc':     'Winding paths, swarms of high-speed enemies.',
    'level.5.subtitle': 'Omega Gate',
    'level.5.desc':     'Final stage — all-elite forces and three Bosses.',
  },

  zh: {
    // ── launch ──
    'launch.lang.toggle': 'EN | 中',

    // ── tutorial ──
    'tutorial.btn.skip':  '跳过引导',

    'tutorial.step1.title': '欢迎来到 QUANTUM DROP',
    'tutorial.step1.body':  '作为指挥官，你需要建造防御塔，阻止机械敌军抵达基地。\n在开始之前，先花 20 秒熟悉一下基本操作。',
    'tutorial.step1.btn':   '开始学习  ▶',

    'tutorial.step2.title': '① 观察战况',
    'tutorial.step2.body':  '顶栏：金币 ¥、基地 HP、当前波次、剩余敌人、进度条。\n基地 HP 归零即失败；右上角 ⏸ 或按 ESC 可随时暂停。',
    'tutorial.step2.btn':   '下一步  ▶',

    'tutorial.step3.title': '② 建造防御塔',
    'tutorial.step3.body':  '点击底部塔按钮选中一种塔（注意金币是否够），\n然后点击地图上的空白格子放下塔。再点一次同按钮可取消。',
    'tutorial.step3.btn':   '下一步  ▶',

    'tutorial.step4.title': '③ 升级与拆除',
    'tutorial.step4.body':  '点击已建造的塔会弹出升级面板：\n  · 绿色按钮 → 升级至下一等级（最高 Lv.3）\n  · 红色按钮 → 拆除并退还 80% 金币',
    'tutorial.step4.btn':   '下一步  ▶',

    'tutorial.step5.title': '④ 准备迎战！',
    'tutorial.step5.body':  '敌人会沿着地面/空中路径冲向基地。\n合理布置塔阵、注意抵御飞行单位，守到最后一波！\n\n祝好运，指挥官。',
    'tutorial.step5.btn':   '出发  ▶',

    // ── level map ──
    'levelmap.title':       '— 任务选择 —',
    'levelmap.difficulty':  '难度: {0}',
    'levelmap.back':        '◀ 返回',
    'levelmap.start':       '▶ 开始任务',
    'levelmap.waves':       '◈ 波次: {0}',
    'levelmap.threat':      '◈ 威胁: {0} / 5',
    'levelmap.startCoins':  '◈ 起始金币: {0}',

    'level.1.subtitle': '新兵训练区',
    'level.1.desc':     '入门关卡，路径简洁，单路步兵为主。',
    'level.2.subtitle': '星云裂隙',
    'level.2.desc':     '双路并进，飞行敌人首次出现。',
    'level.3.subtitle': '钢铁要塞',
    'level.3.desc':     '复杂地形，重装甲怪物与 Boss 登场。',
    'level.4.subtitle': '虚空迷宫',
    'level.4.desc':     '迂回路径，高速怪物大量入侵。',
    'level.5.subtitle': '终极门户',
    'level.5.desc':     '终极关卡，全精英部队 + 三大 Boss。',
  },
};

// ── 查询函数：t(key, ...args)。支持 {0} {1} 位置参数替换 ──
function t(key) {
  const dict = I18N[currentLang] || I18N.en;
  let s = dict[key];
  if (s === undefined) s = I18N.en[key];
  if (s === undefined) s = key; // 回退显示 key 便于发现漏译
  for (let i = 1; i < arguments.length; i++) {
    s = s.split('{' + (i - 1) + '}').join(arguments[i]);
  }
  return s;
}

// ── 切换语言（写入 localStorage）──
function setLang(lang) {
  if (lang !== 'en' && lang !== 'zh') return;
  currentLang = lang;
  try { localStorage.setItem(I18N_STORAGE_KEY, lang); } catch (e) {}
}
