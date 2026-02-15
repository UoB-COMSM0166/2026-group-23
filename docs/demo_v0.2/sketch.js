import { GameConfig } from './src/constants/GameConfig.js';
import { Enemy } from './src/entities/Enemy.js';
import { Tower } from './src/entities/Tower.js';
import { Path } from './src/managers/Path.js';

export let animations = {}; // 存储切割后的图片数组

// 将 P5 函数挂载到 window，确保引擎能触发它们
window.preload = preload;
window.setup = setup;
window.draw = draw;

let config = {
  // 敌人状态
  'Enemy_Walk_Side': { file: GameConfig.PATHS.ENEMY_WALK_SIDE, frames: 6 },
  'Enemy_Walk_Front': { file: GameConfig.PATHS.ENEMY_WALK_FRONT, frames: 6 },
  'Enemy_Death': { file: GameConfig.PATHS.ENEMY_DEATH, frames: 6 },
  // 塔与弓箭手
  'Tower_Base': { file: GameConfig.PATHS.TOWER_BASE, frames: 4 },
  'Archer_Idle': { file: GameConfig.PATHS.ARCHER_IDLE, frames: 4 },
  'Archer_Attack': { file: GameConfig.PATHS.ARCHER_ATTACK, frames: 6 }
};

// 子弹图片数组
let bulletImages = [];

function preload() {
  for (let name in config) {
    config[name].img = loadImage(config[name].file);
  }
  // 加载13张子弹图片
  for (let i = 1; i <= GameConfig.BULLET.COUNT; i++) {
    let imgPath = GameConfig.BULLET.PATH_PREFIX + i + GameConfig.BULLET.PATH_SUFFIX;
    bulletImages.push(loadImage(imgPath));
  }
}

let enemies = [];
let towers = [];
let bullets = [];
let gamePath;  // 路径对象

function setup() {
  createCanvas(800, 600);
  
  // 处理原有动画
  for (let name in config) {
    animations[name] = [];
    let sheet = config[name].img;
    let frames = config[name].frames;
    let w = sheet.width / frames;
    let h = sheet.height;
    
    for (let i = 0; i < frames; i++) {
      animations[name].push(sheet.get(i * w, 0, w, h));
    }
  }
  
  // 将子弹图片存入 animations
  animations['Bullet'] = bulletImages;
  
  // 创建路径
  gamePath = new Path();
  
  imageMode(CENTER);
  towers.push(new Tower(300, 450));  // 调整塔的位置以适应路径
}

function draw() {
  background(100, 180, 100);
  
  // 绘制路径（用于可视化）
  gamePath.draw();
  
  // 更新并显示敌人
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();
    enemies[i].display();
    if (enemies[i].shouldRemove) enemies.splice(i, 1);
  }

  // 更新并显示子弹
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update();
    bullets[i].display();
    if (bullets[i].shouldRemove) bullets.splice(i, 1);
  }

  // 更新并显示防御塔
  for (let t of towers) {
    t.update(enemies, bullets);
    t.display();
  }
  
  // 每180帧生成一个敌人
  if (frameCount % 180 === 0) {
    // 创建新敌人，从路径起点开始
    let startPoint = gamePath.waypoints[0];
    let enemy = new Enemy(startPoint.x, startPoint.y, gamePath);
    enemies.push(enemy);
  }
}