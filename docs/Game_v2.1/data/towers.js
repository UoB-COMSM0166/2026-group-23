// ============================================================
//  data/towers.js — Pure data configuration for the seven defense towers
//  (extracted from towers.js for easier balance tuning)
//
//  Tower overview:
//    RAPID   Rapid Tower      - High-frequency single-target bullets
//    LASER   Laser Cutter     - Charged shot; each level locks one more target and fires multiple beams simultaneously
//    NOVA    Nova Cannon      - Fires a straight piercing bullet that explodes in an area on landing
//    CHAIN   Chain Arc Tower  - Hits chain to nearby monsters (Lv1=1 jump -> Lv3=3 jumps)
//    MAGNET  Magnetic Jammer  - No damage; continuously slows all monsters in range (closer = slower)
//    GHOST   Ghost Missile    - Fires homing missiles (Lv1=1 -> Lv3=3); small explosion on hit
//    SCATTER Scatter AA Gun   - Fan-shaped multi-shot specialised against fliers (Lv1=3 -> Lv3=7 bullets)
//    CANNON  Orbital Cannon   - Whole-map strike; hits ground and air with a large explosion radius
// ============================================================

const TOWER_DEFS = {
  rapid: {
    label: 'RAPID', cost: 110,
    // * The only tower that ignores the robot shield; charging 20 hits activates Super Machine Gun mode
    levels: [
      { dmg: 16, range: 130, fireRate: 20, upgradeCost: 100 },
      { dmg: 28, range: 150, fireRate: 16, upgradeCost: 160 },
      { dmg: 44, range: 170, fireRate: 12, upgradeCost: 0   }
    ],
    projSpd: 16, color: [255, 200, 0], antiAir: false,
    ignoreRobotShield: true,
  },
  laser: {
    label: 'LASER', cost: 180,
    // Lv1=1 target, Lv2=2 targets, Lv3=3 targets; fires at all targets after charging
    levels: [
      { dmg: 65,  range: 150, fireRate: 163, upgradeCost: 170 },
      { dmg: 115, range: 170, fireRate: 138, upgradeCost: 280 },
      { dmg: 210, range: 198, fireRate: 131, upgradeCost: 0   }
    ],
    projSpd: 0, color: [0, 255, 150], antiAir: false,
  },
  nova: {
    label: 'NOVA', cost: 200,
    // Straight piercing bullet that punches through every ground monster, with an AoE explosion at the landing point
    levels: [
      { dmg: 55,  range: 155, fireRate: 95,  upgradeCost: 190 },
      { dmg: 90,  range: 175, fireRate: 82,  upgradeCost: 300 },
      { dmg: 145, range: 200, fireRate: 70,  upgradeCost: 0   }
    ],
    projSpd: 5.5, color: [255, 140, 30], antiAir: false,
  },
  chain: {
    label: 'CHAIN', cost: 160,
    // Chain on hit: Lv1=1 jump, Lv2=2 jumps, Lv3=3 jumps; each jump deals 0.72x damage
    // * The only tower that ignores the tank shield barrier
    levels: [
      { dmg: 75,  range: 135, fireRate: 55,  upgradeCost: 140 },
      { dmg: 120, range: 155, fireRate: 45,  upgradeCost: 220 },
      { dmg: 190, range: 175, fireRate: 36,  upgradeCost: 0   }
    ],
    projSpd: 16, color: [100, 200, 255], antiAir: false,
    ignoreTankBarrier: true, // Ignores the tank shield barrier
  },
  magnet: {
    label: 'MAGNET', cost: 130,
    // No damage, persistent slow: Lv1=-50%, Lv2=-65%, Lv3=-80% (closer = slower)
    levels: [
      { dmg: 0, range: 140, fireRate: 999, upgradeCost: 110 },
      { dmg: 0, range: 165, fireRate: 999, upgradeCost: 180 },
      { dmg: 0, range: 190, fireRate: 999, upgradeCost: 0   }
    ],
    projSpd: 0, color: [120, 80, 255], antiAir: false,
    slowFactor: [0.5, 0.35, 0.2],
  },
  ghost: {
    label: 'GHOST', cost: 190,
    // Fires homing missiles: Lv1=1, Lv2=2, Lv3=3; AoE explosion on hit
    // * Range covers most of the map (near full coverage when upgraded)
    levels: [
      { dmg: 35,  range: 380, fireRate: 120, upgradeCost: 170 },
      { dmg: 55,  range: 440, fireRate: 100, upgradeCost: 270 },
      { dmg: 80,  range: 520, fireRate: 85,  upgradeCost: 0   }
    ],
    projSpd: 3.5, color: [200, 100, 255], antiAir: false,
  },
  scatter: {
    label: 'SCATTER', cost: 160,
    // Fan-shaped volley specialised against fliers: Lv1=3, Lv2=5, Lv3=7 bullets
    levels: [
      { dmg: 45,  range: 200, fireRate: 55,  upgradeCost: 150 },
      { dmg: 72,  range: 230, fireRate: 48,  upgradeCost: 240 },
      { dmg: 115, range: 265, fireRate: 40,  upgradeCost: 0   }
    ],
    projSpd: 14, color: [255, 80, 120], antiAir: true, onlyAir: true,
  },
  cannon: {
    label: 'CANNON', cost: 350,
    // Whole-map range with a huge explosion radius; hits both ground and air
    // Longest charge time, randomly picks a target
    levels: [
      { dmg: 200, range: 9999, fireRate: 300, upgradeCost: 320 },
      { dmg: 300, range: 9999, fireRate: 240, upgradeCost: 500 },
      { dmg: 420, range: 9999, fireRate: 180, upgradeCost: 0   }
    ],
    projSpd: 18, color: [255, 60, 60], antiAir: false,
    cannonBlastRadius: [90, 115, 145], // Explosion radius per level
  },
};
