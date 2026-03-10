// ============================================================
//  ui.js — 所有UI界面
//  负责人：李卓伦（金币/血条显示、按钮、塔升级界面、数值平衡）
//  刘博文贡献：建造菜单、塔升级面板、放置预览
//  依赖：globals.js, map.js, towers.js
// ============================================================

// ── 放置系统状态 ──
let selectedTowerType = null;
let selectedTower     = null;

let BUILD_BTN_Y;

// ── 点击特效 ──
let clickEffects; 

function drawClickEffects() {
  clickEffects = clickEffects.filter(e => e.life > 0);
  for (const e of clickEffects) {
    e.life -= 0.055;
    const r = map(e.life, 1, 0, 8, 55);
    noFill(); stroke(0, 200, 255, e.life*170); strokeWeight(1.5);
    beginShape();
    for (let k = 0; k < 12; k++) {
      const nr = r + sin(k*1.3)*3.5;
      vertex(e.x + cos(k*TWO_PI/12)*nr, e.y + sin(k*TWO_PI/12)*nr);
    }
    endShape(CLOSE);
    stroke(0, 220, 255, e.life*110); strokeWeight(1);
    line(e.x-10, e.y, e.x+10, e.y); line(e.x, e.y-10, e.x, e.y+10);
  }
}

// ============================================================
//  HUD（李卓伦负责，以下为刘博文临时实现）
// ============================================================
function drawHUD() {
  noStroke(); fill(5, 8, 18, 225); rect(0, 0, width, HUD_HEIGHT);
  stroke(0, 180, 255, 180); strokeWeight(1.5); line(0, HUD_HEIGHT, width, HUD_HEIGHT);
  textFont('monospace'); noStroke();

  fill(0, 160, 255); textSize(13); text('◈ CREDITS', 12, 15);
  fill(255, 210, 40); textSize(18); text(nf(coins, 5), 12, 34);

  fill(0, 160, 255); textSize(13); text('◈ BASE HP', 145, 15);
  fill(lerpColor(color(220,30,30), color(0,220,140), baseHp/20));
  textSize(18); text(nf(baseHp, 2) + '/' + baseHpMax, 145, 34);
  
  fill(0, 160, 255); textSize(13); text('◈ WAVE', 285, 15);
  const waveLabel = waveState === 'complete' ? 'DONE' : ('W-' + nf(min(waveNum, TOTAL_WAVES), 2) + '/' + nf(TOTAL_WAVES, 2));
  fill(waveState === 'complete' ? color(0,255,120) : color(140,80,255));
  textSize(18); text(waveLabel, 285, 34);

  fill(0, 160, 255); textSize(13); text('◈ HOSTILES', 395, 15);
  fill(220, 50, 50); textSize(18); text(nf(manager.monsters.length, 3), 395, 34);

  // 波次进度条
  const barX=520,barY=10,barW=200,barH=26;
  fill(10,20,40,180); stroke(0,140,220,120); strokeWeight(1); rect(barX,barY,barW,barH,3);
  const prog = waveNum / TOTAL_WAVES;
  fill(lerpColor(color(0,160,255), color(0,255,180), prog)); noStroke();
  rect(barX+1, barY+1, max(0,(barW-2)*prog), barH-2, 2);
  fill(0,200,255,180); textSize(13); textAlign(CENTER,CENTER);
  text('PROGRESS  ' + floor(prog*100) + '%', barX+barW/2, barY+barH/2);
  textAlign(LEFT, BASELINE);

  // 干扰警告
  if (frameCount < jammedUntilFrame) {
    const t = sin(frameCount*0.3)*0.5+0.5;
    noStroke(); fill(255, 80, 0, 140+t*80); rect(0, HUD_HEIGHT, width, 20);
    fill(255, 220, 180, 230); textSize(13); textAlign(CENTER, CENTER);
    text('⚠  DEFENSE JAMMED — TOWERS OFFLINE  ⚠', width/2, HUD_HEIGHT+10);
    textAlign(LEFT, BASELINE);
  }

  fill(0, 140, 220, 65); textSize(10);
  text(nf(mouseX,4)+','+nf(mouseY,4), width-80, height-8);

  // TODO：李卓伦 — 可在此处扩展更完整的HUD面板
  // 例如：道具栏、技能冷却、波次奖励预览等
}

