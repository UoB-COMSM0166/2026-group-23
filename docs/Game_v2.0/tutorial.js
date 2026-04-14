// ============================================================
//  tutorial.js — 新手引导（仅在玩家第一次进入关卡 1 时弹出）
//
//  工作方式：
//    · 激活期间 sketch.js 会跳过所有战斗 update（类似暂停），但继续
//      绘制画面；鼠标点击被本模块独占，防止误操作。
//    · 完成后写入 localStorage['qd_tutorial_l1_done']，以后不再出现。
//    · 用户也可按右上角「跳过」立刻结束。
//
//  依赖：state.js (tutorialActive / tutorialStep)、全局 p5 API、
//        HUD_HEIGHT、BUILD_BTN_Y（ui/index.js 初始化后可用）
// ============================================================

const TUTORIAL_FLAG_KEY = 'qd_tutorial_l1_done';

// 每一步：
//   title     — 面板标题
//   body      — 正文（支持 \n 换行）
//   highlight — 可选，需要用发光矩形突出显示的屏幕区域 {x,y,w,h}
//   panelAt   — 面板相对高亮区域的位置：'below' | 'above' | 'center'
//   btn       — 按钮文字
const TUTORIAL_STEPS = [
  {
    title: '欢迎来到 QUANTUM DROP',
    body:  '作为指挥官，你需要建造防御塔，阻止机械敌军抵达基地。\n在开始之前，先花 20 秒熟悉一下基本操作。',
    panelAt: 'center',
    btn: '开始学习  ▶',
  },
  {
    title: '① 观察战况',
    body:  '顶栏：金币 ¥、基地 HP、当前波次、剩余敌人、进度条。\n基地 HP 归零即失败；右上角 ⏸ 或按 ESC 可随时暂停。',
    highlight: () => ({ x: 0, y: 0, w: width, h: HUD_HEIGHT }),
    panelAt: 'below',
    btn: '下一步  ▶',
  },
  {
    title: '② 建造防御塔',
    body:  '点击底部塔按钮选中一种塔（注意金币是否够），\n然后点击地图上的空白格子放下塔。再点一次同按钮可取消。',
    highlight: () => ({ x: 0, y: BUILD_BTN_Y, w: 8 * 91 + 4, h: 48 }),
    panelAt: 'below',
    btn: '下一步  ▶',
  },
  {
    title: '③ 升级与拆除',
    body:  '点击已建造的塔会弹出升级面板：\n  · 绿色按钮 → 升级至下一等级（最高 Lv.3）\n  · 红色按钮 → 拆除并退还 80% 金币',
    panelAt: 'center',
    btn: '下一步  ▶',
  },
  {
    title: '④ 准备迎战！',
    body:  '敌人会沿着地面/空中路径冲向基地。\n合理布置塔阵、注意抵御飞行单位，守到最后一波！\n\n祝好运，指挥官。',
    panelAt: 'center',
    btn: '出发  ▶',
  },
];


// ============================================================
//  公共入口：sketch.js initGame() 末尾调用
// ============================================================
function startTutorialIfNeeded() {
  if (currentLevel !== 1) return;
  try {
    if (localStorage.getItem(TUTORIAL_FLAG_KEY) === '1') return;
  } catch (e) { /* localStorage 不可用时忽略，照常弹出 */ }
  tutorialActive = true;
  tutorialStep   = 0;
}

function _finishTutorial() {
  tutorialActive = false;
  tutorialStep   = 0;
  try { localStorage.setItem(TUTORIAL_FLAG_KEY, '1'); } catch (e) {}
}


// ============================================================
//  点击处理 — sketch.js mousePressed 在 'playing' 最先调用
//  返回 true 表示已消费，sketch.js 不再继续分发
// ============================================================
function handleTutorialClick(mx, my) {
  if (!tutorialActive) return false;

  const r = _tutorialSkipBtnRect();
  if (_inRect(mx, my, r)) { _finishTutorial(); return true; }

  const b = _tutorialNextBtnRect();
  if (_inRect(mx, my, b)) {
    tutorialStep++;
    if (tutorialStep >= TUTORIAL_STEPS.length) _finishTutorial();
  }
  return true; // 引导期间消费所有其它点击
}


