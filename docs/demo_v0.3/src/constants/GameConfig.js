// GameConfig.js

export const GameConfig = {
  RESOURCE: {
    INITIAL_GOLD: 100,
    INITIAL_HP: 20,
    MAX_WAVE: 10
  },
  
  ENEMY: {
    INITIAL_HP: 100,
    SPEED: 40,
  },
  
  ARCHER: {
    ATTACK_RANGE: 300,
    ATTACK_SPEED: 1.0, // 攻击/秒
    DAMAGE: 25
  },

  BULLET: {
    SPEED: 200,           // 子弹飞行速度（像素/秒）
    COUNT: 13,            // 子弹图片数量
    PATH_PREFIX: 'assets/Arrow/',  // 子弹图片文件夹路径
    PATH_SUFFIX: '.png'   // 子弹图片后缀
  },
  
  PATHS: {
    ENEMY_WALK_SIDE: 'assets/enemy/S_Walk.png',
    ENEMY_WALK_FRONT: 'assets/enemy/D_Walk.png',
    ENEMY_DEATH: 'assets/enemy/S_Death.png',
    TOWER_BASE: 'assets/tower/3.png',
    ARCHER_IDLE: 'assets/archer/S_Idle.png',
    ARCHER_ATTACK: 'assets/archer/S_Attack.png',
    BULLET: 'assets/bullet/bullet.png'
  }
};