// ============================================================
//  波次倒计时 & 通关提示（李卓伦负责，以下为临时实现）
// ============================================================
function drawWaveUI() {
  textFont('monospace');
  if (waveState === 'countdown') {
    const nextW = waveNum + 1;
    const pulse = sin(frameCount*0.15)*0.3+0.7;
    // 小游戏进行时由小游戏自己占满屏幕，不显示波次倒计时覆盖层
    if (minigameState === 'idle') {
      const remaining = ceil((waveCountdownEnd - frameCount) / 60);
      noStroke(); fill(5,10,25,170); rect(0, height/2-36, width, 72);
      stroke(0,180,255,120*pulse); strokeWeight(1);
      line(0,height/2-36,width,height/2-36); line(0,height/2+36,width,height/2+36);
      fill(0,200,255,230*pulse); textSize(13); textAlign(CENTER,CENTER);
      text('— INCOMING WAVE ' + nextW + ' OF ' + TOTAL_WAVES + ' —', width/2, height/2-18);
      fill(255,220,60,240); textSize(26); text(remaining+'s', width/2, height/2+10);
      const cfg = WAVE_CONFIG[nextW-1];
      if (cfg) {
        const hasBoss = cfg.some(([t]) => t.startsWith('boss'));
        const desc = cfg.map(([t,c]) => {
          if (t==='boss1') return '⚠ BOSS: FISSION CORE';
          if (t==='boss2') return '⚠ BOSS: PHANTOM PROTOCOL';
          if (t==='boss3') return '☠ FINAL BOSS: ANT-MECH';
          return c+'x '+t.toUpperCase();
        }).join('  |  ');
        fill(hasBoss?color(255,120,20,220):color(0,180,220,160)); textSize(9); text(desc,width/2,height/2+30);
      }
      textAlign(LEFT, BASELINE);
    } // end if minigameState === 'idle'
  }
  if (waveState === 'complete') {
    noStroke(); fill(5,15,30,200); rect(0,height/2-50,width,100);
    fill(0,255,160,230); textSize(22); textAlign(CENTER,CENTER);
    text('ALL WAVES CLEARED', width/2, height/2-18);
    fill(255,220,60,200); textSize(13); text('TOTAL CREDITS: '+coins, width/2, height/2+14);
    textAlign(LEFT, BASELINE);
  }
}

// ============================================================
//  建造菜单（刘博文）
// ============================================================
function drawBuildMenu() {
  textFont('monospace'); noStroke();
  fill(5, 10, 22, 200); stroke(0, 130, 200, 100); strokeWeight(1);
  rect(0, BUILD_BTN_Y, 3*110+4, 44, 0, 0, 4, 4);

  const types = ['basic', 'rapid', 'area'];
  for (let i = 0; i < types.length; i++) {
    const type = types[i], def = TOWER_DEFS[type];
    const [r, g, b] = def.color;
    const bx = 4 + i*110, by = BUILD_BTN_Y + 4;
    const bw = 106, bh = 36;
    const selected = selectedTowerType === type;
    const canAfford = coins >= def.cost;

    if (selected)       { fill(r,g,b,60); stroke(r,g,b,220); strokeWeight(1.5); }
    else if (!canAfford){ fill(10,15,28,180); stroke(60,60,80,100); strokeWeight(1); }
    else                { fill(12,20,38,180); stroke(r,g,b,130); strokeWeight(1); }
    rect(bx, by, bw, bh, 3);

    fill(canAfford?color(r,g,b,230):color(100,100,110,180)); noStroke(); textSize(10);
    text(def.label, bx+8, by+15);
    fill(canAfford?color(255,210,50,220):color(160,80,80,180)); textSize(9);
    text('¥'+def.cost, bx+8, by+29);
    fill(r,g,b,canAfford?180:80); noStroke(); ellipse(bx+bw-18, by+bh/2, 14, 14);

    if (selected) {
      fill(r,g,b,230); noStroke(); textSize(8); textAlign(RIGHT,CENTER);
      text('▶ 选中', bx+bw-6, by+bh/2); textAlign(LEFT,BASELINE);
    }
  }

  // 取消按钮
  if (selectedTowerType) {
    const bx = 4+3*110, by = BUILD_BTN_Y+4;
    fill(60,20,20,180); stroke(200,60,60,160); strokeWeight(1); rect(bx,by,60,36,3);
    fill(255,100,100,220); noStroke(); textSize(9); textAlign(CENTER,CENTER);
    text('取消', bx+30, by+18); textAlign(LEFT,BASELINE);
  }
}

