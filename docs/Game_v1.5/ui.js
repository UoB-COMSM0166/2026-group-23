// ============================================================
//  ui.js — 战斗期间的 HUD 与建造交互
//
//  包含：点击特效、HUD 顶栏、波次倒计时、建造菜单、
//        塔升级面板、放置预览、点击事件处理
//
//  已迁移至 screens/ 的内容（请勿在此重复定义）：
//    drawDifficultySelect / _drawDiffCard / handleDifficultyClick
//      → screens/difficulty-select.js
// ============================================================

let selectedTowerType = null;
let selectedTower     = null;
let hoverTowerType = null;
let BUILD_BTN_Y;
let clickEffects;

// ============================================================
//  点击特效
// ============================================================
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
//  HUD 顶栏
// ============================================================
function drawHUD() {
  noStroke(); fill(5, 8, 18, 225); rect(0, 0, width, HUD_HEIGHT);
  stroke(0, 180, 255, 180); strokeWeight(1.5); line(0, HUD_HEIGHT, width, HUD_HEIGHT);
  textFont('monospace'); noStroke();

  fill(0, 160, 255); textSize(13); text('◈ CREDITS', 12, 15);
  fill(255, 210, 40); textSize(18); text(nf(coins, 5), 12, 34);

  fill(0, 160, 255); textSize(13); text('◈ BASE HP', 145, 15);
  fill(lerpColor(color(220,30,30), color(0,220,140), baseHp/baseHpMax));
  textSize(18); text(nf(baseHp, 2) + '/' + baseHpMax, 145, 34);

  fill(0, 160, 255); textSize(13); text('◈ WAVE', 285, 15);
  const waveLabel = waveState === 'complete'
    ? 'DONE'
    : ('W-' + nf(min(waveNum, TOTAL_WAVES), 2) + '/' + nf(TOTAL_WAVES, 2));
  fill(waveState === 'complete' ? color(0,255,120) : color(140,80,255));
  textSize(18); text(waveLabel, 285, 34);

  fill(0, 160, 255); textSize(13); text('◈ HOSTILES', 395, 15);
  fill(220, 50, 50); textSize(18); text(nf(manager.monsters.length, 3), 395, 34);

  // 波次进度条
  const barX=520, barY=10, barW=200, barH=26;
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
}

// 波次结束后 → 点确定再进小游戏（并清空选中）
let waveEndPanelVisible = false;
let waveEndBtnRect = null;

function showWaveEndPanel() {
  waveEndPanelVisible = true;
  waveEndBtnRect = null;
  selectedTowerType = null;
  selectedTower = null;
  _mortarAiming = false;
  _mortarTower = null;
}

function handleWaveEndClick(mx, my) {
  if (!waveEndPanelVisible) return false;
  if (
    waveEndBtnRect &&
    mx >= waveEndBtnRect.x &&
    mx <= waveEndBtnRect.x + waveEndBtnRect.w &&
    my >= waveEndBtnRect.y &&
    my <= waveEndBtnRect.y + waveEndBtnRect.h
  ) {
    waveEndPanelVisible = false;
    waveEndBtnRect = null;
    if (typeof startMinigame === 'function' && minigameState === 'idle') startMinigame();
    return true;
  }
  return true;
}

