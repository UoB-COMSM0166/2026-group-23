// ============================================================
//  tutorial.js — 新手教程（v1.3）
//  目标：不改动现有玩法，仅用 overlay 引导关键操作
// ============================================================

let tutorialActive = false;
let tutorialStepId = 'welcome';

// 可点按钮区域（每帧更新）
let _tutorialBtnNext = null;
let _tutorialBtnSkip = null;

function initTutorial() {
  tutorialActive = _isTutorialEnabled();
  tutorialStepId = 'welcome';
}

function isTutorialActive() {
  return tutorialActive === true;
}

function enableTutorial() {
  tutorialActive = true;
  tutorialStepId = 'welcome';
}

function skipTutorial() {
  tutorialActive = false;
  tutorialStepId = 'done';
}

function _advanceTutorial(nextId) {
  tutorialStepId = nextId;
}

function updateTutorial() {
  if (!tutorialActive) return;

  // 自动推进：尽量依赖“状态变化”，避免强耦合具体实现细节
  switch (tutorialStepId) {
    case 'welcome':
      // 手动点“开始”
      break;

    case 'minigame_aim':
      // 玩家在瞄准界面点击后会进入 playing
      if (typeof minigameState !== 'undefined' && minigameState === 'playing')
        _advanceTutorial('minigame_wait_end');
      break;

    case 'minigame_wait_end':
      if (typeof minigameState !== 'undefined' && minigameState === 'idle')
        _advanceTutorial('build_select_basic');
      break;

    case 'build_select_basic':
      if (typeof selectedTowerType !== 'undefined' && selectedTowerType === 'basic')
        _advanceTutorial('build_place_tower');
      break;

    case 'build_place_tower':
      if (typeof towers !== 'undefined' && Array.isArray(towers) && towers.length > 0)
        _advanceTutorial('upgrade_tower');
      break;

    case 'upgrade_tower':
      if (
        typeof towers !== 'undefined' &&
        Array.isArray(towers) &&
        towers.some(t => t && t.upgraded)
      ) {
        _advanceTutorial('done');
        tutorialActive = false;
      }
      break;
  }
}

function handleTutorialClick(mx, my) {
  if (!tutorialActive) return false;

  // 只消费按钮点击，避免挡住原本的游戏交互
  if (_tutorialBtnSkip && _inRect(mx, my, _tutorialBtnSkip)) {
    skipTutorial();
    return true;
  }

  if (_tutorialBtnNext && _inRect(mx, my, _tutorialBtnNext)) {
    // welcome 用按钮推进到第一步；其他步骤提供“跳到下一步”的容错
    if (tutorialStepId === 'welcome') _advanceTutorial('minigame_aim');
    else if (tutorialStepId === 'minigame_aim') _advanceTutorial('minigame_wait_end');
    else if (tutorialStepId === 'minigame_wait_end') _advanceTutorial('build_select_basic');
    else if (tutorialStepId === 'build_select_basic') _advanceTutorial('build_place_tower');
    else if (tutorialStepId === 'build_place_tower') _advanceTutorial('upgrade_tower');
    else if (tutorialStepId === 'upgrade_tower') {
      tutorialActive = false;
      tutorialStepId = 'done';
    }
    return true;
  }

  return false;
}

function drawTutorial() {
  if (!tutorialActive) return;

  // 顶层半透明遮罩（不过度遮挡，保持可玩）
  push();
  noStroke();
  fill(0, 0, 0, 90);
  rect(0, 0, width, height);

  const msg = _getTutorialMessage();
  _drawTutorialPanel(msg.title, msg.lines);
  _drawTutorialHighlights();
  pop();
}

function _getTutorialMessage() {
  const title = '新手教程';
  switch (tutorialStepId) {
    case 'welcome':
      return {
        title,
        lines: [
          '目标：用投球小游戏拿金币 → 建塔防守 → 抵御 10 波怪物。',
          '这份教程会带你完成：发射一次小球、建一座塔、给塔升级。',
        ],
      };
    case 'minigame_aim':
      return {
        title,
        lines: [
          '投球小游戏：移动鼠标选择发射 X 位置，然后点击发射。',
          '小球穿过门会改变数量，落底后转化为金币。',
        ],
      };
    case 'minigame_wait_end':
      return {
        title,
        lines: [
          '等待小游戏结束结算金币。',
          '结束后会进入波次倒计时，此时可以开始建塔。',
        ],
      };
    case 'build_select_basic':
      return {
        title,
        lines: [
          '点击建造菜单里的 BASIC 选择“基础塔”。',
          '提示：路径格子不能建造；鼠标悬停会显示可建造与否。',
        ],
      };
    case 'build_place_tower':
      return {
        title,
        lines: ['在地图上任意“可建造格子”点击放置基础塔。', '放下后再点击塔可以打开升级面板。'],
      };
    case 'upgrade_tower':
      return {
        title,
        lines: ['点击你放下的塔 → 在弹出的面板里点击“升级”。', '升级后伤害、射程、攻速会提升。'],
      };
    default:
      return { title, lines: ['教程完成。'] };
  }
}

