// ============================================================
//  state.js — 全局游戏/UI 状态的集中声明
//
//  把原本散落在 sketch.js / ui.js / waves.js 顶部的可变全局变量
//  集中到这里，便于团队成员快速了解"游戏里到底有哪些状态"。
//
//  变量名保持不变，所有其它文件直接继续用原名读写，无需修改。
//  index.html 会在所有业务脚本之前加载本文件，确保初始化顺序。
//
//  保留在原模块内的状态（因为是模块内部实现细节）：
//    - map/map-core.js   : _floorCache / _decoCache / _pathFlowPts /
//                          CURRENT_LEVEL_PATHS / pathCellSet
//    - ui.js             : _hudHpFill / _hudBarFill / _wcDesc* 等 HUD 渲染缓存
//    - towers.js         : towers / projectiles / jamRadius /
//                          _chainArcs / _cannonBlasts / _mortarShells
//    - monsters.js       : particles
//    - minigame.js       : 整个小游戏的内部变量
//    - screens/*         : 各界面的动画/悬浮临时变量
// ============================================================


// ── 游戏阶段 ──
// 'launch' | 'difficulty' | 'levelmap' | 'playing' | 'endpanel'
let gamePhase      = 'launch';
let gameDifficulty = null;  // 'easy' | 'difficult'


// ── 语言（默认 English，玩家可在启动页切换；写入 localStorage）──
let currentLang = (() => {
  try {
    const v = localStorage.getItem('qd_lang');
    return (v === 'zh' || v === 'en') ? v : 'en';
  } catch (e) { return 'en'; }
})();


// ── 音频静音（默认开声；启动页右上角按钮切换；写入 localStorage）──
let audioMuted = (() => {
  try { return localStorage.getItem('qd_muted') === '1'; }
  catch (e) { return false; }
})();


// ── 关卡进度 ──
let currentLevel   = 1;
let unlockedLevel  = 1;
let levelResults   = {};    // { 1: 'win'|'lose', ... }


// ── 核心数值 ──
let coins     = 2000;
let baseHp    = 50;
let baseHpMax = 50;
let waveNum   = 0;


// ── 波次系统 ──
let TOTAL_WAVES         = 6;
let waveState           = 'waiting';
let waveCountdownEnd    = 0;
let waveCountdownActive = false;  // （原 waves.js）


// ── 干扰系统（Boss 技能）──
let jammedUntilFrame = 0;
let jamPos           = { x: 0, y: 0 };


// ── 路径 & 管理器 ──
let manager      = null;
let MAIN_PATH_PX = null;
let EDGE_PATH_PX = null;
let AIR_PATH_PX  = null;
let homeTowers   = [];


// ── 启动页辅助状态（screens/launch-screen.js 读写）──
let launchAnim      = 0;
let launchReady     = false;
let launchParticles = [];


// ── 关卡地图辅助状态（screens/level-map.js 读写）──
let levelMapAnim = 0;


// ── 结算面板辅助状态（screens/end-panel.js 读写）──
let endPanelAnim = 0;
let _endPanelWon = false;


// ── 游戏结束标志 ──
let _gameEndFired = false;


// ── 新手引导（仅第 1 关首次进入时弹出）──
let tutorialActive = false;
let tutorialStep   = 0;


// ============================================================
//  UI 状态（原 ui.js 顶部）
// ============================================================

// ── 建造 / 选中 ──
let selectedTowerType = null;
let selectedTower     = null;
let hoverTowerType    = null;
let BUILD_BTN_Y;
let clickEffects;

// ── 暂停系统 ──
let gamePaused       = false;
let pauseConfirmMode = false;
let _pauseBtnRect    = null;

// ── 加农炮瞄准 ──
let _mortarAiming = false;
let _mortarTower  = null;

// ── 波次结束面板 ──
let waveEndPanelVisible = false;
let waveEndBtnRect      = null;
