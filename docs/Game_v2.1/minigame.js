// ============================================================
//  minigame.js — Ball-throwing minigame (gate version)
//  Gameplay: player clicks to choose the launch X position
//        balls pass through vertical 'gates' (+N / -N / xN) that change the count
//        landing on the bottom resolves -> coins
//  States: 'idle' -> 'aiming' -> 'playing' -> 'result'
// ============================================================

let minigameState     = 'idle';
let minigameResult    = 0;
let minigameInitBalls = 10;
let _bonusBallPending = 0;   // After triggering a bonusball gate, the next round adds them to initBalls; cleared after the round

// -- Help panel (question mark) --
let _mgHelpOpen        = false;
let _mgHelpSeen        = false;   // Whether help has been shown this session
const MG_HELP_FLAG_KEY = 'qd_mg_help_seen';

// -- Panel area --
let MG = { x:0, y:0, w:0, h:0 };

// -- Balls --
// { x, y, vx, vy, alive, settled }
let mgBalls = [];
const BALL_R      = 7;
const GRAVITY     = 0.13;   // Slow fall
const WALL_BOUNCE = 0.42;
const FRICTION    = 0.984;

// -- Aiming --
let aimX        = 0;    // Player-chosen launch X
let aimConfirmed = false;

// -- Launch cadence --
let shootTimer  = 0;
let shootCount  = 0;   // Number of balls already launched
let shootTotal  = 0;   // Total launches this round (varies as gates trigger)
let shootDone   = false;

// -- Gates --
// { x, y, w, h, type:'add'|'sub'|'mul', value, label, col, triggered, flashTimer }
// Each row of gates is laid out horizontally; balls trigger them as they pass
let mgGates = [];

// -- Result --
let resultTimer   = 0;
const RESULT_SHOW = 200;

// -- Particles --
let mgParticles = [];

// -- Bottom-landed balls --
let landedBalls = 0;

// -- Pending-add queue (avoid mutating arrays during iteration) --
let spawnQueue = [];

// -- Gate layout constraints and reroll scoring (three difficulty presets) --
const MG_LAYOUT_PRESETS = {
  conservative: {
    rules: {
      maxBouncePerRow: 1,
      bounceSameColXTol: 62,
      maxRerolls: 3,
      minAcceptScoreEasy: 3,
      minAcceptScoreHard: 2,
    },
    weights: {
      mul: 1.25,
      bonus: 0.9,
      sub: -1.0,
      bounce: -0.5,
      sameColBouncePenalty: -1.8,
    },
  },
  standard: {
    rules: {
      maxBouncePerRow: 1,
      bounceSameColXTol: 54,
      maxRerolls: 2,
      minAcceptScoreEasy: 2,
      minAcceptScoreHard: 1,
    },
    weights: {
      mul: 1.2,
      bonus: 0.8,
      sub: -0.9,
      bounce: -0.35,
      sameColBouncePenalty: -1.5,
    },
  },
  aggressive: {
    rules: {
      maxBouncePerRow: 1,
      bounceSameColXTol: 46,
      maxRerolls: 1,
      minAcceptScoreEasy: 1,
      minAcceptScoreHard: 0,
    },
    weights: {
      mul: 1.1,
      bonus: 0.7,
      sub: -0.8,
      bounce: -0.2,
      sameColBouncePenalty: -1.0,
    },
  },
};

const MG_LAYOUT_PRESET_NAME = 'standard';
const MG_GATE_LAYOUT_RULES = MG_LAYOUT_PRESETS[MG_LAYOUT_PRESET_NAME].rules;
const MG_GATE_LAYOUT_SCORE_WEIGHTS = MG_LAYOUT_PRESETS[MG_LAYOUT_PRESET_NAME].weights;

// ============================================================
//  Public API
// ============================================================
function startMinigame() {
  minigameState  = 'aiming';
  minigameResult = 0;
  mgBalls        = [];
  mgGates        = [];
  mgParticles    = [];
  spawnQueue     = [];
  shootTimer     = 0;
  shootCount     = 0;
  // Apply the previous round's bonus balls, then reset (only effective for one round)
  shootTotal     = minigameInitBalls + _bonusBallPending;
  _bonusBallPending = 0;
  shootDone      = false;
  aimConfirmed   = false;
  landedBalls    = 0;

  _mgHelpOpen = false;
  // Check whether help has been seen before (show guide arrow on first entry)
  try { _mgHelpSeen = localStorage.getItem(MG_HELP_FLAG_KEY) === '1'; } catch(e) { _mgHelpSeen = false; }

  MG.x = 0;
  MG.y = HUD_HEIGHT;
  MG.w = width;
  MG.h = height - HUD_HEIGHT;

  _mgStars = null;   // Regenerate the starfield using the actual size
  aimX = MG.x + MG.w / 2;

  generateMinigameGates();
}

function endMinigame() {
  coins        += minigameResult;
  minigameState = 'idle';
}

function updateMinigame() {
  if (minigameState === 'idle') return;

  // Update gate slide positions during aiming so the player sees them moving before launching
  if (minigameState === 'aiming') {
    updateMinigameGates();
    return;
  }

  if (minigameState === 'playing') {
    emitMinigameBalls();

    // Add pending-spawn balls (safe; not mutating during iteration)
    for (const b of spawnQueue) mgBalls.push(b);
    spawnQueue = [];

    updateMinigameBalls();
    updateMinigameGates();
    updateMinigameParticles();
    checkMinigameSettlement();
  }

  if (minigameState === 'result') {
    resultTimer--;
    if (resultTimer <= 0) endMinigame();
  }
}

function drawMinigame() {
  if (minigameState === 'idle') return;
  drawMinigameBackground();
  drawMinigameGates();
  drawMinigameBalls();
  drawMinigameParticles();
  drawMinigameHUD();
  drawMgHelpBtn();
  if (!_mgHelpSeen) drawMgHelpGuide();
  if (_mgHelpOpen)  drawMgHelpPanel();
  if (minigameState === 'aiming') drawMinigameAimUI();
  if (minigameState === 'result') drawMinigameResultUI();
}

// Mouse click
function handleMinigameClick(mx, my) {
  if (minigameState === 'idle') return false;

  // Question-mark help button
  const hb = _mgHelpBtnRect();
  if (_mgInRect(mx, my, hb)) {
    _mgHelpOpen = !_mgHelpOpen;
    if (!_mgHelpSeen) {
      _mgHelpSeen = true;
      try { localStorage.setItem(MG_HELP_FLAG_KEY, '1'); } catch(e) {}
    }
    return true;
  }
  // Clicking anywhere closes the panel when it is open
  if (_mgHelpOpen) { _mgHelpOpen = false; return true; }

  if (minigameState === 'aiming') {
    aimX          = constrain(mx, MG.x + 20, MG.x + MG.w - 20);
    aimConfirmed  = true;
    minigameState = 'playing';
  }
  return true;
}

// Mouse move (follow during aiming)
function handleMinigameMove(mx, my) {
  if (minigameState === 'aiming') {
    aimX = constrain(mx, MG.x + 20, MG.x + MG.w - 20);
  }
}

