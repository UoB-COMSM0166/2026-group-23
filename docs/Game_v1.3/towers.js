// ============================================================
//  towers.js — 塔放置、升级（Max Level 3）、子弹系统
//  更新：增加了三级进化外观与数值平滑缩放
// ============================================================

const TOWER_DEFS = {
  basic: {
    name: '基础塔', label: 'BASIC',
    cost: 80, 
    levels: [
      { dmg: 25, range: 120, fireRate: 60, upgradeCost: 70 },  // Lv1
      { dmg: 45, range: 140, fireRate: 50, upgradeCost: 110 }, // Lv2
      { dmg: 85, range: 170, fireRate: 40, upgradeCost: 0 }    // Lv3 (MAX)
    ],
    projSpd: 7, color: [0, 180, 255], antiAir: false,
  },
  rapid: {
    name: '快速塔', label: 'RAPID',
    cost: 120,
    levels: [
      { dmg: 12, range: 100, fireRate: 20, upgradeCost: 90 },
      { dmg: 22, range: 115, fireRate: 16, upgradeCost: 140 },
      { dmg: 38, range: 135, fireRate: 12, upgradeCost: 0 }
    ],
    projSpd: 10, color: [255, 200, 0], antiAir: false,
  },
  area: {
    name: '范围塔', label: 'AREA',
    cost: 150,
    levels: [
      { dmg: 40, range: 140, fireRate: 90, upgradeCost: 120 },
      { dmg: 75, range: 160, fireRate: 80, upgradeCost: 180 },
      { dmg: 140, range: 190, fireRate: 70, upgradeCost: 0 }
    ],
    projSpd: 5, color: [160, 80, 255], antiAir: false,
  },
  
  // 1. 对空神弩：只打飞行怪，高伤害，超远射程
  sniperAA: {
    name: '对空神弩', label: 'A-AIR',
    cost: 150,
    levels: [
      { dmg: 120, range: 250, fireRate: 40, upgradeCost: 150 }, 
      { dmg: 240, range: 300, fireRate: 35, upgradeCost: 250 },
      { dmg: 500, range: 380, fireRate: 25, upgradeCost: 0 }
    ],
    projSpd: 15, color: [255, 50, 50], antiAir: true, onlyAir: true, // 新增属性限制
  },

  // 2. 激光塔：持续伤害，对地
  laser: {
    name: '激光切割者', label: 'LASER',
    cost: 200,
    levels: [
      { dmg: 5, range: 150, fireRate: 5, upgradeCost: 180 }, // 每帧造成5点伤害
      { dmg: 9, range: 170, fireRate: 5, upgradeCost: 280 },
      { dmg: 16, range: 200, fireRate: 5, upgradeCost: 0 }
    ],
    projSpd: 0, color: [0, 255, 150], antiAir: false,
  },

  // 3. 霜冻塔：群体减速，辅助型
  frost: {
    name: '霜冻塔', label: 'FROST',
    cost: 130,
    levels: [
      { dmg: 10, range: 110, fireRate: 70, upgradeCost: 100 },
      { dmg: 20, range: 130, fireRate: 60, upgradeCost: 180 },
      { dmg: 40, range: 160, fireRate: 50, upgradeCost: 0 }
    ],
    projSpd: 6, color: [150, 220, 255], antiAir: false, slowEffect: 0.5,
  }
};

class Tower {
  constructor(gridX, gridY, type) {
    this.gx = gridX; this.gy = gridY;
    this.px = gridX * CELL_SIZE + CELL_SIZE / 2;
    this.py = gridY * CELL_SIZE + CELL_SIZE / 2;
    this.type = type;
    this.level = 1; // 初始等级为1
    
    this.initStats();
    
    this.timer = 0;
    this.angle = 0;
    this.pulseTime = 0;
    this.shootFlash = 0;
    this.buildAnim = 1.0;
    this.upgradeEffect = 0;
  }

