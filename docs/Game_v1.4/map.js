// ============================================================
//  map.js — 5关卡路径定义、背景绘制、格子判定
// ============================================================

// ============================================================
//  各关卡路径配置
// ============================================================
const LEVEL_PATHS = {
  // 关卡1：SECTOR ALPHA — 简洁单路，入门
  1: {
    MAIN: [ {x:0,y:5},{x:3,y:5},{x:3,y:9},{x:7,y:9},{x:7,y:3},{x:11,y:3},{x:11,y:8},{x:13,y:8} ],
    EDGE: [ {x:0,y:2},{x:5,y:2},{x:5,y:6},{x:9,y:6},{x:9,y:10},{x:13,y:10} ],
    AIR:  [ {x:0,y:8},{x:5,y:4},{x:10,y:1},{x:13,y:8} ],
    theme: { bg:[6,10,18], grid:[0,160,220], path1:[0,200,255], path2:[140,70,230] },
  },
  // 关卡2：NEBULA RIFT — 双路交叉，空中威胁
  2: {
    MAIN: [ {x:0,y:3},{x:4,y:3},{x:4,y:8},{x:8,y:8},{x:8,y:4},{x:12,y:4},{x:12,y:10},{x:13,y:10} ],
    EDGE: [ {x:0,y:7},{x:3,y:7},{x:3,y:1},{x:9,y:1},{x:9,y:6},{x:13,y:6} ],
    AIR:  [ {x:0,y:5},{x:3,y:2},{x:7,y:0},{x:11,y:3},{x:13,y:8} ],
    theme: { bg:[4,8,20], grid:[0,100,200], path1:[0,180,255], path2:[100,50,220] },
  },
  // 关卡3：IRON CITADEL — 复杂地形，中段绕道
  3: {
    MAIN: [ {x:0,y:5},{x:1,y:5},{x:1,y:9},{x:5,y:9},{x:5,y:6},{x:9,y:6},{x:9,y:2},{x:12,y:2},{x:12,y:10},{x:13,y:10} ],
    EDGE: [ {x:0,y:1},{x:6,y:1},{x:6,y:4},{x:3,y:4},{x:3,y:7},{x:7,y:7},{x:7,y:10},{x:13,y:10} ],
    AIR:  [ {x:0,y:6},{x:4,y:3},{x:8,y:1},{x:11,y:4},{x:13,y:10} ],
    theme: { bg:[8,10,16], grid:[180,80,30], path1:[255,140,30], path2:[220,60,20] },
  },
  // 关卡4：VOID MAZE — 迷宫式多折路
  4: {
    MAIN: [ {x:0,y:2},{x:2,y:2},{x:2,y:6},{x:0,y:6},{x:0,y:10},{x:4,y:10},{x:4,y:7},{x:7,y:7},{x:7,y:4},{x:10,y:4},{x:10,y:9},{x:13,y:9} ],
    EDGE: [ {x:0,y:4},{x:1,y:4},{x:1,y:8},{x:5,y:8},{x:5,y:5},{x:8,y:5},{x:8,y:2},{x:11,y:2},{x:11,y:7},{x:13,y:7} ],
    AIR:  [ {x:0,y:11},{x:3,y:6},{x:6,y:1},{x:10,y:3},{x:13,y:9} ],
    theme: { bg:[6,4,18], grid:[120,50,220], path1:[160,60,255], path2:[80,180,255] },
  },
  // 关卡5：OMEGA GATE — 终极复杂，三路全开
  5: {
    MAIN: [ {x:0,y:4},{x:2,y:4},{x:2,y:8},{x:5,y:8},{x:5,y:5},{x:8,y:5},{x:8,y:9},{x:11,y:9},{x:11,y:3},{x:13,y:3} ],
    EDGE: [ {x:0,y:8},{x:3,y:8},{x:3,y:2},{x:6,y:2},{x:6,y:6},{x:9,y:6},{x:9,y:1},{x:12,y:1},{x:12,y:8},{x:13,y:8} ],
    AIR:  [ {x:0,y:0},{x:4,y:4},{x:7,y:2},{x:10,y:6},{x:13,y:3} ],
    theme: { bg:[10,4,10], grid:[220,30,60], path1:[255,50,80], path2:[255,140,40] },
  },
};