// ============================================================
//  Gate generation
//  Layout: 6 rows, 2-3 gates per row, staggered horizontally
//  Type ratio: about 2 add/multiply gates and 1 subtract gate
// ============================================================
// -- Gate pool configuration --
// 'x' gates: standard weighted pool (hard / default)
const MUL_POOL_NORMAL = [
  { value:2, label:'×2', col:[255, 210,  0], weight:35 },
  { value:3, label:'×3', col:[255, 175,  0], weight:28 },
  { value:4, label:'×4', col:[255, 140,  0], weight:18 },
  { value:5, label:'×5', col:[255, 105, 10], weight: 9 },
  { value:6, label:'×6', col:[255,  75, 20], weight: 5 },
  { value:7, label:'×7', col:[255,  50, 35], weight: 3 },
  { value:8, label:'×8', col:[240,  30, 50], weight: 1 },
  { value:9, label:'×9', col:[220,  10, 60], weight: 1 },
];
// 'x' gates: easy weighted pool (much higher chance of large multipliers)
const MUL_POOL_EASY = [
  { value:2, label:'×2', col:[255, 210,  0], weight:15 },
  { value:3, label:'×3', col:[255, 175,  0], weight:20 },
  { value:4, label:'×4', col:[255, 140,  0], weight:22 },
  { value:5, label:'×5', col:[255, 105, 10], weight:18 },
  { value:6, label:'×6', col:[255,  75, 20], weight:13 },
  { value:7, label:'×7', col:[255,  50, 35], weight: 7 },
  { value:8, label:'×8', col:[240,  30, 50], weight: 4 },
  { value:9, label:'×9', col:[220,  10, 60], weight: 1 },
];
// '-' gates: easy mode (small subtract)
const SUB_POOL_EASY = [
  { value:2, label:'-2', col:[220, 55, 55] },
  { value:3, label:'-3', col:[210, 40, 40] },
];
// '-' gates: hard mode (large subtract)
const SUB_POOL_HARD = [
  { value:4, label:'-4', col:[230, 40, 40] },
  { value:5, label:'-5', col:[220, 25, 25] },
  { value:6, label:'-6', col:[200, 10, 10] },
];

// Compatibility with old references
const MUL_POOL = MUL_POOL_NORMAL;
const SUB_POOL = SUB_POOL_EASY;

function pickMulGateDef() {
  const pool = (typeof gameDifficulty !== 'undefined' && gameDifficulty === 'easy')
    ? MUL_POOL_EASY : MUL_POOL_NORMAL;
  const total = pool.reduce((s, m) => s + m.weight, 0);
  let r = random(total);
  for (const m of pool) { r -= m.weight; if (r <= 0) return m; }
  return pool[0];
}

function pickSubGateDef() {
  const pool = (typeof gameDifficulty !== 'undefined' && gameDifficulty === 'difficult')
    ? SUB_POOL_HARD : SUB_POOL_EASY;
  return random(pool);
}

function _getMinigameProfile() {
  const lv = constrain((typeof currentLevel !== 'undefined' ? currentLevel : 1), 1, 5);
  const info = (typeof LEVEL_INFO !== 'undefined' && LEVEL_INFO[lv]) ? LEVEL_INFO[lv] : null;
  const threat = info ? constrain(info.threat || lv, 1, 5) : lv;
  const hard = (typeof gameDifficulty !== 'undefined' && gameDifficulty === 'difficult');

  // Base layout: hard mode is denser with more rows; later levels gradually add complexity
  const rows = constrain((hard ? 5 : 4) + (threat >= 3 ? 1 : 0), 4, 6);
  // Hard mode raises mulBias and reduces the proportion of subtract gates
  const targetMulMin = hard ? max(3, 4 - floor(threat / 3)) : 4;
  const targetMulMax = hard ? 6 : 6;
  const bounceMin = hard ? 1 : 1;   // Easy mode also has a minimum of 1
  const bounceMax = hard ? (threat >= 4 ? 3 : 2) : 2;  // Slightly raise the upper bound

  return {
    lv,
    threat,
    hard,
    rows,
    targetMulMin,
    targetMulMax,
    bounceMin,
    bounceMax,
    // Per-row gate count probability (1-3 gates)
    rowCountWeights: hard ? [0.12, 0.48, 0.40] : [0.26, 0.54, 0.20],
    // Hard mode raises the multiply-gate bias, indirectly reducing subtract gates
    mulBiasTop: hard ? 0.68 : 0.68,
    mulBiasBottom: hard ? 0.42 : 0.40,
    // The harder the difficulty, the narrower the gates
    minGateDiv: hard ? 8.8 : 7.4,
    maxGateDiv: hard ? 4.7 : 4.2,
    // Bonus-ball gate appearance probability (at most 1 per round, ~40% chance)
    bonusBallProb: 0.40,
  };
}

function _pickRowGateCount(weights) {
  const r = random();
  if (r < weights[0]) return 1;
  if (r < weights[0] + weights[1]) return 2;
  return 3;
}

function _calcScoreBalanced(landed, profile) {
  // Balanced version: stable returns + clear cap (avoids extreme score blow-ups)
  // Formula: score = cap * (1 - exp(-k * x^p))
  // As x grows the score approaches cap and never exceeds it
  const CAP = 2000;
  const P = 1.02;
  const K = 0.00255;
  const x = Math.max(landed, 0);
  const base = CAP * (1 - Math.exp(-K * Math.pow(x, P)));
  const levelMul = 1 + (profile.threat - 1) * 0.05;
  const difficultyMul = profile.hard ? 1.05 : 1.0;
  const raw = floor(base * levelMul * difficultyMul);
  const capped = min(raw, CAP);
  const floorScore = 3 + profile.threat + (profile.hard ? 1 : 0);
  return max(capped, floorScore);
}

function _calcScoreClassicJackpot(landed, profile) {
  // Classic surprise version: no cap; allows occasional high payouts (jackpot)
  // Mostly near-linear growth, with low-probability jackpot multipliers + soft-cap decay
  const x = Math.max(landed, 0);
  const levelMul = 1 + (profile.threat - 1) * 0.12;
  const difficultyMul = profile.hard ? 1.12 : 1.0;
  const base = x * 1.40 * levelMul * difficultyMul;

  let surpriseMul = 1;
  const r = random();
  if (r < 0.002) surpriseMul = 2.6;       // 0.2% mega prize (rarer)
  else if (r < 0.012) surpriseMul = 1.9;  // 1.0% large prize
  else if (r < 0.055) surpriseMul = 1.30; // 4.3% small surprise

  const jackpotRaw = base * surpriseMul;
  const SOFT_CAP_START = 2600;
  const SOFT_CAP_KEEP = 0.35; // Above the threshold, only 35% of the increment is kept
  const softened = jackpotRaw <= SOFT_CAP_START
    ? jackpotRaw
    : SOFT_CAP_START + (jackpotRaw - SOFT_CAP_START) * SOFT_CAP_KEEP;
  const raw = floor(softened);
  const floorScore = 3 + profile.threat + (profile.hard ? 1 : 0);
  return max(raw, floorScore);
}

function _calcMinigameScore(landed) {
  const profile = _getMinigameProfile();
  const scoreMode = 'stable_balanced';

  if (scoreMode === 'stable_balanced') return _calcScoreBalanced(landed, profile);
  if (scoreMode === 'classic_jackpot') return _calcScoreClassicJackpot(landed, profile);
  return _calcScoreClassicJackpot(landed, profile);
}