function _drawTutorialPanel(title, lines) {
  const pad = 12;
  const w = min(520, width - 24);
  const x = (width - w) / 2;
  const y = HUD_HEIGHT + 10;

  // 面板
  fill(5, 10, 22, 235);
  stroke(0, 180, 255, 150);
  strokeWeight(1.2);
  rect(x, y, w, 112, 6);

  // 文案
  noStroke();
  fill(0, 200, 255, 230);
  textFont('monospace');
  textSize(13);
  text(title, x + pad, y + 18);

  fill(220, 240, 255, 230);
  textSize(11);
  let ty = y + 40;
  for (const line of lines) {
    text(line, x + pad, ty);
    ty += 16;
  }

  // 按钮（右下角）
  const btnH = 26;
  const btnW = 92;
  const btnGap = 10;
  const btnY = y + 112 - btnH - 10;
  const btnSkipX = x + w - pad - btnW;
  const btnNextX = btnSkipX - btnGap - btnW;

  _tutorialBtnNext = { x: btnNextX, y: btnY, w: btnW, h: btnH };
  _tutorialBtnSkip = { x: btnSkipX, y: btnY, w: btnW, h: btnH };

  // Next
  fill(0, 160, 80, 200);
  noStroke();
  rect(_tutorialBtnNext.x, _tutorialBtnNext.y, _tutorialBtnNext.w, _tutorialBtnNext.h, 4);
  fill(200, 255, 220, 235);
  textAlign(CENTER, CENTER);
  text(tutorialStepId === 'welcome' ? '开始' : '下一步', _tutorialBtnNext.x + btnW / 2, btnY + btnH / 2);

  // Skip
  fill(60, 20, 20, 200);
  rect(_tutorialBtnSkip.x, _tutorialBtnSkip.y, _tutorialBtnSkip.w, _tutorialBtnSkip.h, 4);
  fill(255, 190, 190, 235);
  text('跳过', _tutorialBtnSkip.x + btnW / 2, btnY + btnH / 2);
  textAlign(LEFT, BASELINE);
}

function _drawTutorialHighlights() {
  // 用“高亮框 + 小箭头”提示关键区域（不做挖洞，保持简单稳定）
  let hl = null;

  if (tutorialStepId === 'build_select_basic') {
    hl = _getBuildMenuRect();
  } else if (tutorialStepId === 'minigame_aim' || tutorialStepId === 'minigame_wait_end') {
    hl = _getMinigameRect();
  } else if (tutorialStepId === 'build_place_tower') {
    hl = _getSuggestedBuildCellRect();
  } else if (tutorialStepId === 'upgrade_tower') {
    hl = _getFirstTowerRect();
  }

  if (!hl) return;

  noFill();
  stroke(255, 220, 60, 220);
  strokeWeight(2.2);
  rect(hl.x, hl.y, hl.w, hl.h, 6);

  // 简单箭头
  const ax = hl.x + hl.w / 2;
  const ay = hl.y - 16;
  stroke(255, 220, 60, 220);
  line(ax, ay, ax, hl.y);
  line(ax, hl.y, ax - 6, hl.y - 6);
  line(ax, hl.y, ax + 6, hl.y - 6);
}

function _getBuildMenuRect() {
  if (typeof BUILD_BTN_Y === 'undefined') return null;
  return { x: 0, y: BUILD_BTN_Y, w: 3 * 110 + 4 + 60 + 8, h: 44 };
}

function _getMinigameRect() {
  if (typeof MG !== 'undefined' && MG && typeof MG.w === 'number') return { x: MG.x, y: MG.y, w: MG.w, h: MG.h };
  // fallback：HUD 以下整块区域
  return { x: 0, y: HUD_HEIGHT, w: width, h: height - HUD_HEIGHT };
}

function _getSuggestedBuildCellRect() {
  if (typeof isCellBuildable !== 'function') return null;
  for (let gy = 1; gy < GRID_ROWS; gy++) {
    for (let gx = 0; gx < GRID_COLS; gx++) {
      if (isCellBuildable(gx, gy)) {
        return { x: gx * CELL_SIZE + 2, y: gy * CELL_SIZE + 2, w: CELL_SIZE - 4, h: CELL_SIZE - 4 };
      }
    }
  }
  return null;
}

function _getFirstTowerRect() {
  if (typeof towers === 'undefined' || !Array.isArray(towers) || towers.length === 0) return null;
  const t = towers[0];
  return { x: t.px - CELL_SIZE * 0.55, y: t.py - CELL_SIZE * 0.55, w: CELL_SIZE * 1.1, h: CELL_SIZE * 1.1 };
}

function _inRect(mx, my, r) {
  return mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h;
}

function _isTutorialEnabled() {
  // 方式1：页面参数 ?tutorial=1
  try {
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('tutorial') === '1') return true;
  } catch {}

  // 方式2：由主页/其他脚本设置 window.ENABLE_TUTORIAL = true
  try {
    if (typeof window !== 'undefined' && window.ENABLE_TUTORIAL === true) return true;
  } catch {}

  return false;
}

