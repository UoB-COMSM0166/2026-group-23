// ── 地图尺寸 ──
const CELL_SIZE  = 70;
const GRID_COLS  = 14;
const GRID_ROWS  = 12;
const HUD_HEIGHT = 46;

// ── 游戏阶段 ──
// 'launch' → 'difficulty' → 'levelmap' → 'playing' → 'endpanel'
let gamePhase = 'launch';

// ── 难度系统 ──
let gameDifficulty = null;

// ── 关卡系统 ──
let currentLevel  = 1;
let unlockedLevel = 1;
let levelResults  = {};   // { 1: 'win'|'lose', ... }

// ── 游戏核心数值 ──
let coins     = 2000;
let baseHp    = 50;
let baseHpMax = 50;
let waveNum   = 0;

// ── 波次系统 ──
let TOTAL_WAVES        = 6;
let waveState          = 'waiting';
let waveCountdownEnd   = 0;
const COUNTDOWN_FRAMES = 300;

// ── 干扰系统 ──
let jammedUntilFrame = 0;
let jamPos = { x: 0, y: 0 };

// ── 核心管理器与路径 ──
let manager      = null;
let MAIN_PATH_PX = null;
let EDGE_PATH_PX = null;
let AIR_PATH_PX  = null;
let homeTowers   = [];

// ── 启动/地图画面辅助 ──
let launchAnim    = 0;
let levelMapAnim  = 0;
let launchReady   = false;
let launchParticles = [];
let levelHovered  = 0;
let endPanelAnim  = 0;
let _gameEndFired = false;
let _endPanelWon  = false;

// ============================================================
//  p5 setup
// ============================================================
function setup() {
  createCanvas(GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE);
  textFont('monospace');
  for (let i = 0; i < 90; i++) {
    launchParticles.push({
      x: random(width), y: random(height),
      vx: random(-0.35, 0.35), vy: random(-0.7, -0.1),
      size: random(1, 3.5), life: random(0.3, 1.0),
      col: random() > 0.5 ? [0, 200, 255] : [110, 70, 255],
    });
  }
}

// ============================================================
//  p5 draw — 统一入口
// ============================================================
function draw() {
  if (gamePhase === 'launch')     { drawLaunchScreen(); return; }
  if (gamePhase === 'difficulty') { drawDifficultySelect(); return; }
  if (gamePhase === 'levelmap')   { drawLevelMap(); return; }

  if (gamePhase === 'endpanel') {
    endPanelAnim++;
    drawBackground(); drawPaths();
    for (const ht of homeTowers) ht.draw();
    drawEndPanel();
    return;
  }

  if (gamePhase === 'playing') {
    drawBackground(); drawPaths();
    updateWaveSystem();
    manager.update();
    updateAndDrawTowers();
    for (const ht of homeTowers) { ht.update(); ht.draw(); }
    updateParticles();
    updateMinigame(); drawMinigame();
    drawUI();
    if (waveState === 'complete' && manager.monsters.length === 0 && !_gameEndFired) {
      _gameEndFired = true;
      setTimeout(() => handleGameEnd(true), 1800);
    }
  }
}

// ============================================================
//  p5 mousePressed
// ============================================================
function mousePressed() {
  if (gamePhase === 'launch') {
    if (launchReady) { gamePhase = 'difficulty'; }
    return;
  }
  if (gamePhase === 'difficulty') { handleDifficultyClick(mouseX, mouseY); return; }
  if (gamePhase === 'levelmap')   { handleLevelMapClick(mouseX, mouseY);   return; }
  if (gamePhase === 'endpanel')   { handleEndPanelClick(mouseX, mouseY);   return; }
  if (gamePhase === 'playing') {
    if (minigameState !== 'idle') { handleMinigameClick(mouseX, mouseY); return; }
    const consumed = handlePlacementClick(mouseX, mouseY);
    if (!consumed) clickEffects.push({ x: mouseX, y: mouseY, life: 1.0 });
  }
}

function mouseMoved() {
  if (minigameState !== 'idle') handleMinigameMove(mouseX, mouseY);
}