function generateMinigameGates(_rerollTry = 0) {
  mgGates = [];
  const profile = _getMinigameProfile();
  const rows    = profile.rows;
  const usableH = MG.h - 130;
  const stepY   = usableH / (rows + 1);
  const gateH   = 34;
  const innerL  = MG.x + 28;
  const innerW  = MG.w - 56;

  const minGW = floor(MG.w / profile.minGateDiv);
  const maxGW = floor(MG.w / profile.maxGateDiv);

  const TARGET_MUL = floor(random(profile.targetMulMin, profile.targetMulMax + 1));
  let mulCount = 0;
  let guaranteedMulGate = null; // Lower-half guaranteed scoring gate, used to protect the upper channel

  // Number of bounce gates depends on difficulty/level; track replaceable slots (still forbid the top two rows)
  const bounceCount  = floor(random(profile.bounceMin, profile.bounceMax + 1));
  const bounceSlots  = [];   // Record { row, col }

  for (let row = 0; row < rows; row++) {
    const y = MG.y + 80 + stepY * (row + 1);
    const count = _pickRowGateCount(profile.rowCountWeights);

    const widths = Array.from({length: count}, () => floor(random(minGW, maxGW)));
    const rawTotal = widths.reduce((a, b) => a + b, 0);
    const maxTotal = innerW - 16 * (count + 1);
    const scale    = rawTotal > maxTotal ? maxTotal / rawTotal : 1;
    const finalW   = widths.map(w => floor(w * scale));

    const usedW = finalW.reduce((a, b) => a + b, 0);
    const freeW = innerW - usedW;
    const gaps  = Array.from({length: count + 1}, () => random(0.5, 1.5));
    const gapSum = gaps.reduce((a, b) => a + b, 0);
    const gaps_n = gaps.map(g => (g / gapSum) * freeW);

    let curX = innerL + gaps_n[0];

    for (let c = 0; c < count; c++) {
      const remaining = rows - row;
      const mulLeft   = TARGET_MUL - mulCount;
      const mustMul   = mulLeft >= remaining * count;
      const rowT      = rows <= 1 ? 0 : row / (rows - 1);
      const mulBias   = lerp(profile.mulBiasTop, profile.mulBiasBottom, rowT);
      const placeMul  = mulCount < TARGET_MUL && (mustMul || random() < mulBias);

      let def;
      if (placeMul) {
        const m = pickMulGateDef();
        def = { type:'mul', value: m.value, label: m.label, col: [...m.col] };
        mulCount++;
      } else {
        const s = pickSubGateDef();
        def = { type:'sub', value: s.value, label: s.label, col: [...s.col] };
      }

      // -- Sliding gates: rows >= 1 have ~30% chance of becoming horizontally sliding --
      const isSliding = row >= 1 && random() < 0.30;
      const gateBaseX = curX + finalW[c] / 2;
      // Slide range: detect free space on either side; the more space, the larger the range
      let slideRange = 0;
      if (isSliding) {
        const spaceL = gateBaseX - finalW[c] / 2 - innerL;
        const spaceR = (innerL + innerW) - (gateBaseX + finalW[c] / 2);
        const freeSpace = min(spaceL, spaceR);
        slideRange = constrain(freeSpace * 0.55, 18, 120);

        // Avoid overlapping motion ranges with sliding gates already in the same row
        // Same-row gate list: gates already generated in the current row
        const rowGates = mgGates.filter(gg => gg.row === row);
        for (const gg of rowGates) {
          if (!gg.sliding) continue;
          // gg motion range: [gg.slideBaseX - gg.slideRange - gg.w/2, gg.slideBaseX + gg.slideRange + gg.w/2]
          const ggLeft  = gg.slideBaseX - gg.slideRange - gg.w / 2;
          const ggRight = gg.slideBaseX + gg.slideRange + gg.w / 2;
          const myLeft  = gateBaseX - finalW[c] / 2;
          const myRight = gateBaseX + finalW[c] / 2;

          // If this gate is to the right of an existing gate, the left bound must not cross ggRight; mirror for the other side
          if (myLeft >= gg.slideBaseX) {
            // This gate is on the right: left edge + slideRange must not touch ggRight
            const maxR = myLeft - ggRight - 4;   // 4px safety gap
            slideRange = constrain(slideRange, 0, max(0, maxR));
          } else {
            // This gate is on the left: right edge + slideRange must not touch ggLeft
            const maxR = ggLeft - myRight - 4;
            slideRange = constrain(slideRange, 0, max(0, maxR));
          }
        }
        // If the trimmed range is too small, cancel sliding
        if (slideRange < 10) slideRange = 0;
      }
      // Slide speed (pixels per frame): random direction, faster in hard mode
      const finalSliding = isSliding && slideRange >= 10;
      const slideSpeed = finalSliding
        ? random(profile.hard ? 0.8 : 0.5, profile.hard ? 1.6 : 1.1) * (random() < 0.5 ? 1 : -1)
        : 0;

      mgGates.push({
        x: gateBaseX,
        y,
        w: finalW[c],
        h: gateH,
        row,
        type: def.type, value: def.value,
        label: def.label, col: def.col,
        triggered: false,
        flashTimer: 0,
        // Slide attributes
        sliding:    finalSliding,
        slideBaseX: gateBaseX,
        slideRange,
        slideSpeed,
        slidePhase: random(TWO_PI),   // Stagger initial phases so the gates don't move in lockstep
      });
      // Bounce pads are forbidden in the top two rows (row 0 / 1)
      if (row >= 2) bounceSlots.push({ gateIdx: mgGates.length - 1, row, col: c });

      curX += finalW[c] + gaps_n[c + 1];
    }
  }

  // Ensure at least one 'x' gate in the lower half so the run is not all subtract gates
  const lowerRow = floor(rows / 2);
  const hasLowerMul = mgGates.some(g => g.row >= lowerRow && g.type === 'mul');
  if (!hasLowerMul) {
    const candidates = mgGates.filter(g => g.row >= lowerRow && g.type !== 'bounce');
    if (candidates.length > 0) {
      const g = random(candidates);
      const m = pickMulGateDef();
      g.type = 'mul';
      g.value = m.value;
      g.label = m.label;
      g.col = [...m.col];
      g.triggered = false;
      g.flashTimer = 0;
      guaranteedMulGate = g;
    }
  }
  // If a lower-half multiply gate already exists naturally, pick the lowest one as the 'guaranteed scoring gate' to protect the upper channel
  if (!guaranteedMulGate) {
    const lowerMuls = mgGates.filter(g => g.row >= lowerRow && g.type === 'mul');
    if (lowerMuls.length > 0) {
      guaranteedMulGate = lowerMuls.sort((a, b) => b.row - a.row)[0];
    }
  }

  // -- Randomly replace bounceCount normal gates with bounce gates --
  if (bounceCount > 0 && bounceSlots.length > 0) {
    let slots = bounceSlots;
    // Try not to spawn a bounce gate directly above the 'guaranteed scoring gate' to reduce path obstruction
    if (guaranteedMulGate) {
      const laneHalfWidth = guaranteedMulGate.w * 0.65 + 26;
      const safeSlots = bounceSlots.filter(s => {
        const gg = mgGates[s.gateIdx];
        if (!gg) return false;
        const isAboveGuaranteed = gg.row < guaranteedMulGate.row;
        const inProtectedLane = abs(gg.x - guaranteedMulGate.x) < laneHalfWidth;
        return !(isAboveGuaranteed && inProtectedLane);
      });
      if (safeSlots.length > 0) slots = safeSlots;
    }
    // Shuffle and take the first bounceCount
    for (let i = slots.length - 1; i > 0; i--) {
      const j = floor(random(i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }

    // Constraints:
    // 1) At most 1 bounce gate per row
    // 2) No consecutive jumps in the same column (no second bounce nearby in the same column)
    const pickedSlots = [];
    const rowUsed = Object.create(null);

    for (const s of slots) {
      if (pickedSlots.length >= bounceCount) break;
      const g = mgGates[s.gateIdx];
      if (!g) continue;

      if ((rowUsed[g.row] || 0) >= MG_GATE_LAYOUT_RULES.maxBouncePerRow) continue;

      const hasSameColumnBounce = pickedSlots.some(ps => {
        const pg = mgGates[ps.gateIdx];
        if (!pg) return false;
        return abs(pg.x - g.x) < MG_GATE_LAYOUT_RULES.bounceSameColXTol;
      });
      if (hasSameColumnBounce) continue;

      pickedSlots.push(s);
      rowUsed[g.row] = (rowUsed[g.row] || 0) + 1;
    }

    // If constraints are too strict and none can be picked, place 1 anyway so the bounce mechanic does not disappear
    if (pickedSlots.length === 0 && slots.length > 0) {
      pickedSlots.push(slots[0]);
    }

    for (let k = 0; k < pickedSlots.length; k++) {
      const idx = pickedSlots[k].gateIdx;
      const g   = mgGates[idx];
      g.type      = 'bounce';
      g.value     = 0;
      g.label     = '↯';
      g.col       = [180, 60, 255];
      g.triggered = false;   // Bounce gates can trigger multiple times (once per ball)
    }
  }

  // -- Randomly insert a bonus-ball gate (at most 1 per round, ~bonusBallProb chance) --
  // Pick a random middle-row normal gate to replace; do not overwrite bounce gates
  if (random() < profile.bonusBallProb) {
    const midStart = floor(rows * 0.3);
    let candidates = mgGates.filter(g => g.row >= midStart && g.type !== 'bounce');
    // Likewise, avoid placing special gates above the guaranteed scoring gate to keep the channel open
    if (guaranteedMulGate) {
      const laneHalfWidth = guaranteedMulGate.w * 0.65 + 26;
      const safeCandidates = candidates.filter(g => {
        const isAboveGuaranteed = g.row < guaranteedMulGate.row;
        const inProtectedLane = abs(g.x - guaranteedMulGate.x) < laneHalfWidth;
        return !(isAboveGuaranteed && inProtectedLane);
      });
      if (safeCandidates.length > 0) candidates = safeCandidates;
    }
    if (candidates.length > 0) {
      const g = random(candidates);
      g.type      = 'bonusball';
      g.value     = 10;          // Next round +10 starting balls
      g.label     = '+10🎱';
      g.col       = [50, 230, 120];
      g.triggered = false;
      g.flashTimer = 0;
    }
  }

  // Final fallback: clear obstructing gates (sub/bounce/bonusball) above the guaranteed scoring gate in the same column
  if (guaranteedMulGate) {
    const laneHalfWidth = guaranteedMulGate.w * 0.65 + 22;
    for (const g of mgGates) {
      if (g === guaranteedMulGate) continue;
      const isAboveGuaranteed = g.row < guaranteedMulGate.row;
      const inProtectedLane = abs(g.x - guaranteedMulGate.x) < laneHalfWidth;
      const isBlocker = (g.type === 'sub' || g.type === 'bounce' || g.type === 'bonusball');
      if (isAboveGuaranteed && inProtectedLane && isBlocker && random() < 0.8) {
        const m = pickMulGateDef();
        g.type = 'mul';
        g.value = m.value;
        g.label = m.label;
        g.col = [...m.col];
        g.triggered = false;
        g.flashTimer = 0;
      }
    }
  }

  // Low-score reroll: if layout score is too low, regenerate gate layout (max 2 rerolls)
  const layoutScore = _scoreGateLayoutForReroll(mgGates);
  const minAcceptScore = profile.hard
    ? MG_GATE_LAYOUT_RULES.minAcceptScoreHard
    : MG_GATE_LAYOUT_RULES.minAcceptScoreEasy;
  if (layoutScore < minAcceptScore && _rerollTry < MG_GATE_LAYOUT_RULES.maxRerolls) {
    generateMinigameGates(_rerollTry + 1);
  }
}

function _scoreGateLayoutForReroll(gates) {
  if (!gates || gates.length === 0) return -99;
  let mul = 0, sub = 0, bounce = 0, bonus = 0;
  const bounceCols = [];
  for (const g of gates) {
    if (g.type === 'mul') mul++;
    else if (g.type === 'sub') sub++;
    else if (g.type === 'bounce') {
      bounce++;
      bounceCols.push(g.x);
    } else if (g.type === 'bonusball') bonus++;
  }
  // More bounce gates reused in the same column = larger penalty (already constrained, this is a fallback score)
  let sameColPenalty = 0;
  for (let i = 0; i < bounceCols.length; i++) {
    for (let j = i + 1; j < bounceCols.length; j++) {
      if (abs(bounceCols[i] - bounceCols[j]) < MG_GATE_LAYOUT_RULES.bounceSameColXTol) sameColPenalty++;
    }
  }
  return mul * MG_GATE_LAYOUT_SCORE_WEIGHTS.mul
      + bonus * MG_GATE_LAYOUT_SCORE_WEIGHTS.bonus
      + sub * MG_GATE_LAYOUT_SCORE_WEIGHTS.sub
      + bounce * MG_GATE_LAYOUT_SCORE_WEIGHTS.bounce
      + sameColPenalty * MG_GATE_LAYOUT_SCORE_WEIGHTS.sameColBouncePenalty;
}

// ============================================================
//  Launch balls
// ============================================================
function emitMinigameBalls() {
  if (shootDone) return;
  shootTimer++;
  // Launch one every 4 frames to simulate rapid fire
  if (shootTimer % 4 === 0 && shootCount < shootTotal) {
    shootCount++;
    const ang = random(-0.22, 0.22);
    const spd = random(1.2, 2.2);
    mgBalls.push({
      x:  aimX + random(-6, 6),
      y:  MG.y + 28,
      vx: sin(ang) * spd,
      vy: cos(ang) * spd * 0.25 + 0.5,
      alive: true, settled: false,
    });
  }
  if (shootCount >= shootTotal) {
    shootDone = true;
  }
}

// ============================================================
//  Physics update
// ============================================================
function updateMinigameBalls() {
  const wallL  = MG.x + 20;
  const wallR  = MG.x + MG.w - 20;
  const floorY = MG.y + MG.h - 20;

  for (const b of mgBalls) {
    if (!b.alive) continue;

    b.vy += GRAVITY;
    b.vx *= FRICTION;
    b.x  += b.vx;
    b.y  += b.vy;

    // Bounce off left / right walls
    if (b.x - BALL_R < wallL) {
      b.x  = wallL + BALL_R;
      b.vx = abs(b.vx) * WALL_BOUNCE + random(0.1, 0.4);
    }
    if (b.x + BALL_R > wallR) {
      b.x  = wallR - BALL_R;
      b.vx = -(abs(b.vx) * WALL_BOUNCE + random(0.1, 0.4));
    }

    // Land on the bottom
    if (b.y - BALL_R > floorY) {
      b.alive   = false;
      b.settled = true;
      landedBalls++;
      spawnMinigameParticles(b.x, floorY, color(0, 200, 255), 3);
    }
  }
}

// ============================================================
//  Gate collision & trigger
//  'x' gate: each ball passing through splits independently (original ball disappears -> N child balls fan out)
//  '-' gate: one-shot; removes N active balls
// ============================================================
function updateMinigameGates() {
  for (const g of mgGates) {
    if (g.flashTimer > 0) g.flashTimer--;

    // -- Sliding gate position update --
    if (g.sliding) {
      g.slidePhase += g.slideSpeed * 0.045;
      g.x = g.slideBaseX + sin(g.slidePhase) * g.slideRange;
      // Hard clamp: gates cannot leave the playfield
      const halfW = g.w / 2 + 8;
      const minX  = MG.x + 28 + halfW;
      const maxX  = MG.x + MG.w - 28 - halfW;
      g.x = constrain(g.x, minX, maxX);
    }
  }

  // -- Same-row sliding gates push each other apart (prevents overlap during fast motion) --
  const GATE_PAD = 4;  // Minimum gap
  // Group by row
  const rowMap = {};
  for (const g of mgGates) {
    if (!rowMap[g.row]) rowMap[g.row] = [];
    rowMap[g.row].push(g);
  }
  for (const rowGates of Object.values(rowMap)) {
    // Only process rows that contain a sliding gate
    const sliding = rowGates.filter(g => g.sliding);
    if (sliding.length === 0) continue;
    // Sort by x, push apart pair by pair
    rowGates.sort((a, b) => a.x - b.x);
    for (let i = 0; i < rowGates.length - 1; i++) {
      const a = rowGates[i], b = rowGates[i + 1];
      const minDist = a.w / 2 + b.w / 2 + GATE_PAD;
      const overlap = minDist - (b.x - a.x);
      if (overlap > 0) {
        // Only push the sliding one (or split the push)
        const aMoves = a.sliding, bMoves = b.sliding;
        if (aMoves && bMoves) {
          a.x -= overlap / 2;
          b.x += overlap / 2;
        } else if (aMoves) {
          a.x -= overlap;
        } else if (bMoves) {
          b.x += overlap;
        }
        // Re-clamp after pushing
        const clamp = (g) => {
          const hw = g.w / 2 + 8;
          g.x = constrain(g.x, MG.x + 28 + hw, MG.x + MG.w - 28 - hw);
        };
        clamp(a); clamp(b);
      }
    }
  }

  // -- Ball-gate collision triggers --
  for (const g of mgGates) {
    for (const b of mgBalls) {
      if (!b.alive || b.settled) continue;

      const hw = g.w / 2 + BALL_R;
      const hh = g.h / 2 + BALL_R;
      if (abs(b.x - g.x) < hw && abs(b.y - g.y) < hh) {
        triggerGate(g, b);
      }
    }
  }
}

function triggerGate(g, ball) {
  if (g.type === 'bounce') {
    // Each ball maintains a Set of bounce gates it has hit; bounced gates never retrigger for the same ball
    if (!ball._bouncedGates) ball._bouncedGates = new Set();
    if (ball._bouncedGates.has(g)) return;
    ball._bouncedGates.add(g);
    g.flashTimer = 35;

    // Strong bounce up: invert vy, randomly perturb vx
    const spd = Math.max(Math.hypot(ball.vx, ball.vy), 2.2);
    const ang  = random(-PI * 0.35, PI * 0.35);
    ball.vx = sin(ang) * spd * random(1.1, 1.6);
    ball.vy = -abs(cos(ang)) * spd * random(1.0, 1.4);  // Bounce upward

    spawnMinigameParticles(g.x, g.y, color(...g.col), 10);
    return;
  }

  if (g.type === 'mul') {
    // 'x' gate: each ball splits independently, with no per-trigger limit
    // Use a marker on the ball to prevent triggering the same gate twice in the same frame
    if (ball._lastGate === g) return;
    ball._lastGate = g;

    g.flashTimer = 40;

    // Original ball disappears; spawn `value` child balls at the gate exit
    ball.alive = false;
    const exitY  = g.y + g.h / 2 + BALL_R + 2;
    const baseSpd = Math.max(Math.hypot(ball.vx, ball.vy), 1.5);

    for (let i = 0; i < g.value; i++) {
      const totalArc = PI * 0.24;
      const ang = -totalArc / 2 + (i / (g.value - 1 || 1)) * totalArc + random(-0.06, 0.06);
      const spd = baseSpd * random(0.85, 1.15);
      spawnQueue.push({
        x:  ball.x + sin(ang) * (BALL_R * 1.2),
        y:  exitY,
        vx: sin(ang) * spd,
        vy: abs(cos(ang)) * spd * 0.5 + 0.6,
        alive: true, settled: false,
        _lastGate: g,
        // Child balls inherit the parent's bounced-gate Set (a copy to avoid shared references)
        _bouncedGates: ball._bouncedGates ? new Set(ball._bouncedGates) : new Set(),
      });
    }
    spawnMinigameParticles(g.x, g.y, color(...g.col), 16);

  } else if (g.type === 'bonusball') {
    // Bonus-ball gate: one-shot; only +10 next round, then resets
    if (g.triggered) return;
    g.triggered  = true;
    g.flashTimer = 55;
    _bonusBallPending += g.value;   // Stash for next round; consumed by startMinigame
    spawnMinigameParticles(g.x, g.y, color(...g.col), 20);

  } else {
    // '-' gate: one-shot; removes N active balls
    if (g.triggered) return;
    g.triggered  = true;
    g.flashTimer = 45;

    let killed = 0;
    // Prefer the balls closest to the gate
    const alive = mgBalls.filter(b => b.alive && !b.settled)
      .sort((a, b) => dist(a.x, a.y, g.x, g.y) - dist(b.x, b.y, g.x, g.y));
    for (const b of alive) {
      if (killed >= g.value) break;
      spawnMinigameParticles(b.x, b.y, color(...g.col), 8);
      b.alive = false;
      killed++;
    }
    spawnMinigameParticles(g.x, g.y, color(...g.col), 12);
  }
}

// ============================================================
//  Result detection
// ============================================================
function checkMinigameSettlement() {
  if (!shootDone) return;
  if (spawnQueue.length > 0) return;
  const alive = mgBalls.filter(b => b.alive).length;
  if (alive === 0) {
    minigameResult = _calcMinigameScore(landedBalls);
    minigameState  = 'result';
    resultTimer    = RESULT_SHOW;
  }
}

// ============================================================
//  Drawing: background (sci-fi quantum space style)
// ============================================================
let _mgStars = null;
function initMinigameStars() {
  _mgStars = [];
  for (let i = 0; i < 110; i++) {
    _mgStars.push({
      x: random(MG.w), y: random(MG.h),
      r: random(0.5, 2.2),
      spd: random(0.003, 0.012),
      phase: random(TWO_PI),
    });
  }
}

function drawMinigameBackground() {
  if (!_mgStars || _mgStars.length === 0) initMinigameStars();
  push();
  // Deep-space gradient: top deep-blue -> bottom deep-purple
  noStroke();
  for (let y = 0; y < MG.h; y += 3) {
    const t = y / MG.h;
    fill(lerp(2,8,t), lerp(5,4,t), lerp(22,16,t), 255);
    rect(MG.x, MG.y + y, MG.w, 3);
  }
  // Starfield (twinkling)
  for (const s of _mgStars) {
    const bri = sin(frameCount * s.spd + s.phase) * 0.45 + 0.55;
    noStroke(); fill(180, 210, 255, bri * 155);
    ellipse(MG.x + s.x, MG.y + s.y, s.r * 2, s.r * 2);
  }
  // Horizontal scan beam (slow downward drift)
  const scanY = ((frameCount * 0.4) % (MG.h + 60)) - 30;
  noStroke();
  for (let dy = 0; dy < 28; dy++) {
    fill(0, 160, 255, sin(dy / 28 * PI) * 18);
    rect(MG.x, MG.y + scanY + dy, MG.w, 1);
  }
  // Grid (lightweight)
  stroke(0, 130, 210, 10); strokeWeight(1);
  for (let x = MG.x; x < MG.x + MG.w; x += 52) line(x, MG.y, x, MG.y + MG.h);
  for (let y = MG.y; y < MG.y + MG.h; y += 52) line(MG.x, y, MG.x + MG.w, y);
  // Scan-line texture
  noStroke(); fill(0, 0, 0, 14);
  for (let y = MG.y; y < MG.y + MG.h; y += 4) rect(MG.x, y, MG.w, 2);
  // Edge inner frame
  noFill(); stroke(0, 180, 255, 65); strokeWeight(1.2);
  rect(MG.x + 8, MG.y + 8, MG.w - 16, MG.h - 16, 8);
  // Bottom landing line
  stroke(0, 200, 255, 120); strokeWeight(1.6);
  line(MG.x + 10, MG.y + MG.h - 20, MG.x + MG.w - 10, MG.y + MG.h - 20);
  // Edge darkening on all four sides
  noStroke();
  for (let i = 0; i < 32; i++) {
    fill(0, 0, 0, lerp(40, 0, i / 32));
    rect(MG.x, MG.y + i, MG.w, 1);
    rect(MG.x, MG.y + MG.h - i - 1, MG.w, 1);
    rect(MG.x + i, MG.y, 1, MG.h);
    rect(MG.x + MG.w - i - 1, MG.y, 1, MG.h);
  }
  pop();
}

// ============================================================
//  Drawing: gates
// ============================================================
function drawMinigameGates() {
  textFont('monospace');

  for (const g of mgGates) {
    const [r, gn, b] = g.col;
    const flash  = g.flashTimer / 45;
    const faded  = g.triggered && g.type === 'sub';   // '-' gate dims after triggering
    const alpha  = faded ? 55 : 215;
    const isMul  = g.type === 'mul';

    // -- Bounce gate's special look --
    if (g.type === 'bounce') {
      const [r2, g2, b2] = g.col;
      const t2 = sin(frameCount * 0.22) * 0.5 + 0.5;
      // Outer glow
      noStroke(); fill(r2, g2, b2, 18 + t2 * 28);
      rect(g.x - g.w/2 - 10, g.y - g.h/2 - 10, g.w + 20, g.h + 20, 14);
      // Gate base
      fill(r2 * 0.2, g2 * 0.2, b2 * 0.3, 220);
      rect(g.x - g.w/2, g.y - g.h/2, g.w, g.h, 8);
      // Gate face gradient (purple to blue-violet)
      fill(r2, g2, b2, 180 + t2 * 60);
      rect(g.x - g.w/2, g.y - g.h/2, g.w, g.h - 5, 8);
      // Highlight
      fill(220, 180, 255, 80 + t2 * 80);
      rect(g.x - g.w/2 + 5, g.y - g.h/2 + 4, g.w - 10, 4, 3);
      // Lightning zigzag line
      stroke(220, 160, 255, 160 + t2 * 80); strokeWeight(1.8);
      const zx1 = g.x - g.w/2 + 10, zx2 = g.x + g.w/2 - 10;
      const zy  = g.y;
      const segs = 5;
      beginShape();
      for (let s = 0; s <= segs; s++) {
        const tx = lerp(zx1, zx2, s / segs);
        const ty = zy + (s % 2 === 0 ? -6 : 6) * t2;
        vertex(tx, ty);
      }
      endShape();
      // Corner lightning icon
      noStroke(); fill(255, 220, 255, 140 + t2 * 100);
      textSize(9); textAlign(CENTER, CENTER);
      text('⚡', g.x - g.w/2 + 9, g.y - g.h/2 + 10);
      text('⚡', g.x + g.w/2 - 9, g.y - g.h/2 + 10);
      // Label
      fill(255, 240, 255, 230 + t2 * 25);
      textSize(g.w < 70 ? 13 : g.w < 95 ? 16 : 18);
      text('↯ BOUNCE', g.x, g.y);
      // Trigger flash
      if (g.flashTimer > 0) {
        const fv = g.flashTimer / 35;
        noFill(); stroke(r2, g2, b2, fv * 240); strokeWeight(2 + fv * 6);
        rect(g.x - g.w/2 - (1-fv)*12, g.y - g.h/2 - (1-fv)*12,
             g.w + (1-fv)*24, g.h + (1-fv)*24, 12);
      }
      textAlign(LEFT, BASELINE);
      continue;   // Skip the rest of the generic drawing
    }

    // -- Bonus-ball gate's special look --
    if (g.type === 'bonusball') {
      const [r3, g3, b3] = g.col;
      const t3 = sin(frameCount * 0.18) * 0.5 + 0.5;
      const faded3 = g.triggered;
      const alpha3 = faded3 ? 60 : 215;
      // Outer glow (green)
      noStroke(); fill(r3, g3, b3, faded3 ? 8 : 20 + t3 * 30);
      rect(g.x - g.w/2 - 12, g.y - g.h/2 - 12, g.w + 24, g.h + 24, 16);
      // Base
      fill(r3 * 0.15, g3 * 0.25, b3 * 0.15, alpha3);
      rect(g.x - g.w/2, g.y - g.h/2, g.w, g.h, 8);
      // Gate face
      fill(r3, g3, b3, faded3 ? 55 : 170 + t3 * 45);
      rect(g.x - g.w/2, g.y - g.h/2, g.w, g.h - 5, 8);
      // Highlight
      fill(200, 255, 220, faded3 ? 10 : 70 + t3 * 60);
      rect(g.x - g.w/2 + 5, g.y - g.h/2 + 4, g.w - 10, 4, 3);
      // Rare pulsing border
      if (!faded3) {
        noFill(); stroke(100, 255, 180, 140 * t3); strokeWeight(2);
        rect(g.x - g.w/2 - 4, g.y - g.h/2 - 4, g.w + 8, g.h + 8, 10);
      }
      // Label
      noStroke(); fill(faded3 ? 120 : 220, 255, faded3 ? 120 : 200, faded3 ? 100 : 235);
      textSize(g.w < 80 ? 11 : 13); textAlign(CENTER, CENTER);
      text(faded3 ? '✓ +10🎱' : '+10🎱', g.x, g.y);
      // Trigger flash
      if (g.flashTimer > 0) {
        const fv = g.flashTimer / 55;
        noFill(); stroke(r3, g3, b3, fv * 240); strokeWeight(2 + fv * 7);
        rect(g.x - g.w/2 - (1-fv)*16, g.y - g.h/2 - (1-fv)*16,
             g.w + (1-fv)*32, g.h + (1-fv)*32, 14);
      }
      textAlign(LEFT, BASELINE);
      continue;
    }

    if (!faded) {
      noStroke();
      fill(r, gn, b, isMul ? 28 + flash * 35 : 18 + flash * 20);
      rect(g.x - g.w/2 - 8, g.y - g.h/2 - 8, g.w + 16, g.h + 16, 12);
      // x6 or higher: rare pulsing gold border
      if (isMul && g.value >= 6) {
        const pulse = sin(frameCount * 0.18) * 0.5 + 0.5;
        noFill(); stroke(255, 230, 80, 120 * pulse); strokeWeight(2);
        rect(g.x - g.w/2 - 4, g.y - g.h/2 - 4, g.w + 8, g.h + 8, 10);
      }
    }

    // -- Gate base (dark) --
    noStroke();
    fill(r * 0.35, gn * 0.35, b * 0.35, alpha);
    rect(g.x - g.w/2, g.y - g.h/2, g.w, g.h, 8);

    // -- Gate face --
    fill(r, gn, b, alpha + flash * 40);
    rect(g.x - g.w/2, g.y - g.h/2, g.w, g.h - 5, 8);

    // -- Highlight strip --
    fill(255, 255, 255, faded ? 15 : 55 + flash * 55);
    rect(g.x - g.w/2 + 5, g.y - g.h/2 + 4, g.w - 10, 4, 3);

    // -- Diagonal stripes specific to '-' gates --
    if (!isMul && !faded) {
      stroke(255, 130, 110, 100); strokeWeight(1.5);
      for (let tx = g.x - g.w/2 + 8; tx < g.x + g.w/2 - 4; tx += 13) {
        line(tx, g.y - g.h/2 + 3, tx - 9, g.y + g.h/2 - 3);
      }
    }

    // -- Twinkling diamond corner mark specific to 'x' gates --
    if (isMul && !faded) {
      const ps = sin(frameCount * 0.15) * 0.4 + 0.6;
      noStroke(); fill(255, 255, 180, 120 * ps);
      const mx = g.x + g.w/2 - 10, my = g.y - g.h/2 + 10;
      beginShape();
      vertex(mx, my - 5); vertex(mx + 4, my);
      vertex(mx, my + 5); vertex(mx - 4, my);
      endShape(CLOSE);
    }

    // -- Label (size adapts to gate width) --
    noStroke();
    fill(255, 255, 255, faded ? 80 : 232 + flash * 23);
    const labelSize = g.w < 70 ? 11 : g.w < 95 ? 13 : 15;
    textSize(labelSize); textAlign(CENTER, CENTER);
    text(g.label, g.x, g.y);

    // -- Trigger flash ring --
    if (g.flashTimer > 0) {
      noFill();
      stroke(r, gn, b, flash * 230);
      strokeWeight(2 + flash * 5);
      rect(g.x - g.w/2 - (1-flash)*14, g.y - g.h/2 - (1-flash)*14,
           g.w + (1-flash)*28, g.h + (1-flash)*28, 12);
    }

    // -- Sliding gate specific: motion track line + arrows --
    if (g.sliding && !faded) {
      const trackL = g.slideBaseX - g.slideRange;
      const trackR = g.slideBaseX + g.slideRange;
      const midY   = g.y;
      // Track dashes
      stroke(0, 220, 255, 55); strokeWeight(1.2);
      drawingContext.setLineDash([4, 6]);
      line(trackL, midY, trackR, midY);
      drawingContext.setLineDash([]);
      // Arrows on both ends (triangles)
      const arrSize = 5;
      noStroke(); fill(0, 220, 255, 90);
      triangle(trackL - arrSize, midY, trackL + arrSize, midY - arrSize, trackL + arrSize, midY + arrSize);
      triangle(trackR + arrSize, midY, trackR - arrSize, midY - arrSize, trackR - arrSize, midY + arrSize);
      // Sliding gate outer glow (thin blue-white edge)
      const slPulse = sin(frameCount * 0.16 + g.slidePhase) * 0.4 + 0.6;
      noFill();
      stroke(160, 230, 255, 120 * slPulse); strokeWeight(1.5);
      rect(g.x - g.w/2 - 3, g.y - g.h/2 - 3, g.w + 6, g.h + 6, 10);
    }
  }
  textAlign(LEFT, BASELINE);
}

// ============================================================
//  Drawing: balls
// ============================================================
function drawMinigameBalls() {
  for (const b of mgBalls) {
    if (!b.alive) continue;
    noStroke();
    fill(0, 160, 255, 35);
    ellipse(b.x, b.y, BALL_R * 4.2, BALL_R * 4.2);
    fill(0, 200, 255, 210);
    ellipse(b.x, b.y, BALL_R * 2, BALL_R * 2);
    fill(180, 235, 255, 200);
    ellipse(b.x - BALL_R * 0.28, b.y - BALL_R * 0.28, BALL_R * 0.7, BALL_R * 0.7);
  }
}

// ============================================================
//  Drawing: HUD top bar
// ============================================================
function drawMinigameHUD() {
  noStroke(); fill(3, 7, 20, 220);
  rect(MG.x, MG.y, MG.w, 46);
  stroke(0, 140, 220, 80); strokeWeight(1);
  line(MG.x, MG.y + 46, MG.x + MG.w, MG.y + 46);

  textFont('monospace'); noStroke();
  fill(0, 160, 255); textSize(10); text(t('mg.inFlight'), MG.x + 16, MG.y + 16);
  fill(0, 220, 255); textSize(15);
  text(mgBalls.filter(b => b.alive).length + spawnQueue.length, MG.x + 16, MG.y + 35);

  fill(0, 160, 255); textSize(10); text(t('mg.landed'), MG.x + 110, MG.y + 16);
  fill(0, 255, 170); textSize(15); text(landedBalls, MG.x + 110, MG.y + 35);

  fill(0, 160, 255); textSize(10); text(t('mg.estCoins'), MG.x + 210, MG.y + 16);
  fill(255, 225, 30); textSize(15); text('¥' + _calcMinigameScore(landedBalls), MG.x + 210, MG.y + 35);

  if (minigameState === 'playing') {
    fill(0, 180, 255, 130); textSize(10);
    textAlign(RIGHT, BASELINE);
    text(shootDone ? t('mg.shootDone') : t('mg.shootProgress', shootCount, shootTotal), MG.x + MG.w - 16, MG.y + 35);
    textAlign(LEFT, BASELINE);
  }
}

// ============================================================
//  Drawing: aiming UI
// ============================================================
function drawMinigameAimUI() {
  // Vertical aiming line
  stroke(0, 200, 255, 55); strokeWeight(1.5);
  drawingContext.setLineDash([5, 9]);
  line(aimX, MG.y + 46, aimX, MG.y + MG.h - 24);
  drawingContext.setLineDash([]);

  // Crosshair
  const pulse = sin(frameCount * 0.14) * 0.4 + 0.6;
  noFill(); stroke(0, 220, 255, 180 * pulse); strokeWeight(2);
  ellipse(aimX, MG.y + 28, 28 + pulse * 4, 28 + pulse * 4);
  stroke(0, 220, 255, 130 * pulse); strokeWeight(1.5);
  line(aimX - 16, MG.y + 28, aimX + 16, MG.y + 28);
  line(aimX, MG.y + 28 - 16, aimX, MG.y + 28 + 16);
  // Ball count
  fill(255, 220, 50, 220); noStroke(); textFont('monospace');
  textSize(10); textAlign(CENTER, CENTER);
  text('×' + shootTotal, aimX, MG.y + 28 + 24);

  // Hint moved to small bottom text so the center is no longer obscured
  fill(0, 200, 255, 140); textSize(11);
  textAlign(CENTER, CENTER);
  text('← click anywhere to launch →', MG.x + MG.w / 2, MG.y + MG.h - 36);
  textAlign(LEFT, BASELINE);
}

// ============================================================
//  Drawing: result panel
// ============================================================
function drawMinigameResultUI() {
  const t  = resultTimer / RESULT_SHOW;
  const cx = MG.x + MG.w / 2;
  const cy = MG.y + MG.h / 2;

  noStroke(); fill(2, 6, 20, 205);
  rect(cx - 172, cy - 98, 344, 196, 14);
  stroke(0, 180, 255, 160); strokeWeight(2); noFill();
  rect(cx - 170, cy - 96, 340, 192, 13);

  textFont('monospace'); textAlign(CENTER, CENTER); noStroke();
  fill(0, 200, 255, 225); textSize(13);
  text('— MINIGAME SETTLEMENT —', cx, cy - 68);

  fill(0, 255, 175, 220); textSize(14);
  text('LandedBalls：' + landedBalls + ' ', cx, cy - 32);

  fill(255, 215, 40, 240); textSize(34);
  text('+ ¥' + minigameResult, cx, cy + 12);

  fill(100, 175, 255, 175); textSize(10);
  text('CREDITS ADDED TO RESERVES', cx, cy + 50);

  noStroke(); fill(8, 20, 44);
  rect(cx - 112, cy + 70, 224, 8, 4);
  fill(0, 180, 255, 200);
  rect(cx - 112, cy + 70, 224 * t, 8, 4);

  textAlign(LEFT, BASELINE);
}

// ============================================================
//  Particle system
// ============================================================
function spawnMinigameParticles(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    const a = random(TWO_PI), s = random(1.2, 4.5);
    mgParticles.push({
      x, y, vx: cos(a)*s, vy: sin(a)*s - 0.8,
      life: 1.0, col, r: random(2, 5),
    });
  }
}

function updateMinigameParticles() {
  mgParticles = mgParticles.filter(p => p.life > 0);
  for (const p of mgParticles) {
    p.x  += p.vx; p.y += p.vy;
    p.vx *= 0.90; p.vy = p.vy * 0.90 + 0.12;
    p.life -= 0.036;
  }
}

function drawMinigameParticles() {
  for (const p of mgParticles) {
    noStroke();
    fill(red(p.col), green(p.col), blue(p.col), p.life * 215);
    ellipse(p.x, p.y, p.r * p.life * 2.4, p.r * p.life * 2.4);
  }
}

// ============================================================
//  Sell tower (called from ui.js)
// ============================================================
function demolishTower(t) {
  const refund = Math.floor(TOWER_DEFS[t.type].cost * 0.8);
  coins += refund;
  towers = towers.filter(tower => tower !== t);
}

// ============================================================
//  Minigame help system
// ============================================================

// Question-mark button rectangle (directly below the pause button)
function _mgHelpBtnRect() {
  // _pauseBtnRect is filled in each frame by ui/pause.js when drawing; preferred when present
  const pb = (typeof _pauseBtnRect !== 'undefined' && _pauseBtnRect)
    ? _pauseBtnRect
    : { x: width - 46, y: 6, w: 36, h: 36 };   // Fallback estimate
  const GAP = 6;
  return { x: pb.x, y: pb.y + pb.h + GAP, w: pb.w, h: pb.h };
}

function _mgInRect(mx, my, r) {
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}

// -- Question-mark button --
function drawMgHelpBtn() {
  const r = _mgHelpBtnRect();
  const hov = _mgInRect(mouseX, mouseY, r);
  const pulse = sin(frameCount * 0.12) * 0.3 + 0.7;

  push();
  // Outer glow (more eye-catching on first view)
  if (!_mgHelpSeen) {
    noFill(); stroke(0, 220, 255, 90 * pulse); strokeWeight(4);
    rect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 10);
  }
  // Button base
  noStroke();
  fill(hov ? color(0, 60, 120, 230) : color(5, 20, 50, 210));
  rect(r.x, r.y, r.w, r.h, 7);
  // Border
  noFill();
  stroke(hov ? color(0, 240, 255, 240) : color(0, 180, 255, 160));
  strokeWeight(1.5);
  rect(r.x, r.y, r.w, r.h, 7);
  // Question-mark text
  noStroke();
  fill(hov ? color(255, 255, 255, 255) : color(0, 210, 255, 220));
  textFont('monospace'); textSize(18); textAlign(CENTER, CENTER);
  text('?', r.x + r.w / 2, r.y + r.h / 2 + 1);
  pop();
  textAlign(LEFT, BASELINE);
}

