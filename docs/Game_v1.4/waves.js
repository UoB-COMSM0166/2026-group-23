// ============================================================
//  waves.js — 5关卡独立波次配置 + 波次推进系统
// ============================================================

// ============================================================
//  各关卡波次配置
//  格式: [type, count, interval, delay]
//  type: snake/spider/tank/robot/phoenix/ghostbird/boss1/boss2/boss3
// ============================================================
const WAVE_CONFIGS = {
  // ── 关卡1: SECTOR ALPHA — 入门，6波，以蛇和蜘蛛为主 ──
  1: [
    // W1 纯步兵
    [ ['snake',5,200,0] ],
    // W2 蜘蛛加入
    [ ['snake',6,185,0], ['spider',3,200,80] ],
    // W3 双路进攻
    [ ['snake',7,175,0], ['spider',5,190,60] ],
    // W4 首次飞行威胁
    [ ['snake',6,165,0], ['spider',5,180,50], ['phoenix',2,220,110] ],
    // W5 机器人登场
    [ ['snake',8,155,0], ['spider',6,165,40], ['robot',3,190,90], ['phoenix',2,210,130] ],
    // W6 小Boss收尾
    [ ['snake',8,145,0], ['spider',7,155,35], ['robot',4,175,80], ['phoenix',3,200,120], ['boss1',1,9999,30] ],
  ],

  // ── 关卡2: NEBULA RIFT — 中级，7波，飞行怪大量 ──
  2: [
    // W1 混编起步
    [ ['snake',6,180,0], ['spider',4,190,70] ],
    // W2 飞行先锋
    [ ['snake',7,170,0], ['spider',5,180,55], ['phoenix',3,210,100] ],
    // W3 幽灵鸟
    [ ['snake',7,160,0], ['spider',6,170,45], ['phoenix',3,205,95], ['ghostbird',2,215,155] ],
    // W4 重装甲加入
    [ ['snake',8,150,0], ['spider',6,158,40], ['tank',2,230,75], ['phoenix',4,195,115], ['ghostbird',3,205,175] ],
    // W5 Boss1
    [ ['snake',7,140,0], ['spider',7,148,35], ['robot',4,170,80], ['phoenix',4,185,120], ['boss1',1,9999,50] ],
    // W6 双飞行精锐
    [ ['snake',9,130,0], ['spider',8,138,30], ['robot',5,158,70], ['phoenix',5,178,110], ['ghostbird',5,168,160] ],
    // W7 Boss2终局
    [ ['snake',8,120,0], ['spider',8,128,28], ['robot',5,148,65], ['tank',3,185,55], ['phoenix',5,168,105], ['ghostbird',5,158,155], ['boss2',1,9999,45] ],
  ],

  // ── 关卡3: IRON CITADEL — 高级，8波，原始关卡配置强化版 ──
  3: [
    [ ['snake',6,190,0], ['spider',4,185,60] ],
    [ ['snake',7,175,0], ['spider',6,185,60], ['tank',2,240,90] ],
    [ ['snake',5,160,0], ['spider',4,170,50], ['phoenix',2,220,100], ['ghostbird',2,220,160], ['boss1',1,9999,20] ],
    [ ['snake',8,155,0], ['spider',7,160,40], ['robot',5,180,80], ['phoenix',3,210,130], ['ghostbird',3,200,185] ],
    [ ['snake',6,145,0], ['spider',5,150,30], ['robot',5,165,80], ['tank',3,200,60], ['phoenix',4,195,120], ['ghostbird',4,185,175], ['boss2',1,9999,40] ],
    [ ['snake',9,140,0], ['spider',8,145,35], ['robot',6,160,80], ['tank',3,190,60], ['phoenix',5,185,110], ['ghostbird',5,175,165] ],
    [ ['snake',10,125,0], ['spider',9,130,30], ['robot',8,145,65], ['tank',4,175,50], ['phoenix',6,170,100], ['ghostbird',6,160,150] ],
    [ ['snake',10,110,0], ['spider',9,115,25], ['robot',8,128,58], ['tank',4,160,44], ['phoenix',7,148,88], ['ghostbird',7,138,138], ['boss3',1,9999,48] ],
  ],

  // ── 关卡4: VOID MAZE — 高速迷宫，9波，快速怪为主 ──
  4: [
    // W1 快速蜘蛛群
    [ ['spider',8,170,0], ['snake',5,190,60] ],
    // W2 蜘蛛+飞鸟
    [ ['spider',9,160,0], ['snake',6,175,50], ['phoenix',3,200,100] ],
    // W3 机器人高速
    [ ['snake',8,150,0], ['spider',10,155,35], ['robot',5,168,80], ['phoenix',3,195,120] ],
    // W4 幽灵鸟突袭
    [ ['snake',9,140,0], ['spider',10,145,30], ['robot',6,160,72], ['ghostbird',5,175,130] ],
    // W5 Boss1 + 坦克
    [ ['snake',9,130,0], ['spider',10,135,28], ['tank',4,190,55], ['phoenix',4,175,110], ['boss1',1,9999,45] ],
    // W6 全精锐
    [ ['snake',10,122,0], ['spider',11,127,25], ['robot',7,148,66], ['tank',4,178,52], ['phoenix',5,165,105], ['ghostbird',5,155,155] ],
    // W7 Boss2
    [ ['snake',10,112,0], ['spider',11,117,22], ['robot',8,138,62], ['tank',5,168,48], ['phoenix',6,155,98], ['ghostbird',6,145,148], ['boss2',1,9999,42] ],
    // W8 双Boss突破
    [ ['snake',11,100,0], ['spider',12,105,20], ['robot',9,125,55], ['tank',5,158,44], ['phoenix',7,142,88], ['ghostbird',7,132,135] ],
    // W9 终局大潮
    [ ['snake',12,92,0], ['spider',13,97,18], ['robot',10,115,50], ['tank',6,148,40], ['phoenix',8,132,82], ['ghostbird',8,122,128], ['boss3',1,9999,38] ],
  ],

  // ── 关卡5: OMEGA GATE — 终极，10波，全精英+三Boss ──
  5: [
    // W1 精英先锋
    [ ['snake',8,175,0], ['spider',7,180,55], ['robot',3,200,100] ],
    // W2 空地双压
    [ ['snake',9,165,0], ['spider',8,170,48], ['robot',4,188,90], ['phoenix',4,205,130], ['ghostbird',3,195,180] ],
    // W3 Boss1突袭
    [ ['snake',8,155,0], ['spider',8,160,42], ['robot',5,175,84], ['tank',3,215,65], ['phoenix',4,192,118], ['boss1',1,9999,40] ],
    // W4 重装突破
    [ ['snake',10,145,0], ['spider',9,150,38], ['robot',6,165,78], ['tank',4,200,60], ['phoenix',5,182,112], ['ghostbird',5,172,162] ],
    // W5 Boss2 + 全兵种
    [ ['snake',9,135,0], ['spider',9,140,34], ['robot',6,155,72], ['tank',4,188,56], ['phoenix',5,172,108], ['ghostbird',5,162,155], ['boss2',1,9999,48] ],
    // W6 精锐强化
    [ ['snake',11,125,0], ['spider',10,130,30], ['robot',8,145,68], ['tank',4,178,52], ['phoenix',6,162,102], ['ghostbird',6,152,148] ],
    // W7 终极高速
    [ ['snake',12,115,0], ['spider',11,120,26], ['robot',9,135,62], ['tank',5,165,48], ['phoenix',7,150,95], ['ghostbird',7,140,142] ],
    // W8 Boss3先锋
    [ ['snake',11,105,0], ['spider',11,110,23], ['robot',9,125,58], ['tank',5,158,44], ['phoenix',7,140,88], ['ghostbird',7,130,135], ['boss3',1,9999,52] ],
    // W9 全面猛攻
    [ ['snake',13,95,0], ['spider',12,100,20], ['robot',10,115,52], ['tank',6,148,40], ['phoenix',8,130,82], ['ghostbird',8,120,128] ],
    // W10 OMEGA终局：Boss全家桶
    [ ['snake',10,115,0], ['spider',9,120,28], ['robot',8,135,65], ['tank',4,175,48], ['phoenix',6,155,98], ['ghostbird',6,145,148], ['boss1',1,9999,35], ['boss2',1,9999,180], ['boss3',1,9999,320] ],
  ],
};

// 兼容性：也保留 WAVE_CONFIG（ui.js 里可能引用）
const WAVE_CONFIG = WAVE_CONFIGS[3]; // 默认用关卡3的配置

let waveCountdownActive = false;

function launchWave(n) {
  waveNum = n;
  waveState = 'fighting';
  waveCountdownActive = false;
  const lv = (typeof currentLevel !== 'undefined') ? currentLevel : 1;
  const cfg = WAVE_CONFIGS[lv];
  if (!cfg || n <= 0 || n > cfg.length) return;
  const waveCfg = cfg[n - 1];
  for (const [type, count, interval, delay] of waveCfg) {
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
