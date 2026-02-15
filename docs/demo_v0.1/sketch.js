let animations = {}; // 存储切割后的图片数组
let config = {
  // 敌人状态
  'Enemy_Walk_Side': { file: 'assets/enemy/S_Walk.png', frames: 6 },
  'Enemy_Walk_Front': { file: 'assets/enemy/D_Walk.png', frames: 6 },
  'Enemy_Death': { file: 'assets/enemy/S_Death.png', frames: 6 },
  // 塔与弓箭手
  'Tower_Base': { file: 'assets/tower/3.png', frames: 4 },
  'Archer_Idle': { file: 'assets/archer/S_Idle.png', frames: 4 },
  'Archer_Attack': { file: 'assets/archer/S_Attack.png', frames: 6 }
};

function preload() {
  for (let name in config) {
    config[name].img = loadImage(config[name].file);
  }
}

function setup() {
  createCanvas(800, 600);
  
  // 核心：将 SpriteSheet 切割并存入 animations 字典
  for (let name in config) {
    animations[name] = [];
    let sheet = config[name].img;
    let frames = config[name].frames;
    let w = sheet.width / frames;
    let h = sheet.height;
    
    for (let i = 0; i < frames; i++) {
      // 使用 get() 裁切每一帧
      animations[name].push(sheet.get(i * w, 0, w, h));
    }
  }
  imageMode(CENTER);
  // 示例：初始化一座塔
  towers.push(new Tower(200, 450));
}

// 全局管理数组
let enemies = [];
let towers = [];

function draw() {
  background(100, 180, 100); 
  
  // 更新和显示敌人
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();
    enemies[i].display();
    if (enemies[i].shouldRemove) enemies.splice(i, 1);
  }

  // 更新和显示防御塔（包括地基动画和弓箭手）
  for (let t of towers) {
    t.update(enemies);
    t.display();
  }
  
  if (frameCount % 120 === 0) {
    enemies.push(new Enemy(0, random(height-200, height-100)));
  }
}

// --- 核心类定义 ---

class SpriteEntity {
  constructor(x, y, configName) {
    this.pos = createVector(x, y);
    this.currentAction = configName;
    this.frameIdx = 0;
    this.timer = 0;
    this.facing = 1;
  }

  animate(actionName, fps = 10) {
    if (this.currentAction !== actionName) {
      this.currentAction = actionName;
      this.frameIdx = 0;
    }
    this.timer += deltaTime / 1000;
    if (this.timer > 1 / fps) {
      // 检查动画是否存在
      if (animations[this.currentAction]) {
        this.frameIdx = (this.frameIdx + 1) % animations[this.currentAction].length;
      }
      this.timer = 0;
    }
  }
}

class Enemy extends SpriteEntity {
  constructor(x, y) {
    super(x, y);
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.isDead = false;
    this.shouldRemove = false;
  }

  update() {
    if (this.isDead) {
      this.playDeathAnimation();
      return;
    }
    // 移动逻辑
    this.pos.x += 1; 
    this.animate('Enemy_Walk_Side', 10);
    
    if (this.hp <= 0) this.isDead = true;
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    scale(-this.facing, 1);
    image(animations[this.currentAction][this.frameIdx], 0, 0);
    // 绘制血条
    this.drawHealthBar();
    pop();
  }

  playDeathAnimation() {
    this.currentAction = 'Enemy_Death';
    // 播放一次死亡动画后销毁
    if (this.frameIdx === animations['Enemy_Death'].length - 1) {
      this.shouldRemove = true;
    }
    this.animate('Enemy_Death', 8);
  }

  drawHealthBar() {
    // 血条背景
    let barWidth = 40;
    let barHeight = 6;
    let yOffset = -30;
    
    push();
    scale(-1/abs(this.facing), 1); // 抵消缩放效果
    
    // 血条背景
    fill(50, 50, 50);
    rect(-barWidth/2, yOffset, barWidth, barHeight);
    
    // 当前血量
    let healthPercent = this.hp / this.maxHp;
    if (healthPercent > 0.6) {
      fill(0, 255, 0);   // 绿色
    } else if (healthPercent > 0.3) {
      fill(255, 255, 0); // 黄色
    } else {
      fill(255, 0, 0);   // 红色
    }
    
    rect(-barWidth/2, yOffset, barWidth * healthPercent, barHeight);
    
    // 血条边框
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

class Tower extends SpriteEntity {
  constructor(x, y) {
    // 调用父类构造函数，初始化 this.pos 和动画相关变量
    super(x, y); 
    // 每个塔自带一个弓箭手
    this.archer = new Archer(x, y); 
  }

  update(targets) {
    // 播放 Tower_Base 的动画
    this.animate('Tower_Base', 5);
    
    // 更新弓箭手逻辑
    this.archer.update(targets);
  }

  display() {
    // 1. 绘制塔基座动画
    push();
    translate(this.pos.x, this.pos.y);
    // 地基不需要翻转，scale 保持 (1, 1)
    image(animations['Tower_Base'][this.frameIdx], 0, 0);
    pop();
    
    // 2. 绘制弓箭手
    this.archer.display();
  }
}

class Archer extends SpriteEntity {
  constructor(x, y) {
    super(x, y);
    this.range = 300;
    this.target = null;
    this.attackCooldown = 0;
    this.attackSpeed = 1.0; // 每秒攻击次数
    this.isAttacking = false;
    this.attackAnimationTimer = 0;
    this.attackAnimationSpeed = 6; // 攻击动画的FPS
  }

  update(targets) {
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
      this.startAttack();
    } else {
      // 空闲状态
      this.animate('Archer_Idle', 5);
    }
  }

  startAttack() {
    this.isAttacking = true;
    this.frameIdx = 0; // 重置动画帧
    this.attackAnimationTimer = 0;
    this.currentAction = 'Archer_Attack';
    this.facing = (this.target.pos.x > this.pos.x) ? 1 : -1;
    
    // 立即造成伤害
    this.target.takeDamage(25);
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
