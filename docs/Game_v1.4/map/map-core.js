// ============================================================
//  map/map-core.js
//  路径定义、格子判定、缓存构建、drawPaths、共享辅助
//
//  对外接口（供 sketch.js / ui.js 调用）：
//    initMap()           initPathCells()      isCellBuildable(gx,gy)
//    drawBackground()    drawPaths()          drawScanlines()
//    drawHexMarker()     distAB(a,b)
//
//  内部共享（供各 map-lvN.js 使用）：
//    _floorCache[][]     _decoCache[]         _pathFlowPts[]
//    _rng(seed)          _drawFog()           _drawCornerHUD()
//    _road_stonebrick()  _road_metalplate()   _road_crystalpath()
//    _road_voidpath()    _road_bloodstone()   _road_legacy()
//    _drawFlowParticles()  _drawAirLane()     _drawWaypoints()
// ============================================================

// ============================================================
//  关卡路径 & 主题配置
// ============================================================
const LEVEL_PATHS = {
  1: {
    MAIN: [{x:0,y:5},{x:3,y:5},{x:3,y:9},{x:7,y:9},{x:7,y:3},{x:11,y:3},{x:11,y:8},{x:13,y:8}],
    EDGE: [{x:0,y:2},{x:5,y:2},{x:5,y:6},{x:9,y:6},{x:9,y:10},{x:13,y:10}],
    AIR:  [{x:0,y:8},{x:5,y:4},{x:10,y:1},{x:13,y:8}],
    theme: { style:'grassland', grid:[80,160,80], path1:[180,220,100], path2:[100,180,60],
             bg:[18,32,12], fogCol:[10,40,10] },
  },
  2: {
    MAIN: [{x:0,y:3},{x:4,y:3},{x:4,y:8},{x:8,y:8},{x:8,y:4},{x:12,y:4},{x:12,y:10},{x:13,y:10}],
    EDGE: [{x:0,y:7},{x:3,y:7},{x:3,y:1},{x:9,y:1},{x:9,y:6},{x:13,y:6}],
    AIR:  [{x:0,y:5},{x:3,y:2},{x:7,y:0},{x:11,y:3},{x:13,y:8}],
    theme: { style:'nebula', grid:[60,120,220], path1:[80,180,255], path2:[120,60,230],
             bg:[4,8,24], fogCol:[8,20,80] },
  },
  3: {
    MAIN: [{x:0,y:5},{x:1,y:5},{x:1,y:9},{x:5,y:9},{x:5,y:6},{x:9,y:6},{x:9,y:2},{x:12,y:2},{x:12,y:10},{x:13,y:10}],
    EDGE: [{x:0,y:1},{x:6,y:1},{x:6,y:4},{x:3,y:4},{x:3,y:7},{x:7,y:7},{x:7,y:10},{x:13,y:10}],
    AIR:  [{x:0,y:6},{x:4,y:3},{x:8,y:1},{x:11,y:4},{x:13,y:10}],
    theme: { style:'inferno', grid:[200,80,20], path1:[255,130,20], path2:[220,50,10],
             bg:[20,8,2], fogCol:[80,20,0] },
  },
  4: {
    MAIN: [{x:0,y:2},{x:2,y:2},{x:2,y:6},{x:0,y:6},{x:0,y:10},{x:4,y:10},{x:4,y:7},{x:7,y:7},{x:7,y:4},{x:10,y:4},{x:10,y:9},{x:13,y:9}],
    EDGE: [{x:0,y:4},{x:1,y:4},{x:1,y:8},{x:5,y:8},{x:5,y:5},{x:8,y:5},{x:8,y:2},{x:11,y:2},{x:11,y:7},{x:13,y:7}],
    AIR:  [{x:0,y:11},{x:3,y:6},{x:6,y:1},{x:10,y:3},{x:13,y:9}],
    theme: { style:'void', grid:[130,50,230], path1:[170,65,255], path2:[90,190,255],
             bg:[6,3,20], fogCol:[40,8,110] },
  },
  5: {
    MAIN: [{x:0,y:4},{x:2,y:4},{x:2,y:8},{x:5,y:8},{x:5,y:5},{x:8,y:5},{x:8,y:9},{x:11,y:9},{x:11,y:3},{x:13,y:3}],
    EDGE: [{x:0,y:8},{x:3,y:8},{x:3,y:2},{x:6,y:2},{x:6,y:6},{x:9,y:6},{x:9,y:1},{x:12,y:1},{x:12,y:8},{x:13,y:8}],
    AIR:  [{x:0,y:0},{x:4,y:4},{x:7,y:2},{x:10,y:6},{x:13,y:3}],
    theme: { style:'ruin', grid:[200,40,55], path1:[230,50,70], path2:[220,130,30],
             bg:[14,4,6], fogCol:[100,8,18] },
  },
};

