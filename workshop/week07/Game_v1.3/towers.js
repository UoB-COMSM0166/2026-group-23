// ============================================================
//  towers.js — 塔放置、升级、子弹系统
//  负责人：刘博文（Tower类、Projectile类、放置逻辑）
//          张震宇（TODO: 塔攻击技能扩展）
//  依赖：globals.js, map.js, monsters.js
// ============================================================

// ============================================================
//  塔定义
// ============================================================
const TOWER_DEFS = {
  basic: {
    name: '基础塔', label: 'BASIC',
    cost: 80, dmg: 25, range: 120, fireRate: 60, projSpd: 6,
    color: [0, 180, 255], upgradeCost: 60, antiAir: false,
  },
  rapid: {
    name: '快速塔', label: 'RAPID',
    cost: 120, dmg: 12, range: 100, fireRate: 22, projSpd: 9,
    color: [255, 200, 0], upgradeCost: 80, antiAir: false,
  },
  area: {
    name: '范围塔', label: 'AREA',
    cost: 150, dmg: 40, range: 140, fireRate: 90, projSpd: 5,
    color: [160, 80, 255], upgradeCost: 100, antiAir: true,
  },
};

const UPGRADE_BONUS = {
  dmg: 1.6, range: 1.3, fireRate: 0.65,
};

// ============================================================
//  Tower 类
// ============================================================
class Tower {
  constructor(gridX, gridY, type) {
    this.gx = gridX; this.gy = gridY;
    this.px = gridX * CELL_SIZE + CELL_SIZE / 2;
    this.py = gridY * CELL_SIZE + CELL_SIZE / 2;
    this.type = type;
    const def = TOWER_DEFS[type];
    this.dmg      = def.dmg;
    this.range    = def.range;
    this.fireRate = def.fireRate;
    this.projSpd  = def.projSpd;
    this.col      = def.color;
    this.antiAir  = def.antiAir;
    this.upgradeCost = def.upgradeCost;
    this.upgraded  = false;
    this.timer     = 0;
    this.angle     = 0;
    this.pulseTime = 0;
    this.shootFlash = 0;
    this.buildAnim  = 1.0;
    this.upgradeEffect = 0;
    this._btnRect  = null;
  }

  upgrade() {
    if (this.upgraded || coins < this.upgradeCost) return false;
    coins -= this.upgradeCost;
    this.dmg      = Math.round(this.dmg      * UPGRADE_BONUS.dmg);
    this.range    = Math.round(this.range    * UPGRADE_BONUS.range);
    this.fireRate = Math.round(this.fireRate * UPGRADE_BONUS.fireRate);
    this.upgraded = true;
    this.upgradeEffect = 50;
    return true;
  }

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
    if (frameCount < jammedUntilFrame) return;
    this.timer++;
    const target = this.findTarget();
    if (!target) return;
    const dx = target.pos.x - this.px, dy = target.pos.y - this.py;
    this.angle = Math.atan2(dy, dx);
    if (this.timer >= this.fireRate) {
      this.timer = 0; this.shootFlash = 8;
      projectiles.push(new Projectile(
        this.px, this.py, this.angle,
        this.projSpd, this.dmg, this.col, this.antiAir, this.type
      ));
    }
  }

  draw() {
    push(); translate(this.px, this.py);
    const buildScale = 1 - this.buildAnim * 0.6;
    scale(buildScale);
    const [r, g, b] = this.col;

    // 升级光晕
    if (this.upgradeEffect > 0) {
      const t = this.upgradeEffect / 50;
      noFill(); stroke(255, 220, 80, t * 200); strokeWeight(3 + t * 4);
      ellipse(0, 0, CELL_SIZE * 0.9 + (1-t)*40, CELL_SIZE * 0.9 + (1-t)*40);
    }

    // 悬停显示攻击范围
    if (dist(mouseX, mouseY, this.px, this.py) < CELL_SIZE / 2) {
      noFill(); stroke(r, g, b, 40); strokeWeight(1.5);
      ellipse(0, 0, this.range * 2, this.range * 2);
      stroke(r, g, b, 80); strokeWeight(1);
      ellipse(0, 0, this.range * 2 - 2, this.range * 2 - 2);
    }

    // 底座
    fill(10, 18, 32); stroke(r, g, b, 160); strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < 8; i++) {
      const a = i * TWO_PI / 8 + PI / 8;
      vertex(cos(a) * CELL_SIZE * 0.38, sin(a) * CELL_SIZE * 0.38);
    }
    endShape(CLOSE);
    fill(16, 28, 50); stroke(r, g, b, 100); strokeWeight(1);
    ellipse(0, 0, CELL_SIZE * 0.5, CELL_SIZE * 0.5);

    // 干扰遮罩
    if (frameCount < jammedUntilFrame) {
      fill(40, 10, 10, 160); noStroke();
      ellipse(0, 0, CELL_SIZE * 0.55, CELL_SIZE * 0.55);
    }

    if (this.type === 'basic') this._drawBasic(r, g, b);
    else if (this.type === 'rapid') this._drawRapid(r, g, b);
    else if (this.type === 'area')  this._drawArea(r, g, b);

    // 升级星标
    if (this.upgraded) {
      fill(255, 210, 50, 200); noStroke();
      textFont('monospace'); textSize(7); textAlign(CENTER, CENTER);
      text('★', 0, CELL_SIZE * 0.32); textAlign(LEFT, BASELINE);
    }
    pop();
  }

  _drawBasic(r, g, b) {
    push(); rotate(this.angle);
    fill(18, 30, 52); stroke(r, g, b, 200); strokeWeight(1.5);
    beginShape(); vertex(-6,-5); vertex(6,-5); vertex(8,0); vertex(6,5); vertex(-6,5); endShape(CLOSE);
    fill(12, 20, 38); stroke(r, g, b, 220); strokeWeight(2); rect(4, -2.5, 16, 5, 1);
    if (this.shootFlash > 0) {
      const f = this.shootFlash / 8; noStroke();
      fill(r, g, b, f*220); ellipse(22, 0, 10*f, 10*f);
      fill(255, 255, 255, f*150); ellipse(22, 0, 5*f, 5*f);
    }
    pop();
    const p = sin(this.pulseTime)*0.4+0.6;
    fill(r, g, b, 180*p); noStroke(); ellipse(0, 0, 8, 8);
    fill(255, 255, 255, 100*p); ellipse(-1, -1, 3, 3);
  }

  _drawRapid(r, g, b) {
    push(); rotate(this.angle);
    fill(20, 25, 15); stroke(r, g, b, 200); strokeWeight(1.5);
    beginShape(); vertex(-5,-4); vertex(5,-4); vertex(7,0); vertex(5,4); vertex(-5,4); endShape(CLOSE);
    fill(14, 18, 10); stroke(r, g, b, 220); strokeWeight(1.5);
    rect(3, -6, 14, 3.5, 1); rect(3, 2.5, 14, 3.5, 1);
    if (this.shootFlash > 0) {
      const f = this.shootFlash / 8; noStroke();
      fill(r, g, b, f*200); ellipse(19, -4, 7*f, 7*f); ellipse(19, 4, 7*f, 7*f);
    }
    pop();
    const p = sin(this.pulseTime*1.5)*0.4+0.6;
    fill(r, g, b, 180*p); noStroke();
    beginShape();
    for (let i = 0; i < 4; i++) {
      const a = i*PI/2 + this.pulseTime*0.5;
      vertex(cos(a)*5, sin(a)*5);
    }
    endShape(CLOSE);
  }

  _drawArea(r, g, b) {
    fill(18, 12, 35); stroke(r, g, b, 200); strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < 6; i++) {
      const a = i*PI/3 + PI/6;
      vertex(cos(a)*18, sin(a)*18);
    }
    endShape(CLOSE);
    push(); rotate(this.angle + this.pulseTime*0.4);
    for (let i = 0; i < 4; i++) {
      push(); rotate(i*PI/2);
      fill(12, 8, 28); stroke(r, g, b, 180); strokeWeight(1.5); rect(6, -2, 12, 4, 1);
      if (this.shootFlash > 0) {
        const f = this.shootFlash/8; noStroke(); fill(r, g, b, f*180); ellipse(21, 0, 9*f, 9*f);
      }
      pop();
    }
    pop();
    const p = sin(this.pulseTime)*0.5+0.5;
    noFill(); stroke(r, g, b, 120+80*p); strokeWeight(2); ellipse(0, 0, 14+p*4, 14+p*4);
    fill(r, g, b, 160*p); noStroke(); ellipse(0, 0, 8, 8);
  }
}