// ============================================================
//  initGame — 按关卡初始化
// ============================================================
function initGame() {
  initMap();   // map.js: 根据 currentLevel 选路径

  const lcfg = LEVEL_INFO[currentLevel];
  coins     = Math.floor(gameDifficulty === 'easy' ? lcfg.startCoins * 1.3 : lcfg.startCoins);
  baseHpMax = gameDifficulty === 'easy' ? 60 : 50;
  baseHp    = baseHpMax;
  TOTAL_WAVES = WAVE_CONFIGS[currentLevel].length;

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
}

function handleGameEnd(won) {
  levelResults[currentLevel] = won ? 'win' : 'lose';
  if (won && currentLevel >= unlockedLevel) unlockedLevel = Math.min(5, currentLevel + 1);
  endPanelAnim  = 0;
  _endPanelWon  = won;
  gamePhase     = 'endpanel';
}

// ============================================================
//  LAUNCH SCREEN
// ============================================================
function drawLaunchScreen() {
  launchAnim++;
  background(2, 4, 14);

  // 流动粒子星空
  noStroke();
  for (const p of launchParticles) {
    p.x += p.vx; p.y += p.vy; p.life -= 0.0025;
    if (p.life <= 0 || p.y < -10) {
      p.x = random(width); p.y = height + 5;
      p.life = random(0.4, 1.0);
      p.vx = random(-0.35, 0.35); p.vy = random(-0.7, -0.12);
    }
    fill(p.col[0], p.col[1], p.col[2], p.life * 190);
    ellipse(p.x, p.y, p.size, p.size);
  }

  // 扫描线 & 网格
  stroke(0, 90, 160, 7); strokeWeight(1);
  for (let x = 0; x < width; x += 50) line(x, 0, x, height);
  for (let y = 0; y < height; y += 50) line(0, y, width, y);
  noStroke(); fill(0, 160, 255, 10);
  rect(0, (launchAnim * 1.4) % height, width, 2);

  textFont('monospace'); textAlign(CENTER, CENTER);
  const fadein = constrain(launchAnim / 90, 0, 1);
  const pulse  = sin(launchAnim * 0.06) * 0.25 + 0.75;

  // 顶部标签
  if (fadein > 0.2) {
    const t = constrain((fadein - 0.2) / 0.5, 0, 1);
    stroke(0, 180, 255, t * 70); strokeWeight(1);
    line(width/2 - 270*t, height/2 - 115, width/2 + 270*t, height/2 - 115);
    noStroke(); fill(0, 200, 255, t * 55); textSize(9);
    text('◈ QUANTUM DEFENSE NETWORK v5.0  |  INITIALIZED ◈', width/2, height/2 - 128);
  }

  // 主标题双行
  if (fadein > 0.1) {
    const t = constrain((fadein - 0.1) / 0.55, 0, 1);
    noStroke();
    fill(0, 200, 255, t * 35 * pulse); textSize(70);
    text('QUANTUM', width/2, height/2 - 68);
    text('DROP', width/2, height/2 - 2);
    fill(0, 225, 255, t * 235 * pulse); textSize(66);
    text('QUANTUM', width/2, height/2 - 70);
    fill(130, 75, 255, t * 225 * pulse);
    text('DROP', width/2, height/2 - 4);
  }

  // 副标题
  if (fadein > 0.55) {
    const t = constrain((fadein-0.55)/0.4, 0, 1);
    noStroke(); fill(160, 200, 240, t*175); textSize(12);
    text('数字塔防 — 守护量子基地', width/2, height/2+50);
  }

  // 装饰六边形
  if (fadein > 0.3) {
    const t = constrain((fadein-0.3)/0.5, 0, 1);
    const hx = sin(launchAnim*0.035)*3;
    push(); translate(width/2, height/2+50);
    push(); translate(-215*t, 0);
    stroke(0, 200, 255, t*115); strokeWeight(1.2); noFill();
    beginShape();
    for (let k=0;k<6;k++) vertex(cos(k*PI/3)*19, sin(k*PI/3)*19);
    endShape(CLOSE);
    fill(0,200,255,t*80); noStroke(); textSize(7); text('SYS.ONLINE', 0, 0);
    pop();
    push(); translate(215*t, 0);
    stroke(130,75,255,t*115); strokeWeight(1.2); noFill();
    beginShape();
    for (let k=0;k<6;k++) vertex(cos(k*PI/3+PI/6)*19, sin(k*PI/3+PI/6)*19);
    endShape(CLOSE);
    fill(130,75,255,t*80); noStroke(); textSize(7); text('READY', 0, 0);
    pop();
    pop();
  }

  // 底部线
  if (fadein > 0.65) {
    const t = constrain((fadein-0.65)/0.3, 0, 1);
    stroke(0,180,255,t*65); strokeWeight(1);
    line(width/2-230*t, height/2+80, width/2+230*t, height/2+80);
  }

  // 点击提示
  if (launchAnim > 130) {
    launchReady = true;
    const blink = sin(launchAnim*0.12)*0.5+0.5;
    noStroke(); fill(0,200,255,blink*210); textSize(13);
    text('[ CLICK TO CONTINUE ]', width/2, height/2+110);
    fill(0,110,175,130); textSize(9);
    text('SELECT DIFFICULTY & MISSION TO BEGIN', width/2, height/2+133);
  }

  // 底栏
  noStroke(); fill(0,80,140,50); rect(0, height-22, width, 22);
  stroke(0,130,195,45); strokeWeight(1); line(0,height-22,width,height-22);
  noStroke(); fill(0,150,215,90); textSize(8); textAlign(LEFT,CENTER);
  text('QUANTUM CORE ■ STATUS: ONLINE ■ SECTORS: 5', 10, height-11);
  textAlign(RIGHT,CENTER);
  text('FRAME:'+nf(launchAnim,5)+'  ■  SEC-LVL: ALPHA', width-10, height-11);
  textAlign(LEFT,BASELINE);
}

