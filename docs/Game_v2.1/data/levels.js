// ============================================================
//  data/levels.js — Level metadata (pure data)
//  (extracted from screens/level-map.js)
//
//  LEVEL_INFO  : level name / description / threat level / colors / starting coins / icon
//  LEVEL_NODES : relative coordinates (0-1) of each level node on the level select map
// ============================================================

// Note: subtitle / desc have been moved to i18n.js (key: level.<N>.subtitle / level.<N>.desc);
// only language-independent values / colors / icon are kept here. `name` is the English code (not translated).
const LEVEL_INFO = {
  1:{ name:'SECTOR ALPHA',  threat:1, color:[0,220,140],  startCoins:2000, icon:'①' },
  2:{ name:'NEBULA RIFT',   threat:2, color:[0,180,255],  startCoins:1800, icon:'②' },
  3:{ name:'IRON CITADEL',  threat:3, color:[255,160,40], startCoins:1600, icon:'③' },
  4:{ name:'VOID MAZE',     threat:4, color:[180,60,255], startCoins:1400, icon:'④' },
  5:{ name:'OMEGA GATE',    threat:5, color:[255,60,80],  startCoins:1200, icon:'⑤' },
};

const LEVEL_NODES = [
  { x:0.11, y:0.72 }, { x:0.29, y:0.40 },
  { x:0.50, y:0.64 }, { x:0.71, y:0.33 }, { x:0.89, y:0.58 },
];