// ── 当前关卡路径（全局） ──
let CURRENT_LEVEL_PATHS = LEVEL_PATHS[1];

function pathToPixels(p) {
  return p.map(n => ({
    x: n.x * CELL_SIZE + CELL_SIZE / 2,
    y: n.y * CELL_SIZE + CELL_SIZE / 2,
  }));
}

function initMap() {
  const lv = (typeof currentLevel !== 'undefined') ? currentLevel : 1;
  CURRENT_LEVEL_PATHS = LEVEL_PATHS[lv] || LEVEL_PATHS[1];
  MAIN_PATH_PX = pathToPixels(CURRENT_LEVEL_PATHS.MAIN);
  EDGE_PATH_PX = pathToPixels(CURRENT_LEVEL_PATHS.EDGE);
  AIR_PATH_PX  = pathToPixels(CURRENT_LEVEL_PATHS.AIR);
  initPathCells();
}

// ============================================================
//  格子判定
// ============================================================
let pathCellSet = null;

function initPathCells() {
  pathCellSet = new Set();
  function markSeg(a, b) {
    const dist = Math.hypot(b.x-a.x, b.y-a.y);
    const steps = Math.ceil(dist*2)+1;
    for (let i=0;i<=steps;i++) {
      const t=i/steps;
      pathCellSet.add(Math.floor(lerp(a.x,b.x,t))+','+Math.floor(lerp(a.y,b.y,t)));
    }
  }
  const lv=(typeof currentLevel!=='undefined')?currentLevel:1;
  const lp=LEVEL_PATHS[lv]||LEVEL_PATHS[1];
  for (const path of [lp.MAIN, lp.EDGE, lp.AIR]) {
    for (let i=0;i<path.length-1;i++) markSeg(path[i],path[i+1]);
    for (const node of path) pathCellSet.add(node.x+','+node.y);
  }
}

function isCellBuildable(gx,gy) {
  if (gx<0||gx>=GRID_COLS||gy<0||gy>=GRID_ROWS) return false;
  if (gy===0) return false;
  if (pathCellSet&&pathCellSet.has(gx+','+gy)) return false;
  if (towers&&towers.some(t=>t.gx===gx&&t.gy===gy)) return false;
  return true;
}

// ============================================================
//  背景绘制（随关卡主题变色）
// ============================================================
function drawBackground() {
  const lv=(typeof currentLevel!=='undefined')?currentLevel:1;
  const theme=LEVEL_PATHS[lv]?LEVEL_PATHS[lv].theme:LEVEL_PATHS[1].theme;
  const [br,bg2,bb]=theme.bg;
  const [gr,gg,gb]=theme.grid;

  background(br,bg2,bb);
  stroke(gr,gg,gb,14); strokeWeight(1);
  for (let x=0;x<=width;x+=CELL_SIZE) line(x,0,x,height);
  for (let y=0;y<=height;y+=CELL_SIZE) line(0,y,width,y);

  // 角落装饰
  stroke(gr,gg,gb,50); strokeWeight(1.5);
  for (const [cx,cy] of [[0,0],[width,0],[0,height],[width,height]]) {
    const sx=cx===0?1:-1, sy=cy===0?1:-1;
    line(cx,cy,cx+sx*22,cy); line(cx,cy,cx,cy+sy*22);
    line(cx+sx*4,cy,cx+sx*4,cy+sy*10);
    line(cx,cy+sy*4,cx+sx*10,cy+sy*4);
  }

  // 关卡标签（左上角）
  noStroke(); fill(gr,gg,gb,55); textFont('monospace'); textSize(8);
  const lvName = LEVEL_INFO && LEVEL_INFO[lv] ? LEVEL_INFO[lv].name : 'LV'+lv;
  text('SEC:'+lv+'  '+lvName, 6, GRID_ROWS*CELL_SIZE-6);
}