// ============================================================
//  LEVEL MAP
// ============================================================
const LEVEL_INFO = {
  1:{ name:'SECTOR ALPHA',  subtitle:'新兵训练区', desc:'入门关卡，路径简洁，单路步兵为主。',   threat:1, color:[0,220,140],  startCoins:2000, icon:'①' },
  2:{ name:'NEBULA RIFT',   subtitle:'星云裂隙',   desc:'双路并进，飞行敌人首次出现。',        threat:2, color:[0,180,255],  startCoins:1800, icon:'②' },
  3:{ name:'IRON CITADEL',  subtitle:'钢铁要塞',   desc:'复杂地形，重装甲怪物与Boss登场。',    threat:3, color:[255,160,40], startCoins:1600, icon:'③' },
  4:{ name:'VOID MAZE',     subtitle:'虚空迷宫',   desc:'迂回路径，高速怪物大量入侵。',        threat:4, color:[180,60,255], startCoins:1400, icon:'④' },
  5:{ name:'OMEGA GATE',    subtitle:'终极门户',   desc:'终极关卡，全精英部队 + 三大Boss。',   threat:5, color:[255,60,80],  startCoins:1200, icon:'⑤' },
};

const LEVEL_NODES = [
  { x:0.11, y:0.72 }, { x:0.29, y:0.40 },
  { x:0.50, y:0.64 }, { x:0.71, y:0.33 }, { x:0.89, y:0.58 },
];