let CURRENT_LEVEL_PATHS = LEVEL_PATHS[1];

// ── 路径转像素坐标 ──
function pathToPixels(p) {
  return p.map(n => ({ x: n.x*CELL_SIZE + CELL_SIZE/2, y: n.y*CELL_SIZE + CELL_SIZE/2 }));
}

// ============================================================
//  格子判定
// ============================================================
let pathCellSet = null;

function initPathCells() {
  pathCellSet = new Set();
  function markSeg(a, b) {
    const steps = Math.ceil(Math.hypot(b.x-a.x, b.y-a.y)*2)+1;
    for (let i=0; i<=steps; i++) {
      const t = i/steps;
      pathCellSet.add(Math.floor(lerp(a.x,b.x,t))+','+Math.floor(lerp(a.y,b.y,t)));
    }
  }
  const lv = (typeof currentLevel!=='undefined') ? currentLevel : 1;
  const lp = LEVEL_PATHS[lv] || LEVEL_PATHS[1];
  for (const path of [lp.MAIN, lp.EDGE, lp.AIR]) {
    for (let i=0; i<path.length-1; i++) markSeg(path[i], path[i+1]);
    for (const node of path) pathCellSet.add(node.x+','+node.y);
  }
}

function isCellBuildable(gx, gy) {
  if (gx<0 || gx>=GRID_COLS || gy<0 || gy>=GRID_ROWS) return false;
  if (gy===0) return false;
  if (pathCellSet && pathCellSet.has(gx+','+gy)) return false;
  if (towers && towers.some(t => t.gx===gx && t.gy===gy)) return false;
  return true;
}

// ============================================================
//  缓存（所有关卡共用同一套缓存变量）
// ============================================================
let _floorCache  = [];  // [gx][gy] = { n1,n2,n3,n4 }
let _decoCache   = [];  // [{ gx, gy, r1..r4, style }]
let _pathFlowPts = [];  // [{ x, y, lane, t }]

function initMap() {
  const lv = (typeof currentLevel!=='undefined') ? currentLevel : 1;
  CURRENT_LEVEL_PATHS = LEVEL_PATHS[lv] || LEVEL_PATHS[1];
  MAIN_PATH_PX = pathToPixels(CURRENT_LEVEL_PATHS.MAIN);
  EDGE_PATH_PX = pathToPixels(CURRENT_LEVEL_PATHS.EDGE);
  AIR_PATH_PX  = pathToPixels(CURRENT_LEVEL_PATHS.AIR);
  initPathCells();
  _buildFloorCache();
  _buildDecoCache();
  _buildPathFlowCache();
}

function _buildFloorCache() {
  _floorCache = [];
  const rng = _rng(42317);
  for (let gx=0; gx<GRID_COLS; gx++) {
    _floorCache[gx] = [];
    for (let gy=0; gy<GRID_ROWS; gy++) {
      _floorCache[gx][gy] = { n1:rng()*2-1, n2:rng()*2-1, n3:rng(), n4:rng() };
    }
  }
}

function _buildDecoCache() {
  _decoCache = [];
  const lv    = (typeof currentLevel!=='undefined') ? currentLevel : 1;
  const style = LEVEL_PATHS[lv]?.theme?.style || 'legacy';
  const rng   = _rng(lv*7331+1);
  for (let gx=0; gx<GRID_COLS; gx++) {
    for (let gy=1; gy<GRID_ROWS; gy++) {
      if (!isCellBuildable(gx,gy)) continue;
      if (rng() > 0.38) continue;
      _decoCache.push({ gx, gy, r1:rng(), r2:rng(), r3:rng(), r4:rng(), style });
    }
  }
  _decoCache.sort((a,b) => a.gy - b.gy); // 近处(gy大)后画，有层次感
}