// ============================================================
//  Projectile 子弹类
// ============================================================
class Projectile {
  constructor(x, y, angle, spd, dmg, col, antiAir, towerType) {
    this.x = x; this.y = y;
    this.vx = cos(angle)*spd; this.vy = sin(angle)*spd;
    this.dmg = dmg; this.col = col;
    this.antiAir = antiAir; this.towerType = towerType;
    this.alive = true; this.life = 1.0;
    this.isArea = (towerType === 'area');
  }

  update() {
    this.x += this.vx; this.y += this.vy; this.life -= 0.018;
    if (this.life <= 0 || this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
      this.alive = false; return;
    }
    if (this.isArea) {
      const hits = manager.getMonstersInRange(this.x, this.y, 14, this.antiAir);
      if (hits.length > 0) {
        manager.damageInRadius(this.x, this.y, 55, this.dmg, this.antiAir);
        spawnParticles(this.x, this.y, color(...this.col), 14);
        this.alive = false;
      }
    } else {
      const hits = manager.getMonstersInRange(this.x, this.y, 10, this.antiAir);
      if (hits.length > 0) {
        manager.damageAt(this.x, this.y, this.dmg, this.antiAir, false);
        spawnParticles(this.x, this.y, color(...this.col), 5);
        this.alive = false;
      }
    }
  }

  draw() {
    const [r, g, b] = this.col;
    const angle = Math.atan2(this.vy, this.vx);
    const f = this.life;
    push(); translate(this.x, this.y); rotate(angle);
    if (this.isArea) {
      noStroke(); fill(r, g, b, f*220); ellipse(0, 0, 12, 12);
      fill(255, 255, 255, f*150); ellipse(0, 0, 6, 6);
      stroke(r, g, b, f*120); strokeWeight(2); line(-8, 0, -18, 0);
    } else {
      noStroke(); fill(r, g, b, f*230);
      beginShape(); vertex(8,0); vertex(2,-2.5); vertex(-6,0); vertex(2,2.5); endShape(CLOSE);
      fill(255, 255, 255, f*140);
      beginShape(); vertex(7,0); vertex(2,-1); vertex(-4,0); vertex(2,1); endShape(CLOSE);
      stroke(r, g, b, f*100); strokeWeight(1.5);
      line(-6, 0, -6-this.vx*1.5, -this.vy*1.5);
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