function drawLevelMap() {
  levelMapAnim++;
  background(3, 6, 18);

  noStroke();
  for (const p of launchParticles) {
    p.x += p.vx*0.25; p.y += p.vy*0.25;
    if (p.y < -10) { p.x = random(width); p.y = height; p.life = random(0.5,1); }
    fill(p.col[0],p.col[1],p.col[2], p.life*120);
    ellipse(p.x, p.y, p.size*0.65, p.size*0.65);
  }
  stroke(0,75,135,8); strokeWeight(1);
  for (let x=0;x<width;x+=60) line(x,0,x,height);
  for (let y=0;y<height;y+=60) line(0,y,width,y);

  // 标题
  textFont('monospace'); textAlign(CENTER,CENTER);
  const pulse = sin(levelMapAnim*0.05)*0.2+0.8;
  noStroke(); fill(0,200,255,220*pulse); textSize(20);
  text('— MISSION SELECT —', width/2, 30);
  fill(0,140,200,150); textSize(9);
  text('DIFFICULTY: '+(gameDifficulty?gameDifficulty.toUpperCase():'---'), width/2, 52);

  // 连线
  for (let i=0; i<LEVEL_NODES.length-1; i++) {
    const a=LEVEL_NODES[i], b=LEVEL_NODES[i+1];
    const ax=a.x*width, ay=a.y*(height-100)+70;
    const bx=b.x*width, by=b.y*(height-100)+70;
    const unlocked=(i+2)<=unlockedLevel;
    stroke(unlocked?color(0,180,255,75):color(55,75,100,55));
    strokeWeight(unlocked?2.2:1.2); noFill();
    const steps=18;
    for (let s=0;s<steps;s+=2)
      line(lerp(ax,bx,s/steps),lerp(ay,by,s/steps),lerp(ax,bx,(s+1)/steps),lerp(ay,by,(s+1)/steps));
    if (unlocked) {
      const ft=(levelMapAnim*0.016+i*0.3)%1;
      noStroke(); fill(0,215,255,190);
      ellipse(lerp(ax,bx,ft),lerp(ay,by,ft),5,5);
    }
  }

  // 节点
  levelHovered = 0;
  for (let i=0;i<5;i++) {
    const lv=i+1;
    const nd=LEVEL_NODES[i];
    const nx=nd.x*width, ny=nd.y*(height-100)+70;
    const info=LEVEL_INFO[lv];
    const [r,g,b]=info.color;
    const locked=lv>unlockedLevel;
    const result=levelResults[lv];
    const hov=!locked && Math.hypot(mouseX-nx,mouseY-ny)<38;
    if (hov) levelHovered=lv;

    if (!locked) {
      noStroke(); fill(r,g,b,hov?38:12); ellipse(nx,ny,100,100);
      fill(r,g,b,hov?18:6); ellipse(nx,ny,145,145);
    }
    const rr=36+(hov?sin(levelMapAnim*0.13)*3:0);
    strokeWeight(hov?2.5:1.8);
    stroke(locked?color(48,60,80,140):color(r,g,b,hov?230:145));
    noFill();
    beginShape();
    for (let k=0;k<6;k++) vertex(nx+cos(k*PI/3+levelMapAnim*0.007)*rr, ny+sin(k*PI/3+levelMapAnim*0.007)*rr);
    endShape(CLOSE);
    if (!locked) {
      strokeWeight(1); stroke(r,g,b,55);
      beginShape();
      for (let k=0;k<6;k++) vertex(nx+cos(k*PI/3-levelMapAnim*0.014)*(rr*0.72), ny+sin(k*PI/3-levelMapAnim*0.014)*(rr*0.72));
      endShape(CLOSE);
    }
    noStroke();
    fill(locked?color(7,11,20,200):color(r*0.14,g*0.14,b*0.14,200));
    beginShape();
    for (let k=0;k<6;k++) vertex(nx+cos(k*PI/3)*rr, ny+sin(k*PI/3)*rr);
    endShape(CLOSE);

    textAlign(CENTER,CENTER);
    if (locked)           { fill(75,95,130,175); textSize(20); text('🔒', nx, ny); }
    else if (result==='win')  { fill(0,255,140,220); textSize(22); text('★', nx, ny); }
    else if (result==='lose') { fill(255,80,80,200); textSize(22); text('✕', nx, ny); }
    else                  { fill(r,g,b,hov?255:200); textSize(20); text(info.icon, nx, ny); }

    const ny2=ny+52;
    fill(locked?color(58,76,108,145):color(r,g,b,hov?240:185));
    textSize(hov?11:10); text(info.name, nx, ny2);
    fill(locked?color(48,62,88,115):color(200,218,238,hov?175:125));
    textSize(8); text(info.subtitle, nx, ny2+15);
    if (!locked) {
      fill(r,g,b,120); textSize(7);
      text('THREAT '+'█'.repeat(info.threat)+'░'.repeat(5-info.threat), nx, ny2+28);
    }
  }

  // 悬浮信息卡
  if (levelHovered>0) {
    const info=LEVEL_INFO[levelHovered];
    const [r,g,b]=info.color;
    const px=width-215, py2=height/2-95, pw=200, ph=185;
    fill(4,8,22,220); stroke(r,g,b,145); strokeWeight(1.5);
    rect(px,py2,pw,ph,6);
    noStroke(); fill(r,g,b,190); textSize(13); textAlign(CENTER,CENTER);
    text(info.name, px+pw/2, py2+20);
    fill(r,g,b,125); textSize(9); text(info.subtitle, px+pw/2, py2+36);
    stroke(r,g,b,55); strokeWeight(1); line(px+10,py2+48,px+pw-10,py2+48);
    noStroke(); fill(178,208,238,185); textSize(9); textAlign(LEFT,CENTER);
    text(info.desc, px+12, py2+64, pw-22, 40);
    fill(r,g,b,135); textSize(8);
    const wc=WAVE_CONFIGS[levelHovered]?WAVE_CONFIGS[levelHovered].length:'?';
    text('◈ WAVES: '+wc, px+12, py2+110);
    text('◈ THREAT: '+info.threat+' / 5', px+12, py2+124);
    const cs=gameDifficulty==='easy'?Math.floor(info.startCoins*1.3):info.startCoins;
    text('◈ START ¥: '+cs, px+12, py2+138);
    const btnY=py2+ph-42;
    fill(r*0.55,g*0.55,b*0.55,195); stroke(r,g,b,190); strokeWeight(1.2);
    rect(px+12, btnY, pw-24, 28, 5);
    noStroke(); fill(255,255,255,225); textSize(12); textAlign(CENTER,CENTER);
    text('▶ START MISSION', px+pw/2, btnY+14);
  }

  // 返回按钮
  const bkH=mouseX<92&&mouseY<38;
  fill(bkH?color(0,45,75,220):color(5,10,24,200));
  stroke(0,160,215,bkH?200:95); strokeWeight(1);
  rect(6,6,82,26,4);
  noStroke(); fill(0,200,255,bkH?240:175); textSize(10); textAlign(CENTER,CENTER);
  text('◀ BACK',47,19);
  textAlign(LEFT,BASELINE);
}

