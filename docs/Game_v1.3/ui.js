// ============================================================
//  ui.js — 所有UI界面
//  负责人：李卓伦（金币/血条显示、按钮、塔升级界面、数值平衡）
//  刘博文贡献：建造菜单、塔升级面板、放置预览
//  依赖：globals.js, map.js, towers.js
// ============================================================

// ============================================================
//  难度选择界面
// ============================================================
function drawDifficultySelect() {
  background(4, 7, 18);
  // 网格背景
  stroke(0, 150, 220, 10); strokeWeight(1);
  for (let x = 0; x < width; x += 50) line(x, 0, x, height);
  for (let y = 0; y < height; y += 50) line(0, y, width, y);

  textFont('monospace'); textAlign(CENTER, CENTER);

  // 标题
  const pulse = sin(frameCount * 0.07) * 0.3 + 0.7;
  noStroke();
  fill(0, 200, 255, 220 * pulse); textSize(28);
  text('Quantum Drop', width / 2, height / 2 - 155);
  fill(0, 140, 200, 160 * pulse); textSize(11);
  text('SELECT DIFFICULTY', width / 2, height / 2 - 118);

  // 分割线
  stroke(0, 180, 255, 60); strokeWeight(1);
  line(width / 2 - 200, height / 2 - 105, width / 2 + 200, height / 2 - 105);

  // ── EASY 卡片 ──
  const eX = width / 2 - 210, eY = height / 2 - 90, eW = 190, eH = 240;
  _drawDiffCard(eX, eY, eW, eH,
    [0, 220, 120],
    'EASY',
    '简单模式',
    [
      '× 门倍率提升',
      '更多高倍率机会',
      '-门数值正常',
      '推荐初学者',
    ]
  );

  // ── DIFFICULT 卡片 ──
  const dX = width / 2 + 20, dY = height / 2 - 90, dW = 190, dH = 240;
  _drawDiffCard(dX, dY, dW, dH,
    [255, 100, 40],
    'DIFFICULT',
    '困难模式',
    [
      '× 门倍率正常',
      '-门扣除数值↑↑',
      '生存压力倍增',
      '挑战高手专属',
    ]
  );

  // 底部提示
  noStroke(); fill(0, 140, 200, 120 * pulse); textSize(10);
  text('choose a difficulty level to start the game', width / 2, height / 2 + 175);
  textAlign(LEFT, BASELINE);
}

function _drawDiffCard(x, y, w, h, col, title, subtitle, lines) {
  const [r, g, b] = col;
  const mx = mouseX, my = mouseY;
  const hovered = mx >= x && mx <= x + w && my >= y && my <= y + h;

  // 外发光
  noStroke();
  fill(r, g, b, hovered ? 22 : 10);
  rect(x - 8, y - 8, w + 16, h + 16, 18);

  // 背景
  fill(hovered ? color(r*0.25, g*0.25, b*0.25, 230) : color(8, 14, 28, 215));
  stroke(r, g, b, hovered ? 200 : 90); strokeWeight(hovered ? 2 : 1.2);
  rect(x, y, w, h, 12);

  // 顶部色条
  noStroke(); fill(r, g, b, hovered ? 200 : 140);
  rect(x, y, w, 6, 12, 12, 0, 0);

  // 标题
  fill(r, g, b, 230); textSize(20); textAlign(CENTER, CENTER);
  text(title, x + w / 2, y + 32);

  // 副标题
  fill(r, g, b, 150); textSize(10);
  text(subtitle, x + w / 2, y + 54);

  // 分割线
  stroke(r, g, b, 60); strokeWeight(1);
  line(x + 16, y + 66, x + w - 16, y + 66);

  // 特性列表
  noStroke();
  for (let i = 0; i < lines.length; i++) {
    fill(200, 220, 240, 190); textSize(10); textAlign(LEFT, CENTER);
    text('◈  ' + lines[i], x + 18, y + 88 + i * 28);
  }

  // 按钮
  const btnY = y + h - 46;
  fill(r, g, b, hovered ? 200 : 120); noStroke();
  rect(x + 16, btnY, w - 32, 30, 8);
  fill(hovered ? color(255, 255, 255, 240) : color(r, g, b, 220));
  textSize(12); textAlign(CENTER, CENTER);
  text(hovered ? '▶  START' : 'SELECT', x + w / 2, btnY + 15);

  textAlign(LEFT, BASELINE);
}

