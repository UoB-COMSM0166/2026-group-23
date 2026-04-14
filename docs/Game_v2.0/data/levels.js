// ============================================================
//  data/levels.js — 关卡元数据（纯数据）
//  （从 screens/level-map.js 抽离）
//
//  LEVEL_INFO  : 关卡名称 / 描述 / 威胁度 / 配色 / 初始金币 / 图标
//  LEVEL_NODES : 关卡选择地图上各关卡节点的相对坐标（0~1）
// ============================================================

// 注意：subtitle / desc 已迁移到 i18n.js（key: level.<N>.subtitle / level.<N>.desc），
// 本对象只保留与语言无关的数值/配色/图标。name 为英文代号（不翻译）。
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
