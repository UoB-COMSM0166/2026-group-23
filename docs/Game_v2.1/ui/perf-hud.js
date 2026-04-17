// ============================================================
//  ui/perf-hud.js — 性能诊断叠层（按 F 切换）
//
//  · showPerfHud === false 时函数开头立即 return，零开销
//  · 每帧采样 deltaTime，维护 60 帧环形缓冲，从中算
//    平均 FPS / 最大帧时间 / 最小 FPS
//  · 在所有游戏阶段（菜单/战斗/结算）都绘制，方便对比
//  · 计数数据取自已有的全局数组：manager.monsters / towers /
//    projectiles / particles / _cannonBlasts / _mortarShells /
//    _chainArcs —— 任一未定义则显示 "-"
//
//  依赖：state.js（showPerfHud）
// ============================================================

// ── 采样环形缓冲 ──
const PERF_SAMPLE_N = 60;          // 1 秒（60fps 下）
const _perfDt = new Float32Array(PERF_SAMPLE_N);
let _perfIdx = 0;
let _perfFilled = 0;

// ── 文案缓存（每 0.5s 刷一次文本，避免每帧 text 抖动）──
const _perfStr = { fps: '0', dt: '0.0', lo: '0', hi: '0.0', counts: '' };
let _perfLastRefreshMs = 0;
const PERF_REFRESH_MS = 500;

function drawPerfHud() {
  if (!showPerfHud) return;

  // 1. 采样当前帧
  //    deltaTime 是 p5 提供的上一帧到本帧的毫秒数
  const dt = (typeof deltaTime === 'number' && deltaTime > 0) ? deltaTime : 16.67;
  _perfDt[_perfIdx] = dt;
  _perfIdx = (_perfIdx + 1) % PERF_SAMPLE_N;
  if (_perfFilled < PERF_SAMPLE_N) _perfFilled++;

  // 2. 汇总（每 PERF_REFRESH_MS 毫秒刷一次）
  const nowMs = (typeof millis === 'function') ? millis() : performance.now();
  if (nowMs - _perfLastRefreshMs >= PERF_REFRESH_MS) {
    _perfLastRefreshMs = nowMs;
    let sum = 0, maxDt = 0;
    for (let i = 0; i < _perfFilled; i++) {
      const v = _perfDt[i];
      sum += v;
      if (v > maxDt) maxDt = v;
    }
    const avgDt = sum / Math.max(1, _perfFilled);
    const avgFps = 1000 / avgDt;
    const minFps = 1000 / Math.max(0.001, maxDt);
    _perfStr.fps = avgFps.toFixed(0);
    _perfStr.dt  = avgDt.toFixed(1);
    _perfStr.hi  = maxDt.toFixed(1);
    _perfStr.lo  = minFps.toFixed(0);

    // 计数（小心未定义的全局）
    const nm = (typeof manager !== 'undefined' && manager && manager.monsters) ? manager.monsters.length : '-';
    const nt = (typeof towers !== 'undefined') ? towers.length : '-';
    const np = (typeof projectiles !== 'undefined') ? projectiles.length : '-';
    const nx = (typeof particles !== 'undefined') ? particles.length : '-';
    const nc = (typeof _cannonBlasts !== 'undefined') ? _cannonBlasts.length : '-';
    const nMort = (typeof _mortarShells !== 'undefined') ? _mortarShells.length : '-';
    const nArc = (typeof _chainArcs !== 'undefined') ? _chainArcs.length : '-';
    _perfStr.counts = `M:${nm}  T:${nt}  P:${np}  FX:${nx}  B:${nc}/${nMort}  ARC:${nArc}`;
  }

  // 3. 绘制（左下角，紧凑两行）
  push();
  textFont('monospace');
  textAlign(LEFT, TOP);
  textSize(11);

  const pad = 6;
  const lineH = 14;
  const rows = [
    `FPS ${_perfStr.fps}  (min ${_perfStr.lo})  dt ${_perfStr.dt}ms  max ${_perfStr.hi}ms`,
    _perfStr.counts,
    `phase:${gamePhase}${gamePaused ? '  ⏸' : ''}${tutorialActive ? '  T' : ''}`,
  ];
  // 根据最长行估宽（monospace 11px 每字符约 6.6px）
  let maxLen = 0;
  for (const r of rows) if (r.length > maxLen) maxLen = r.length;
  const boxW = Math.ceil(maxLen * 6.6) + pad * 2;
  const boxH = rows.length * lineH + pad * 2 - 2;
  const boxX = 6;
  const boxY = height - boxH - 6;

  noStroke();
  fill(0, 0, 0, 180);
  rect(boxX, boxY, boxW, boxH, 3);
  stroke(0, 220, 180, 120); strokeWeight(1); noFill();
  rect(boxX, boxY, boxW, boxH, 3);

  // FPS 颜色分档：≥55 绿 / ≥40 黄 / <40 红
  const fpsNum = parseFloat(_perfStr.fps);
  const fpsCol = fpsNum >= 55 ? [0, 255, 160]
                : fpsNum >= 40 ? [255, 220, 80]
                               : [255, 90, 90];
  noStroke(); fill(fpsCol[0], fpsCol[1], fpsCol[2], 235);
  text(rows[0], boxX + pad, boxY + pad);
  fill(180, 220, 240, 220);
  text(rows[1], boxX + pad, boxY + pad + lineH);
  fill(140, 200, 220, 180);
  text(rows[2], boxX + pad, boxY + pad + lineH * 2);

  pop();
  resetTextAlign();
}

// ── 切换（由 sketch.js keyPressed 调用）──
function togglePerfHud() {
  showPerfHud = !showPerfHud;
  try { localStorage.setItem('qd_perf', showPerfHud ? '1' : '0'); } catch (e) {}
  // 清空环形缓冲，重新采样，避免旧 pause 期间的异常 dt 污染新读数
  _perfIdx = 0;
  _perfFilled = 0;
  _perfLastRefreshMs = 0;
}
