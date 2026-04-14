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

    // ── tower names (displayed in upgrade panel title) ──
    'tower.rapid.name':   'Rapid Fire',
    'tower.laser.name':   'Laser Cutter',
    'tower.nova.name':    'Nova Piercer',
    'tower.chain.name':   'Chain Arc',
    'tower.magnet.name':  'Magnet Field',
    'tower.ghost.name':   'Ghost Missile',
    'tower.scatter.name': 'Scatter AA',
    'tower.cannon.name':  'Rail Cannon',

    // ── tower hover tips (build-menu) ──
    'tower.rapid.tipName':   'RAPID',
    'tower.rapid.tipDesc':   'High fire rate, great for swarms',
    'tower.laser.tipName':   'LASER',
    'tower.laser.tipDesc':   'Multi-target lock-on, piercing beam',
    'tower.nova.tipName':    'NOVA',
    'tower.nova.tipDesc':    'Line pierce + impact explosion',
    'tower.chain.tipName':   'CHAIN',
    'tower.chain.tipDesc':   'Chain lightning, jumps between foes',
    'tower.magnet.tipName':  'MAGNET',
    'tower.magnet.tipDesc':  'AOE slow support tower',
    'tower.ghost.tipName':   'GHOST',
    'tower.ghost.tipDesc':   'Homing missiles with explosion',
    'tower.scatter.tipName': 'AA-FAN',
    'tower.scatter.tipDesc': 'Anti-air fan burst, fast intercept',
    'tower.cannon.tipName':  'CANNON',
    'tower.cannon.tipDesc':  'Map-wide strike, huge blast radius',

    // ── tower specials (upgrade panel) ──
    'tower.laser.special':    '◆ Multi-lock × {0}',
    'tower.chain.special':    '◆ Chain × {0} jumps  ×0.72 falloff',
    'tower.magnet.special':   '◆ No damage  AOE slow support',
    'tower.ghost.special':    '◆ Homing × {0}  on-hit blast',
    'tower.scatter.special':  '◆ AA fan × {0} pellets',
    'tower.nova.special':     '◆ Line pierce + impact blast',
    'tower.cannon.special1':  '◆ Orbital cannon  air & ground',
    'tower.cannon.special2':  '◆ Blast radius {0}  air priority',

    // ── tower upgrade/demolish panel ──
    'tower.panel.atk':        'ATK  {0}',
    'tower.panel.rng':        'RNG  {0}',
    'tower.panel.spd':        'SPD  {0}/s',
    'tower.panel.magnetSlow': 'Slow  up to -{0}%',
    'tower.panel.upgrade':    'Upgrade to Lv.{0}   ¥{1}',
    'tower.panel.maxed':      '★ MAX LEVEL',
    'tower.panel.demolish':   'Demolish   refund ¥{0}',
    'tower.panel.closeHint':  '[ Click elsewhere to close ]',

    // ── HUD ──
    'hud.jammed':             '⚠  DEFENSE JAMMED — TOWERS OFFLINE  ⚠',

    // ── pause menu ──
    'pause.title':            'PAUSED',
    'pause.subtitle':         'Game has been paused',
    'pause.continue':         '▶ CONTINUE',
    'pause.restart':          '↺ RESTART',
    'pause.levelSelect':      '⊞ LEVEL SELECT',
    'pause.hint':             'Press ESC to Continue',
    'pause.confirmTitle':     'Confirm Exit?',
    'pause.confirmSubtitle':  'Current progress will not be saved',
    'pause.confirmExit':      'Confirm Exit to Level Select',
    'pause.confirmCancel':    'Cancel, Back to Pause Menu',

    // ── wave UI ──
    'wave.breakTitle':        'WAVE BREAK',
    'wave.breakDesc':         'Prepare for the next wave.',
    'wave.continue':          'CONTINUE',
    'wave.incoming':          '— INCOMING WAVE {0} OF {1} —',
    'wave.countdownUnit':     's',
    'wave.bossFission':       '⚠ BOSS: FISSION CORE',
    'wave.bossPhantom':       '⚠ BOSS: PHANTOM PROTOCOL',
    'wave.bossAntmech':       '☠ FINAL BOSS: ANT-MECH',
    'wave.allClear':          'ALL WAVES CLEARED',
    'wave.totalCredits':      'TOTAL CREDITS: {0}',

    // ── placement ──
    'placement.cantBuild':    'Cannot Build',
    'placement.noCoins':      'Not Enough Coins',
    'placement.clickToFire':  'Click to fire',
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

    // ── 塔名（升级面板标题）──
    'tower.rapid.name':   '快速塔',
    'tower.laser.name':   '激光切割者',
    'tower.nova.name':    'Nova 穿透炮',
    'tower.chain.name':   '链式电弧塔',
    'tower.magnet.name':  '磁场干扰塔',
    'tower.ghost.name':   '幽灵导弹塔',
    'tower.scatter.name': '散射对空炮',
    'tower.cannon.name':  '轨道巨炮',

    // ── 建造菜单悬浮提示 ──
    'tower.rapid.tipName':   '快速塔',
    'tower.rapid.tipDesc':   '高射速，适合清兵',
    'tower.laser.tipName':   '激光切割者',
    'tower.laser.tipDesc':   '多目标锁定，穿透射线',
    'tower.nova.tipName':    'Nova 穿透炮',
    'tower.nova.tipDesc':    '直线穿透 + 落点爆炸',
    'tower.chain.tipName':   '链式电弧塔',
    'tower.chain.tipDesc':   '链式闪电，跳跃目标',
    'tower.magnet.tipName':  '磁场干扰塔',
    'tower.magnet.tipDesc':  '范围减速辅助塔',
    'tower.ghost.tipName':   '幽灵导弹塔',
    'tower.ghost.tipDesc':   '追踪导弹，命中爆炸',
    'tower.scatter.tipName': '散射对空炮',
    'tower.scatter.tipDesc': '扇形对空速射拦截',
    'tower.cannon.tipName':  '轨道巨炮',
    'tower.cannon.tipDesc':  '全图打击，超大爆炸半径',

    // ── 塔特殊能力（升级面板）──
    'tower.laser.special':    '◆ 多目标锁定 × {0}',
    'tower.chain.special':    '◆ 跳链 × {0} 次  衰减×0.72',
    'tower.magnet.special':   '◆ 无伤害  范围减速辅助',
    'tower.ghost.special':    '◆ 追踪导弹 × {0} 枚  爆炸',
    'tower.scatter.special':  '◆ 对空扇射 × {0} 弹',
    'tower.nova.special':     '◆ 穿透直线 + 落点爆炸',
    'tower.cannon.special1':  '◆ 全图轨道炮  空陆两用',
    'tower.cannon.special2':  '◆ 爆炸半径 {0}  优先打空中',

    // ── 升级/拆除面板 ──
    'tower.panel.atk':        'ATK  {0}',
    'tower.panel.rng':        'RNG  {0}',
    'tower.panel.spd':        'SPD  {0}/s',
    'tower.panel.magnetSlow': '减速  最高 -{0}%',
    'tower.panel.upgrade':    '升级至 Lv.{0}   ¥{1}',
    'tower.panel.maxed':      '★ 已达满级 MAX',
    'tower.panel.demolish':   '拆除   退还 ¥{0}',
    'tower.panel.closeHint':  '[ 点击其他处关闭 ]',

    // ── HUD ──
    'hud.jammed':             '⚠  防御干扰中 — 所有塔已瘫痪  ⚠',

    // ── 暂停菜单 ──
    'pause.title':            '已暂停',
    'pause.subtitle':         '游戏已暂停',
    'pause.continue':         '▶ 继续',
    'pause.restart':          '↺ 重新开始',
    'pause.levelSelect':      '⊞ 关卡选择',
    'pause.hint':             '按 ESC 继续',
    'pause.confirmTitle':     '确认退出？',
    'pause.confirmSubtitle':  '当前进度将不会保存',
    'pause.confirmExit':      '确认退出到关卡选择',
    'pause.confirmCancel':    '取消，返回暂停菜单',

    // ── 波次 UI ──
    'wave.breakTitle':        '波次间歇',
    'wave.breakDesc':         '准备迎接下一波敌人。',
    'wave.continue':          '继续',
    'wave.incoming':          '— 即将来袭第 {0} / {1} 波 —',
    'wave.countdownUnit':     '秒',
    'wave.bossFission':       '⚠ BOSS: 分裂核心',
    'wave.bossPhantom':       '⚠ BOSS: 幻影协议',
    'wave.bossAntmech':       '☠ 最终 BOSS: 蚁型机甲',
    'wave.allClear':          '全部波次已清除',
    'wave.totalCredits':      '总金币: {0}',

    // ── 放置 / 准星 ──
    'placement.cantBuild':    '无法建造',
    'placement.noCoins':      '金币不足',
    'placement.clickToFire':  '点击发射炮弹',
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