// ============================================================
//  波次倒计时 & 通关提示
// ============================================================
function drawWaveUI() {
  textFont('monospace');
  if (waveEndPanelVisible && waveState === 'countdown' && minigameState === 'idle') {
    // 与 end-panel.js 结算面板同一套视觉（遮罩 / 框体 / 顶条 / 分割线 / 按钮）
    noStroke();
    fill(0, 0, 0, 165);
    rect(0, 0, width, height);

    const r = 0, g = 200, b = 255;
    const pw = 336, ph = 178;
    const px = (width - pw) / 2, py = (height - ph) / 2;
    const pulse = sin(frameCount * 0.08) * 0.2 + 0.8;

    fill(4, 8, 22, 230);
    stroke(r, g, b, 180);
    strokeWeight(2);
    rect(px, py, pw, ph, 10);
    noStroke();
    fill(r, g, b, 160);
    rect(px, py, pw, 6, 10, 10, 0, 0);

    textAlign(CENTER, CENTER);
    fill(r, g, b, 240 * pulse);
    textSize(22);
    text('WAVE BREAK', px + pw / 2, py + 48);
    fill(178, 210, 240, 200);
    textSize(11);
    text('Prepare for the next wave.', px + pw / 2, py + 78);

    stroke(r, g, b, 60);
    strokeWeight(1);
    line(px + 28, py + 100, px + pw - 28, py + 100);

    const bY = py + ph - 48;
    const bhov =
      mouseX >= px + 28 &&
      mouseX <= px + pw - 28 &&
      mouseY >= bY &&
      mouseY <= bY + 28;
    fill(bhov ? color(20, 75, 115, 220) : color(10, 20, 40, 200));
    stroke(0, 180, 255, bhov ? 200 : 115);
    strokeWeight(1);
    rect(px + 28, bY, pw - 56, 28, 5);
    noStroke();
    fill(0, 200, 255, 230);
    textSize(12);
    text('CONTINUE', px + pw / 2, bY + 14);

    waveEndBtnRect = { x: px + 28, y: bY, w: pw - 56, h: 28 };
    textAlign(LEFT, BASELINE);
    return;
  }

  if (waveState === 'countdown') {
    const nextW = waveNum + 1;
    const pulse = sin(frameCount*0.15)*0.3+0.7;
    if (minigameState === 'idle') {
      const remaining = ceil((waveCountdownEnd - frameCount) / 60);
      noStroke(); fill(5,10,25,170); rect(0, height/2-36, width, 72);
      stroke(0,180,255,120*pulse); strokeWeight(1);
      line(0,height/2-36,width,height/2-36); line(0,height/2+36,width,height/2+36);
      fill(0,200,255,230*pulse); textSize(13); textAlign(CENTER,CENTER);
      text('— INCOMING WAVE ' + nextW + ' OF ' + TOTAL_WAVES + ' —', width/2, height/2-18);
      fill(255,220,60,240); textSize(26); text(remaining+'s', width/2, height/2+10);
      const wc  = WAVE_CONFIGS[currentLevel] || [];
      const cfg = wc[nextW - 1];
      if (cfg) {
        const hasBoss = cfg.some(([t]) => t.startsWith('boss'));
        const desc = cfg.map(([t,c]) => {
          if (t==='boss1') return '⚠ BOSS: FISSION CORE';
          if (t==='boss2') return '⚠ BOSS: PHANTOM PROTOCOL';
          if (t==='boss3') return '☠ FINAL BOSS: ANT-MECH';
          return c+'x '+t.toUpperCase();
        }).join('  |  ');
        fill(hasBoss?color(255,120,20,220):color(0,180,220,160));
        textSize(9); text(desc, width/2, height/2+30);
      }
      textAlign(LEFT, BASELINE);
    }
  }
  if (waveState === 'complete') {
    noStroke(); fill(5,15,30,200); rect(0, height/2-50, width, 100);
    fill(0,255,160,230); textSize(22); textAlign(CENTER,CENTER);
    text('ALL WAVES CLEARED', width/2, height/2-18);
    fill(255,220,60,200); textSize(13);
    text('TOTAL CREDITS: ' + coins, width/2, height/2+14);
    textAlign(LEFT, BASELINE);
  }
}

