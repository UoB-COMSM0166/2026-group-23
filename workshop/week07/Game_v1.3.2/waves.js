// ============================================================
//  waves.js — 波次配置与波次推进系统
//  负责人：张洵
// ============================================================

const WAVE_CONFIG = [
  [ ['snake',6,190,0] ],
  [ ['snake',7,175,0], ['spider',6,185,60] ],
  [ ['snake',5,160,0], ['spider',4,170,50], ['boss1',1,9999,20] ],
  [ ['snake',8,155,0], ['spider',7,160,40], ['robot',5,180,80], ['phoenix',3,220,160] ],
  [ ['snake',6,145,0], ['spider',5,150,30], ['robot',5,165,80], ['phoenix',4,200,160], ['boss2',1,9999,40] ],
  [ ['snake',9,140,0], ['spider',8,145,35], ['robot',6,160,80], ['phoenix',5,190,150] ],
  [ ['snake',10,125,0], ['spider',9,130,30], ['robot',8,145,65], ['phoenix',6,175,130] ],
  [ ['snake',12,110,0], ['spider',10,115,25], ['robot',9,130,60], ['phoenix',8,155,120] ],
  [ ['snake',12,100,0], ['spider',11,105,20], ['robot',10,120,55], ['phoenix',9,140,110] ],
  [ ['snake',8,120,0], ['spider',7,125,30], ['robot',6,140,70], ['phoenix',5,165,130], ['boss3',1,9999,50] ],
];

// 波次间隔倒计时（小游戏结束后才开始计）
let waveCountdownActive = false;

function launchWave(n) {
  waveNum = n;
  waveState = 'fighting';
  waveCountdownActive = false;
  if (n <= 0 || n > WAVE_CONFIG.length) return;
  const cfg = WAVE_CONFIG[n - 1];
  for (const [type, count, interval, delay] of cfg) {
    manager.enqueueWave(type, count, interval, delay);
  }
}

// 游戏启动时调用，先触发小游戏，小游戏结束后再开始倒计时
function beginAutoWave() {
  waveNum = 0;
  waveState = 'countdown';
  waveCountdownActive = false;   // 等小游戏结束后才激活
  waveCountdownEnd    = 0;
  if (typeof startMinigame === 'function') {
    startMinigame();
  }
}

function updateWaveSystem() {
  if (waveState === 'complete') return;
  if (waveState === 'waiting')  return;

  if (waveState === 'countdown') {
    // 如果小游戏刚结束（idle），激活倒计时
    if (!waveCountdownActive && minigameState === 'idle') {
      waveCountdownActive = true;
      waveCountdownEnd    = frameCount + COUNTDOWN_FRAMES;
    }
    // 倒计时激活后才推进
    if (waveCountdownActive && frameCount >= waveCountdownEnd) {
      launchWave(waveNum + 1);
    }
    return;
  }

  if (waveState === 'fighting') {
    if (manager.queue.length === 0 && manager.monsters.length === 0) {
      if (waveNum >= TOTAL_WAVES) {
        waveState = 'complete';
      } else {
        // 本波结束 → 切到 countdown，先触发小游戏
        waveState = 'countdown';
        waveCountdownActive = false;
        waveCountdownEnd    = 0;
        if (typeof startMinigame === 'function' && minigameState === 'idle') {
          startMinigame();
        }
      }
    }
  }
}