function _buildPathFlowCache() {
  _pathFlowPts = [];
  for (const [px, lane] of [[MAIN_PATH_PX,0],[EDGE_PATH_PX,1]]) {
    for (let i=0; i<px.length-1; i++) {
      const a=px[i], b=px[i+1];
      const steps = Math.max(2, Math.floor(distAB(a,b)/18));
      for (let s=0; s<steps; s++)
        _pathFlowPts.push({ x:lerp(a.x,b.x,s/steps), y:lerp(a.y,b.y,s/steps), lane, t:s/steps+i });
    }
  }
}

// ── 固定种子随机数生成器 ──
function _rng(seed) {
  let s = seed;
  return () => { s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; };
}

// ============================================================
//  drawBackground  —  按 style 路由到各关卡文件
// ============================================================
function drawBackground() {
  const lv    = (typeof currentLevel!=='undefined') ? currentLevel : 1;
  const theme = LEVEL_PATHS[lv]?.theme || LEVEL_PATHS[1].theme;
  switch (theme.style) {
    case 'grassland': _bg_grassland(lv, theme); break;
    case 'nebula':    _bg_nebula   (lv, theme); break;
    case 'inferno':   _bg_inferno  (lv, theme); break;
    case 'void':      _bg_void     (lv, theme); break;
    case 'ruin':      _bg_ruin     (lv, theme); break;
    default:          _bg_legacy   (lv, theme); break;
  }
}

