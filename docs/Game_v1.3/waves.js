// ============================================================
//  waves.js — 波次配置与波次推进系统
// ============================================================

const WAVE_CONFIG = [
  // Wave 1 — 入门：蛇+蜘蛛
  [ ['snake',6,190,0], ['spider',4,185,60] ],
  // Wave 2 — 加入坦克
  [ ['snake',7,175,0], ['spider',6,185,60], ['tank',2,240,90] ],
  // Wave 3 — Boss1 + 两种空中怪，错开出场（随机offset由launchWave动态处理）
  [ ['snake',5,160,0], ['spider',4,170,50], ['phoenix',2,220,100], ['ghostbird',2,220,160], ['boss1',1,9999,20] ],
  // Wave 4 — 机器人，两鸟错开
  [ ['snake',8,155,0], ['spider',7,160,40], ['robot',5,180,80], ['phoenix',3,210,130], ['ghostbird',3,200,185] ],
  // Wave 5 — Boss2 + 坦克
  [ ['snake',6,145,0], ['spider',5,150,30], ['robot',5,165,80], ['tank',3,200,60], ['phoenix',4,195,120], ['ghostbird',4,185,175], ['boss2',1,9999,40] ],
  // Wave 6
  [ ['snake',9,140,0], ['spider',8,145,35], ['robot',6,160,80], ['tank',3,190,60], ['phoenix',5,185,110], ['ghostbird',5,175,165] ],
  // Wave 7
  [ ['snake',10,125,0], ['spider',9,130,30], ['robot',8,145,65], ['tank',4,175,50], ['phoenix',6,170,100], ['ghostbird',6,160,150] ],
  // Wave 8
  [ ['snake',12,110,0], ['spider',10,115,25], ['robot',9,130,60], ['tank',4,160,45], ['phoenix',8,150,90], ['ghostbird',8,140,140] ],
  // Wave 9
  [ ['snake',12,100,0], ['spider',11,105,20], ['robot',10,120,55], ['tank',5,150,40], ['phoenix',9,135,80], ['ghostbird',9,125,130] ],
  // Wave 10 — 最终关：全部怪 + Boss3
  [ ['snake',8,120,0], ['spider',7,125,30], ['robot',6,140,70], ['tank',3,180,50], ['phoenix',5,160,100], ['ghostbird',5,150,155], ['boss3',1,9999,50] ],
];

let waveCountdownActive = false;

function launchWave(n) {
  waveNum = n;
  waveState = 'fighting';
  waveCountdownActive = false;
  if (n <= 0 || n > WAVE_CONFIG.length) return;
  const cfg = WAVE_CONFIG[n - 1];
  for (const [type, count, interval, delay] of cfg) {
    // 给两种飞行怪各加随机偏移，让它们不会并排贴着出现
    let actualDelay = delay;
    if (type === 'phoenix' || type === 'ghostbird') {
      actualDelay = delay + Math.floor(Math.random() * 80);
    }
    manager.enqueueWave(type, count, interval, actualDelay);
  }
}

function beginAutoWave() {
  waveNum = 0;
  waveState = 'countdown';
  waveCountdownActive = false;
  waveCountdownEnd    = 0;
  if (typeof startMinigame === 'function') {
    startMinigame();
  }
}

function updateWaveSystem() {
  if (waveState === 'complete') return;
  if (waveState === 'waiting')  return;

  if (waveState === 'countdown') {
    const panelActive = (typeof waveEndPanelVisible !== 'undefined') && waveEndPanelVisible;
    if (!waveCountdownActive && minigameState === 'idle' && !panelActive) {
      waveCountdownActive = true;
      waveCountdownEnd    = frameCount + COUNTDOWN_FRAMES;
    }
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
        waveState = 'countdown';
        waveCountdownActive = false;
        waveCountdownEnd    = 0;
        if (typeof showWaveEndPanel === 'function') {
          showWaveEndPanel();
        } else if (typeof startMinigame === 'function' && minigameState === 'idle') {
          startMinigame();
        }
      }
    }
  }
}