// ============================================================
//  建造菜单
// ============================================================
function drawBuildMenu() {
  textFont('monospace'); noStroke();
  const btnW = 86, spacing = 5;
  const menuWidth = 8 * (btnW + spacing) + 4;

  fill(5, 10, 22, 220); stroke(0, 130, 200, 120); strokeWeight(1.5);
  rect(0, BUILD_BTN_Y, menuWidth, 48, 0, 0, 6, 0);

  const types = ['rapid', 'laser', 'nova', 'chain', 'magnet', 'ghost', 'scatter', 'cannon'];
  const displayNames = {
    rapid:'RAPID', laser:'LASER', nova:'NOVA', chain:'CHAIN',
    magnet:'MAGNET', ghost:'GHOST', scatter:'AA-FAN', cannon:'CANNON',
  };

  for (let i = 0; i < types.length; i++) {
    const type = types[i], def = TOWER_DEFS[type];
    if (!def) continue; // 防止 towers.js 未定义该塔时崩溃
    const [r, g, b] = def.color;
    const bx = 6 + i * (btnW + spacing), by = BUILD_BTN_Y + 6;
    const selected  = selectedTowerType === type;
    const canAfford = coins >= def.cost;

    if (selected)        { fill(r,g,b,80); stroke(r,g,b,255); strokeWeight(2); }
    else if (!canAfford) { fill(15,15,25,150); stroke(60,60,70,100); strokeWeight(1); }
    else                 { fill(10,20,40,200); stroke(r,g,b,120); strokeWeight(1); }
    rect(bx, by, btnW, 36, 4);

    noStroke();
    fill(canAfford ? color(r,g,b) : color(120));
    textSize(10); textAlign(LEFT, TOP); text(displayNames[type], bx+8, by+6);
    fill(canAfford ? color(255,215,0) : color(150,80,80));
    textSize(9); textAlign(LEFT, BOTTOM); text('¥'+def.cost, bx+8, by+30);
    fill(r, g, b, canAfford ? 200 : 80); rect(bx+btnW-12, by+8, 4, 20, 1);
  }

  if (selectedTowerType) {
    const cancelX = 6 + types.length * (btnW + spacing);
    const by = BUILD_BTN_Y + 6;
    fill(80, 20, 20, 200); stroke(255, 60, 60, 180); strokeWeight(1.2);
    rect(cancelX, by, 44, 36, 4);
    fill(255, 100, 100); noStroke(); textAlign(CENTER, CENTER); textSize(12);
    text('✕', cancelX + 22, by + 18);
    textAlign(LEFT, BASELINE);
  }

  // ==== 悬停检 ====
  hoverTowerType = null;
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    const bx = 6 + i * (btnW + spacing);
    const by = BUILD_BTN_Y + 6;

    if (mouseX >= bx && mouseX <= bx + btnW &&
        mouseY >= by && mouseY <= by + 36) {
      hoverTowerType = type;
    }
  }
}

// ============================================================
//  鼠标悬停商店页面塔简介
// ============================================================
function drawTowerHoverTooltip() {
  if (!hoverTowerType) return;

  const TOWER_TIPS = {
    rapid:   ["RAPID",   "High fire rate, great for swarms"],
    laser:   ["LASER",   "Multi-target lock-on, piercing beam"],
    nova:    ["NOVA",    "Line pierce + impact explosion"],
    chain:   ["CHAIN",   "Chain lightning, jumps between foes"],
    magnet:  ["MAGNET",  "AOE slow support tower"],
    ghost:   ["GHOST",   "Homing missiles with explosion"],
    scatter: ["AA-FAN",  "Anti-air fan burst, fast intercept"],
    cannon:  ["CANNON",  "Map-wide strike, huge blast radius"],
  };

  const tip = TOWER_TIPS[hoverTowerType];
  if (!tip) return;

  const [name, desc] = tip;

  // --- Text Settings ---
  textFont("monospace");
  const padding = 12;
  textSize(14);
  const titleWidth = textWidth(name);

  textSize(12);
  const descWidth = textWidth(desc);

  // 总宽度 = 最大文字宽度 + padding * 2
  const w = Math.max(titleWidth, descWidth) + padding * 2;
  const h = 44; // 一行高，标题 + 描述 + 间距

  // --- Position (avoid going outside screen) ---
  let x = mouseX + 20;
  let y = mouseY + 20;
  if (x + w > width)  x = width - w - 8;
  if (y + h > height) y = height - h - 8;

  // --- Draw Background ---
  fill(8, 12, 24, 230);
  stroke(0, 180, 255, 150);
  strokeWeight(1);
  rect(x, y, w, h, 6);

  // --- Draw Title ---
  noStroke();
  fill(0, 200, 255);
  textSize(14);
  text(name, x + padding, y + 14);

  // --- Draw Description (single line) ---
  fill(180, 220, 255);
  textSize(12);
  text(desc, x + padding, y + 32);
}