// ============================================================
//  塔升级面板（刘博文）
// ============================================================
function drawTowerPanel() {
  if (!selectedTower) return;
  const t = selectedTower;
  const panelW = 170, panelH = 145;
  let px = t.px + 35, py = t.py - 30;
  px = constrain(px, 0, width-panelW-4);
  py = constrain(py, HUD_HEIGHT+4, height-panelH-4);

  fill(5,10,22,220); stroke(0,180,255,160); strokeWeight(1.2);
  rect(px, py, panelW, panelH, 4);

  const def = TOWER_DEFS[t.type];
  const [r,g,b] = t.col;
  fill(r,g,b,220); noStroke(); textFont('monospace'); textSize(10);
  text(def.name + (t.upgraded?' ★':''), px+8, py+16);

  stroke(0,140,220,100); strokeWeight(1); line(px+6,py+22,px+panelW-6,py+22);

  fill(180,220,255,200); noStroke(); textSize(9);
  text('ATK   ' + t.dmg,  px+10, py+36);
  text('RNG   ' + t.range, px+10, py+50);
  text('SPD   ' + (t.upgraded?'↑':'') + Math.round(60/t.fireRate*10)/10 + '/s', px+10, py+64);
  if (t.antiAir) { fill(255,160,30,200); text('◆ 防空', px+100, py+36); }

  if (!t.upgraded) {
    const btnY = py+76;
    const canUpg = coins >= t.upgradeCost;
    fill(canUpg?color(0,160,80,200):color(60,60,60,180));
    stroke(canUpg?color(0,220,100,200):color(100,100,100,120)); strokeWeight(1);
    rect(px+8, btnY, panelW-16, 22, 3);
    fill(canUpg?color(180,255,200,230):color(140,140,140,180));
    noStroke(); textSize(9); textAlign(CENTER,CENTER);
    text('升级  花费 '+t.upgradeCost+' 金币', px+panelW/2, btnY+11);
    textAlign(LEFT,BASELINE);
    t._btnRect = { x:px+8, y:btnY, w:panelW-16, h:22 };
  } else {
    fill(255,200,50,160); noStroke(); textSize(9); textAlign(CENTER,CENTER);
    text('已升级（满级）', px+panelW/2, py+87);
    textAlign(LEFT,BASELINE);
    t._btnRect = null;
  }

// 拆除按钮
  const delBtnY = py + 104;
  fill(80, 20, 20, 200);
  stroke(200, 60, 60, 180); strokeWeight(1);
  rect(px + 8, delBtnY, panelW - 16, 20, 3);
  fill(255, 100, 100, 230); noStroke(); textSize(9); textAlign(CENTER, CENTER);
  const refund = Math.floor(TOWER_DEFS[t.type].cost * 0.8);
  text('拆除  退还 ' + refund + ' 金币', px + panelW / 2, delBtnY + 10);
  textAlign(LEFT, BASELINE);
  t._delRect = { x: px + 8, y: delBtnY, w: panelW - 16, h: 20 };

  fill(100,140,180,130); noStroke(); textSize(8); textAlign(CENTER,CENTER);
  text('[ 点击其他处关闭 ]', px+panelW/2, py+panelH-7);
  textAlign(LEFT,BASELINE);
}

