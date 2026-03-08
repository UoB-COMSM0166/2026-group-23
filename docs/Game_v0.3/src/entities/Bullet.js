// src/entities/Bullet.js
import { SpriteEntity } from './Entity.js';
import { animations } from '../../sketch.js';
import { GameConfig } from '../constants/GameConfig.js';

export class Bullet extends SpriteEntity {
  constructor(x, y, target, damage) {
    super(x, y, 'Bullet');
    this.target = target;
    this.damage = damage;
    this.speed = GameConfig.BULLET.SPEED;

    // 初始方向
    this.updateDirection();
  }

  updateDirection() {
    if (!this.target || this.target.isDead) return;
    
    // 实时计算指向目标的方向
    const dir = p5.Vector.sub(this.target.pos, this.pos);
    this.velocity = dir.normalize().mult(this.speed);

    // 更新子弹方向对应的图片
    this.calculateDirectionAndFlip();
  }

  calculateDirectionAndFlip() {
    // 获取速度向量的角度（弧度）
    let angleRad = atan2(this.velocity.y, this.velocity.x);
    
    // 转换为角度（-180到180度）
    let angleDeg = angleRad * 180 / Math.PI;
    
    // 转换为0-360度
    if (angleDeg < 0) angleDeg += 360;
    
    // 调试：打印角度
    // console.log('原始角度:', angleDeg);
    
    // 确定方向所在的象限
    if (angleDeg >= 0 && angleDeg <= 90) {
      // 第一象限：0-90度（上到右）
      // 直接使用图片1-13，不需要翻转
      // 角度范围：0°(上) 到 90°(右)
      this.bulletIndex = Math.floor(angleDeg / (90 / 13)) + 1;
      this.bulletIndex = Math.min(13, Math.max(1, this.bulletIndex));
      this.bulletIndex = 14 - this.bulletIndex; // 转换为13-1
      this.flipX = false;
      this.flipY = true;  // 垂直翻转
      // console.log('Q1:', angleDeg, '→', this.bulletIndex);
    }
    else if (angleDeg > 90 && angleDeg <= 180) {
      // 第二象限：90-180度（上到左）
      // 水平翻转，图片顺序从13到1（逆序）
      // 映射：180°(左)对应图片13，90°(上)对应图片1
      let mappedAngle = 180 - angleDeg; // 映射到0-90度
      this.bulletIndex = Math.floor(mappedAngle / (90 / 13)) + 1;
      this.bulletIndex = Math.min(13, Math.max(1, this.bulletIndex));
      // 逆序：角度越小（越接近左）图片编号越小
      this.bulletIndex = 14 - this.bulletIndex; // 转换为13-1
      this.flipX = true;  // 水平翻转
      this.flipY = true;  // 垂直翻转
    }
    else if (angleDeg > 180 && angleDeg <= 270) {
      // 第三象限：180-270度（左到下）
      // 水平和垂直翻转，图片顺序从1到13
      // 映射：180°(左)对应图片13，270°(下)对应图片1
      let mappedAngle = angleDeg - 180; // 映射到0-90度
      this.bulletIndex = Math.floor(mappedAngle / (90 / 13)) + 1;
      this.bulletIndex = Math.min(13, Math.max(1, this.bulletIndex));
      // 逆序：角度越大（越接近下）图片编号越小
      this.bulletIndex = 14 - this.bulletIndex; // 转换为13-1
      this.flipX = true;  // 水平翻转
      this.flipY = false;
    }
    else {
      // 第四象限：270-360度（下到右）
      // 垂直翻转，图片顺序从13到1（逆序）
      // 映射：270°(下)对应图片1，360°(右)对应图片13
      let mappedAngle = 360 - angleDeg; // 映射到0-90度
      this.bulletIndex = Math.floor(mappedAngle / (90 / 13)) + 1;
      this.bulletIndex = Math.min(13, Math.max(1, this.bulletIndex));
      // 角度越大（越接近右）图片编号越小
      this.bulletIndex = 14 - this.bulletIndex; // 转换为13-1
      this.flipX = false;
      this.flipY = false;
    }
  }

  update() {
    // 目标失效则子弹消失
    if (!this.target || this.target.isDead || this.target.shouldRemove) {
      this.shouldRemove = true;
      return;
    }

    // 每帧更新方向（追踪移动的敌人）
    this.updateDirection();

    // 移动
    this.pos.add(p5.Vector.mult(this.velocity, deltaTime / 1000));

    // 碰撞检测
    let distanceToTarget = p5.Vector.dist(this.pos, this.target.pos);
    if (distanceToTarget < 20) {
      this.target.takeDamage(this.damage);
      this.shouldRemove = true;
    }

    // 超出屏幕移除
    if (this.pos.x < -50 || this.pos.x > width + 50 || 
        this.pos.y < -50 || this.pos.y > height + 50) {
      this.shouldRemove = true;
    }
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // 应用翻转
    if (this.flipX || this.flipY) {
      let scaleX = this.flipX ? -1 : 1;
      let scaleY = this.flipY ? -1 : 1;
      scale(scaleX, scaleY);
    }
    
    // 显示子弹
    const bulletImg = animations['Bullet'][this.bulletIndex - 1];
    if (bulletImg) {
      image(bulletImg, 0, 0);
      
      // 调试：显示子弹编号和翻转状态
      // push();
      // fill(255, 0, 0);
      // textSize(12);
      // let flipText = '';
      // if (this.flipX) flipText += 'H';
      // if (this.flipY) flipText += 'V';
      // text(this.bulletIndex + flipText, 20, -20);
      // pop();
    }
    
    pop();
  }
}