// ============================================================
//  塔升级面板
// ============================================================
function drawTowerPanel() {
  if (!selectedTower) return;
  const t = selectedTower;
  const panelW = 178, panelH = 158;
  let px = constrain(t.px+35, 0, width-panelW-4);
  let py = constrain(t.py-30, HUD_HEIGHT+4, height-panelH-4);

  fill(5,10,22,225); stroke(0,180,255,160); strokeWeight(1.2);
  rect(px, py, panelW, panelH, 4);

  const def = TOWER_DEFS[t.type], [r,g,b] = t.col, isMaxed = t.level >= 3;

  fill(r,g,b,220); noStroke(); textFont('monospace'); textSize(10);
  text(def.name + '  Lv.' + t.level + (isMaxed?' ★MAX':''), px+8, py+16);
  stroke(0,140,220,100); strokeWeight(1); line(px+6,py+22,px+panelW-6,py+22);

  fill(180,220,255,200); noStroke(); textSize(9);
  text('ATK  '+t.dmg, px+10, py+36);
  text('RNG  '+t.range, px+10, py+50);
  if (t.type==='magnet') {
    text('减速  最高-'+[50,65,80][t.level-1]+'%', px+10, py+64);
  } else {
    text('SPD  '+Math.round(60/t.fireRate*10)/10+'/s', px+10, py+64);
  }

  let specialY = py+78;
  const specials = {
    laser:   ['◆ 多目标锁定 ×'+t.level,        [0,255,150,210]],
    chain:   ['◆ 跳链 ×'+t.level+'次  衰减×0.72',[100,200,255,210]],
    magnet:  ['◆ 无伤害  范围减速辅助',           [140,100,255,210]],
    ghost:   ['◆ 追踪导弹 ×'+t.level+'枚  爆炸', [200,100,255,210]],
    scatter: ['◆ 对空扇射 ×'+[3,5,7][t.level-1]+'弹',[255,80,120,210]],
    nova:    ['◆ 穿透直线+落点爆炸',              [255,160,50,210]],
  };
  if (specials[t.type]) {
    const [label, col] = specials[t.type];
    fill(...col); noStroke(); textSize(9); text(label, px+10, specialY); specialY += 14;
  }
  // 大炮需要两行说明，单独处理
  if (t.type === 'cannon') {
    const br = TOWER_DEFS.cannon.cannonBlastRadius[t.level-1];
    fill(255,80,80,210); noStroke(); textSize(9);
    text('◆ 全图轨道炮  空陆两用', px+10, specialY); specialY += 14;
    fill(255,140,60,200); noStroke(); textSize(9);
    text('◆ 爆炸半径 '+br+'  优先打空中', px+10, specialY); specialY += 14;
  }

  if (!isMaxed) {
    const canUpg = coins >= t.upgradeCost;
    fill(canUpg?color(0,150,75,200):color(55,55,55,180));
    stroke(canUpg?color(0,210,95,200):color(95,95,95,120)); strokeWeight(1);
    rect(px+8, specialY, panelW-16, 24, 3);
    fill(canUpg?color(175,255,195,230):color(135,135,135,180));
    noStroke(); textSize(9); textAlign(CENTER,CENTER);
    text('升级至 Lv.'+(t.level+1)+'  ¥'+t.upgradeCost, px+panelW/2, specialY+12);
    textAlign(LEFT,BASELINE);
    t._btnRect = { x:px+8, y:specialY, w:panelW-16, h:24 };
  } else {
    fill(255,200,50,155); noStroke(); textSize(9); textAlign(CENTER,CENTER);
    text('★ 已达满级 MAX', px+panelW/2, specialY+8);
    textAlign(LEFT,BASELINE); t._btnRect = null;
  }

  const delBtnY = py+panelH-34;
  fill(75,18,18,200); stroke(195,55,55,175); strokeWeight(1);
  rect(px+8, delBtnY, panelW-16, 22, 3);
  fill(255,100,100,230); noStroke(); textSize(9); textAlign(CENTER,CENTER);
  text('拆除  退还 ¥'+Math.floor(TOWER_DEFS[t.type].cost*0.8), px+panelW/2, delBtnY+11);
  textAlign(LEFT,BASELINE);
  t._delRect = { x:px+8, y:delBtnY, w:panelW-16, h:22 };

  fill(95,135,175,125); noStroke(); textSize(8); textAlign(CENTER,CENTER);
  text('[ 点击其他处关闭 ]', px+panelW/2, py+panelH-7);
  textAlign(LEFT,BASELINE);
}

