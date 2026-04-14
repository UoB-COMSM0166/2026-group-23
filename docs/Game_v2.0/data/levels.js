// ============================================================
//  data/levels.js — 关卡元数据（纯数据）
//  （从 screens/level-map.js 抽离）
//
//  LEVEL_INFO  : 关卡名称 / 描述 / 威胁度 / 配色 / 初始金币 / 图标
//  LEVEL_NODES : 关卡选择地图上各关卡节点的相对坐标（0~1）
// ============================================================

const LEVEL_INFO = {
  1:{ name:'SECTOR ALPHA',  subtitle:'新兵训练区', desc:'入门关卡，路径简洁，单路步兵为主。',   threat:1, color:[0,220,140],  startCoins:2000, icon:'①' },
  2:{ name:'NEBULA RIFT',   subtitle:'星云裂隙',   desc:'双路并进，飞行敌人首次出现。',        threat:2, color:[0,180,255],  startCoins:1800, icon:'②' },
  3:{ name:'IRON CITADEL',  subtitle:'钢铁要塞',   desc:'复杂地形，重装甲怪物与Boss登场。',    threat:3, color:[255,160,40], startCoins:1600, icon:'③' },
  4:{ name:'VOID MAZE',     subtitle:'虚空迷宫',   desc:'迂回路径，高速怪物大量入侵。',        threat:4, color:[180,60,255], startCoins:1400, icon:'④' },
  5:{ name:'OMEGA GATE',    subtitle:'终极门户',   desc:'终极关卡，全精英部队 + 三大Boss。',   threat:5, color:[255,60,80],  startCoins:1200, icon:'⑤' },
};

const LEVEL_NODES = [
  { x:0.11, y:0.72 }, { x:0.29, y:0.40 },
  { x:0.50, y:0.64 }, { x:0.71, y:0.33 }, { x:0.89, y:0.58 },
];