// ── 通用 legacy 背景（无专属主题时兜底）──
function _bg_legacy(lv, theme) {
  const [br,bg2,bb]    = theme.bg;
  const [gr,gg,gb]     = theme.grid;
  const [fr,fg,fb]     = theme.fogCol;
  const [fla,flb,flc]  = theme.floorA || [br+5, bg2+5, bb+5];
  const [flr,flg,flb2] = theme.floorB || [br+15, bg2+15, bb+15];

  background(br, bg2, bb);
  noStroke();
  for (let gx=0; gx<GRID_COLS; gx++) {
    for (let gy=1; gy<GRID_ROWS; gy++) {
      if (pathCellSet && pathCellSet.has(gx+','+gy)) continue;
      let minD=99;
      for (let dx=-2; dx<=2&&minD>0; dx++)
        for (let dy=-2; dy<=2&&minD>0; dy++)
          if (pathCellSet && pathCellSet.has((gx+dx)+','+(gy+dy)))
            minD = Math.min(minD, Math.abs(dx)+Math.abs(dy));
      const f = Math.max(0, 1-minD/3);
      fill(fla+(flr-fla)*f*0.55, flb+(flg-flb)*f*0.55, flc+(flb2-flc)*f*0.55, 200);
      rect(gx*CELL_SIZE, gy*CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
  stroke(gr,gg,gb,18); strokeWeight(1);
  for (let x=0; x<=width; x+=CELL_SIZE) line(x,0,x,height);
  for (let y=0; y<=height; y+=CELL_SIZE) line(0,y,width,y);
  _drawFog(fr,fg,fb,55);
  _drawCornerHUD(theme.grid);
  _drawLevelLabel(lv, gr,gg,gb, 55);
}

// ============================================================
//  drawPaths  —  按 style 选路面风格
// ============================================================
function distAB(a,b){ return Math.hypot(b.x-a.x, b.y-a.y); }

function drawPaths() {
  const lv    = (typeof currentLevel!=='undefined') ? currentLevel : 1;
  const theme = LEVEL_PATHS[lv]?.theme || LEVEL_PATHS[1].theme;
  const [r1,g1,b1] = theme.path1;
  const [r2,g2,b2] = theme.path2;

  switch (theme.style) {
    case 'grassland':
      _road_stonebrick(MAIN_PATH_PX, r1,g1,b1, CELL_SIZE*0.88, 0);
      _road_stonebrick(EDGE_PATH_PX, r2,g2,b2, CELL_SIZE*0.68, 1);
      break;
    case 'nebula':
      _road_crystalpath(MAIN_PATH_PX, r1,g1,b1, CELL_SIZE*0.88, 0);
      _road_crystalpath(EDGE_PATH_PX, r2,g2,b2, CELL_SIZE*0.68, 1);
      break;
    case 'inferno':
      _road_metalplate(MAIN_PATH_PX, r1,g1,b1, CELL_SIZE*0.88, 0);
      _road_metalplate(EDGE_PATH_PX, r2,g2,b2, CELL_SIZE*0.68, 1);
      break;
    case 'void':
      _road_voidpath(MAIN_PATH_PX, r1,g1,b1, CELL_SIZE*0.88, 0);
      _road_voidpath(EDGE_PATH_PX, r2,g2,b2, CELL_SIZE*0.68, 1);
      break;
    case 'ruin':
      _road_bloodstone(MAIN_PATH_PX, r1,g1,b1, CELL_SIZE*0.88, 0);
      _road_bloodstone(EDGE_PATH_PX, r2,g2,b2, CELL_SIZE*0.68, 1);
      break;
    default:
      _road_legacy(MAIN_PATH_PX, r1,g1,b1, CELL_SIZE*0.88);
      _road_legacy(EDGE_PATH_PX, r2,g2,b2, CELL_SIZE*0.68);
  }

  _drawAirLane(theme.style);
  _drawFlowParticles(r1,g1,b1, r2,g2,b2, theme.style);
  _drawWaypoints(MAIN_PATH_PX, r1,g1,b1);
  _drawWaypoints(EDGE_PATH_PX, r2,g2,b2);

  noStroke(); textFont('monospace'); textSize(9);
  fill(r1,g1,b1,200); text('► MAIN',  MAIN_PATH_PX[1].x+5, MAIN_PATH_PX[1].y-10);
  fill(r2,g2,b2,200); text('► FLANK', EDGE_PATH_PX[1].x+5, EDGE_PATH_PX[1].y-10);
  fill(255,160,50,200); text('◆ AIR',  AIR_PATH_PX[1].x+5,  AIR_PATH_PX[1].y-12);

  const end = MAIN_PATH_PX[MAIN_PATH_PX.length-1];
  drawHexMarker(end.x, end.y, color(220,40,40), 'BASE');
  drawHexMarker(MAIN_PATH_PX[0].x, MAIN_PATH_PX[0].y, color(r1,g1,b1), 'M');
  drawHexMarker(EDGE_PATH_PX[0].x, EDGE_PATH_PX[0].y, color(r2,g2,b2), 'F');
  drawHexMarker(AIR_PATH_PX[0].x,  AIR_PATH_PX[0].y,  color(255,160,50),'A');
}

// ============================================================
//  路面绘制函数
// ============================================================

// ── 石砖路（lv1 草地）──
function _road_stonebrick(pathPx, r,g,b, w, lane) {
  const rng = _rng(lane*5557+3);
  for (let i=0; i<pathPx.length-1; i++) {
    const a=pathPx[i], b2=pathPx[i+1];
    const ang=Math.atan2(b2.y-a.y, b2.x-a.x), d=distAB(a,b2);
    push(); translate((a.x+b2.x)/2,(a.y+b2.y)/2); rotate(ang);
    noStroke(); fill(62,44,22,255); rect(-d/2-2,-w/2,d+4,w);
    const brickW=w*0.72, brickH=w*0.88, cols=Math.ceil(d/brickW)+1;
    for (let c=0; c<cols; c++) {
      const offset=(lane===1&&c%2===0)?brickH*0.5:0;
      for (let row=0; row<2; row++) {
        const bx=-d/2+c*brickW, by=-w/2+row*brickH*0.5+offset*0.5;
        const bw=brickW*0.92, bh=brickH*0.44, n=rng();
        fill(72+n*18, 62+n*14, 48+n*10, 240); rect(bx+1,by+1,bw,bh,1);
        fill(90+n*20,78+n*16,62+n*12,80); rect(bx+1,by+1,bw*0.35,2); rect(bx+1,by+1,2,bh*0.55);
        fill(42+n*10,35+n*8,26+n*6,100); rect(bx+bw*0.7,by+bh*0.55,bw*0.32+1,bh*0.42+1,0,0,1,0);
      }
    }
    noFill(); stroke(0,0,0,55); strokeWeight(3);
    line(-d/2,-w/2,d/2,-w/2); line(-d/2,w/2,d/2,w/2);
    stroke(r,g,b,80); strokeWeight(1.5); line(-d/2,-w/2+2,d/2,-w/2+2);
    stroke(r,g,b,40); strokeWeight(1);  line(-d/2,w/2-2, d/2,w/2-2);
    pop();
  }
}

// ── 冰晶石路（lv2 星云）──
function _road_crystalpath(pathPx, r,g,b, w, lane) {
  const rng=_rng(lane*3331+7), T=frameCount;
  for (let i=0; i<pathPx.length-1; i++) {
    const a=pathPx[i], b2=pathPx[i+1];
    const ang=Math.atan2(b2.y-a.y,b2.x-a.x), d=distAB(a,b2);
    push(); translate((a.x+b2.x)/2,(a.y+b2.y)/2); rotate(ang);
    // 底层（深蓝黑）
    noStroke(); fill(8,12,35,255); rect(-d/2-2,-w/2,d+4,w);
    // 冰晶板块
    const tileW=w*0.78, cols=Math.ceil(d/tileW)+1;
    for (let c=0; c<cols; c++) {
      const n=rng(), tx=-d/2+c*tileW, tw=tileW*0.93;
      fill(18+n*12, 35+n*20, 75+n*30, 230); rect(tx+1,-w/2+2,tw,w-4,2);
      // 冰面高光（斜向）
      const glowP=sin(T*0.03+c*0.8+i)*0.3+0.7;
      fill(r,g,b, 35*glowP*n); rect(tx+1,-w/2+2,tw*0.5,3);
      fill(180,220,255, 20*glowP); rect(tx+1,-w/2+2,tw,3);
      // 板缝
      stroke(5,10,25,180); strokeWeight(1.5); line(tx,-w/2+2,tx,w/2-2);
    }
    // 能量流边线
    const ep=sin(T*0.04+i*0.6)*0.5+0.5;
    noFill(); stroke(r,g,b,50+ep*40); strokeWeight(2);
    line(-d/2,-w/2+1,d/2,-w/2+1); line(-d/2,w/2-1,d/2,w/2-1);
    stroke(255,255,255,20*ep); strokeWeight(1);
    line(-d/2,-w/2+2,d/2,-w/2+2);
    pop();
  }
}

// ── 金属铁板路（lv3 熔岩）──
function _road_metalplate(pathPx, r,g,b, w, lane) {
  const T=frameCount;
  for (let i=0; i<pathPx.length-1; i++) {
    const a=pathPx[i], b2=pathPx[i+1];
    const ang=Math.atan2(b2.y-a.y,b2.x-a.x), d=distAB(a,b2);
    push(); translate((a.x+b2.x)/2,(a.y+b2.y)/2); rotate(ang);
    noStroke(); fill(28,12,4,255); rect(-d/2-2,-w/2,d+4,w);
    const plateW=w*0.85, numPlates=Math.ceil(d/plateW)+1;
    for (let p=0; p<numPlates; p++) {
      const px2=-d/2+p*plateW, pw=plateW*0.94;
      fill(52+p%2*6, 24+p%2*3, 7+p%2*2, 240); rect(px2+1,-w/2+2,pw,w-4,1);
      fill(65,30,10,200);
      for (const [rx,ry] of [[px2+4,-w/2+5],[px2+pw-3,-w/2+5],[px2+4,w/2-5],[px2+pw-3,w/2-5]]) {
        ellipse(rx,ry,4,4); fill(80,38,14,160); ellipse(rx-0.5,ry-0.5,2,2); fill(65,30,10,200);
      }
      fill(70,32,10,70); rect(px2+1,-w/2+2,pw*0.4,3);
      stroke(18,7,2,160); strokeWeight(1.5); line(px2,-w/2+2,px2,w/2-2);
    }
    const lavaGlow=sin(T*0.05+i*0.7)*0.5+0.5;
    fill(255,80+lavaGlow*40,0, 8+lavaGlow*12); rect(-d/2,-w/2,d,w);
    noFill(); stroke(0,0,0,80); strokeWeight(3);
    line(-d/2,-w/2,d/2,-w/2); line(-d/2,w/2,d/2,w/2);
    stroke(r,g,b,90); strokeWeight(1.5); line(-d/2,-w/2+2,d/2,-w/2+2);
    stroke(r,g,b,40); strokeWeight(1);  line(-d/2,w/2-2, d/2,w/2-2);
    pop();
  }
}

// ── 虚空量子路（lv4）──
function _road_voidpath(pathPx, r,g,b, w, lane) {
  const T=frameCount, rng=_rng(lane*4441+11);
  for (let i=0; i<pathPx.length-1; i++) {
    const a=pathPx[i], b2=pathPx[i+1];
    const ang=Math.atan2(b2.y-a.y,b2.x-a.x), d=distAB(a,b2);
    push(); translate((a.x+b2.x)/2,(a.y+b2.y)/2); rotate(ang);
    // 深空底
    noStroke(); fill(8,4,22,255); rect(-d/2-2,-w/2,d+4,w);
    // 量子板块（半透明，带扭曲感）
    const tileW=w*0.9, cols=Math.ceil(d/tileW)+1;
    for (let c=0; c<cols; c++) {
      const n=rng(), tx=-d/2+c*tileW, tw=tileW*0.93;
      const vp=sin(T*0.025+c*1.1+i*0.5)*0.4+0.6;
      fill(25+n*15, 10+n*8, 55+n*25, 200*vp); rect(tx+1,-w/2+2,tw,w-4,2);
      // 能量网格线
      stroke(r,g,b, 20*vp); strokeWeight(0.7);
      for (let row=0; row<3; row++) {
        const ry2=-w/2+2+(w-4)*row/2;
        line(tx+1,ry2, tx+tw,ry2);
      }
      // 扭曲高光
      const sp=sin(T*0.04+c*0.7)*0.5+0.5;
      fill(r,g,b, 40*sp*n); noStroke(); rect(tx+tw*0.1,-w/2+2,tw*0.3,2);
    }
    // 外边能量线（双色交替）
    const ep=sin(T*0.05+i*0.8)*0.5+0.5;
    noFill();
    stroke(r,g,b, 70+ep*50); strokeWeight(1.8);
    line(-d/2,-w/2+1,d/2,-w/2+1); line(-d/2,w/2-1,d/2,w/2-1);
    stroke(255,255,255,25*ep); strokeWeight(1);
    line(-d/2,-w/2+3,d/2,-w/2+3);
    pop();
  }
}

// ── 血石路（lv5 废墟）──
function _road_bloodstone(pathPx, r,g,b, w, lane) {
  const rng=_rng(lane*6661+5), T=frameCount;
  for (let i=0; i<pathPx.length-1; i++) {
    const a=pathPx[i], b2=pathPx[i+1];
    const ang=Math.atan2(b2.y-a.y,b2.x-a.x), d=distAB(a,b2);
    push(); translate((a.x+b2.x)/2,(a.y+b2.y)/2); rotate(ang);
    // 底层（深红黑）
    noStroke(); fill(25,6,8,255); rect(-d/2-2,-w/2,d+4,w);
    // 不规则石板
    const tileW=w*0.82, cols=Math.ceil(d/tileW)+1;
    for (let c=0; c<cols; c++) {
      const n=rng(), tx=-d/2+c*tileW, tw=tileW*0.91;
      // 石板（暗红褐）
      fill(42+n*18, 18+n*8, 14+n*6, 245); rect(tx+1,-w/2+2,tw,w-4,1);
      // 高光
      fill(60+n*22,26+n*10,20+n*8, 70); rect(tx+1,-w/2+2,tw*0.4,2); rect(tx+1,-w/2+2,2,w*0.45);
      // 暗纹（横向磨损）
      fill(18,6,4,60);
      for (let k=0; k<2; k++) rect(tx+tw*0.1+k*tw*0.35, -w/2+w*0.25+k*w*0.2, tw*0.2, 1.5);
      // 缝隙（带红光渗出）
      const gp=sin(T*0.04+c*0.9+i)*0.5+0.5;
      stroke(r,g*0.4,b*0.4, 40+gp*40); strokeWeight(1.5);
      line(tx,-w/2+2,tx,w/2-2);
    }
    noFill(); stroke(0,0,0,70); strokeWeight(3);
    line(-d/2,-w/2,d/2,-w/2); line(-d/2,w/2,d/2,w/2);
    stroke(r,g,b,80); strokeWeight(1.5); line(-d/2,-w/2+2,d/2,-w/2+2);
    stroke(r,g,b,35); strokeWeight(1);  line(-d/2,w/2-2, d/2,w/2-2);
    pop();
  }
}

// ── Legacy 路面 ──
function _road_legacy(pathPx, r,g,b, w) {
  noStroke();
  for (let i=0; i<pathPx.length-1; i++) {
    const a=pathPx[i], b2=pathPx[i+1];
    const ang=Math.atan2(b2.y-a.y,b2.x-a.x), d=distAB(a,b2);
    fill(r*0.1,g*0.1,b*0.1,210);
    push(); translate((a.x+b2.x)/2,(a.y+b2.y)/2); rotate(ang);
    rect(-d/2-2,-w/2,d+4,w); pop();
  }
  for (const p of pathPx) { fill(r*0.1,g*0.1,b*0.1,210); ellipse(p.x,p.y,w,w); }
  noFill();
  for (const off of [-w/2+2, w/2-2]) {
    stroke(r,g,b,55); strokeWeight(2.5);
    beginShape();
    for (let i=0; i<pathPx.length-1; i++) {
      const a=pathPx[i], b2=pathPx[i+1];
      const n=Math.atan2(b2.y-a.y,b2.x-a.x)+HALF_PI;
      if (i===0) vertex(a.x+cos(n)*off,a.y+sin(n)*off);
      vertex(b2.x+cos(n)*off,b2.y+sin(n)*off);
    }
    endShape();
    stroke(r,g,b,130); strokeWeight(1);
    beginShape();
    for (let i=0; i<pathPx.length-1; i++) {
      const a=pathPx[i], b2=pathPx[i+1];
      const n=Math.atan2(b2.y-a.y,b2.x-a.x)+HALF_PI;
      if (i===0) vertex(a.x+cos(n)*off,a.y+sin(n)*off);
      vertex(b2.x+cos(n)*off,b2.y+sin(n)*off);
    }
    endShape();
  }
}

// ============================================================
//  共用动画层
// ============================================================

function _drawFlowParticles(r1,g1,b1, r2,g2,b2, style) {
  noStroke();
  const T=frameCount, PERIOD=style==='inferno'?90:120;
  for (const pt of _pathFlowPts) {
    const phase=(T/PERIOD+pt.t*0.04)%1;
    const alpha=sin(phase*PI)*sin(phase*PI);
    if (alpha<0.05) continue;
    const [r,g,b]=pt.lane===0?[r1,g1,b1]:[r2,g2,b2];
    const sz=pt.lane===0?3.5:2.5;
    fill(r,g,b,alpha*50); ellipse(pt.x,pt.y,sz*3.5,sz*3.5);
    fill(r,g,b,alpha*200); ellipse(pt.x,pt.y,sz,sz);
    fill(255,255,255,alpha*120); ellipse(pt.x,pt.y,sz*0.4,sz*0.4);
  }
}

function _drawAirLane(style) {
  const T=frameCount, pts=AIR_PATH_PX; noFill();
  const airCol = style==='void'?[160,100,255]:style==='ruin'?[255,80,50]:[255,160,50];
  for (let i=0; i<pts.length-1; i++) {
    const a=pts[i], b=pts[i+1], d=distAB(a,b);
    stroke(...airCol,15); strokeWeight(6); line(a.x,a.y,b.x,b.y);
    const steps=Math.floor(d/18);
    stroke(...airCol,130); strokeWeight(1.8);
    for (let s=0; s<steps; s+=2)
      line(lerp(a.x,b.x,s/steps),lerp(a.y,b.y,s/steps),
           lerp(a.x,b.x,(s+1)/steps),lerp(a.y,b.y,(s+1)/steps));
  }
  noStroke();
  for (let i=0; i<pts.length-1; i++) {
    const a=pts[i], b=pts[i+1], d=distAB(a,b);
    const steps=Math.max(2,Math.floor(d/20));
    for (let s=0; s<steps; s++) {
      const phase=(T/80+(s+i*8)*0.055)%1;
      const alpha=sin(phase*PI)*sin(phase*PI);
      if (alpha<0.08) continue;
      fill(...airCol,alpha*180); ellipse(lerp(a.x,b.x,s/steps),lerp(a.y,b.y,s/steps),3,3);
    }
  }
}

function _drawWaypoints(pathPx, r,g,b) {
  const T=frameCount;
  for (let i=1; i<pathPx.length-1; i++) {
    const p=pathPx[i], pulse=sin(T*0.05+i*0.8)*0.25+0.75;
    noStroke(); fill(r,g,b,18*pulse); ellipse(p.x,p.y,26,26);
    fill(r*0.15,g*0.15,b*0.15,220);
    stroke(r,g,b,160*pulse); strokeWeight(1.5);
    const rs=7+pulse*1.5;
    beginShape();
    vertex(p.x,p.y-rs); vertex(p.x+rs,p.y); vertex(p.x,p.y+rs); vertex(p.x-rs,p.y);
    endShape(CLOSE);
    noStroke(); fill(r,g,b,200*pulse); ellipse(p.x,p.y,3,3);
  }
}

// ============================================================
//  六边形标记、雾气、角落HUD、标签、扫描线
// ============================================================

function drawHexMarker(x,y,col,label) {
  push(); translate(x,y);
  const T=frameCount, pulse=sin(T*0.06)*0.2+0.8, r=18+pulse*2;
  noStroke();
  fill(red(col),green(col),blue(col),20*pulse); ellipse(0,0,r*3.2,r*3.2);
  fill(red(col),green(col),blue(col),35*pulse); ellipse(0,0,r*2,r*2);
  stroke(red(col),green(col),blue(col),190*pulse); strokeWeight(2);
  fill(red(col)*0.12,green(col)*0.12,blue(col)*0.12,220);
  beginShape();
  for (let i=0;i<6;i++) vertex(cos(i*PI/3-PI/6)*r, sin(i*PI/3-PI/6)*r);
  endShape(CLOSE);
  stroke(red(col),green(col),blue(col),80*pulse); strokeWeight(1); noFill();
  beginShape();
  for (let i=0;i<6;i++) vertex(cos(i*PI/3-PI/6)*r*0.62, sin(i*PI/3-PI/6)*r*0.62);
  endShape(CLOSE);
  fill(red(col),green(col),blue(col),230*pulse); noStroke();
  textSize(label.length>2?8:10); textAlign(CENTER,CENTER); text(label,0,0);
  textAlign(LEFT,BASELINE);
  pop();
}

function _drawFog(fr,fg,fb,maxA) {
  noStroke(); const d=85;
  for (let x=0;x<d;x++) {
    fill(fr,fg,fb,map(x,0,d,maxA,0));
    rect(x,0,1,height); rect(width-x-1,0,1,height);
  }
  for (let y=0;y<d*0.7;y++) { fill(fr,fg,fb,map(y,0,d*0.7,maxA*0.6,0)); rect(0,y,width,1); }
  for (let y=0;y<d*0.5;y++) { fill(fr,fg,fb,map(y,0,d*0.5,maxA*0.4,0)); rect(0,height-y-1,width,1); }
}

function _drawCornerHUD(grid) {
  const [gr,gg,gb]=grid;
  stroke(gr,gg,gb,55); strokeWeight(1.5);
  for (const [cx,cy] of [[0,0],[width,0],[0,height],[width,height]]) {
    const sx=cx===0?1:-1, sy=cy===0?1:-1;
    line(cx,cy,cx+sx*22,cy); line(cx,cy,cx,cy+sy*22);
    line(cx+sx*4,cy,cx+sx*4,cy+sy*10); line(cx,cy+sy*4,cx+sx*10,cy+sy*4);
  }
}

function _drawLevelLabel(lv, r,g,b, a) {
  noStroke(); fill(r,g,b,a); textFont('monospace'); textSize(8);
  const lvName=LEVEL_INFO&&LEVEL_INFO[lv]?LEVEL_INFO[lv].name:'LV'+lv;
  text('SEC:'+lv+'  '+lvName, 6, GRID_ROWS*CELL_SIZE-6);
}

function drawScanlines() {
  noStroke();
  // 加大步长、略增厚条纹：视觉接近原效果，rect 次数约降为原来的 ~1/2（降 draw call）
  for (let y = 0; y < height; y += 8) {
    fill(0, 0, 0, 14);
    rect(0, y, width, 3);
  }
  const lv = (typeof currentLevel !== 'undefined') ? currentLevel : 1;
  const [r, g, b] = LEVEL_PATHS[lv]?.theme?.grid || [100, 100, 100];
  fill(r, g, b, 7);
  rect(0, (frameCount * 1.1) % height, width, 3);
}