// ============================================================
//  绘制 — sketch.js draw() playing 分支最后调用（在 drawUI 之后）
// ============================================================
function drawTutorial() {
  if (!tutorialActive) return;
  const step = TUTORIAL_STEPS[tutorialStep];
  if (!step) { _finishTutorial(); return; }

  // 整体暗化遮罩
  push();
  noStroke(); fill(0, 0, 0, 170);
  rect(0, 0, width, height);

  // 高亮区域（如果有）— 在遮罩上"挖"亮 + 发光边框
  let hl = null;
  if (step.highlight) {
    hl = step.highlight();
    // 在高亮区叠加轻微高光
    fill(0, 180, 255, 22);
    rect(hl.x, hl.y, hl.w, hl.h);
    // 脉冲边框
    const pulse = sin(frameCount * 0.12) * 0.25 + 0.75;
    noFill();
    stroke(0, 220, 255, 220 * pulse); strokeWeight(2.5);
    rect(hl.x + 1, hl.y + 1, hl.w - 2, hl.h - 2, 4);
    stroke(0, 220, 255, 90 * pulse); strokeWeight(6);
    rect(hl.x + 1, hl.y + 1, hl.w - 2, hl.h - 2, 4);
  }

  // 面板
  const PW = 520, PH = 190;
  let px = (width - PW) / 2;
  let py;
  if (step.panelAt === 'below' && hl) {
    py = hl.y + hl.h + 18;
  } else if (step.panelAt === 'above' && hl) {
    py = hl.y - PH - 18;
  } else {
    py = (height - PH) / 2;
  }
  py = constrain(py, 12, height - PH - 12);

  // 面板背景
  noStroke(); fill(4, 10, 24, 240);
  rect(px, py, PW, PH, 10);
  stroke(0, 200, 255, 200); strokeWeight(2); noFill();
  rect(px, py, PW, PH, 10);
  noStroke(); fill(0, 200, 255, 175);
  rect(px, py, PW, 6, 10, 10, 0, 0);

  // 步骤指示
  const total = TUTORIAL_STEPS.length;
  const dotGap = 14, dotY = py + PH - 18;
  const dotStartX = px + PW / 2 - (total - 1) * dotGap / 2;
  for (let i = 0; i < total; i++) {
    const active = i === tutorialStep;
    fill(active ? color(0, 220, 255, 230) : color(0, 120, 180, 120));
    ellipse(dotStartX + i * dotGap, dotY, active ? 8 : 5, active ? 8 : 5);
  }

  // 文本
  textFont('monospace');
  fill(0, 220, 255, 240); textSize(18); textAlign(LEFT, TOP);
  text(step.title, px + 22, py + 20);

  stroke(0, 180, 255, 80); strokeWeight(1);
  line(px + 22, py + 50, px + PW - 22, py + 50);
  noStroke();

  fill(210, 230, 250, 220); textSize(12);
  text(step.body, px + 22, py + 64, PW - 44, 100);

  // 下一步按钮
  const b = _tutorialNextBtnRect(px, py, PW, PH);
  const hov = _inRect(mouseX, mouseY, b);
  fill(hov ? color(0, 80, 140, 230) : color(10, 30, 60, 210));
  stroke(0, 220, 255, hov ? 230 : 140); strokeWeight(1.5);
  rect(b.x, b.y, b.w, b.h, 5);
  noStroke(); fill(hov ? 255 : 220, 255, 255, 240);
  textSize(13); textAlign(CENTER, CENTER);
  text(step.btn, b.x + b.w / 2, b.y + b.h / 2);

  // 右上角"跳过"
  const s = _tutorialSkipBtnRect();
  const shov = _inRect(mouseX, mouseY, s);
  fill(shov ? color(60, 20, 20, 210) : color(15, 10, 20, 180));
  stroke(255, 120, 100, shov ? 220 : 110); strokeWeight(1);
  rect(s.x, s.y, s.w, s.h, 4);
  noStroke(); fill(255, 150, 130, shov ? 240 : 180);
  textSize(11); textAlign(CENTER, CENTER);
  text('跳过引导', s.x + s.w / 2, s.y + s.h / 2);

  textAlign(LEFT, BASELINE);
  pop();
}


// ============================================================
//  内部工具
// ============================================================
function _tutorialNextBtnRect(px, py, PW, PH) {
  // 如果没有传入面板坐标（点击时调用），按当前帧重算
  if (px === undefined) {
    const step = TUTORIAL_STEPS[tutorialStep];
    PW = 520; PH = 190;
    px = (width - PW) / 2;
    if (step && step.panelAt === 'below' && step.highlight) {
      const hl = step.highlight();
      py = hl.y + hl.h + 18;
    } else if (step && step.panelAt === 'above' && step.highlight) {
      const hl = step.highlight();
      py = hl.y - PH - 18;
    } else {
      py = (height - PH) / 2;
    }
    py = constrain(py, 12, height - PH - 12);
  }
  const bw = 140, bh = 34;
  return { x: px + PW - bw - 18, y: py + PH - bh - 14, w: bw, h: bh };
}

function _tutorialSkipBtnRect() {
  return { x: width - 92, y: 56, w: 82, h: 22 };
}

function _inRect(mx, my, r) {
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}