// -- First entry: arrow guide --
function drawMgHelpGuide() {
  if (_mgHelpSeen || _mgHelpOpen) return;
  const r  = _mgHelpBtnRect();
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const pulse = sin(frameCount * 0.14) * 0.4 + 0.6;

  push();
  // Highlight ring
  noFill(); stroke(0, 220, 255, 180 * pulse); strokeWeight(2.5);
  ellipse(cx, cy, r.w + 18 + pulse * 6, r.h + 18 + pulse * 6);

  // Arrow (points from lower-left to the button)
  const ax = cx - 68, ay = cy + 52;
  stroke(0, 220, 255, 200 * pulse); strokeWeight(2);
  // Curve simulated with a polyline: start -> bend -> end
  line(ax, ay, cx - 14, cy + 14);
  // Arrowhead
  const ang = atan2(cy - (ay), cx - 14 - ax) ; // Pointing upper-right
  const hs = 10;
  line(cx - 14, cy + 14, cx - 14 - cos(ang + 0.4) * hs, cy + 14 - sin(ang + 0.4) * hs);
  line(cx - 14, cy + 14, cx - 14 - cos(ang - 0.4) * hs, cy + 14 - sin(ang - 0.4) * hs);

  // Hint text
  noStroke(); fill(0, 220, 255, 210 * pulse);
  textFont('monospace'); textSize(11); textAlign(CENTER, TOP);
  text('How to play?', ax, ay + 8);
  pop();
  textAlign(LEFT, BASELINE);
}

