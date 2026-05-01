// ============================================================
//  audio.js — Audio manager (BGM + SFX)
//
//  Design notes:
//   . Native HTMLAudioElement; no p5.sound, zero dependencies.
//   . Browsers block autoplay until the first user interaction.
//     setBgm() / playSfx() in this module record the desired BGM
//     before unlock and play it once unlockAudio() fires.
//   . Missing files fail silently (load errors are swallowed).
//   . Mute state is persisted to localStorage['qd_muted'].
//
//  Dependencies: state.js (audioMuted).
// ============================================================

const AUDIO_MUTED_KEY = 'qd_muted';

// -- Volume settings --
const BGM_VOLUME = 0.45;
const SFX_VOLUME = 0.7;

// -- File paths (relative to index.html) --
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

// -- Internal state --
const _bgmCache = Object.create(null);   // name -> HTMLAudioElement (singleton, looped)
const _sfxCache = Object.create(null);   // name -> HTMLAudioElement (used as a template; cloneNode on each play)
let _currentBgm = null;                   // Currently playing Audio object
let _desiredBgm = null;                   // Pending BGM name (queued before audio unlock)
let _audioUnlocked = false;

// ============================================================
//  Public API
// ============================================================

/** Called on the first user click; unlocks autoplay and plays the queued BGM. */
function unlockAudio() {
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  if (_desiredBgm) _startBgm(_desiredBgm);
}

/** Switch BGM (same track does not restart). Pass null to stop. */
function setBgm(name) {
  if (_desiredBgm === name) return;
  _desiredBgm = name;
  if (!_audioUnlocked) return;     // Wait for the first click
  _startBgm(name);
}

/** Stop the current BGM. */
function stopBgm() { setBgm(null); }

/** Play a one-shot SFX. Supports overlap (clone playback). */
function playSfx(name) {
  if (audioMuted) return;
  const src = SFX_FILES[name];
  if (!src) return;
  try {
    let tmpl = _sfxCache[name];
    if (!tmpl) {
      tmpl = new Audio(src);
      tmpl.preload = 'auto';
      tmpl.addEventListener('error', () => { /* Silently ignore missing files */ });
      _sfxCache[name] = tmpl;
    }
    // Clone the node so multiple instances can overlap (e.g. rapid clicks / bursts)
    const inst = tmpl.cloneNode();
    inst.volume = SFX_VOLUME;
    const p = inst.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (e) { /* Silent */ }
}

/** Toggle mute and refresh the persisted flag. */
function setAudioMuted(muted) {
  audioMuted = !!muted;
  try { localStorage.setItem(AUDIO_MUTED_KEY, audioMuted ? '1' : '0'); } catch (e) {}
  if (_currentBgm) _currentBgm.muted = audioMuted;
}

function toggleAudioMuted() { setAudioMuted(!audioMuted); }

// ============================================================
//  Internal
// ============================================================
function _startBgm(name) {
  // Stop the previous one
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
      a.addEventListener('error', () => { /* Silently ignore missing files */ });
      _bgmCache[name] = a;
    }
    a.muted = audioMuted;
    a.currentTime = 0;
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    _currentBgm = a;
  } catch (e) { /* Silent */ }
}
