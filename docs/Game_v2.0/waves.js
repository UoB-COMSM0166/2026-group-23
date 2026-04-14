// ============================================================
//  waves.js — 波次推进系统（运行时逻辑）
//  波次配置数据已抽离到 data/waves.js（WAVE_CONFIGS / WAVE_CONFIG）
// ============================================================


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