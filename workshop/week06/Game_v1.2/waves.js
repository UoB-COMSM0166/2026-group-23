// ============================================================
//  waves.js — 波次配置与波次推进系统
//  负责人：张洵（波次控制逻辑）
//  依赖：globals.js, monsters.js
// ============================================================

// ── 波次配置表（W1-W10）──
const WAVE_CONFIG = [
  // W1 热身
  [ ['snake',6,190,0] ],
  // W2 双路
  [ ['snake',7,175,0], ['spider',6,185,60] ],
  // W3 Boss①
  [ ['snake',5,160,0], ['spider',4,170,50], ['boss1',1,9999,20] ],
  // W4 引入机器人与烈焰鸟
  [ ['snake',8,155,0], ['spider',7,160,40], ['robot',5,180,80], ['phoenix',3,220,160] ],
  // W5 Boss②
  [ ['snake',6,145,0], ['spider',5,150,30], ['robot',5,165,80], ['phoenix',4,200,160], ['boss2',1,9999,40] ],
  // W6 高密度
  [ ['snake',9,140,0], ['spider',8,145,35], ['robot',6,160,80], ['phoenix',5,190,150] ],
  // W7 精英波
  [ ['snake',10,125,0], ['spider',9,130,30], ['robot',8,145,65], ['phoenix',6,175,130] ],
  // W8 地狱密度
  [ ['snake',12,110,0], ['spider',10,115,25], ['robot',9,130,60], ['phoenix',8,155,120] ],
  // W9 最终冲刺
  [ ['snake',12,100,0], ['spider',11,105,20], ['robot',10,120,55], ['phoenix',9,140,110] ],
  // W10 最终Boss
  [ ['snake',8,120,0], ['spider',7,125,30], ['robot',6,140,70], ['phoenix',5,165,130], ['boss3',1,9999,50] ],
];

// ── 启动第 n 波 ──
function launchWave(n) {
  waveNum = n;
  waveState = 'fighting';
  if (n <= 0 || n > WAVE_CONFIG.length) return;
  const cfg = WAVE_CONFIG[n-1];
  for (const [type, count, interval, delay] of cfg) {
    manager.enqueueWave(type, count, interval, delay);
  }
}

// ── 第一波开始 ──
function beginAutoWave() {
  waveNum = 0;
  waveState = 'countdown';
  waveCountdownEnd = frameCount + 180;
}

// ── 每帧调用：波次状态推进 ──
function updateWaveSystem() {
  if (waveState === 'complete') return;
  if (waveState === 'waiting') return;
  if (waveState === 'countdown') {
    if (frameCount >= waveCountdownEnd) launchWave(waveNum + 1);
    return;
  }
  if (waveState === 'fighting') {
    if (manager.queue.length === 0 && manager.monsters.length === 0) {
      if (waveNum >= TOTAL_WAVES) waveState = 'complete';
      else { waveState = 'countdown'; waveCountdownEnd = frameCount + COUNTDOWN_FRAMES; }
    }
  }
}