  initStats() {
    const def = TOWER_DEFS[this.type];
    const lvData = def.levels[this.level - 1];
    this.dmg = lvData.dmg;
    this.range = lvData.range;
    this.fireRate = lvData.fireRate;
    this.upgradeCost = lvData.upgradeCost;
    this.col = def.color;
    this.antiAir = def.antiAir;
    this.projSpd = def.projSpd;
  }

  upgrade() {
    if (this.level >= 3 || coins < this.upgradeCost) return false;
    
    coins -= this.upgradeCost;
    this.level++;
    this.initStats();
    
    this.upgradeEffect = 40;
    // 升级瞬间产生粒子效果
    if (typeof spawnParticles === 'function') {
      spawnParticles(this.px, this.py, color(255, 215, 0), 20);
    }
    return true;
  }

  // ... findTarget() 和 update() 逻辑保持不变 ...
  findTarget() {
  if (!manager) return null;
  const def = TOWER_DEFS[this.type];
  
  // 获取范围内怪物
  let inRange = manager.getMonstersInRange(this.px, this.py, this.range, this.antiAir);
  
  // 如果是对空神弩，过滤掉地面单位
  if (def.onlyAir) {
    inRange = inRange.filter(m => m.isFlying);
  } else if (!this.antiAir) {
    // 普通对地塔过滤掉飞行单位
    inRange = inRange.filter(m => !m.isFlying);
  }

  if (inRange.length === 0) return null;
  // 优先攻击进度最前面的怪
  return inRange.reduce((best, m) => m.progress > best.progress ? m : best, inRange[0]);
}

  update() {
  this.pulseTime += 0.05;
  if (this.shootFlash > 0) this.shootFlash--;
  this.timer++;

  const target = this.findTarget();
  if (!target) {
    this.laserTarget = null;
    return;
  }

  // 瞄准角度
  this.angle = Math.atan2(target.pos.y - this.py, target.pos.x - this.px);

  if (this.type === 'laser') {
    // 激光塔逻辑：每一帧都造成伤害
    this.laserTarget = target;
    manager.damageAt(target.pos.x, target.pos.y, this.dmg, false, false);
    // 激光粒子
    if (frameCount % 2 === 0) spawnParticles(target.pos.x, target.pos.y, color(...this.col), 1);
  } 
  else if (this.timer >= this.fireRate) {
    this.timer = 0;
    this.shootFlash = 10;
    
    // 逻辑分发
    if (this.type === 'area') {
      // 之前的全方位散弹逻辑...
      // --- 核心修改：发射一圈子弹 ---
      const numProjectiles = 8; // 每一圈发射8颗子弹
      for (let i = 0; i < numProjectiles; i++) {
        let angle = (TWO_PI / numProjectiles) * i + (this.pulseTime); // 随时间旋转起始角，更帅
        projectiles.push(new Projectile(
          this.px, this.py, angle,
          this.projSpd, this.dmg, this.col, this.antiAir, this.type, this.level
        ));
      }
    } else {
      // 普通弹丸攻击（神弩、霜冻等）
      projectiles.push(new Projectile(
        this.px, this.py, this.angle,
        this.projSpd, this.dmg, this.col, this.antiAir, this.type, this.level
      ));
    }
  }
}

  draw() {
    push(); translate(this.px, this.py);
    const buildScale = 1 - this.buildAnim * 0.6;
    scale(buildScale);
    const [r, g, b] = this.col;

    // 升级光效
    if (this.upgradeEffect > 0) {
      const t = this.upgradeEffect / 40;
      noFill(); stroke(255, 255, 200, t * 255); strokeWeight(2 + t * 5);
      rectMode(CENTER); rect(0, 0, CELL_SIZE * (1.5 - t), CELL_SIZE * (1.5 - t));
    }

    // 范围显示
    if (dist(mouseX, mouseY, this.px, this.py) < CELL_SIZE / 2) {
      noFill(); stroke(r, g, b, 50); strokeWeight(1);
      ellipse(0, 0, this.range * 2, this.range * 2);
    }

    // 通用底座（随等级变厚重）
    fill(10, 15, 25); stroke(r, g, b, 120); strokeWeight(this.level);
    rectMode(CENTER);
    rect(0, 0, CELL_SIZE * 0.7, CELL_SIZE * 0.7, 3 + this.level);

    // 根据类型和等级调用专用绘制
    if (this.type === 'basic') this._drawBasic(r, g, b);
    else if (this.type === 'rapid') this._drawRapid(r, g, b);
    else if (this.type === 'area')  this._drawArea(r, g, b);
    else if (this.type === 'laser') this._drawLaser(r, g, b);
    else if (this.type === 'frost')  this._drawFrost(r, g, b);
    else if (this.type === 'sniperAA') this._drawSniper(r, g, b);

    // 等级指示器 (UI)
    this._drawRankStars();
    pop();
  }