function handleDifficultyClick(mx, my) {
  // EASY 区域
  const eX = width / 2 - 210, eY = height / 2 - 90, eW = 190, eH = 240;
  if (mx >= eX && mx <= eX + eW && my >= eY && my <= eY + eH) {
    gameDifficulty = 'easy';
    gamePhase      = 'playing';
    initGame();
    return;
  }
  // DIFFICULT 区域
  const dX = width / 2 + 20, dY = height / 2 - 90, dW = 190, dH = 240;
  if (mx >= dX && mx <= dX + dW && my >= dY && my <= dY + dH) {
    gameDifficulty = 'difficult';
    gamePhase      = 'playing';
    initGame();
    return;
  }
}


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
  fill(lerpColor(color(220,30,30), color(0,220,140), baseHp/baseHpMax));
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
// ui.js 核心修改部分

// ui.js

function drawBuildMenu() {
  textFont('monospace'); noStroke();
  
  // 8个塔，压缩按钮宽度以适应屏幕（14格×70=980px宽）
  const btnW = 86;
  const spacing = 5;
  const menuWidth = 8 * (btnW + spacing) + 4;
  
  // 背景板
  fill(5, 10, 22, 220); stroke(0, 130, 200, 120); strokeWeight(1.5);
  rect(0, BUILD_BTN_Y, menuWidth, 48, 0, 0, 6, 0);

  const types = ['rapid', 'laser', 'nova', 'chain', 'magnet', 'ghost', 'scatter', 'cannon'];
  const displayNames = {
    rapid:   'RAPID',
    laser:   'LASER',
    nova:    'NOVA',
    chain:   'CHAIN',
    magnet:  'MAGNET',
    ghost:   'GHOST',
    scatter: 'AA-FAN',
    cannon:  'CANNON',
  };

  for (let i = 0; i < types.length; i++) {
    const type = types[i], def = TOWER_DEFS[type];
    const [r, g, b] = def.color;
    const bx = 6 + i * (btnW + spacing), by = BUILD_BTN_Y + 6;
    const bw = btnW, bh = 36;
    
    const selected = selectedTowerType === type;
    const canAfford = coins >= def.cost;

    // 按钮样式
    if (selected) { 
      fill(r, g, b, 80); stroke(r, g, b, 255); strokeWeight(2); 
    } else if (!canAfford) { 
      fill(15, 15, 25, 150); stroke(60, 60, 70, 100); strokeWeight(1); 
    } else { 
      fill(10, 20, 40, 200); stroke(r, g, b, 120); strokeWeight(1); 
    }
    rect(bx, by, bw, bh, 4);

    // 塔名与价格
    noStroke();
    fill(canAfford ? color(r, g, b) : color(120)); 
    textSize(10); textAlign(LEFT, TOP);
    text(displayNames[type], bx + 8, by + 6);
    
    fill(canAfford ? color(255, 215, 0) : color(150, 80, 80)); 
    textSize(9); textAlign(LEFT, BOTTOM);
    text('¥' + def.cost, bx + 8, by + 30);
    
    // 装饰色块
    fill(r, g, b, canAfford ? 200 : 80);
    rect(bx + bw - 12, by + 8, 4, 20, 1);
  }

  // 取消按钮：紧跟在最后一个塔按钮后面
  if (selectedTowerType) {
    const cancelX = 6 + types.length * (btnW + spacing);
    const by = BUILD_BTN_Y + 6;
    fill(80, 20, 20, 200); stroke(255, 60, 60, 180); strokeWeight(1.2);
    rect(cancelX, by, 44, 36, 4);
    fill(255, 100, 100); noStroke(); textAlign(CENTER, CENTER); textSize(12);
    text('✕', cancelX + 22, by + 18);
    textAlign(LEFT, BASELINE);
  }
}