// ── 路径绘制 ──
function distAB(a,b) { return Math.hypot(b.x-a.x,b.y-a.y); }

function drawGlowPath(px,col,w) {
  noFill();
  stroke(red(col),green(col),blue(col),20); strokeWeight(w*1.1);
  beginShape(); for (const p of px) vertex(p.x,p.y); endShape();
  stroke(red(col),green(col),blue(col),45); strokeWeight(w*0.45);
  beginShape(); for (const p of px) vertex(p.x,p.y); endShape();
  stroke(red(col),green(col),blue(col),80); strokeWeight(w*0.12);
  beginShape(); for (const p of px) vertex(p.x,p.y); endShape();
}

function drawDashedPath(px,col,w) {
  for (let i=0;i<px.length-1;i++) {
    const a=px[i],b=px[i+1],steps=floor(distAB(a,b)/16);
    stroke(red(col),green(col),blue(col),160); strokeWeight(w);
    for (let s=0;s<steps;s+=2)
      line(lerp(a.x,b.x,s/steps),lerp(a.y,b.y,s/steps),lerp(a.x,b.x,(s+1)/steps),lerp(a.y,b.y,(s+1)/steps));
  }
}

function drawHexMarker(x,y,col,label) {
  push(); translate(x,y);
  const r=16+sin(frameCount*0.05)*1.5;
  stroke(red(col),green(col),blue(col),180); strokeWeight(1.5);
  fill(red(col),green(col),blue(col),30);
  beginShape();
  for (let i=0;i<6;i++) vertex(cos(i*PI/3-PI/6)*r,sin(i*PI/3-PI/6)*r);
  endShape(CLOSE);
  fill(red(col),green(col),blue(col),210); noStroke();
  textSize(9); textAlign(CENTER,CENTER); text(label,0,0);
  textAlign(LEFT,BASELINE);
  pop();
}

function drawPaths() {
  const lv=(typeof currentLevel!=='undefined')?currentLevel:1;
  const theme=LEVEL_PATHS[lv]?LEVEL_PATHS[lv].theme:LEVEL_PATHS[1].theme;
  const [r1,g1,b1]=theme.path1;
  const [r2,g2,b2]=theme.path2;

  drawGlowPath(MAIN_PATH_PX, color(r1,g1,b1), CELL_SIZE*0.8);
  drawGlowPath(EDGE_PATH_PX, color(r2,g2,b2), CELL_SIZE*0.52);
  drawDashedPath(AIR_PATH_PX, color(255,140,30), 2.5);

  noStroke(); textFont('monospace'); textSize(9);
  fill(r1,g1,b1,190); text('► MAIN', MAIN_PATH_PX[2].x+5, MAIN_PATH_PX[2].y-8);
  fill(r2,g2,b2,190); text('► FLANK', EDGE_PATH_PX[1].x+5, EDGE_PATH_PX[1].y-8);
  fill(255,150,40,190); text('◆ AIR', AIR_PATH_PX[1].x+5, AIR_PATH_PX[1].y-10);

  const end=MAIN_PATH_PX[MAIN_PATH_PX.length-1];
  drawHexMarker(end.x,end.y,color(220,40,40),'BASE');
  drawHexMarker(MAIN_PATH_PX[0].x,MAIN_PATH_PX[0].y,color(r1,g1,b1),'M');
  drawHexMarker(EDGE_PATH_PX[0].x,EDGE_PATH_PX[0].y,color(r2,g2,b2),'F');
  drawHexMarker(AIR_PATH_PX[0].x,AIR_PATH_PX[0].y,color(255,150,40),'A');
}

function drawScanlines() {
  noStroke();
  for (let y=0;y<height;y+=4) { fill(0,0,0,14); rect(0,y,width,2); }
  const lv=(typeof currentLevel!=='undefined')?currentLevel:1;
  const theme=LEVEL_PATHS[lv]?LEVEL_PATHS[lv].theme:LEVEL_PATHS[1].theme;
  const [r,g,b]=theme.grid;
  fill(r,g,b,7); rect(0,(frameCount*1.1)%height,width,3);
}