// ============================================================
//  放置预览
// ============================================================
function drawPlacementPreview() {
  if (!selectedTowerType) return;
  const gx = Math.floor(mouseX/CELL_SIZE), gy = Math.floor(mouseY/CELL_SIZE);
  const canBuild = isCellBuildable(gx, gy), canAfford = coins >= TOWER_DEFS[selectedTowerType].cost;
  const ok = canBuild && canAfford;
  const px = gx*CELL_SIZE, py = gy*CELL_SIZE;
  const def = TOWER_DEFS[selectedTowerType], [r,g,b] = def.color;

  noFill(); stroke(ok?color(0,255,120,200):color(255,60,60,200)); strokeWeight(2);
  rect(px+2, py+2, CELL_SIZE-4, CELL_SIZE-4, 3);
  fill(ok?color(0,255,120,30):color(255,60,60,30)); noStroke();
  rect(px+2, py+2, CELL_SIZE-4, CELL_SIZE-4, 3);
  fill(r,g,b,ok?120:60); noStroke();
  ellipse(px+CELL_SIZE/2, py+CELL_SIZE/2, CELL_SIZE*0.55, CELL_SIZE*0.55);
  noFill(); stroke(r,g,b,ok?50:25); strokeWeight(1);
  ellipse(px+CELL_SIZE/2, py+CELL_SIZE/2, def.range*2, def.range*2);

  if (!canAfford || !canBuild) {
    fill(255,80,80,220); noStroke(); textFont('monospace'); textSize(9);
    textAlign(CENTER,CENTER);
    text(canAfford?'无法建造':'金币不足', px+CELL_SIZE/2, py+CELL_SIZE+10);
    textAlign(LEFT,BASELINE);
  }
}

// ============================================================
//  点击事件处理（返回 true = 已消费）
// ============================================================
// 加农炮瞄准模式
let _mortarAiming = false; // 是否在瞄准状态
let _mortarTower  = null;  // 当前瞄准的防空塔