// -- Help panel --
function drawMgHelpPanel() {
  const PW = min(520, width - 32), PH = 390;
  const px = (width - PW) / 2;
  const py = MG.y + (MG.h - PH) / 2;

  push();
  // Mask
  noStroke(); fill(0, 0, 0, 160);
  rect(MG.x, MG.y, MG.w, MG.h);

  // Panel background
  fill(3, 8, 22, 248);
  rect(px, py, PW, PH, 12);
  stroke(0, 200, 255, 200); strokeWeight(2); noFill();
  rect(px, py, PW, PH, 12);
  // Top color bar
  noStroke(); fill(0, 200, 255, 190);
  rect(px, py, PW, 6, 12, 12, 0, 0);

  // Title
  textFont('monospace');
  fill(0, 220, 255, 240); textSize(16); textAlign(LEFT, TOP);
  text('HOW TO PLAY — MINIGAME', px + 20, py + 18);

  stroke(0, 180, 255, 70); strokeWeight(1);
  line(px + 20, py + 46, px + PW - 20, py + 46);
  noStroke();

  // -- Basic controls --
  fill(180, 210, 255, 200); textSize(11);
  text('① Move mouse to aim  ·  Click to launch all balls', px + 20, py + 58);

  // -- Gate types explanation --
  const entries = [
    { col: [255, 175, 0],  label: '× Multiply', desc: 'Each ball splits into N copies — chain for big combos!' },
    { col: [220, 55, 55],  label: '− Subtract',  desc: 'One-shot trap: destroys N balls nearest to the gate.' },
    { col: [180, 60, 255], label: '↯ BOUNCE',    desc: 'Launches ball upward — great for extra gate hits.' },
    { col: [50, 230, 120], label: '+10 🎱 Bonus', desc: 'Next round starts with 10 extra balls (one time only).' },
    { col: [160, 230, 255],label: '⇄ Sliding',   desc: 'Some gates slide left/right — time your shot!' },
  ];

  let ey = py + 82;
  for (const e of entries) {
    const [er, eg, eb] = e.col;
    // Color block
    noStroke(); fill(er, eg, eb, 200);
    rect(px + 20, ey, 10, 10, 2);
    // Label
    fill(er, eg, eb, 230); textSize(12);
    text(e.label, px + 38, ey);
    // Description
    fill(180, 205, 240, 185); textSize(10);
    text(e.desc, px + 38, ey + 15);
    ey += 48;
  }

  // -- Score explanation --
  stroke(0, 180, 255, 55); strokeWeight(1);
  line(px + 20, ey + 4, px + PW - 20, ey + 4);
  noStroke();
  fill(255, 220, 60, 210); textSize(11);
  text('Score  ≈  50 balls → ¥250  ·  200 → ¥800  ·  500 → ¥1500  ·  1000 → ¥2000+', px + 20, ey + 16);

  // -- Close hint --
  fill(0, 160, 200, 140); textSize(10); textAlign(CENTER, TOP);
  text('[ click anywhere to close ]', px + PW / 2, py + PH - 20);

  pop();
  textAlign(LEFT, BASELINE);
}