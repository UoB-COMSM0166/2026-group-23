// ============================================================
//  sketch.js — p5 引擎骨架（仅 setup / draw / 事件路由）
//
//  游戏阶段流转：
//    'launch' → 'difficulty' → 'levelmap' → 'playing' → 'endpanel'
//
//  各阶段渲染 / 点击逻辑已拆至：
//    screens/launch-screen.js
//    screens/difficulty-select.js
//    screens/level-map.js
//    screens/end-panel.js
// ============================================================

// ── 布局常量 ──
const CELL_SIZE  = 70;
const GRID_COLS  = 14;
const GRID_ROWS  = 12;
const HUD_HEIGHT = 46;

// ── 波次常量 ──
const COUNTDOWN_FRAMES = 300;

// 全局可变状态（gamePhase / coins / baseHp / manager / 路径 / 启动页与结算动画 等）
// 已集中到 state.js 声明，本文件直接按原名读写即可。

// ============================================================
//  p5 setup
// ============================================================
function setup() {
  createCanvas(GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE);
  textFont('monospace');

  // 初始化启动页粒子
  for (let i = 0; i < 90; i++) {
    launchParticles.push({
      x: random(width), y: random(height),
      vx: random(-0.35, 0.35), vy: random(-0.7, -0.1),
      size: random(1, 3.5), life: random(0.3, 1.0),
      col: random() > 0.5 ? [0, 200, 255] : [110, 70, 255],
    });
  }

  // 菜单 BGM（首次用户点击前浏览器会阻止自动播放，
  // audio.js 会把这个名字排队，等 unlockAudio() 触发时再开始）
  setBgm('launch');
}

// ============================================================
//  p5 draw — 阶段路由
// ============================================================
function draw() {
  switch (gamePhase) {
    case 'launch':     drawLaunchScreen();    return;
    case 'difficulty': drawDifficultySelect(); return;
    case 'levelmap':   drawLevelMap();         return;

    case 'endpanel':
      endPanelAnim++;
      drawBackground(); drawPaths();
      for (const ht of homeTowers) ht.draw();
      drawEndPanel();
      return;

    case 'playing':
      drawBackground(); drawPaths();
      // 暂停 / 新手引导 时跳过所有更新，只绘制静止画面
      const _frozen = gamePaused || tutorialActive;
      if (!_frozen) {
        updateWaveSystem();
        manager.update();
        updateAndDrawTowers();
        for (const ht of homeTowers) { ht.update(); ht.draw(); }
        updateParticles();
        updateMinigame(); drawMinigame();
      } else {
        // 冻结期间仍然绘制怪物和塔（静止），让画面不黑屏
        for (const m of manager.monsters) m.draw();
        for (const ht of homeTowers) ht.draw();
        drawTowersOnly(); // 只绘制不更新
      }
      drawUI(); // drawUI 内部会调用 drawPauseMenu()
      drawTutorial(); // 若激活则绘制引导覆盖层（始终盖在 UI 之上）
      if (!_frozen && waveState === 'complete' && manager.monsters.length === 0 && !_gameEndFired) {
        _gameEndFired = true;
        setTimeout(() => handleGameEnd(true), 1800);
      }
      return;
  }
}

