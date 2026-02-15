// src/entities/Archer.js
import { SpriteEntity } from './Entity.js';
import { Bullet } from './Bullet.js';
import { GameConfig } from '../constants/GameConfig.js';
import { animations } from '../../sketch.js'; // 导入全局动画资源

export class Archer extends SpriteEntity {
  constructor(x, y) {
    super(x, y);
    this.range = GameConfig.ARCHER.ATTACK_RANGE;
    this.damage = GameConfig.ARCHER.DAMAGE;
    this.attackSpeed = GameConfig.ARCHER.ATTACK_SPEED; // 每秒攻击次数
    this.target = null;
    this.attackCooldown = 0;
    this.isAttacking = false;
    this.attackAnimationTimer = 0;
    this.attackAnimationSpeed = 6; // 攻击动画的FPS
  }

  update(targets, bullets) {
    // 减少攻击冷却时间
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime / 1000;
    }
    
    // 自动寻找最近的目标
    this.target = this.findNearest(targets);
    
    // 如果正在播放攻击动画
    if (this.isAttacking) {
      this.playAttackAnimation();
      return; // 播放攻击动画时跳过其他逻辑
    }
    
    if (this.target && this.attackCooldown <= 0) {
      // 开始攻击
      this.startAttack(bullets);
    } else {
      // 空闲状态
      this.animate('Archer_Idle', 5);
    }
  }

  startAttack(bullets) {
    if (!this.target || this.target.isDead) {
      this.isAttacking = false;
      return;
    }

    this.isAttacking = true;
    this.frameIdx = 0;
    this.attackAnimationTimer = 0;
    this.currentAction = 'Archer_Attack';
    this.facing = (this.target.pos.x > this.pos.x) ? -1 : 1;

    // 发射子弹
    bullets.push(new Bullet(this.pos.x, this.pos.y-10, this.target, this.damage));
    this.attackCooldown = 1 / this.attackSpeed;
  }

  playAttackAnimation() {
    // 播放一次完整的攻击动画
    this.attackAnimationTimer += deltaTime / 1000;
    
    // 更新动画帧
    if (this.attackAnimationTimer > 1 / this.attackAnimationSpeed) {
      this.frameIdx++;
      this.attackAnimationTimer = 0;
      
      // 检查动画是否播放完成
      if (this.frameIdx >= animations['Archer_Attack'].length) {
        this.isAttacking = false;
        this.currentAction = 'Archer_Idle'; // 回到空闲状态
        this.frameIdx = 0;
      }
    }
    
    // 显示当前帧
    let img = animations[this.currentAction][this.frameIdx];
    if (img) {
      this.display();
    }
  }

  findNearest(targets) {
    let closest = null;
    let minDist = this.range;
    for (let e of targets) {
      let d = dist(this.pos.x, this.pos.y, e.pos.x, e.pos.y);
      if (d < minDist && !e.isDead) {
        minDist = d;
        closest = e;
      }
    }
    return closest;
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    scale(this.facing, 1);
    image(animations[this.currentAction][this.frameIdx], 0, 0);
    pop();
  }
}