// ============================================================
//  塔升级面板（刘博文）
// ============================================================
function drawTowerPanel() {
  if (!selectedTower) return;
  const t = selectedTower;
  const panelW = 178, panelH = 158;
  let px = t.px + 35, py = t.py - 30;
  px = constrain(px, 0, width-panelW-4);
  py = constrain(py, HUD_HEIGHT+4, height-panelH-4);

  fill(5,10,22,225); stroke(0,180,255,160); strokeWeight(1.2);
  rect(px, py, panelW, panelH, 4);

  const def = TOWER_DEFS[t.type];
  const [r,g,b] = t.col;
  const isMaxed = (t.level >= 3);

  fill(r,g,b,220); noStroke(); textFont('monospace'); textSize(10);
  text(def.name + '  Lv.' + t.level + (isMaxed ? ' ★MAX' : ''), px+8, py+16);

  stroke(0,140,220,100); strokeWeight(1); line(px+6,py+22,px+panelW-6,py+22);

  fill(180,220,255,200); noStroke(); textSize(9);
  text('ATK  ' + t.dmg,  px+10, py+36);
  text('RNG  ' + t.range, px+10, py+50);
  if (t.type === 'magnet') {
    const factors = [50, 65, 80];
    text('减速  最高-' + factors[t.level-1] + '%', px+10, py+64);
  } else {
    text('SPD  ' + Math.round(60/t.fireRate*10)/10 + '/s', px+10, py+64);
  }

  // 特殊属性行
  let specialY = py + 78;
  if (t.type === 'laser') {
    fill(0,255,150,210); noStroke(); textSize(9);
    text('◆ 多目标锁定 ×' + t.level, px+10, specialY); specialY += 14;
  } else if (t.type === 'chain') {
    fill(100,200,255,210); noStroke(); textSize(9);
    text('◆ 跳链 ×' + t.level + '次  衰减×0.72', px+10, specialY); specialY += 14;
  } else if (t.type === 'magnet') {
    fill(140,100,255,210); noStroke(); textSize(9);
    text('◆ 无伤害  范围减速辅助', px+10, specialY); specialY += 14;
  } else if (t.type === 'ghost') {
    fill(200,100,255,210); noStroke(); textSize(9);
    text('◆ 追踪导弹 ×' + t.level + '枚  爆炸', px+10, specialY); specialY += 14;
  } else if (t.type === 'scatter') {
    const bc=[3,5,7]; fill(255,80,120,210); noStroke(); textSize(9);
    text('◆ 对空扇射 ×' + bc[t.level-1] + '弹', px+10, specialY); specialY += 14;
  } else if (t.type === 'nova') {
    fill(255,160,50,210); noStroke(); textSize(9);
    text('◆ 穿透直线+落点爆炸', px+10, specialY); specialY += 14;
  } else if (t.type === 'cannon') {
    const def = TOWER_DEFS.cannon;
    const br = def.cannonBlastRadius[t.level-1];
    fill(255,80,80,210); noStroke(); textSize(9);
    text('◆ 全图轨道炮  空陆两用', px+10, specialY); specialY += 14;
    fill(255,140,60,200); noStroke(); textSize(9);
    text('◆ 爆炸半径 ' + br + '  优先打空中', px+10, specialY); specialY += 14;
  }

  if (!isMaxed) {
    const btnY = specialY;
    const canUpg = coins >= t.upgradeCost;
    fill(canUpg?color(0,150,75,200):color(55,55,55,180));
    stroke(canUpg?color(0,210,95,200):color(95,95,95,120)); strokeWeight(1);
    rect(px+8, btnY, panelW-16, 24, 3);
    fill(canUpg?color(175,255,195,230):color(135,135,135,180));
    noStroke(); textSize(9); textAlign(CENTER,CENTER);
    text('升级至 Lv.'+(t.level+1)+'  ¥'+t.upgradeCost, px+panelW/2, btnY+12);
    textAlign(LEFT,BASELINE);
    t._btnRect = { x:px+8, y:btnY, w:panelW-16, h:24 };
  } else {
    fill(255,200,50,155); noStroke(); textSize(9); textAlign(CENTER,CENTER);
    text('★ 已达满级 MAX', px+panelW/2, specialY+8);
    textAlign(LEFT,BASELINE);
    t._btnRect = null;
  }

  const delBtnY = py + panelH - 34;
  fill(75,18,18,200); stroke(195,55,55,175); strokeWeight(1);
  rect(px+8, delBtnY, panelW-16, 22, 3);
  fill(255,100,100,230); noStroke(); textSize(9); textAlign(CENTER,CENTER);
  const refund = Math.floor(TOWER_DEFS[t.type].cost * 0.8);
  text('拆除  退还 ¥' + refund, px+panelW/2, delBtnY+11);
  textAlign(LEFT,BASELINE);
  t._delRect = { x:px+8, y:delBtnY, w:panelW-16, h:22 };

  fill(95,135,175,125); noStroke(); textSize(8); textAlign(CENTER,CENTER);
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
  // 必须与 drawBuildMenu 中的参数完全一致
  const btnW   = 86;
  const spacing = 5;
  const types  = ['rapid', 'laser', 'nova', 'chain', 'magnet', 'ghost', 'scatter', 'cannon'];

  // 建造菜单区域
  if (my >= BUILD_BTN_Y && my < BUILD_BTN_Y + 48) {
    // 7个塔按钮
    for (let i = 0; i < types.length; i++) {
      const bx = 6 + i * (btnW + spacing);
      if (mx >= bx && mx < bx + btnW) {
        selectedTowerType = (selectedTowerType === types[i]) ? null : types[i];
        if (selectedTowerType) selectedTower = null;
        return true;
      }
    }
    // 取消按钮：紧跟在第7个塔后面
    const cancelX = 6 + types.length * (btnW + spacing);
    if (selectedTowerType && mx >= cancelX && mx < cancelX + 44) {
      selectedTowerType = null;
      return true;
    }
    return true; // 点击菜单空白处也拦截
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