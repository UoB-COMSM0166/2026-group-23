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
    projSpd: 5, color: [160, 80, 255], antiAir: true,
  },
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
    const inRange = manager.getMonstersInRange(this.px, this.py, this.range, this.antiAir);
    if (inRange.length === 0) return null;
    return inRange.reduce((best, m) => m.progress > best.progress ? m : best, inRange[0]);
  }

  update() {
    this.pulseTime += 0.05;
    if (this.buildAnim > 0) this.buildAnim = max(0, this.buildAnim - 0.06);
    if (this.shootFlash > 0) this.shootFlash--;
    if (this.upgradeEffect > 0) this.upgradeEffect--;
    if (typeof jammedUntilFrame !== 'undefined' && frameCount < jammedUntilFrame) return;
    
    this.timer++;
    const target = this.findTarget();
    if (!target) return;
    
    const dx = target.pos.x - this.px, dy = target.pos.y - this.py;
    this.angle = Math.atan2(dy, dx);
    
    if (this.timer >= this.fireRate) {
      this.timer = 0; 
      this.shootFlash = 8;
      projectiles.push(new Projectile(
        this.px, this.py, this.angle,
        this.projSpd, this.dmg, this.col, this.antiAir, this.type, this.level
      ));
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

  _drawBasic(r, g, b) {
    push(); rotate(this.angle);
    const lv = this.level;
    // 炮管
    fill(20, 30, 50); stroke(r, g, b); strokeWeight(1.5);
    if (lv === 1) {
      rect(6, -3, 16, 6, 1); // 单管
    } else if (lv === 2) {
      rect(6, -6, 18, 5, 1); rect(6, 1, 18, 5, 1); // 双管
    } else {
      rect(6, -8, 22, 6, 1); rect(6, 2, 22, 6, 1); // 强化双管 + 核心
      fill(r, g, b, 150); rect(4, -2, 12, 4);
    }
    // 主体
    fill(15, 25, 45); 
    ellipse(0, 0, 18 + lv * 4, 18 + lv * 4);
    pop();
  }

  _drawRapid(r, g, b) {
    push(); rotate(this.angle);
    const lv = this.level;
    const speed = this.pulseTime * 2;
    // 旋转炮头
    rotate(lv === 3 ? speed * 0.5 : 0);
    for (let i = 0; i < (lv + 1); i++) {
      push();
      rotate((TWO_PI / (lv + 1)) * i);
      fill(r, g, b, 180);
      rect(8, -2, 10 + lv * 2, 3, 1);
      pop();
    }
    // 能量核心
    const p = sin(this.pulseTime * 2) * 5;
    fill(r, g, b, 200);
    ellipse(0, 0, 8 + p, 8 + p);
    pop();
  }

  _drawArea(r, g, b) {
    const lv = this.level;
    const p = sin(this.pulseTime) * 3;
    // 浮动装甲板
    for (let i = 0; i < 3 + lv; i++) {
      const a = (TWO_PI / (3 + lv)) * i + this.pulseTime * 0.5;
      const d = 14 + lv * 3 + p;
      fill(10, 10, 30); stroke(r, g, b, 200);
      push(); translate(cos(a) * d, sin(a) * d); rotate(a);
      rect(0, 0, 6, 10, 2);
      pop();
    }
    // 核心
    fill(r, g, b, 100 + p * 10);
    ellipse(0, 0, 12 + lv * 5, 12 + lv * 5);
    fill(255, 255, 255, 150);
    ellipse(0, 0, 4 + lv, 4 + lv);
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
    this.life -= 0.015;
    
    if (this.life <= 0 || this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
      this.alive = false; return;
    }

    const isArea = (this.towerType === 'area');
    const hitRadius = isArea ? 15 : 10;
    const hits = manager.getMonstersInRange(this.x, this.y, hitRadius, this.antiAir);

    if (hits.length > 0) {
      if (isArea) {
        // 范围伤害随等级扩大
        const splashRange = 50 + this.level * 15;
        manager.damageInRadius(this.x, this.y, splashRange, this.dmg, this.antiAir);
        spawnParticles(this.x, this.y, color(...this.col), 10 + this.level * 5);
      } else {
        manager.damageAt(this.x, this.y, this.dmg, this.antiAir, false);
        spawnParticles(this.x, this.y, color(...this.col), 4 + this.level * 2);
      }
      this.alive = false;
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