function handleLevelMapClick(mx,my) {
  if (mx<92&&my<38) { gamePhase='difficulty'; return; }
  for (let i=0;i<5;i++) {
    const lv=i+1;
    if (lv>unlockedLevel) continue;
    const nd=LEVEL_NODES[i];
    const nx=nd.x*width, ny=nd.y*(height-100)+70;
    if (Math.hypot(mx-nx,my-ny)<38) {
      currentLevel=lv; gamePhase='playing'; _gameEndFired=false; initGame(); return;
    }
  }
  if (levelHovered>0) {
    const info=LEVEL_INFO[levelHovered];
    const pw=200, ph=185, px=width-215, py2=height/2-95;
    const btnY=py2+ph-42;
    if (mx>=px+12&&mx<=px+pw-12&&my>=btnY&&my<=btnY+28) {
      currentLevel=levelHovered; gamePhase='playing'; _gameEndFired=false; initGame();
    }
  }
}

// ============================================================
//  END PANEL
// ============================================================
function drawEndPanel() {
  noStroke(); fill(0,0,0,165); rect(0,0,width,height);
  const won=_endPanelWon;
  const t=constrain(endPanelAnim/40,0,1);
  const pw=388, ph=285;
  const px=(width-pw)/2, py=(height-ph)/2;
  const [r,g,b]=won?[0,220,140]:[255,60,60];
  const pulse=sin(endPanelAnim*0.08)*0.2+0.8;

  fill(4,8,22,230*t); stroke(r,g,b,180*t); strokeWeight(2);
  rect(px,py,pw,ph,10);
  noStroke(); fill(r,g,b,160*t); rect(px,py,pw,6,10,10,0,0);

  textFont('monospace'); textAlign(CENTER,CENTER);
  fill(r,g,b,240*t*pulse); textSize(28);
  text(won?'MISSION COMPLETE':'MISSION FAILED', px+pw/2, py+46);
  fill(r,g,b,145*t); textSize(11);
  text(won?'量子基地成功守卫':'基地已被攻陷，重新部署', px+pw/2, py+72);

  stroke(r,g,b,60*t); strokeWeight(1); line(px+20,py+88,px+pw-20,py+88);
  noStroke(); fill(178,210,240,200*t); textSize(10);
  const lname=LEVEL_INFO[currentLevel]?LEVEL_INFO[currentLevel].name:'-';
  text('关卡: '+lname, px+pw/2, py+108);
  text('剩余金币: ¥'+coins, px+pw/2, py+124);
  text('基地HP: '+baseHp+' / '+baseHpMax, px+pw/2, py+140);
  text('完成波次: '+waveNum+' / '+TOTAL_WAVES, px+pw/2, py+156);

  const b1y=py+ph-70, b2y=py+ph-36;
  const h1=mouseX>=px+20&&mouseX<=px+pw/2-10&&mouseY>=b1y&&mouseY<=b1y+26;
  fill(h1?color(r*0.5,g*0.5,b*0.5,220):color(20,35,60,200));
  stroke(r,g,b,h1?200:115); strokeWeight(1); rect(px+20,b1y,pw/2-30,26,5);
  noStroke(); fill(255,255,255,220*t); textSize(11);
  text('↺ RETRY', px+20+(pw/2-30)/2, b1y+13);

  const h2=mouseX>=px+pw/2+10&&mouseX<=px+pw-20&&mouseY>=b1y&&mouseY<=b1y+26;
  fill(h2?color(20,75,115,220):color(10,20,40,200));
  stroke(0,180,255,h2?200:115); strokeWeight(1); rect(px+pw/2+10,b1y,pw/2-30,26,5);
  noStroke(); fill(0,200,255,220*t); textSize(11);
  text('⊞ STAGES', px+pw/2+10+(pw/2-30)/2, b1y+13);

  if (won&&currentLevel<5) {
    const h3=mouseX>=px+20&&mouseX<=px+pw-20&&mouseY>=b2y&&mouseY<=b2y+26;
    fill(h3?color(0,135,75,230):color(0,55,32,200));
    stroke(0,220,130,h3?220:135); strokeWeight(1.5); rect(px+20,b2y,pw-40,26,5);
    noStroke(); fill(0,255,148,230*t*pulse); textSize(12);
    const nn=LEVEL_INFO[currentLevel+1]?LEVEL_INFO[currentLevel+1].name:'';
    text('▶▶ NEXT: '+nn, px+pw/2, b2y+13);
  }
}

function handleEndPanelClick(mx,my) {
  const pw=388, ph=285, px=(width-pw)/2, py=(height-ph)/2;
  const b1y=py+ph-70, b2y=py+ph-36;
  if (mx>=px+20&&mx<=px+pw/2-10&&my>=b1y&&my<=b1y+26) {
    endPanelAnim=0; _gameEndFired=false; gamePhase='playing'; initGame(); return;
  }
  if (mx>=px+pw/2+10&&mx<=px+pw-20&&my>=b1y&&my<=b1y+26) {
    endPanelAnim=0; gamePhase='levelmap'; return;
  }
  if (_endPanelWon&&currentLevel<5) {
    if (mx>=px+20&&mx<=px+pw-20&&my>=b2y&&my<=b2y+26) {
      endPanelAnim=0; currentLevel++; _gameEndFired=false; gamePhase='playing'; initGame(); return;
    }
  }
}
