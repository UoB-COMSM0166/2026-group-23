// src/system/AssetManager.js
import { GameConfig } from '../constants/GameConfig.js';

export class AssetManager {
  constructor() {
    this.animations = {};
    this.bulletImages = [];
    this.config = {
      // 敌人状态
      'Enemy_Walk_Side': { file: GameConfig.PATHS.ENEMY_WALK_SIDE, frames: 6 },
      'Enemy_Walk_Front': { file: GameConfig.PATHS.ENEMY_WALK_FRONT, frames: 6 },
      'Enemy_Death': { file: GameConfig.PATHS.ENEMY_DEATH, frames: 6 },
      // 塔与弓箭手
      'Tower_Base': { file: GameConfig.PATHS.TOWER_BASE, frames: 4 },
      'Archer_Idle': { file: GameConfig.PATHS.ARCHER_IDLE, frames: 4 },
      'Archer_Attack': { file: GameConfig.PATHS.ARCHER_ATTACK, frames: 6 }
    };
  }

  preload() {
    // 加载塔防资源
    for (let name in this.config) {
      this.config[name].img = loadImage(this.config[name].file);
    }
    
    // 加载子弹图片
    for (let i = 1; i <= GameConfig.BULLET.COUNT; i++) {
      let imgPath = GameConfig.BULLET.PATH_PREFIX + i + GameConfig.BULLET.PATH_SUFFIX;
      this.bulletImages.push(loadImage(imgPath));
    }
  }

  setup() {
    // 处理动画
    for (let name in this.config) {
      this.animations[name] = [];
      let sheet = this.config[name].img;
      let frames = this.config[name].frames;
      let w = sheet.width / frames;
      let h = sheet.height;
      
      for (let i = 0; i < frames; i++) {
        this.animations[name].push(sheet.get(i * w, 0, w, h));
      }
    }
    
    // 将子弹图片存入 animations
    this.animations['Bullet'] = this.bulletImages;
    
    return this.animations;
  }

  getAnimation(name) {
    return this.animations[name] || [];
  }
}