  _drawRankStars() {
    for (let i = 0; i < this.level; i++) {
      const x = -10 + i * 10;
      fill(255, 200, 0); noStroke();
      ellipse(x, CELL_SIZE * 0.35, 4, 4);
    }
  }

  // --- 进化视觉逻辑 ---

  // ============================================================
//  重新设计的“进化视觉”逻辑 - 更加复杂、酷炫、体积随等级增长
// ============================================================

  _drawBasic(r, g, b) {
    push(); rotate(this.angle);
    const lv = this.level;
    const sizeBase = 20 + lv * 6; // 体积随等级增大

    // 1. 强化装甲支架
    stroke(r, g, b, 150); strokeWeight(1);
    fill(30, 35, 50);
    rect(2, 0, sizeBase, sizeBase * 0.8, 2);

    // 2. 炮管系统
    fill(20, 25, 40); stroke(r, g, b); strokeWeight(1.5 + lv * 0.5);
    if (lv === 1) {
      rect(10, -4, 22, 8, 2); // 重型单管
    } else if (lv === 2) {
      rect(12, -10, 24, 7, 2); rect(12, 3, 24, 7, 2); // 强化双管
    } else {
      // 满级：三管齐下 + 侧翼挡板
      rect(14, -13, 28, 6, 1); rect(16, -3, 30, 6, 1); rect(14, 7, 28, 6, 1);
      fill(r, g, b, 100);
      triangle(0, -20, 15, -15, 0, -10); triangle(0, 20, 15, 15, 0, 10);
    }

    // 3. 顶部能量舱
    fill(15, 20, 35); stroke(r, g, b);
    ellipse(0, 0, sizeBase, sizeBase);
    fill(r, g, b, 180 + sin(this.pulseTime * 4) * 50);
    noStroke();
    ellipse(0, 0, sizeBase * 0.4, sizeBase * 0.4); // 呼吸灯核心
    pop();
  }

  _drawRapid(r, g, b) {
    push(); rotate(this.angle);
    const lv = this.level;
    const rotSpd = this.pulseTime * (2 + lv); // 等级越高转得越疯狂

    // 1. 底盘旋转齿轮
    push(); rotate(-rotSpd * 0.5);
    stroke(r, g, b, 100); fill(20);
    for(let i=0; i<6; i++) {
      rotate(PI/3);
      rect(12 + lv*2, 0, 6, 4);
    }
    pop();

    // 2. 加特林炮管组
    push(); rotate(rotSpd);
    const count = 3 + lv; 
    for (let i = 0; i < count; i++) {
      push();
      rotate((TWO_PI / count) * i);
      fill(40); stroke(r, g, b); strokeWeight(1);
      rect(10, -2, 12 + lv * 4, 4, 1);
      // 枪口红热效果
      if (this.shootFlash > 0) {
        fill(255, 100, 0);
        rect(20 + lv * 4, -2, 5, 4);
      }
      pop();
    }
    pop();

    // 3. 核心轴承
    fill(r, g, b); ellipse(0, 0, 10 + lv*2, 10 + lv*2);
    fill(255, 200); ellipse(0, 0, 4 + lv, 4 + lv);
    pop();
  }