// ============================================================
//  p5 mousePressed — 阶段路由
// ============================================================
function mousePressed() {
  // 首次点击解锁浏览器自动播放限制；之后多次调用为 no-op
  unlockAudio();
  switch (gamePhase) {
    case 'launch':
      // 静音切换按钮最高优先：点击后仅切换音频状态，不进入下一界面
      if (typeof handleLaunchMuteBtn === 'function' && handleLaunchMuteBtn(mouseX, mouseY)) return;
      // 语言切换按钮次高优先：点击后仅切换语言，不进入下一界面
      if (handleLaunchLangBtn(mouseX, mouseY)) return;
      // 测试入口次优先检测
      if (launchReady && handleLaunchTestBtn(mouseX, mouseY)) {
        activateTestMode();
        return;
      }
      if (launchReady) { playSfx('click'); gamePhase = 'difficulty'; }
      return;

    case 'difficulty': handleDifficultyClick(mouseX, mouseY); return;
    case 'levelmap':   handleLevelMapClick(mouseX, mouseY);   return;
    case 'endpanel':   handleEndPanelClick(mouseX, mouseY);   return;

    case 'playing':
      // 新手引导最优先：拦截所有其它点击
      if (tutorialActive) { handleTutorialClick(mouseX, mouseY); return; }
      // 暂停按钮与暂停菜单优先处理
      if (handlePauseClick(mouseX, mouseY)) return;
      // 暂停期间消费所有其他点击
      if (gamePaused) return;
      if (typeof handleWaveEndClick === 'function' && handleWaveEndClick(mouseX, mouseY)) return;
      if (minigameState !== 'idle') { handleMinigameClick(mouseX, mouseY); return; }
      const consumed = handlePlacementClick(mouseX, mouseY);
      if (!consumed) clickEffects.push({ x: mouseX, y: mouseY, life: 1.0 });
      return;
  }
}

function mouseMoved() {
  if (minigameState !== 'idle') handleMinigameMove(mouseX, mouseY);
}

// ESC 键暂停（引导期间吞掉 ESC，避免叠加暂停菜单）
function keyPressed() {
  if (keyCode === ESCAPE) {
    if (tutorialActive) return;
    handlePauseKey();
  }
}

// 暂停期间只绘制塔，不触发攻击逻辑
function drawTowersOnly() {
  for (const t of towers) t.draw();
}

// ============================================================
//  initGame — 按当前 currentLevel 初始化一局
// ============================================================
function initGame() {
  initMap(); // map.js：根据 currentLevel 选路径、建格子集合

  const lcfg = LEVEL_INFO[currentLevel];
  coins     = Math.floor(gameDifficulty === 'easy' ? lcfg.startCoins * 1.3 : lcfg.startCoins);
  baseHpMax = gameDifficulty === 'easy' ? 30 : 20;
  baseHp    = baseHpMax;
  TOTAL_WAVES = WAVE_CONFIGS[currentLevel].length;

  // 终点基地
  homeTowers = [];
  if (MAIN_PATH_PX && MAIN_PATH_PX.length > 0) {
    const ep = MAIN_PATH_PX[MAIN_PATH_PX.length - 1];
    homeTowers.push(new HomeTower(ep.x, ep.y));
  }
  if (EDGE_PATH_PX && EDGE_PATH_PX.length > 0) {
    const ep2 = EDGE_PATH_PX[EDGE_PATH_PX.length - 1];
    const ep1 = MAIN_PATH_PX[MAIN_PATH_PX.length - 1];
    if (Math.hypot(ep2.x - ep1.x, ep2.y - ep1.y) > 40)
      homeTowers.push(new HomeTower(ep2.x, ep2.y));
  }

  manager = new MonsterManager();
  manager.onKilled = m => { coins += m.reward; };
  manager.onReach  = (m, dmg) => {
    baseHp = max(0, baseHp - (dmg || 1));
    if (baseHp <= 0 && !_gameEndFired) {
      _gameEndFired = true;
      setTimeout(() => handleGameEnd(false), 600);
    }
  };

  initTowers();
  initUI();
  beginAutoWave();
  startTutorialIfNeeded(); // 第 1 关首次进入时弹出新手引导

  // 切到该关卡的 BGM（launch → level{N}）
  setBgm('level' + currentLevel);
}

// ============================================================
//  handleGameEnd — 胜利 / 失败后切换到结算面板
// ============================================================
function handleGameEnd(won) {
  levelResults[currentLevel] = won ? 'win' : 'lose';
  if (won && currentLevel >= unlockedLevel)
    unlockedLevel = Math.min(5, currentLevel + 1);
  endPanelAnim = 0;
  _endPanelWon = won;
  gamePhase    = 'endpanel';
  // 停 BGM，留给胜/负音效独自响一下
  stopBgm();
  playSfx(won ? 'win' : 'lose');
}