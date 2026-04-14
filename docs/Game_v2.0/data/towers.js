// ============================================================
//  data/towers.js — 七座防御塔的纯数据配置
//  （从 towers.js 抽离，便于单独维护数值平衡）
//
//  塔一览：
//    RAPID   快速塔        — 高频单体子弹
//    LASER   激光切割者    — 蓄力，Lv升一级多锁一个目标，同时多射线击发
//    NOVA    穿透炮        — 朝目标方向发射直线穿透子弹，落点范围爆炸
//    CHAIN   链式电弧塔    — 命中后跳链附近怪物（Lv1跳1次→Lv3跳3次）
//    MAGNET  磁场干扰塔    — 无伤害，持续降低范围内所有怪速度（越近越慢）
//    GHOST   幽灵导弹塔    — 发射追踪导弹（Lv1=1枚→Lv3=3枚），命中小爆炸
//    SCATTER 散射对空炮    — 扇形多弹专打飞行怪（Lv1=3弹→Lv3=7弹）
//    CANNON  轨道巨炮      — 全图打击，空地兼顾，大范围爆炸
// ============================================================

const TOWER_DEFS = {
  rapid: {
    name: '快速塔', label: 'RAPID', cost: 110,
    // ★ 唯一能无视机器人护盾的塔；充能20次可激活超级机枪模式
    levels: [
      { dmg: 16, range: 130, fireRate: 20, upgradeCost: 100 },
      { dmg: 28, range: 150, fireRate: 16, upgradeCost: 160 },
      { dmg: 44, range: 170, fireRate: 12, upgradeCost: 0   }
    ],
    projSpd: 16, color: [255, 200, 0], antiAir: false,
    ignoreRobotShield: true,
  },
  laser: {
    name: '激光切割者', label: 'LASER', cost: 180,
    // Lv1=1目标 Lv2=2目标 Lv3=3目标，蓄力后同时对所有目标发射
    levels: [
      { dmg: 65,  range: 150, fireRate: 163, upgradeCost: 170 },
      { dmg: 115, range: 170, fireRate: 138, upgradeCost: 280 },
      { dmg: 210, range: 198, fireRate: 131, upgradeCost: 0   }
    ],
    projSpd: 0, color: [0, 255, 150], antiAir: false,
  },
  nova: {
    name: 'Nova穿透炮', label: 'NOVA', cost: 200,
    // 直线穿透子弹，打穿所有地面怪，落点范围爆炸
    levels: [
      { dmg: 55,  range: 155, fireRate: 95,  upgradeCost: 190 },
      { dmg: 90,  range: 175, fireRate: 82,  upgradeCost: 300 },
      { dmg: 145, range: 200, fireRate: 70,  upgradeCost: 0   }
    ],
    projSpd: 5.5, color: [255, 140, 30], antiAir: false,
  },
  chain: {
    name: '链式电弧塔', label: 'CHAIN', cost: 160,
    // 命中后跳链：Lv1跳1次  Lv2跳2次  Lv3跳3次，每跳伤害×0.72
    // ★ 唯一能无视坦克护盾屏障的塔
    levels: [
      { dmg: 75,  range: 135, fireRate: 55,  upgradeCost: 140 },
      { dmg: 120, range: 155, fireRate: 45,  upgradeCost: 220 },
      { dmg: 190, range: 175, fireRate: 36,  upgradeCost: 0   }
    ],
    projSpd: 16, color: [100, 200, 255], antiAir: false,
    ignoreTankBarrier: true, // 无视坦克护盾屏障
  },
  magnet: {
    name: '磁场干扰塔', label: 'MAGNET', cost: 130,
    // 无伤害，持续减速：Lv1减50%  Lv2减65%  Lv3减80%（越靠近越慢）
    levels: [
      { dmg: 0, range: 140, fireRate: 999, upgradeCost: 110 },
      { dmg: 0, range: 165, fireRate: 999, upgradeCost: 180 },
      { dmg: 0, range: 190, fireRate: 999, upgradeCost: 0   }
    ],
    projSpd: 0, color: [120, 80, 255], antiAir: false,
    slowFactor: [0.5, 0.35, 0.2],
  },
  ghost: {
    name: '幽灵导弹塔', label: 'GHOST', cost: 190,
    // 发射追踪导弹：Lv1=1枚  Lv2=2枚  Lv3=3枚，命中范围爆炸
    // ★ 攻击范围几乎覆盖大半张地图（升级后接近全图）
    levels: [
      { dmg: 35,  range: 380, fireRate: 120, upgradeCost: 170 },
      { dmg: 55,  range: 440, fireRate: 100, upgradeCost: 270 },
      { dmg: 80,  range: 520, fireRate: 85,  upgradeCost: 0   }
    ],
    projSpd: 3.5, color: [200, 100, 255], antiAir: false,
  },
  scatter: {
    name: '散射对空炮', label: 'SCATTER', cost: 160,
    // 扇形发射多弹专打飞行怪：Lv1=3弹  Lv2=5弹  Lv3=7弹
    levels: [
      { dmg: 45,  range: 200, fireRate: 55,  upgradeCost: 150 },
      { dmg: 72,  range: 230, fireRate: 48,  upgradeCost: 240 },
      { dmg: 115, range: 265, fireRate: 40,  upgradeCost: 0   }
    ],
    projSpd: 14, color: [255, 80, 120], antiAir: true, onlyAir: true,
  },
  cannon: {
    name: '轨道巨炮', label: 'CANNON', cost: 350,
    // 全图攻击范围，超大范围爆炸，同时打击地面与空中
    // 蓄力时间最长，随机选择目标
    levels: [
      { dmg: 200, range: 9999, fireRate: 300, upgradeCost: 320 },
      { dmg: 300, range: 9999, fireRate: 240, upgradeCost: 500 },
      { dmg: 420, range: 9999, fireRate: 180, upgradeCost: 0   }
    ],
    projSpd: 18, color: [255, 60, 60], antiAir: false,
    cannonBlastRadius: [90, 115, 145], // 各等级爆炸半径
  },
};