  _drawArea(r, g, b) {
    const lv = this.level;
    const bounce = sin(this.pulseTime * 2) * 5;
    
    // 1. 外围浮游轨道
    noFill(); stroke(r, g, b, 80); strokeWeight(1);
    ellipse(0, 0, (40 + lv*10) * 2, (40 + lv*10) * 2);

    // 2. 浮游炮塔/反射板
    for (let i = 0; i < 2 + lv; i++) {
      const a = (TWO_PI / (2 + lv)) * i + this.pulseTime;
      const d = 30 + lv * 8 + bounce;
      push(); translate(cos(a) * d, sin(a) * d); rotate(a + PI/2);
      fill(15, 15, 30); stroke(r, g, b);
      // 等级越高，浮游炮形状越复杂
      if(lv < 3) {
        rect(0, 0, 10, 15, 2);
      } else {
        triangle(-8, 10, 8, 10, 0, -15); // 满级变棱形炮
      }
      // 能量连接线
      stroke(r, g, b, 50); line(0, 0, -cos(a)*d, -sin(a)*d);
      pop();
    }

    // 3. 地震波发生器主体
    fill(20); stroke(r, g, b, 200); strokeWeight(2);
    rect(0, 0, 20+lv*5, 20+lv*5, 4);
    fill(r, g, b, 150 + bounce * 10);
    ellipse(0, 0, 10+lv*4, 10+lv*4);
  }

  _drawSniper(r, g, b) {
    push(); rotate(this.angle);
    const lv = this.level;
    const length = 35 + lv * 10;

    // 1. 超长导轨
    fill(30); stroke(r, g, b); strokeWeight(2);
    rect(length/2 - 5, 0, length, 8, 2);
    
    // 2. 复合弩翼 (多层结构)
    for(let i=0; i<lv; i++) {
        const offset = i * 8;
        stroke(r, g, b, 200 - i*40);
        noFill();
        bezier(0, 0, 10, -20-offset, 20, -30-offset, -10, -40-offset);
        bezier(0, 0, 10, 20+offset, 20, 30+offset, -10, 40+offset);
    }

    // 3. 瞄准激光束 (装饰用)
    stroke(255, 0, 0, 100); strokeWeight(1);
    line(10, 0, this.range, 0);

    // 4. 蓄能核心
    fill(255, 50, 50); noStroke();
    rect(5, 0, 12, 12, 2);
    if(lv === 3) {
        // 满级增加电弧特效
        stroke(255, 255, 255, 200);
        line(5, -6, 5 + random(-5,5), -15);
        line(5, 6, 5 + random(-5,5), 15);
    }
    pop();
  }

  _drawLaser(r, g, b) {
    push(); rotate(this.angle);
    const lv = this.level;
    
    // 1. 环形约束装置
    for(let i=0; i<lv; i++) {
        const s = 25 + i * 10;
        noFill(); stroke(r, g, b, 150 - i*30);
        strokeWeight(2);
        arc(0, 0, s, s, QUARTER_PI, PI-QUARTER_PI);
        arc(0, 0, s, s, PI+QUARTER_PI, TWO_PI-QUARTER_PI);
    }

    // 2. 聚焦镜头
    fill(10); stroke(255); strokeWeight(1);
    rect(12, 0, 10 + lv*4, 6 + lv*2, 1);
    
    // 3. 核心球体
    let pulse = sin(this.pulseTime * 10) * 5;
    fill(r, g, b, 100); ellipse(0, 0, 20+lv*2, 20+lv*2);
    fill(255); ellipse(0, 0, 8+pulse, 8+pulse);

    // 4. 激光渲染 (在 update 逻辑中已有，这里增加枪口光晕)
    if (this.laserTarget) {
      fill(r, g, b, 200);
      ellipse(15 + lv*4, 0, 10 + pulse, 10 + pulse);
    }
    pop();
  }