function handlePlacementClick(mx, my) {
  const btnW=86, spacing=5;
  const types=['rapid','laser','nova','chain','magnet','ghost','scatter','cannon'];

  if (my >= BUILD_BTN_Y && my < BUILD_BTN_Y+48) {
    // 点击菜单时取消瞄准
    _mortarAiming = false; _mortarTower = null;
    for (let i=0; i<types.length; i++) {
      const bx=6+i*(btnW+spacing);
      if (mx>=bx && mx<bx+btnW) {
        selectedTowerType = (selectedTowerType===types[i]) ? null : types[i];
        if (selectedTowerType) selectedTower = null;
        return true;
      }
    }
    const cancelX=6+types.length*(btnW+spacing);
    if (selectedTowerType && mx>=cancelX && mx<cancelX+44) { selectedTowerType=null; return true; }
    return true;
  }

  // 瞄准模式：点击地图发射炮弹
  if (_mortarAiming && _mortarTower) {
    if (my > HUD_HEIGHT) {
      _mortarTower.fireMortar(mx, my);
      _mortarAiming = false;
      _mortarTower  = null;
    }
    return true;
  }

  if (selectedTower?._btnRect) {
    const b=selectedTower._btnRect;
    if (mx>=b.x&&mx<b.x+b.w&&my>=b.y&&my<b.y+b.h) { selectedTower.upgrade(); return true; }
  }
  if (selectedTower?._delRect) {
    const d=selectedTower._delRect;
    if (mx>=d.x&&mx<d.x+d.w&&my>=d.y&&my<d.y+d.h) {
      demolishTower(selectedTower); selectedTower=null; return true;
    }
  }

  // 点击防空塔且炮弹就绪，进入瞄准模式
  const clicked=towers.find(t=>dist(mx,my,t.px,t.py)<CELL_SIZE*0.45);
  if (clicked) {
    if (clicked.type === 'scatter' && clicked.mortarReady) {
      _mortarAiming = true;
      _mortarTower  = clicked;
      selectedTower = clicked;
      selectedTowerType = null;
      return true;
    }
    // 点击充能就绪的快速塔，激活超级机枪模式
    if (clicked.type === 'rapid' && clicked.rapidReady) {
      clicked.activateOverdrive();
      selectedTower = clicked;
      selectedTowerType = null;
      return true;
    }
    selectedTower = selectedTower===clicked ? null : clicked;
    if (selectedTower) selectedTowerType=null;
    return true;
  }

  if (selectedTowerType) {
    const gx=Math.floor(mx/CELL_SIZE), gy=Math.floor(my/CELL_SIZE);
    if (isCellBuildable(gx,gy) && coins>=TOWER_DEFS[selectedTowerType].cost) {
      coins -= TOWER_DEFS[selectedTowerType].cost;
      towers.push(new Tower(gx,gy,selectedTowerType));
      selectedTowerType=null;
    } else if (my>HUD_HEIGHT) { selectedTower=null; }
    return true;
  }

  if (selectedTower) { selectedTower=null; return true; }
  return false;
}

// ============================================================
//  主绘制入口 & 初始化
// ============================================================
function drawUI() {
  drawBuildMenu();
  drawTowerHoverTooltip();
  drawPlacementPreview();
  // 加农炮瞄准准星（显示缩小，不影响实际攻击范围）
  if (_mortarAiming && _mortarTower) {
    const radii = [90, 115, 145];
    const actualRadius = radii[_mortarTower.level-1]; // 实际攻击范围不变
    const displayRadius = 28; // 准星显示尺寸缩小
    const pulse = sin(frameCount*0.18)*0.4+0.6;
    // 小准星圆圈
    noFill(); stroke(255,180,30,150*pulse); strokeWeight(1.5);
    ellipse(mouseX, mouseY, displayRadius*2, displayRadius*2);
    // 十字准星
    stroke(255,200,50,180*pulse); strokeWeight(1.2);
    const arm = displayRadius + 8;
    line(mouseX-arm, mouseY, mouseX-displayRadius-2, mouseY);
    line(mouseX+displayRadius+2, mouseY, mouseX+arm, mouseY);
    line(mouseX, mouseY-arm, mouseX, mouseY-displayRadius-2);
    line(mouseX, mouseY+displayRadius+2, mouseX, mouseY+arm);
    // 中心点
    noStroke(); fill(255,220,50,200*pulse);
    ellipse(mouseX, mouseY, 4, 4);
    // 提示文字
    fill(255,220,60,220); noStroke(); textFont('monospace'); textSize(10);
    textAlign(CENTER, CENTER);
    text('点击发射炮弹', mouseX, mouseY - arm - 10);
    textAlign(LEFT, BASELINE);
  }
  drawTowerPanel();
  drawClickEffects();
  drawScanlines();
  drawWaveUI();
  drawHUD();
}

function initUI() {
  selectedTowerType   = null;
  selectedTower       = null;
  clickEffects        = [];
  BUILD_BTN_Y         = HUD_HEIGHT + 2;
  _mortarAiming       = false;
  _mortarTower        = null;
  waveEndPanelVisible = false;
  waveEndBtnRect      = null;
}
