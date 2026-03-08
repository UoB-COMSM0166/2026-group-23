// src/system/GameManager.js
import { Enemy } from '../entities/Enemy.js';
import { Tower } from '../entities/Tower.js';
import { Path } from '../managers/Path.js';

export class GameManager {
  constructor(layout) {
    this.layout = layout;
    this.enemies = [];
    this.towers = [];
    this.bullets = [];
    this.gamePath = new Path();
    
    // 初始化塔
    this.towers.push(new Tower(300, 450));
  }
  
  update() {
    // 更新并检查敌人
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].update();
      if (this.enemies[i].shouldRemove) {
        this.enemies.splice(i, 1);
      }
    }

    // 更新并检查子弹
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.bullets[i].update();
      if (this.bullets[i].shouldRemove) {
        this.bullets.splice(i, 1);
      }
    }

    // 更新防御塔
    for (let t of this.towers) {
      t.update(this.enemies, this.bullets);
    }
    
    // 每180帧生成一个敌人
    if (frameCount % 180 === 0) {
      let startPoint = this.gamePath.waypoints[0];
      let enemy = new Enemy(startPoint.x, startPoint.y, this.gamePath);
      this.enemies.push(enemy);
    }
  }
  
  display() {
    // 绘制塔防游戏背景
    fill(100, 180, 100);
    noStroke();
    rect(this.layout.width/2, this.layout.height/2, this.layout.width, this.layout.height);
    
    // 绘制路径
    this.gamePath.draw();
    
    // 绘制敌人
    for (let enemy of this.enemies) {
      enemy.display();
    }
    
    // 绘制子弹
    for (let bullet of this.bullets) {
      bullet.display();
    }
    
    // 绘制防御塔
    for (let tower of this.towers) {
      tower.display();
    }
  }
  
  handleMousePressed(x, y) {
    // 处理塔防区域的鼠标点击
    // 例如：添加新的塔
    console.log('塔防区域点击:', x, y);
  }
  
  handleKeyPressed(key) {
    // 处理塔防区域的键盘事件
  }
}