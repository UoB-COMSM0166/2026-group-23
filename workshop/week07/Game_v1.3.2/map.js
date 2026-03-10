// ============================================================
//  map.js — 路径定义、背景绘制、格子判定
//  负责人：刘博文（地图布局部分）
//  依赖：globals.js
// ============================================================

// ── 路径网格坐标定义（由张洵设计）──
const MAIN_PATH = [
  {x:0, y:5}, {x:1, y:5}, {x:1, y:9}, {x:5, y:9},
  {x:5, y:6}, {x:9, y:6}, {x:9, y:2}, {x:12,y:2},
  {x:12,y:10},{x:13,y:10},
];
const EDGE_PATH = [
  {x:0, y:1}, {x:6, y:1}, {x:6, y:4}, {x:3, y:4},
  {x:3, y:7}, {x:7, y:7}, {x:7, y:10},{x:13,y:10},
];
const AIR_PATH = [
  {x:0, y:6}, {x:4, y:3}, {x:8, y:1}, {x:11,y:4}, {x:13,y:10},
];

// ── 路径转像素坐标 ──
function pathToPixels(p) {
  return p.map(n => ({
    x: n.x * CELL_SIZE + CELL_SIZE / 2,
    y: n.y * CELL_SIZE + CELL_SIZE / 2,
  }));
}

// ── 初始化路径像素坐标（在 setup 中调用）──
function initMap() {
  MAIN_PATH_PX = pathToPixels(MAIN_PATH);
  EDGE_PATH_PX = pathToPixels(EDGE_PATH);
  AIR_PATH_PX  = pathToPixels(AIR_PATH);
  initPathCells(); // 通知 towers.js 重建格子集合
}

// ============================================================
//  格子判定（刘博文负责，塔放置核心逻辑）
// ============================================================
let pathCellSet = null;

function initPathCells() {
  pathCellSet = new Set();

  function markSegment(a, b) {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.ceil(dist * 2) + 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const gx = Math.floor(lerp(a.x, b.x, t));
      const gy = Math.floor(lerp(a.y, b.y, t));
      pathCellSet.add(gx + ',' + gy);
    }
  }

  for (const path of [MAIN_PATH, EDGE_PATH, AIR_PATH]) {
    for (let i = 0; i < path.length - 1; i++) markSegment(path[i], path[i + 1]);
    for (const node of path) pathCellSet.add(node.x + ',' + node.y);
  }
}

// 判断格子是否可建塔（供 towers.js 调用）
function isCellBuildable(gx, gy) {
  if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return false;
  if (gy === 0) return false; // 第0行紧贴HUD
  if (pathCellSet && pathCellSet.has(gx + ',' + gy)) return false;
  if (towers && towers.some(t => t.gx === gx && t.gy === gy)) return false;
  return true;
}

// ============================================================
//  背景绘制（蓝色科幻基调）
// ============================================================
function drawBackground() {
  background(8, 12, 20);
  // 网格线
  stroke(0, 180, 255, 16); strokeWeight(1);
  for (let x = 0; x <= width; x += CELL_SIZE) line(x, 0, x, height);
  for (let y = 0; y <= height; y += CELL_SIZE) line(0, y, width, y);
  // 角落装饰
  stroke(0, 200, 255, 50); strokeWeight(1.5);
  for (const [cx, cy] of [[0,0],[width,0],[0,height],[width,height]]) {
    const sx = cx === 0 ? 1 : -1, sy = cy === 0 ? 1 : -1;
    line(cx, cy, cx + sx * 22, cy); line(cx, cy, cx, cy + sy * 22);
    line(cx + sx * 4, cy, cx + sx * 4, cy + sy * 10);
    line(cx, cy + sy * 4, cx + sx * 10, cy + sy * 4);
  }
}

// ── 路径绘制辅助 ──
function distAB(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }

function drawGlowPath(px, col, w) {
  noFill();
  stroke(red(col), green(col), blue(col), 20); strokeWeight(w * 1.1);
  beginShape(); for (const p of px) vertex(p.x, p.y); endShape();
  stroke(red(col), green(col), blue(col), 45); strokeWeight(w * 0.45);
  beginShape(); for (const p of px) vertex(p.x, p.y); endShape();
  stroke(red(col), green(col), blue(col), 80); strokeWeight(w * 0.12);
  beginShape(); for (const p of px) vertex(p.x, p.y); endShape();
}

function drawDashedPath(px, col, w) {
  for (let i = 0; i < px.length - 1; i++) {
    const a = px[i], b = px[i + 1], steps = floor(distAB(a, b) / 16);
    stroke(red(col), green(col), blue(col), 160); strokeWeight(w);
    for (let s = 0; s < steps; s += 2)
      line(lerp(a.x,b.x,s/steps), lerp(a.y,b.y,s/steps),
           lerp(a.x,b.x,(s+1)/steps), lerp(a.y,b.y,(s+1)/steps));
  }
}

function drawHexMarker(x, y, col, label) {
  push(); translate(x, y);
  const r = 16 + sin(frameCount * 0.05) * 1.5;
  stroke(red(col), green(col), blue(col), 180); strokeWeight(1.5);
  fill(red(col), green(col), blue(col), 30);
  beginShape();
  for (let i = 0; i < 6; i++) vertex(cos(i*PI/3-PI/6)*r, sin(i*PI/3-PI/6)*r);
  endShape(CLOSE);
  fill(red(col), green(col), blue(col), 210); noStroke();
  textSize(9); textAlign(CENTER, CENTER); text(label, 0, 0);
  textAlign(LEFT, BASELINE);
  pop();
}

function drawPaths() {
  drawGlowPath(MAIN_PATH_PX, color(0, 200, 255), CELL_SIZE * 0.8);
  drawGlowPath(EDGE_PATH_PX, color(160, 80, 255), CELL_SIZE * 0.52);
  drawDashedPath(AIR_PATH_PX, color(255, 140, 30), 2.5);
  noStroke(); textFont('monospace'); textSize(9);
  fill(0, 200, 255, 190);  text('► MAIN',   MAIN_PATH_PX[4].x + 5, MAIN_PATH_PX[4].y - 8);
  fill(160, 80, 255, 190); text('► SPIDER', EDGE_PATH_PX[2].x + 5, EDGE_PATH_PX[2].y - 8);
  fill(255, 150, 40, 190); text('◆ AIR',    AIR_PATH_PX[2].x + 5,  AIR_PATH_PX[2].y - 10);
  const end = MAIN_PATH_PX[MAIN_PATH_PX.length - 1];
  drawHexMarker(end.x, end.y, color(220, 40, 40), 'BASE');
  drawHexMarker(MAIN_PATH_PX[0].x, MAIN_PATH_PX[0].y, color(0, 220, 255),  'M');
  drawHexMarker(EDGE_PATH_PX[0].x, EDGE_PATH_PX[0].y, color(160, 80, 255), 'S');
  drawHexMarker(AIR_PATH_PX[0].x,  AIR_PATH_PX[0].y,  color(255, 150, 40), 'A');
}

// ── 扫描线 ──
function drawScanlines() {
  noStroke();
  for (let y = 0; y < height; y += 4) { fill(0, 0, 0, 14); rect(0, y, width, 2); }
  fill(0, 180, 255, 8); rect(0, (frameCount * 1.1) % height, width, 3);
}