// ============================================================
//  放置预览（刘博文）
// ============================================================
function drawPlacementPreview() {
  if (!selectedTowerType) return;
  const gx = Math.floor(mouseX / CELL_SIZE);
  const gy = Math.floor(mouseY / CELL_SIZE);
  const canBuild  = isCellBuildable(gx, gy);
  const canAfford = coins >= TOWER_DEFS[selectedTowerType].cost;
  const ok = canBuild && canAfford;
  const px = gx * CELL_SIZE, py = gy * CELL_SIZE;
  const def = TOWER_DEFS[selectedTowerType];
  const [r,g,b] = def.color;

  noFill(); stroke(ok?color(0,255,120,200):color(255,60,60,200)); strokeWeight(2);
  rect(px+2, py+2, CELL_SIZE-4, CELL_SIZE-4, 3);
  fill(ok?color(0,255,120,30):color(255,60,60,30)); noStroke();
  rect(px+2, py+2, CELL_SIZE-4, CELL_SIZE-4, 3);
  fill(r,g,b,ok?120:60); noStroke();
  ellipse(px+CELL_SIZE/2, py+CELL_SIZE/2, CELL_SIZE*0.55, CELL_SIZE*0.55);
  noFill(); stroke(r,g,b,ok?50:25); strokeWeight(1);
  ellipse(px+CELL_SIZE/2, py+CELL_SIZE/2, def.range*2, def.range*2);

  if (!canAfford) {
    fill(255,80,80,220); noStroke(); textFont('monospace'); textSize(9);
    textAlign(CENTER,CENTER); text('金币不足', px+CELL_SIZE/2, py+CELL_SIZE+10);
    textAlign(LEFT,BASELINE);
  } else if (!canBuild) {
    fill(255,80,80,220); noStroke(); textFont('monospace'); textSize(9);
    textAlign(CENTER,CENTER); text('无法建造', px+CELL_SIZE/2, py+CELL_SIZE+10);
    textAlign(LEFT,BASELINE);
  }
}

// ============================================================
//  鼠标点击处理（刘博文）
//  返回 true 表示已消费，不传给战斗系统
// ============================================================
function handlePlacementClick(mx, my) {
  // 建造菜单区域
  if (my >= BUILD_BTN_Y && my < BUILD_BTN_Y + 44) {
    const types = ['basic', 'rapid', 'area'];
    for (let i = 0; i < types.length; i++) {
      const bx = 4 + i*110;
      if (mx >= bx && mx < bx+106) {
        selectedTowerType = selectedTowerType===types[i] ? null : types[i];
        if (selectedTowerType) selectedTower = null;
        return true;
      }
    }
    if (selectedTowerType && mx >= 4+3*110 && mx < 4+3*110+60) {
      selectedTowerType = null; return true;
    }
    return true;
  }

  // 升级按钮
  if (selectedTower && selectedTower._btnRect) {
    const btn = selectedTower._btnRect;
    if (mx>=btn.x && mx<btn.x+btn.w && my>=btn.y && my<btn.y+btn.h) {
      selectedTower.upgrade(); return true;
    }
  }

  // 拆除按钮
  if (selectedTower && selectedTower._delRect) {
    const del = selectedTower._delRect;
    if (mx >= del.x && mx < del.x + del.w && my >= del.y && my < del.y + del.h) {
      demolishTower(selectedTower);
      selectedTower = null;
      return true;
    }
  }

  // 点击已有塔
  const clicked = towers.find(t => dist(mx,my,t.px,t.py) < CELL_SIZE*0.45);
  if (clicked) {
    selectedTower = selectedTower===clicked ? null : clicked;
    if (selectedTower) selectedTowerType = null;
    return true;
  }

  // 放置塔
  if (selectedTowerType) {
    const gx = Math.floor(mx/CELL_SIZE), gy = Math.floor(my/CELL_SIZE);
    if (isCellBuildable(gx,gy) && coins >= TOWER_DEFS[selectedTowerType].cost) {
      coins -= TOWER_DEFS[selectedTowerType].cost;
      towers.push(new Tower(gx, gy, selectedTowerType));
      selectedTowerType = null;
    } else if (my > HUD_HEIGHT) {
      selectedTower = null;
    }
    return true;
  }

  if (selectedTower) { selectedTower = null; return true; }
  return false;
}

// ============================================================
//  主UI绘制入口（在 sketch.js draw() 中调用）
// ============================================================
function drawUI() {
  drawBuildMenu();
  drawPlacementPreview();
  drawTowerPanel();
  drawClickEffects();
  drawScanlines();
  drawWaveUI();
  drawHUD();
}

// ── 初始化 ──
function initUI() {
  selectedTowerType = null;
  selectedTower     = null;
  clickEffects      = [];
  BUILD_BTN_Y       = HUD_HEIGHT + 2;
}

// ============================================================
//  TODO：李卓伦 — 可在此文件扩展的UI功能
//  1. drawHUD()       — 完善金币/血条动画、道具栏
//  2. drawWaveUI()    — 完善倒计时、波次奖励预览
//  3. drawShopPanel() — 投球小游戏结束后的商店界面
//  4. 数值平衡参数统一放在 globals.js 或此文件顶部
// ============================================================