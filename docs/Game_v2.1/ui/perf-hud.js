// ============================================================
//  ui/perf-hud.js — Performance overlay (toggle with F)
//
//  . When showPerfHud === false, returns at the very top of the function (zero overhead)
//  . Samples deltaTime each frame, maintains a 60-frame ring buffer, derives
//    average FPS / max frame time / min FPS
//  . Draws in every game phase (menu / combat / end), useful for comparison
//  . Counts come from existing globals: manager.monsters / towers /
//    projectiles / particles / _cannonBlasts / _mortarShells /
//    _chainArcs - any one being undefined shows '-'
//
//  Dependencies: state.js (showPerfHud)
// ============================================================

// -- Sample ring buffer --
const PERF_SAMPLE_N = 60;          // 1 second (at 60fps)
const _perfDt = new Float32Array(PERF_SAMPLE_N);
let _perfIdx = 0;
let _perfFilled = 0;

// -- Text cache (refresh every 0.5s to avoid per-frame text jitter) --
const _perfStr = { fps: '0', dt: '0.0', lo: '0', hi: '0.0', counts: '' };
let _perfLastRefreshMs = 0;
const PERF_REFRESH_MS = 500;

function drawPerfHud() {
  if (!showPerfHud) return;

  // 1. Sample current frame
  //    deltaTime is the milliseconds since the previous frame, provided by p5
  const dt = (typeof deltaTime === 'number' && deltaTime > 0) ? deltaTime : 16.67;
  _perfDt[_perfIdx] = dt;
  _perfIdx = (_perfIdx + 1) % PERF_SAMPLE_N;
  if (_perfFilled < PERF_SAMPLE_N) _perfFilled++;

  // 2. Aggregate (refresh every PERF_REFRESH_MS milliseconds)
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

    // Counts (be careful with undefined globals)
    const nm = (typeof manager !== 'undefined' && manager && manager.monsters) ? manager.monsters.length : '-';
    const nt = (typeof towers !== 'undefined') ? towers.length : '-';
    const np = (typeof projectiles !== 'undefined') ? projectiles.length : '-';
    const nx = (typeof particles !== 'undefined') ? particles.length : '-';
    const nc = (typeof _cannonBlasts !== 'undefined') ? _cannonBlasts.length : '-';
    const nMort = (typeof _mortarShells !== 'undefined') ? _mortarShells.length : '-';
    const nArc = (typeof _chainArcs !== 'undefined') ? _chainArcs.length : '-';
    _perfStr.counts = `M:${nm}  T:${nt}  P:${np}  FX:${nx}  B:${nc}/${nMort}  ARC:${nArc}`;
  }

  // 3. Draw (bottom left, compact two lines)
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
  // Estimate width from the longest line (monospace 11px ~ 6.6px per char)
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

  // FPS color tier: >=55 green / >=40 yellow / <40 red
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

// -- Toggle (called from sketch.js keyPressed) --
function togglePerfHud() {
  showPerfHud = !showPerfHud;
  try { localStorage.setItem('qd_perf', showPerfHud ? '1' : '0'); } catch (e) {}
  // Clear the ring buffer and resample, so abnormal dt during the previous pause does not pollute new readings
  _perfIdx = 0;
  _perfFilled = 0;
  _perfLastRefreshMs = 0;
}
