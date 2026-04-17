// ============================================================
//  audio.js — 音频管理（BGM + SFX）
//
//  设计要点：
//   · 原生 HTMLAudioElement，不引入 p5.sound，保持零依赖。
//   · 浏览器会阻止页面加载后自动播放，直到用户首次交互。
//     本模块的 setBgm() / playSfx() 在解锁前会把"期望 BGM"记下，
//     首次 unlockAudio() 触发时补播。
//   · 文件缺失时静默失败（load error 被吃掉）。
//   · 静音状态持久化到 localStorage['qd_muted']。
//
//  依赖：state.js（audioMuted）。
// ============================================================

const AUDIO_MUTED_KEY = 'qd_muted';

// ── 音量配置 ──
const BGM_VOLUME = 0.45;
const SFX_VOLUME = 0.7;

// ── 文件路径（相对 index.html）──
const BGM_FILES = {
  launch: 'assert/audio/bgm/launch.mp3',
  level1: 'assert/audio/bgm/level1.mp3',
  level2: 'assert/audio/bgm/level2.mp3',
  level3: 'assert/audio/bgm/level3.mp3',
  level4: 'assert/audio/bgm/level4.mp3',
  level5: 'assert/audio/bgm/level5.mp3',
};

const SFX_FILES = {
  click:   'assert/audio/sfx/click.wav',
  place:   'assert/audio/sfx/place.mp3',
  explode: 'assert/audio/sfx/explode.wav',
  win:     'assert/audio/sfx/win.wav',
  lose:    'assert/audio/sfx/lose.wav',
};

// ── 内部状态 ──
const _bgmCache = Object.create(null);   // name → HTMLAudioElement (单例，循环)
const _sfxCache = Object.create(null);   // name → HTMLAudioElement (作为模板，每次 cloneNode 播放)
let _currentBgm = null;                   // 当前播放的 Audio 对象
let _desiredBgm = null;                   // 期望播放的 BGM 名（用于解锁前排队）
let _audioUnlocked = false;

// ============================================================
//  公开 API
// ============================================================

/** 首次用户点击时调用，解锁自动播放限制并补播期望 BGM。 */
function unlockAudio() {
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  if (_desiredBgm) _startBgm(_desiredBgm);
}

/** 切换 BGM（相同曲不重启）。传 null 停止。 */
function setBgm(name) {
  if (_desiredBgm === name) return;
  _desiredBgm = name;
  if (!_audioUnlocked) return;     // 等首次点击
  _startBgm(name);
}

/** 停止当前 BGM。 */
function stopBgm() { setBgm(null); }

/** 播放一次性音效。支持重叠（clone 播放）。 */
function playSfx(name) {
  if (audioMuted) return;
  const src = SFX_FILES[name];
  if (!src) return;
  try {
    let tmpl = _sfxCache[name];
    if (!tmpl) {
      tmpl = new Audio(src);
      tmpl.preload = 'auto';
      tmpl.addEventListener('error', () => { /* 文件缺失时静默 */ });
      _sfxCache[name] = tmpl;
    }
    // 克隆节点以支持重叠播放（例如连续点击 / 连发）
    const inst = tmpl.cloneNode();
    inst.volume = SFX_VOLUME;
    const p = inst.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (e) { /* 静默 */ }
}

/** 切换静音并刷新持久化标志。 */
function setAudioMuted(muted) {
  audioMuted = !!muted;
  try { localStorage.setItem(AUDIO_MUTED_KEY, audioMuted ? '1' : '0'); } catch (e) {}
  if (_currentBgm) _currentBgm.muted = audioMuted;
}

function toggleAudioMuted() { setAudioMuted(!audioMuted); }

// ============================================================
//  内部
// ============================================================
function _startBgm(name) {
  // 停旧
  if (_currentBgm) {
    try { _currentBgm.pause(); _currentBgm.currentTime = 0; } catch (e) {}
    _currentBgm = null;
  }
  if (!name) return;
  const src = BGM_FILES[name];
  if (!src) return;
  try {
    let a = _bgmCache[name];
    if (!a) {
      a = new Audio(src);
      a.loop = true;
      a.preload = 'auto';
      a.volume = BGM_VOLUME;
      a.addEventListener('error', () => { /* 文件缺失时静默 */ });
      _bgmCache[name] = a;
    }
    a.muted = audioMuted;
    a.currentTime = 0;
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    _currentBgm = a;
  } catch (e) { /* 静默 */ }
}