  _drawFrost(r, g, b) {
    const lv = this.level;
    const rot = this.pulseTime * 0.5;

    // 1. 寒冰领域环
    noFill(); stroke(r, g, b, 50); 
    strokeWeight(10 + lv * 5);
    ellipse(0, 0, 50 + lv * 10);

    // 2. 旋转冰晶簇
    for(let i=0; i < (4 + lv * 2); i++) {
      let a = rot + (TWO_PI / (4 + lv * 2)) * i;
      let d = 25 + lv * 5;
      push();
      translate(cos(a) * d, sin(a) * d);
      rotate(a + PI/4);
      fill(255, 200); stroke(r, g, b); strokeWeight(1);
      // 冰晶形状：等级越高越尖锐
      beginShape();
      vertex(0, -8-lv*2); vertex(4, 0); vertex(0, 8+lv*2); vertex(-4, 0);
      endShape(CLOSE);
      pop();
    }

    // 3. 中心冷冻核心
    fill(r, g, b, 100);
    for(let j=0; j<3; j++) {
        rotate(rot * (j+1));
        rect(0, 0, 15+lv*3, 15+lv*3, 2);
    }
  }
}
// ============================================================
//  Projectile 子弹类 (微调以支持等级视觉)
// ============================================================
class Projectile {
  constructor(x, y, angle, spd, dmg, col, antiAir, towerType, level) {
    this.x = x; this.y = y;
    this.vx = cos(angle) * spd; this.vy = sin(angle) * spd;
    this.dmg = dmg; this.col = col;
    this.antiAir = antiAir; 
    this.towerType = towerType;
    this.level = level;
    this.alive = true; this.life = 1.0;
  }
  
  update() {
    this.x += this.vx; this.y += this.vy;
    this.life -= 0.012; // 稍长的存活时间以覆盖整个射程
    
    if (this.life <= 0) { this.alive = false; return; }

    const isArea = (this.towerType === 'area');
    // 增加范围塔子弹的判定半径，确保散弹更容易击中目标
    const hitRadius = isArea ? 18 : 10; 
    const hits = manager.getMonstersInRange(this.x, this.y, hitRadius, this.antiAir);

    if (hits.length > 0) {
      if (isArea) {
        // 范围塔子弹碰撞后产生小型爆炸
        const splashRange = 40 + this.level * 10;
        manager.damageInRadius(this.x, this.y, splashRange, this.dmg, this.antiAir);
        spawnParticles(this.x, this.y, color(...this.col), 8);
      } else {
        manager.damageAt(this.x, this.y, this.dmg, this.antiAir, false);
        spawnParticles(this.x, this.y, color(...this.col), 4);
      }
      this.alive = false; // 碰撞后消失
    }
  }

  draw() {
    const [r, g, b] = this.col;
    push(); translate(this.x, this.y);
    rotate(Math.atan2(this.vy, this.vx));
    
    const sz = 5 + this.level * 2;
    noStroke(); fill(r, g, b, this.life * 255);
    
    if (this.towerType === 'area') {
      ellipse(0, 0, sz * 1.5, sz * 1.5);
      fill(255, 150); ellipse(0, 0, sz, sz);
    } else {
      rectMode(CENTER); rect(0, 0, sz * 2, sz / 2, 2);
    }
    pop();
  }
}

// ============================================================
//  全局数组
// ============================================================
let towers      = [];
let projectiles = [];

// ============================================================
//  塔系统更新与绘制（在 sketch.js draw() 中调用）
// ============================================================
function updateAndDrawTowers() {
  for (const t of towers) { t.update(); t.draw(); }
  projectiles = projectiles.filter(p => p.alive);
  for (const p of projectiles) { p.update(); p.draw(); }
}

// ── 初始化 ──
function initTowers() {
  towers = [];
  projectiles = [];
}

// ============================================================
//  TODO: 张震宇 — 塔攻击技能扩展区
//  可在此处为 Tower 类添加技能方法，或新增技能塔类型
//  接口建议：
//    Tower.activateSkill()   — 主动技能触发
//    Tower.passiveEffect()   — 每帧被动效果
//  新塔类型直接加入 TOWER_DEFS，并在 Tower.draw() 分支扩展
// ============================================================
