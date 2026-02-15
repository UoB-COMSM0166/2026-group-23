// src/entities/Enemy.js
import { SpriteEntity } from './Entity.js';
import { GameConfig } from '../constants/GameConfig.js';
import { animations } from '../../sketch.js';

export class Enemy extends SpriteEntity {
  constructor(x, y, path) {
    super(x, y);
    this.maxHp = GameConfig.ENEMY.INITIAL_HP;
    this.hp = this.maxHp;
    this.isDead = false;
    this.shouldRemove = false;
    this.speed = GameConfig.ENEMY.SPEED;
    
    // 路径相关
    this.path = path;
    this.currentWaypointIndex = 0;
    this.currentWaypoint = null;
    this.reachedEnd = false;
    
    // 平行偏移量（每个敌人固定）
    this.offsetX = random(-30, 30);
    this.offsetY = random(-30, 30);
    
    // 存储偏移后的路径点
    this.offsetWaypoints = this.generateOffsetPath();
  }

  // 生成整个偏移路径
  generateOffsetPath() {
    let offsetPoints = [];
    let waypoints = this.path.getAllWaypoints();
    
    for (let i = 0; i < waypoints.length; i++) {
      let wp = waypoints[i];
      
      if (i === 0 || i === waypoints.length - 1) {
        // 起点和终点保持原样，避免超出屏幕
        offsetPoints.push(createVector(wp.x, wp.y));
      } else {
        // 计算当前路径段的方向
        let prevWp = waypoints[i - 1];
        let nextWp = waypoints[i + 1];
        
        // 计算进入方向和离开方向
        let dirIn = p5.Vector.sub(wp, prevWp);
        let dirOut = p5.Vector.sub(nextWp, wp);
        
        // 归一化
        dirIn.normalize();
        dirOut.normalize();
        
        // 计算平均方向（用于拐角处的偏移方向）
        let avgDir = p5.Vector.add(dirIn, dirOut);
        avgDir.normalize();
        
        // 计算垂直向量（用于偏移）
        let perpendicular = createVector(-avgDir.y, avgDir.x);
        
        // 根据路径点的位置决定偏移方向
        // 如果路径点是向右转的拐角，偏移方向可能需要调整
        let cross = dirIn.x * dirOut.y - dirIn.y * dirOut.x;
        let offsetMultiplier = cross > 0 ? 1 : -1;
        
        // 应用偏移
        let offsetPoint = createVector(
          wp.x + perpendicular.x * this.offsetX * offsetMultiplier,
          wp.y + perpendicular.y * this.offsetY * offsetMultiplier
        );
        
        offsetPoints.push(offsetPoint);
      }
    }
    
    return offsetPoints;
  }

  update() {
    if (this.isDead) {
      this.playDeathAnimation();
      return;
    }

    if (this.reachedEnd) {
      this.shouldRemove = true;
      return;
    }

    // 获取当前目标偏移路径点
    let targetWaypoint = this.offsetWaypoints[this.currentWaypointIndex];
    
    if (!targetWaypoint) {
      this.reachedEnd = true;
      return;
    }
    
    // 计算移动方向
    let direction = p5.Vector.sub(targetWaypoint, this.pos);
    let distance = direction.mag();
    
    // 检查是否到达当前路径点
    if (distance < 5) {
      this.currentWaypointIndex++;
      
      // 检查是否还有下一个路径点
      if (this.currentWaypointIndex < this.offsetWaypoints.length) {
        targetWaypoint = this.offsetWaypoints[this.currentWaypointIndex];
        direction = p5.Vector.sub(targetWaypoint, this.pos);
        distance = direction.mag();
      } else {
        this.reachedEnd = true;
        return;
      }
    }
    
    if (distance > 1) {
      // 归一化方向向量
      direction.normalize();
      
      // 根据移动方向设置朝向
      if (direction.x > 0) {
        this.facing = 1;
      } else if (direction.x < 0) {
        this.facing = -1;
      }
      
      // 根据移动方向选择动画
      if (Math.abs(direction.y) > Math.abs(direction.x)) {
        this.animate('Enemy_Walk_Front', 10);
      } else {
        this.animate('Enemy_Walk_Side', 10);
      }
      
      // 移动敌人
      let moveVector = p5.Vector.mult(direction, this.speed * (deltaTime / 1000));
      
      if (distance < moveVector.mag()) {
        this.pos.set(targetWaypoint);
      } else {
        this.pos.add(moveVector);
      }
    }
    
    if (this.hp <= 0) this.isDead = true;
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    scale(-this.facing, 1);
    
    // 显示当前动画帧
    const currentAnim = animations[this.currentAction];
    if (currentAnim && currentAnim[this.frameIdx]) {
      image(currentAnim[this.frameIdx], 0, 0);
    }
    
    // 绘制血条
    this.drawHealthBar();
    
    // 调试：显示偏移路径
    // this.drawOffsetPath();
    
    pop();
  }

  // 调试方法：绘制这个敌人的偏移路径
  drawOffsetPath() {
    push();
    stroke(255, 0, 0, 100);
    strokeWeight(1);
    noFill();
    
    beginShape();
    for (let wp of this.offsetWaypoints) {
      vertex(wp.x, wp.y);
    }
    endShape();
    
    // 绘制路径点
    fill(255, 0, 0);
    noStroke();
    for (let wp of this.offsetWaypoints) {
      circle(wp.x, wp.y, 4);
    }
    pop();
  }

  playDeathAnimation() {
    this.currentAction = 'Enemy_Death';
    
    if (this.frameIdx === animations['Enemy_Death'].length - 1) {
      this.shouldRemove = true;
    }
    this.animate('Enemy_Death', 8);
  }

  drawHealthBar() {
    let barWidth = 40;
    let barHeight = 6;
    let yOffset = -30;
    
    push();
    scale(-1/abs(this.facing), 1);
    
    fill(50, 50, 50);
    rect(-barWidth/2, yOffset, barWidth, barHeight);
    
    let healthPercent = this.hp / this.maxHp;
    if (healthPercent > 0.6) {
      fill(0, 255, 0);
    } else if (healthPercent > 0.3) {
      fill(255, 255, 0);
    } else {
      fill(255, 0, 0);
    }
    
    rect(-barWidth/2, yOffset, barWidth * healthPercent, barHeight);
    
    noFill();
    stroke(255);
    strokeWeight(1);
    rect(-barWidth/2, yOffset, barWidth, barHeight);
    
    pop();
  }

  takeDamage(damage) {
    this.hp -= damage;
  }
}