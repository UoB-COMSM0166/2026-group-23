// ============================================================
//  monsters.js — 怪物与路径系统
//  负责人：张洵
//  依赖：globals.js, map.js
// ============================================================

// ============================================================
//  工具函数
// ============================================================
function moveAlongPath(pos, seg, path, spd) {
  let rem = spd, px = pos.x, py = pos.y, s = seg;
  while (rem > 0 && s < path.length - 1) {
    const tx = path[s+1].x, ty = path[s+1].y;
    const d = Math.hypot(tx - px, ty - py);
    if (d <= rem) { rem -= d; px = tx; py = ty; s++; }
    else { const r = rem/d; px += (tx-px)*r; py += (ty-py)*r; rem = 0; }
  }
  return { pos: { x: px, y: py }, seg: s };
}

function calcProgress(pos, seg, path) {
  let t = 0;
  for (let i = 0; i < seg; i++) t += distAB(path[i], path[i+1]);
  return t + distAB(path[seg], pos);
}

// ============================================================
//  粒子系统
// ============================================================
let particles = [];

function spawnParticles(x, y, col, count) {
  for (let i = 0; i < count; i++) {
    const a = random(TWO_PI), s = random(1.5, 5);
    particles.push({
      x, y, vx: cos(a)*s, vy: sin(a)*s,
      life: 1.0, col, size: random(2, 7),
    });
  }
}

function updateParticles() {
  particles = particles.filter(p => p.life > 0);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.88; p.vy *= 0.88;
    p.life -= 0.04;
    noStroke();
    fill(red(p.col), green(p.col), blue(p.col), p.life * 220);
    push(); translate(p.x, p.y); rotate(p.vx * 0.5);
    rectMode(CENTER); rect(0, 0, p.size*p.life*1.4, p.size*p.life*0.7);
    rectMode(CORNER); pop();
  }
}

// ============================================================
//  基类 Monster
// ============================================================
class Monster {
  constructor(path, hp, spd, reward) {
    this.path = path; this.hp = hp; this.maxHp = hp;
    this.spd = spd; this.reward = reward;
    this.seg = 0; this.pos = { x: path[0].x, y: path[0].y };
    this.alive = true; this.reached = false; this.progress = 0;
    this.radius = 14; this.hitFlash = 0;
    this.deathColor = color(180, 20, 10);
  }
  takeDamage(dmg) {
    this.hp -= dmg; this.hitFlash = 6;
    if (this.hp <= 0) {
      this.alive = false;
      spawnParticles(this.pos.x, this.pos.y, this.deathColor, 20);
    }
  }
  move() {
    // 应用磁场减速（由 MAGNET 塔每帧设置）
    let spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0) {
      const curFrame = typeof frameCount !== 'undefined' ? frameCount : 0;
      if (this._magnetFrame >= curFrame - 1) {
        spdMult = this._magnetFactor;
      } else {
        this._magnetFactor = 1.0;
      }
    }
    // 母舰地面光环：移速加快30%
    if (this._carrierAura && this._carrierAura >= (typeof frameCount !== 'undefined' ? frameCount : 0)) {
      spdMult *= 1.3;
    } else {
      this._carrierSpd = false;
    }
    const effectiveSpd = this.spd * spdMult;
    const r = moveAlongPath(this.pos, this.seg, this.path, effectiveSpd);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  drawHealthBar() {
    if (this.hitFlash > 0) this.hitFlash--;
    const bw = 40, bh = 3, bx = this.pos.x - bw/2, by = this.pos.y - this.radius - 15;
    stroke(0, 180, 255, 100); strokeWeight(1); fill(5, 8, 15, 200);
    rect(bx-1, by-1, bw+2, bh+2);
    noStroke();
    const ratio = this.hp / this.maxHp;
    fill(this.hitFlash > 0 ? color(255,220,180) : lerpColor(color(200,20,5), color(0,220,150), ratio));
    rect(bx, by, bw * ratio, bh);
    fill(255, 255, 255, 40); rect(bx, by, bw * ratio, 1);
  }
  draw() {}
  update() {
    if (!this.alive || this.reached) return;
    // 空投坠落动画：从空中下落到路径节点，期间不移动不受伤
    if (this._dropping) {
      this._dropTimer++;
      const t = this._dropTimer / this._dropFrames;
      const drawY = lerp(this._dropFromY, this._dropToY, t);
      // 画下落中的投放舱
      push(); translate(this.pos.x, drawY);
      const alpha = 200;
      fill(60, 60, 80, alpha); stroke(180, 200, 255, alpha); strokeWeight(1.5);
      rectMode(CENTER); rect(0, 0, 14, 20, 3);
      // 降落伞
      noFill(); stroke(200, 220, 255, alpha * 0.7); strokeWeight(1);
      arc(0, -10, 24, 18, PI, TWO_PI);
      line(-12, -10, -5, -10); line(12, -10, 5, -10);
      // 速度线
      stroke(180, 200, 255, alpha * 0.4); strokeWeight(0.8);
      for (let k = -1; k <= 1; k++) {
        line(k*4, 10, k*4, 10 + (1-t)*20);
      }
      pop();
      if (this._dropTimer >= this._dropFrames) {
        this._dropping = false;
        spawnParticles(this.pos.x, this.pos.y, color(200, 180, 100), 10);
      }
      return;
    }
    this.move(); this.draw(); this.drawHealthBar();
  }
}

// ── 机械蛇 ──
class MechSnake extends Monster {
  constructor(path) {
    super(path, 500, 0.95, 18);
    this.radius = 9; this.deathColor = color(160, 30, 5);
    this.waveTime = 0; this.breathe = 0;
    this.history = Array(120).fill(null).map(() => ({ x: path[0].x, y: path[0].y }));
    this.healTimer = 240; this.healEffect = 0; // 出生4秒后触发第一次（原10秒）
    this.HEAL_RADIUS = 260;
  }
  move() {
    this.waveTime += 0.13; this.breathe += 0.08; this.healTimer++;
    if (this.healTimer >= 360) { // 冷却6秒（原10秒）
      this.healTimer = 0; this.healEffect = 60;
      if (typeof manager !== 'undefined') {
        for (const m of manager.monsters) {
          if (!m.alive || m === this) continue;
          const d = distAB(this.pos, m.pos);
          if (d > this.HEAL_RADIUS) continue;
          // 只给小怪回血，Boss不回血
          const isBoss = (m instanceof BossFission)||(m instanceof BossPhantom)||
                         (m instanceof BossAntMech)||(m instanceof FissionCore)||
                         (m instanceof BossCarrier);
          if (isBoss) continue;
          m.hp = min(m.maxHp, m.hp + floor(m.maxHp * 0.15));
        }
      }
    }
    if (this.healEffect > 0) this.healEffect--;
    // 应用磁场减速
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
    this.history.unshift({ x: this.pos.x, y: this.pos.y });
    if (this.history.length > 120) this.history.pop();
  }
  draw() {
    push();
    const n = 14;
    for (let i = n-1; i >= 0; i--) {
      const idx = min(i*6, this.history.length-1);
      const nd = this.history[idx];
      const wave = sin(this.waveTime - i*0.5) * 11;
      const nx = nd.x + wave, ny = nd.y;
      const t = 1 - i/n, w = lerp(4, 16, t);
      push(); translate(nx, ny);
      fill(lerpColor(color(28,8,4), color(75,18,7), t));
      stroke(110, 30, 8, 150 + t*80); strokeWeight(0.8);
      beginShape(); vertex(0,-w*0.9); vertex(w*0.55,0); vertex(0,w*0.65); vertex(-w*0.55,0); endShape(CLOSE);
      if (i%2===0 && t>0.3) {
        fill(55,12,4); stroke(140,35,8,140); strokeWeight(0.8);
        beginShape(); vertex(0,-w*0.9); vertex(w*0.25,-w*1.85); vertex(-w*0.25,-w*1.85); endShape(CLOSE);
      }
      if (t > 0.5) { noFill(); stroke(190,25,5,55*t); strokeWeight(1); line(-w*0.35,-w*0.25,w*0.35,w*0.25); }
      pop();
    }
    const h = this.history[0];
    push(); translate(h.x, h.y);
    fill(42,11,4); stroke(170,38,8); strokeWeight(1.2);
    beginShape(); vertex(0,-13); vertex(9,-7); vertex(11,0); vertex(8,6); vertex(2,11); vertex(-2,11); vertex(-8,6); vertex(-11,0); vertex(-9,-7); endShape(CLOSE);
    fill(28,7,2); stroke(140,32,7,170); strokeWeight(1);
    beginShape(); vertex(-9,5); vertex(-4,13); vertex(0,15); vertex(4,13); vertex(9,5); endShape();
    fill(190,155,90); noStroke();
    for (const tx of [-4,0,4]) { beginShape(); vertex(tx,9); vertex(tx+2,15); vertex(tx-2,15); endShape(CLOSE); }
    fill(4,1,1); stroke(170,28,5,190); strokeWeight(1);
    beginShape(); vertex(-5,-4); vertex(-1,-8); vertex(3,-4); vertex(1,-1); vertex(-3,-1); endShape(CLOSE);
    beginShape(); vertex(3,-4); vertex(7,-8); vertex(11,-4); vertex(9,-1); vertex(5,-1); endShape(CLOSE);
    noStroke(); fill(210,38,8, 120+sin(this.breathe)*50); ellipse(-1,-4,4,3); ellipse(7,-4,4,3);
    pop(); pop();
    if (this.healEffect > 0) {
      const t = this.healEffect / 60;
      noFill(); stroke(30,220,80,t*150); strokeWeight(2.5);
      ellipse(this.history[0].x, this.history[0].y, (1-t)*this.HEAL_RADIUS*2+10, (1-t)*this.HEAL_RADIUS*2+10);
      noFill(); stroke(80,255,120,t*80); strokeWeight(1);
      ellipse(this.history[0].x, this.history[0].y, (1-t)*this.HEAL_RADIUS*2+40, (1-t)*this.HEAL_RADIUS*2+40);
      fill(80,255,120,t*210); noStroke(); textSize(10); textAlign(CENTER);
      text('+AREA HEAL', this.history[0].x, this.history[0].y - 28);
    }
  }
}

// ── 机械天蛛 ──
// 出生时超级冲刺无敌，之后保持高速+定期冲刺
class MechSpider extends Monster {
  constructor(path) {
    super(path, 420, 1.8, 26);
    this.radius = 16; this.deathColor = color(110, 55, 8);
    this.legTime = 0; this.stopTimer = 0; this.stopped = false; this.pulse = 0;
    // 出生超级冲刺
    this.spawnDash = true;
    this.spawnDashFrames = 40; // 出生冲刺持续40帧
    this.spawnDashInvincible = true;
    // 常规冲刺
    this.dashTimer = 0; this.dashing = false; this.dashFrames = 0;
    this.dashEffect = 0; this.baseSpd = 1.8;
  }
  takeDamage(dmg) {
    if (this.spawnDash || this.dashing) return; // 冲刺期间无敌
    this.hitFlash = 5;
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.alive = false;
      spawnParticles(this.pos.x, this.pos.y, this.deathColor, 20);
    }
  }
  move() {
    this.legTime += 0.16; this.stopTimer++; this.pulse += 0.07; this.dashTimer++;

    // 出生超级冲刺阶段
    if (this.spawnDash) {
      this.spawnDashFrames--;
      if (this.spawnDashFrames <= 0) {
        this.spawnDash = false;
        this.spawnDashInvincible = false;
        this.spd = this.baseSpd;
      }
      let _spdMult = 1.0;
      if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
        _spdMult = this._magnetFactor;
      } else { this._magnetFactor = 1.0; }
      // 出生冲刺速度是基础速度的4倍
      const r = moveAlongPath(this.pos, this.seg, this.path, this.baseSpd * 4.0 * _spdMult);
      this.pos = r.pos; this.seg = r.seg;
      this.progress = calcProgress(this.pos, this.seg, this.path);
      if (this.seg >= this.path.length - 1) this.reached = true;
      return;
    }

    // 常规冲刺
    if (this.dashTimer >= 380 && !this.dashing) {
      this.dashing = true; this.dashFrames = 20; this.dashEffect = 25; this.dashTimer = 0;
    }
    if (this.dashing) {
      this.spd = this.baseSpd * 3.5; this.dashFrames--;
      if (this.dashFrames <= 0) { this.dashing = false; this.spd = this.baseSpd; }
    }
    if (this.dashEffect > 0) this.dashEffect--;
    if (this.stopTimer % 200 < 22 && !this.dashing) { this.stopped = true; return; }
    this.stopped = false;
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    // 对空导弹减速
    if (this._airSlowed && this._airSlowed >= frameCount) _spdMult *= this._airSlowFactor || 0.5;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  draw() {
    push(); translate(this.pos.x, this.pos.y);
    // 出生冲刺特效：拖尾残影
    if (this.spawnDash) {
      const t = this.spawnDashFrames / 40;
      noFill(); stroke(255, 140, 20, t * 220); strokeWeight(3);
      ellipse(0, 0, 42, 42);
      stroke(255, 200, 60, t * 160); strokeWeight(1.5);
      ellipse(0, 0, 55, 55);
      fill(255, 180, 40, t * 180); noStroke(); textSize(10); textAlign(CENTER);
      text('▶▶', 0, -28);
    }
    for (let i = 0; i < 4; i++) {
      const ba = map(i, 0, 3, -PI*0.78, PI*0.06);
      const sw = sin(this.legTime + i*1.1) * 0.44;
      for (const side of [-1, 1]) {
        const a1 = ba*side + sw*side;
        const kx = cos(a1)*14*side, ky = sin(a1)*8;
        const a2 = a1 + side*0.68;
        const fx = cos(a2)*28*side, fy = sin(a2)*15 + i*3.5 - 6;
        stroke(95,60,18,190); strokeWeight(3.5); line(side*5,i*5.5-8,kx,ky);
        stroke(75,48,12,170); strokeWeight(2.5); line(kx,ky,fx,fy);
        fill(55,30,8); noStroke();
        push(); translate(kx,ky); beginShape(); for (let k=0;k<5;k++) vertex(cos(k*TWO_PI/5)*3.5,sin(k*TWO_PI/5)*3.5); endShape(CLOSE); pop();
        stroke(130,75,18,170); strokeWeight(1.5);
        line(fx,fy,fx+cos(a2-0.3)*8*side,fy+sin(a2-0.3)*5);
        line(fx,fy,fx+cos(a2)*6*side,fy+sin(a2)*5);
        line(fx,fy,fx+cos(a2+0.3)*7*side,fy+sin(a2+0.3)*4);
      }
    }
    fill(22,10,4); stroke(95,50,13); strokeWeight(1.5);
    beginShape(); vertex(0,15); vertex(10,9); vertex(13,1); vertex(9,-4); vertex(0,-1); vertex(-9,-4); vertex(-13,1); vertex(-10,9); endShape(CLOSE);
    fill(33,13,4); stroke(110,58,16); strokeWeight(1.5);
    beginShape(); vertex(0,-15); vertex(11,-9); vertex(12,-1); vertex(7,4); vertex(0,5); vertex(-7,4); vertex(-12,-1); vertex(-11,-9); endShape(CLOSE);
    fill(8,2,2); stroke(170,18,5,170); strokeWeight(1.5);
    beginShape(); vertex(0,-11); vertex(7,-7); vertex(7,-3); vertex(0,-1); vertex(-7,-3); vertex(-7,-7); endShape(CLOSE);
    fill(190,14,5,150+sin(this.pulse)*55); noStroke(); ellipse(0,-6,8,5);
    if (this.dashing || this.dashEffect > 0) {
      const t = this.dashing ? 1 : this.dashEffect/25;
      noFill(); stroke(255,140,20,t*180); strokeWeight(2.5); ellipse(0,0,38,38);
      fill(255,160,30,t*220); noStroke(); textSize(9); textAlign(CENTER); text('DASH!',0,-32);
    }
    pop();
  }
}

// ── 机器人 ──
class MechRobot extends Monster {
  constructor(path) {
    super(path, 1200, 0.95, 30);
    this.radius = 18; this.deathColor = color(60,160,255);
    this.walkTime = 0; this.corePulse = 0;
    this.shielded = false; this.shieldHp = 0; this.shieldPulse = 0; this.shieldTriggered = false;
    this.shootTimer = 0; this.shootCooldown = 100; this.muzzleFlash = 0; this.bullets = [];
    this.aimDx = 1; this.aimDy = 0; this.aimAngle = 0;
  }
  takeDamage(dmg, fromSide, ignoreShield) {
    this.hitFlash = 7;
    if (ignoreShield) {
      // 快速塔专属：完全无视护盾，直接造成全额伤害
      this.shielded = false;
      this.hp -= dmg;
      if (!this.shieldTriggered && this.hp > 0 && this.hp/this.maxHp <= 0.6) {
        this.shieldTriggered = true; this.shielded = true;
        this.shieldHp = floor(this.maxHp * 0.2); this.shieldPulse = 25;
        spawnParticles(this.pos.x, this.pos.y, color(60,180,255), 14);
      }
      if (this.hp <= 0) { this.alive = false; spawnParticles(this.pos.x,this.pos.y,this.deathColor,26); }
      return;
    }
    if (this.shielded) {
      if (!fromSide) dmg = floor(dmg * 0.5);
      this.shieldHp -= dmg; this.shieldPulse = 14;
      if (this.shieldHp <= 0) { this.shielded = false; spawnParticles(this.pos.x,this.pos.y,color(60,180,255),16); }
    } else {
      this.hp -= dmg;
      if (!this.shieldTriggered && this.hp > 0 && this.hp/this.maxHp <= 0.6) {
        this.shieldTriggered = true; this.shielded = true;
        this.shieldHp = floor(this.maxHp * 0.2); this.shieldPulse = 25;
        spawnParticles(this.pos.x, this.pos.y, color(60,180,255), 14);
      }
      if (this.hp <= 0) { this.alive = false; spawnParticles(this.pos.x,this.pos.y,this.deathColor,26); }
    }
  }
  move() {
    this.walkTime += 0.2; this.corePulse += 0.07;
    if (this.shieldPulse > 0) this.shieldPulse--;
    if (this.muzzleFlash > 0) this.muzzleFlash--;
    if (this.seg < this.path.length - 1) {
      const tx = this.path[this.seg+1].x - this.pos.x;
      const ty = this.path[this.seg+1].y - this.pos.y;
      const len = Math.hypot(tx, ty) || 1;
      this.aimDx = tx/len; this.aimDy = ty/len;
      this.aimAngle = Math.atan2(ty, tx);
    }
    this.shootTimer++;
    if (this.shootTimer >= this.shootCooldown) {
      this.shootTimer = 0; this.muzzleFlash = 8;
      this.bullets.push({ x:this.pos.x+this.aimDx*14, y:this.pos.y+this.aimDy*14, vx:this.aimDx*7, vy:this.aimDy*7, life:1.0 });
    }
    this.bullets = this.bullets.filter(b => b.life > 0);
    for (const b of this.bullets) { b.x += b.vx; b.y += b.vy; b.life -= 0.035; }
    // 应用磁场减速
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    // 对空导弹减速
    if (this._airSlowed && this._airSlowed >= frameCount) _spdMult *= this._airSlowFactor || 0.5;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  draw() {
    for (const b of this.bullets) {
      push(); translate(b.x, b.y);
      const angle = Math.atan2(b.vy, b.vx); rotate(angle);
      noStroke(); fill(0,200,255,b.life*230);
      beginShape(); vertex(7,0); vertex(2,-2); vertex(-5,0); vertex(2,2); endShape(CLOSE);
      stroke(0,140,255,b.life*120); strokeWeight(1.5);
      line(-5,0,-5-b.vx*2.5,-b.vy*2.5);
      pop();
    }
    push(); translate(this.pos.x, this.pos.y);
    if (this.shielded) {
      const p = this.shieldPulse > 0 ? map(this.shieldPulse,25,0,1,0) : sin(frameCount*0.045)*0.3+0.7;
      noFill(); stroke(40,160,255,80*p); strokeWeight(7);
      beginShape(); for (let k=0;k<6;k++) vertex(cos(k*PI/3-PI/6)*32,sin(k*PI/3-PI/6)*32); endShape(CLOSE);
    }
    const ls = sin(this.walkTime) * 11;
    fill(20,28,46); stroke(55,115,195,185); strokeWeight(1.3);
    beginShape(); vertex(-4,0); vertex(-9,2); vertex(-10,18+ls); vertex(-5,20+ls); vertex(-2,4); endShape(CLOSE);
    beginShape(); vertex(4,0); vertex(9,2); vertex(10,18-ls); vertex(5,20-ls); vertex(2,4); endShape(CLOSE);
    fill(18,26,46); stroke(58,125,208,200); strokeWeight(1.5);
    beginShape(); vertex(-10,-22); vertex(-8,-30); vertex(8,-30); vertex(10,-22); vertex(12,-10); vertex(10,0); vertex(-10,0); vertex(-12,-10); endShape(CLOSE);
    const cc = this.shielded ? color(55,165,255) : color(40,120,205);
    fill(cc); noStroke();
    push(); translate(0,-16); rotate(PI/4);
    const cs = 5+sin(this.corePulse)*0.9; rect(-cs/2,-cs/2,cs,cs,1); pop();
    fill(16,24,42); stroke(62,135,220,215); strokeWeight(1.6); rect(-9,-52,18,18,3);
    fill(6,10,20); stroke(52,125,222,180); strokeWeight(1); rect(-8,-48,16,5,2);
    noStroke(); fill(0,130+sin(this.corePulse)*28,255,230); rect(-7,-47,14,3,1);
    pop();
  }
}

// ── 机械烈焰鸟 ──
class MechPhoenix extends Monster {
  constructor(path) {
    super(path, 190, 1.9, 32);
    this.isFlying = true;
    this.radius = 16; this.deathColor = color(200, 50, 5);
    this.baseSpd = 2.0; this.wingTime = 0; this.diveTimer = 0;
    this.diving = false; this.floatY = 0; this.trail = []; this.boneAngle = 0;
    this.jamTimer = 0; this.jamming = false; this.jamEffect = 0; this.jamRadius = 150;
  }
  move() {
    this.wingTime += 0.22; this.diveTimer++;
    this.floatY = cos(this.wingTime * 0.38) * 8; this.boneAngle += 0.03;
    this.diving = this.diveTimer % 180 < 42;
    // 对空导弹减速到期后恢复baseSpd
    if (this._airSlowApplied && this._airSlowExpire && frameCount >= this._airSlowExpire) {
      this.baseSpd = this._origBaseSpd || 2.0;
      this._airSlowApplied = false; this._airSlowExpire = 0;
    }
    this.spd = this.diving ? this.baseSpd * (3.2/1.85) : this.baseSpd;
    this.jamTimer++;
    if (this.jamTimer >= 360) {
      this.jamTimer = 0; this.jamEffect = 60;
      jammedUntilFrame = frameCount + 90;
      jamPos = { x: this.pos.x, y: this.pos.y };
    }
    if (this.jamEffect > 0) this.jamEffect--;
    this.trail.push({ x:this.pos.x, y:this.pos.y+this.floatY, vx:(random()-0.5)*1.2, vy:(random()-0.5)*1.2+0.5, life:1.0, size:random(5,14) });
    // 应用磁场减速
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    // 对空导弹减速
    if (this._airSlowed && this._airSlowed >= frameCount) _spdMult *= this._airSlowFactor || 0.5;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  draw() {
    if (this.jamEffect > 0) {
      const t = this.jamEffect / 60;
      const r = (1-t) * this.jamRadius;
      noFill(); stroke(255,80,0,t*160); strokeWeight(3); ellipse(this.pos.x,this.pos.y+this.floatY,r*2,r*2);
      fill(255,120,20,t*200); noStroke(); textSize(10); textAlign(CENTER);
      text('JAM!', this.pos.x, this.pos.y+this.floatY-r*0.5-8);
    }
    this.trail = this.trail.filter(p => p.life > 0);
    for (const p of this.trail) {
      p.life -= this.diving ? 0.07 : 0.045; p.x += p.vx; p.y += p.vy;
      noStroke();
      fill(p.life>0.6 ? color(200,lerp(10,80,p.life),5,p.life*200) : color(18,10,6,p.life*150));
      push(); translate(p.x,p.y); rotate(p.vx*0.8);
      const sz = p.size * p.life;
      beginShape(); vertex(0,-sz); vertex(sz*0.45,sz*0.3); vertex(0,sz*0.75); vertex(-sz*0.45,sz*0.3); endShape(CLOSE);
      pop();
    }
    push(); translate(this.pos.x, this.pos.y + this.floatY);
    const wa = sin(this.wingTime) * 0.65;
    for (const side of [-1, 1]) {
      push(); scale(side, 1); rotate(-wa*side-0.4);
      fill(38,13,4); stroke(130,50,10); strokeWeight(1.5);
      beginShape(); vertex(0,-2); vertex(8,-4); vertex(28,-10); vertex(36,-6); vertex(26,0); vertex(8,2); endShape(CLOSE);
      pop();
    }
    fill(26,9,3); stroke(115,42,8); strokeWeight(1.5);
    beginShape(); vertex(0,-13); vertex(10,-9); vertex(13,-1); vertex(11,5); vertex(5,11); vertex(-5,11); vertex(-11,5); vertex(-13,-1); vertex(-10,-9); endShape(CLOSE);
    fill(38,13,4); stroke(125,47,10); strokeWeight(1.5);
    beginShape(); vertex(0,-27); vertex(8,-23); vertex(11,-17); vertex(9,-11); vertex(5,-9); vertex(-5,-9); vertex(-9,-11); vertex(-11,-17); vertex(-8,-23); endShape(CLOSE);
    fill(4,1,1); stroke(170,18,5,175); strokeWeight(1.2);
    beginShape(); vertex(-7,-21); vertex(-3,-25); vertex(1,-21); vertex(-1,-17); vertex(-5,-17); endShape(CLOSE);
    beginShape(); vertex(3,-21); vertex(7,-25); vertex(11,-21); vertex(9,-17); vertex(5,-17); endShape(CLOSE);
    noStroke(); fill(215,22,5,140+sin(this.wingTime*0.8)*55); ellipse(-3,-20,5,4); ellipse(7,-20,5,4);
    pop();
  }
}

// ── Boss 裂变核心 ──
// 技能一：核心护盾——每累积15次命中，激活护盾吸收下一波伤害，护盾期间向周围塔释放干扰脉冲使1~2座塔临时下线
// 技能二：辐射爆发——血量<75%后每240帧向四周扩散一圈辐射波，波及范围内所有塔被干扰120帧
// 技能三：临界分裂——血量降至40%时，分裂出2个小裂变体继续行进，自身移速提升
// 技能四：过热冲刺——血量<20%进入过热状态，移速大幅提升并持续对周围塔造成干扰光环
class BossFission extends Monster {
  constructor(path) {
    super(path, 5400, 0.38, 160);
    this.radius = 28; this.deathColor = color(255,120,20);
    this.armAngle = 0; this.pulseFire = 0;
    // 护盾系统
    this.hitCount = 0; this.shieldActive = false; this.shieldHp = 0; this.shieldPulse = 0;
    // 辐射波系统
    this.radWaveTimer = 0; this.radWaves = []; // [{r, life}]
    this.radWarning = 0;
    // 分裂系统
    this.splitDone = false;
    // 过热系统
    this.overheating = false;
    this.overheatPulse = 0;
    // 干扰计时
    this.jamTimer = 0;
  }
  takeDamage(dmg) {
    this.hitFlash = 5;
    if (this.shieldActive) {
      this.shieldHp -= dmg; this.shieldPulse = 18;
      if (this.shieldHp <= 0) {
        this.shieldActive = false;
        spawnParticles(this.pos.x, this.pos.y, color(255,180,40), 16);
        // 护盾破碎时释放干扰脉冲，让周围塔下线150帧
        jammedUntilFrame = frameCount + 150;
        jamPos = { x: this.pos.x, y: this.pos.y };
        if (typeof jamRadius !== 'undefined') jamRadius = 150;
      }
      return;
    }
    this.hp -= dmg;
    this.hitCount++;
    // 每15次命中激活核心护盾
    if (this.hitCount >= 15 && !this.shieldActive) {
      this.hitCount = 0; this.shieldActive = true;
      this.shieldHp = floor(this.maxHp * 0.12);
      this.shieldPulse = 30;
      spawnParticles(this.pos.x, this.pos.y, color(255,160,20), 12);
    }
    // 临界分裂：40%血触发
    if (!this.splitDone && this.hp > 0 && this.hp / this.maxHp <= 0.4) {
      this.splitDone = true;
      this.spd = 0.62; // 分裂后加速
      if (typeof manager !== 'undefined') {
        for (let i = 0; i < 2; i++) {
          const sub = new FissionCore(this.path.slice(this.seg));
          sub.hp = floor(this.maxHp * 0.18);
          sub.maxHp = sub.hp;
          sub.pos = { x: this.pos.x + (i*2-1)*18, y: this.pos.y };
          manager.monsters.push(sub);
        }
      }
      spawnParticles(this.pos.x, this.pos.y, color(255,100,0), 30);
    }
    if (this.hp <= 0) { this.alive = false; spawnParticles(this.pos.x,this.pos.y,this.deathColor,40); }
  }
  move() {
    this.armAngle += 0.022; this.pulseFire += 0.05;
    if (this.shieldPulse > 0) this.shieldPulse--;
    this.overheatPulse += 0.08;

    // 过热状态：血量<20%
    this.overheating = this.hp / this.maxHp < 0.20;
    if (this.overheating) {
      this.spd = 0.88;
      // 过热持续干扰（每180帧一次）
      this.jamTimer++;
      if (this.jamTimer >= 180) {
        this.jamTimer = 0;
        jammedUntilFrame = frameCount + 100;
        jamPos = { x: this.pos.x, y: this.pos.y };
        if (typeof jamRadius !== 'undefined') jamRadius = 120;
      }
    }

    // 辐射爆发：血量<75%后启用
    if (this.hp / this.maxHp < 0.75) {
      this.radWaveTimer++;
      if (this.radWaveTimer >= 240) {
        this.radWaveTimer = 0;
        this.radWarning = 40; // 预警帧数
      }
      if (this.radWarning > 0) {
        this.radWarning--;
        if (this.radWarning === 0) {
          this.radWaves.push({ r: 10, life: 1.0 });
          // 辐射波干扰塔120帧
          jammedUntilFrame = frameCount + 120;
          jamPos = { x: this.pos.x, y: this.pos.y };
          if (typeof jamRadius !== 'undefined') jamRadius = 200;
          spawnParticles(this.pos.x, this.pos.y, color(255,140,0), 20);
        }
      }
    }
    // 更新辐射波
    this.radWaves = this.radWaves.filter(w => w.life > 0);
    for (const w of this.radWaves) { w.r += 6; w.life -= 0.035; }

    // 应用磁场减速
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    // 对空导弹减速
    if (this._airSlowed && this._airSlowed >= frameCount) _spdMult *= this._airSlowFactor || 0.5;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  draw() {
    // 辐射波视觉
    for (const w of this.radWaves) {
      noFill(); stroke(255, 140, 0, w.life * 180); strokeWeight(3 + (1-w.life)*4);
      ellipse(this.pos.x, this.pos.y, w.r*2, w.r*2);
      stroke(255, 80, 0, w.life * 80); strokeWeight(8);
      ellipse(this.pos.x, this.pos.y, w.r*2, w.r*2);
    }
    // 辐射预警闪烁
    if (this.radWarning > 0) {
      const t = this.radWarning / 40;
      noFill(); stroke(255, 200, 0, t*200); strokeWeight(2);
      ellipse(this.pos.x, this.pos.y, 60+sin(frameCount*0.5)*8, 60+sin(frameCount*0.5)*8);
    }

    push(); translate(this.pos.x, this.pos.y);

    // 过热光环
    if (this.overheating) {
      const op = sin(this.overheatPulse*4)*0.5+0.5;
      noFill(); stroke(255,60,0,100+op*120); strokeWeight(5+op*4);
      ellipse(0,0,80+op*14,80+op*14);
      stroke(255,200,0,60+op*80); strokeWeight(2);
      ellipse(0,0,100+op*18,100+op*18);
    }

    // 旋转臂
    const berserk = this.hp/this.maxHp < 0.4;
    const armCount = berserk ? 12 : 8;
    for (let i = 0; i < armCount; i++) {
      const a = this.armAngle*(berserk?1.8:1) + i*(TWO_PI/armCount);
      const len = 30 + sin(this.pulseFire+i)*5;
      const col = berserk ? [255,60,0] : [180,80,20];
      stroke(...col, 200); strokeWeight(3.5); line(0,0,cos(a)*len,sin(a)*len);
      // 臂端小球
      noStroke(); fill(...col, 180); ellipse(cos(a)*len, sin(a)*len, 6, 6);
    }

    // 主体
    fill(40,18,5); stroke(200,90,20); strokeWeight(2.2); ellipse(0,0,56,56);
    // 内核颜色随血量变化
    const ratio = this.hp/this.maxHp;
    const coreR = floor(255);
    const coreG = floor(lerp(40, 200, ratio));
    fill(coreR, coreG, 20, 210); noStroke(); ellipse(0,0,24,24);
    fill(255,255,200,150); ellipse(0,0,10,10);

    // 核心护盾
    if (this.shieldActive) {
      const sp = this.shieldPulse > 0 ? map(this.shieldPulse,30,0,1,0.4) : sin(frameCount*0.06)*0.3+0.7;
      noFill(); stroke(255,180,40,180*sp); strokeWeight(4+sp*3);
      ellipse(0,0,70+sp*6,70+sp*6);
      stroke(255,220,100,100*sp); strokeWeight(1.5);
      for (let i=0;i<6;i++) {
        const a=i*PI/3+frameCount*0.02;
        line(cos(a)*28,sin(a)*28,cos(a)*34,sin(a)*34);
      }
    }

    // 状态标签
    if (this.overheating) {
      fill(255,80,0,230); noStroke(); textSize(9); textAlign(CENTER);
      text('🔥 OVERHEAT', 0, -40);
    } else if (this.shieldActive) {
      fill(255,200,50,230); noStroke(); textSize(9); textAlign(CENTER);
      text('⬡ SHIELD', 0, -40);
    } else if (this.splitDone) {
      fill(255,120,0,200); noStroke(); textSize(9); textAlign(CENTER);
      text('⚡ CRITICAL', 0, -40);
    }
    pop();
    this.drawHealthBar();
  }
  drawHealthBar() {
    if (this.hitFlash > 0) this.hitFlash--;
    const bw=60,bh=5,bx=this.pos.x-bw/2,by=this.pos.y-this.radius-22;
    stroke(200,80,10,150); strokeWeight(1); fill(8,4,2,210); rect(bx-1,by-1,bw+2,bh+2);
    noStroke(); const ratio=max(0,this.hp/this.maxHp);
    fill(this.hitFlash>0?color(255,255,255):lerpColor(color(200,20,5),color(255,160,20),ratio));
    rect(bx,by,bw*ratio,bh);
    // 护盾血量条（橙色叠加）
    if (this.shieldActive) {
      const sr = this.shieldHp / (this.maxHp*0.12);
      fill(255,200,40,180); rect(bx,by,bw*sr,bh);
    }
    // 关键血量刻度线
    for (const t of [0.4,0.75]) {
      stroke(255,200,80,150); strokeWeight(1);
      line(bx+bw*t,by,bx+bw*t,by+bh);
    }
    fill(255,120,20,200); noStroke(); textSize(8); textAlign(CENTER);
    text('BOSS  FISSION CORE', this.pos.x, by-4); textAlign(LEFT,BASELINE);
  }
}

// ── 小裂变体（BossFission分裂后产生）──
class FissionCore extends Monster {
  constructor(path) {
    super(path, 800, 0.7, 30);
    this.radius = 14; this.deathColor = color(255,100,0);
    this.armAngle = 0; this.pulseFire = 0;
    this.shieldActive = false; this.shieldHp = 0; this.shieldPulse = 0;
  }
  takeDamage(dmg) {
    this.hitFlash = 5;
    if (this.shieldActive) {
      this.shieldHp -= dmg; this.shieldPulse = 10;
      if (this.shieldHp <= 0) { this.shieldActive = false; spawnParticles(this.pos.x,this.pos.y,color(255,140,20),8); }
      return;
    }
    this.hp -= dmg;
    // 50%血触发一次小护盾
    if (!this.shieldActive && this.hp > 0 && this.hp/this.maxHp <= 0.5) {
      this.shieldActive = true; this.shieldHp = floor(this.maxHp*0.1); this.shieldPulse = 20;
    }
    if (this.hp <= 0) { this.alive = false; spawnParticles(this.pos.x,this.pos.y,this.deathColor,18); }
  }
  move() {
    this.armAngle += 0.035; this.pulseFire += 0.07;
    if (this.shieldPulse > 0) this.shieldPulse--;
    // 应用磁场减速
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    // 对空导弹减速
    if (this._airSlowed && this._airSlowed >= frameCount) _spdMult *= this._airSlowFactor || 0.5;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  draw() {
    push(); translate(this.pos.x, this.pos.y);
    for (let i = 0; i < 5; i++) {
      const a = this.armAngle + i*(TWO_PI/5);
      const len = 18+sin(this.pulseFire+i)*3;
      stroke(200,80,10,180); strokeWeight(2.5); line(0,0,cos(a)*len,sin(a)*len);
      noStroke(); fill(255,100,0,160); ellipse(cos(a)*len,sin(a)*len,5,5);
    }
    fill(35,14,4); stroke(180,70,15); strokeWeight(1.5); ellipse(0,0,28,28);
    fill(255,lerp(40,180,this.hp/this.maxHp),10,200); noStroke(); ellipse(0,0,12,12);
    if (this.shieldActive) {
      const sp = sin(frameCount*0.08)*0.3+0.7;
      noFill(); stroke(255,160,30,160*sp); strokeWeight(2.5); ellipse(0,0,40+sp*4,40+sp*4);
    }
    pop();
    // 血条
    if (this.hitFlash>0) this.hitFlash--;
    const bw=36,bh=3,bx=this.pos.x-bw/2,by=this.pos.y-this.radius-14;
    fill(8,4,2,200); stroke(180,70,10,130); strokeWeight(1); rect(bx-1,by-1,bw+2,bh+2);
    noStroke(); const ratio=max(0,this.hp/this.maxHp);
    fill(this.hitFlash>0?color(255,255,255):lerpColor(color(180,15,5),color(255,130,15),ratio));
    rect(bx,by,bw*ratio,bh);
    fill(255,100,10,180); noStroke(); textSize(7); textAlign(CENTER);
    text('FISSION', this.pos.x, by-3); textAlign(LEFT,BASELINE);
  }
}
// ── Boss 幽灵协议 ──
class BossPhantom extends Monster {
  constructor(path) {
    super(path, 5000, 0.88, 260);
    this.radius = 18; this.deathColor = color(180,220,255);
    this.walkTime = 0; this.corePulse = 0;
    this.invincible = 0; this.ghost = 0;
    this.ghostPos = { x:this.pos.x, y:this.pos.y };
    this.empEffect = 0;
    this.clonesDone = false; this.isClone = false; this.clonePulse = 0;
    this.trail = []; this.bullets = []; this.shootTimer = 0;
    // 新机制：每受到10%最大血量伤害位移一次，每位移3次触发干扰
    this.dmgAccum    = 0;  // 累计伤害量
    this.dashCount   = 0;  // 本轮已位移次数
  }
  takeDamage(dmg) {
    if (this.invincible > 0) return;
    this.hitFlash = 5;
    this.hp -= dmg;
    this.dmgAccum += dmg;

    // 每累计10%最大HP伤害触发一次位移
    if (this.dmgAccum >= this.maxHp * 0.1) {
      this.dmgAccum = 0;
      this.ghostPos = { x:this.pos.x, y:this.pos.y };
      this.ghost = 40; this.invincible = 30;
      const r = moveAlongPath(this.pos, this.seg, this.path, 60);
      this.pos = r.pos; this.seg = r.seg;
      this.progress = calcProgress(this.pos, this.seg, this.path);
      this.dashCount++;
      // 每位移3次，在当前位置触发干扰
      if (this.dashCount >= 3 && !this.isClone) {
        this.dashCount = 0;
        this.empEffect = 60;
        jammedUntilFrame = frameCount + 120;
        jamPos = { x: this.pos.x, y: this.pos.y };
        if (typeof jamRadius !== 'undefined') jamRadius = 160;
        spawnParticles(this.pos.x, this.pos.y, color(80,180,255), 20);
      }
    }

    if (!this.clonesDone && !this.isClone && this.hp > 0 && this.hp/this.maxHp <= 0.3) {
      this.clonesDone = true;
      if (typeof manager !== 'undefined') {
        for (let i = 0; i < 2; i++) {
          const c = new BossPhantom(this.path.slice(this.seg));
          c.hp = floor(this.maxHp*0.2); c.maxHp = floor(this.maxHp*0.2);
          c.isClone = true; c.pos = { x:this.pos.x+(i*2-1)*20, y:this.pos.y };
          manager.monsters.push(c);
        }
      }
    }
    if (this.hp <= 0) { this.alive = false; spawnParticles(this.pos.x,this.pos.y,this.deathColor,35); }
  }
  move() {
    this.walkTime += 0.2; this.corePulse += 0.06; this.clonePulse += 0.08;
    if (this.invincible > 0) this.invincible--;
    if (this.ghost > 0) this.ghost--;
    if (this.empEffect > 0) this.empEffect--;
    this.trail.push({ x:this.pos.x, y:this.pos.y, life:1.0 });
    if (this.trail.length > 12) this.trail.shift();
    for (const t of this.trail) t.life -= 0.12;
    this.shootTimer++;
    if (this.shootTimer >= 70) {
      this.shootTimer = 0;
      let dx=0,dy=0;
      if (this.seg < this.path.length-1) {
        dx=this.path[this.seg+1].x-this.pos.x; dy=this.path[this.seg+1].y-this.pos.y;
        const l=Math.hypot(dx,dy)||1; dx/=l; dy/=l;
      }
      this.bullets.push({ x:this.pos.x, y:this.pos.y, vx:dx*8, vy:dy*8, life:1.0 });
    }
    this.bullets = this.bullets.filter(b => b.life > 0);
    for (const b of this.bullets) { b.x+=b.vx; b.y+=b.vy; b.life-=0.03; }
    // 应用磁场减速
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length-1) this.reached = true;
  }
  draw() {
    for (const t of this.trail) {
      noStroke(); fill(this.isClone?color(180,100,255,t.life*80):color(100,180,255,t.life*80));
      ellipse(t.x, t.y, 32, 32);
    }
    push(); translate(this.pos.x, this.pos.y);
    if (this.empEffect > 0) {
      const et = this.empEffect/60;
      noFill(); stroke(200,230,255,et*180); strokeWeight(3);
      ellipse(0,0,(1-et)*400+20,(1-et)*400+20);
    }
    const ls = sin(this.walkTime)*9;
    fill(18,28,52); stroke(60,140,255,160); strokeWeight(1.2);
    beginShape(); vertex(-4,2); vertex(-8,4); vertex(-9,20+ls); vertex(-4,22+ls); vertex(-2,5); endShape(CLOSE);
    beginShape(); vertex(4,2); vertex(8,4); vertex(9,20-ls); vertex(4,22-ls); vertex(2,5); endShape(CLOSE);
    fill(18,28,52); stroke(60,140,255,200); strokeWeight(1.5);
    beginShape(); vertex(-8,-24); vertex(-5,-34); vertex(5,-34); vertex(8,-24); vertex(10,-8); vertex(8,4); vertex(-8,4); vertex(-10,-8); endShape(CLOSE);
    fill(16,26,50); stroke(140,210,255,220); strokeWeight(1.8); ellipse(0,-42,22,24);
    fill(0,140+sin(this.corePulse)*40,255,230); noStroke(); rect(-7,-49,14,3,1);
    if (this.isClone) { fill(200,120,255,160); noStroke(); textSize(8); textAlign(CENTER); text('CLONE',0,-55); }
    pop();
    this.drawHealthBar();
  }
  drawHealthBar() {
    if (this.hitFlash>0) this.hitFlash--;
    const bw=this.isClone?40:60,bh=5,bx=this.pos.x-bw/2,by=this.pos.y-this.radius-20;
    fill(5,8,18,210); stroke(60,180,255,150); strokeWeight(1); rect(bx-1,by-1,bw+2,bh+2);
    noStroke(); const ratio=max(0,this.hp/this.maxHp);
    fill(lerpColor(color(200,20,200),color(80,180,255),ratio)); rect(bx,by,bw*ratio,bh);
    if (!this.isClone) {
      fill(80,180,255,180); noStroke(); textSize(8); textAlign(CENTER);
      text('BOSS  PHANTOM PROTOCOL', this.pos.x, by-4); textAlign(LEFT,BASELINE);
    }
  }
}

// ── Boss 相变战士 ──
class BossAntMech extends Monster {
  constructor(path) {
    super(path, 9000, 0.72, 520);
    this.radius = 18; this.deathColor = color(80,255,120);
    this.walkTime = 0; this.corePulse = 0;
    this.phaseState = 'normal'; this.phaseTimer = 0;
    this.normalDur=480; this.giantDur=360; this.tinyDur=240;
    this.phaseOrder=['normal','giant','normal','tiny']; this.phaseIdx=0;
    this.scale=1.0; this.targetScale=1.0; this.baseSpd=0.75; this.baseRadius=18;
    this.shockwave=0; this.shockwaveR=0;
    this.antReleaseCount=0; this.antThresholds=[0.75,0.5,0.25];
    this.bullets=[]; this.shootTimer=0; this.berserk=false;
    this.legTime=0; this.antennaPulse=0;
    this.shieldTriggered=false; this.shielded=false; this.shieldHp=0; this.shieldPulse=0;
  }
  takeDamage(dmg) {
    if (this.phaseState==='giant') dmg=floor(dmg*0.15);
    if (this.phaseState==='normal') dmg=floor(dmg*1.5); // 正常形态受到1.5倍伤害
    if (this.phaseState==='tiny' && Math.random() < 0.6) return; // 缩小形态60%概率闪避
    this.hitFlash=5;
    if (this.shielded) {
      this.shieldHp-=dmg; this.shieldPulse=14;
      if (this.shieldHp<=0) { this.shielded=false; spawnParticles(this.pos.x,this.pos.y,color(80,255,120),14); }
    } else {
      this.hp-=dmg;
      if (!this.shieldTriggered&&this.hp>0&&this.hp/this.maxHp<=0.5) {
        this.shieldTriggered=true; this.shielded=true;
        this.shieldHp=floor(this.maxHp*0.2); this.shieldPulse=25;
      }
    }
    for (let i=this.antReleaseCount;i<this.antThresholds.length;i++) {
      if (this.hp/this.maxHp<=this.antThresholds[i]) {
        this.antReleaseCount=i+1;
        if (typeof manager!=='undefined') {
          for (let j=0;j<5;j++) {
            const s=new MechSpider(this.path.slice(this.seg));
            s.hp=40; s.maxHp=40; s.spd=2.2; manager.monsters.push(s);
          }
        }
        break;
      }
    }
    if (this.hp<=0) { this.alive=false; spawnParticles(this.pos.x,this.pos.y,this.deathColor,50); }
  }
  move() {
    this.walkTime+=0.18; this.corePulse+=0.07; this.antennaPulse+=0.1; this.legTime+=0.2;
    if (this.shieldPulse>0) this.shieldPulse--;
    this.berserk=this.hp/this.maxHp<=0.5;
    this.phaseTimer++;
    const phaseDurs={normal:this.berserk?200:this.normalDur,giant:this.berserk?240:this.giantDur,tiny:this.berserk?180:this.tinyDur};
    if (this.phaseTimer>=phaseDurs[this.phaseState]) {
      const prev=this.phaseState;
      this.phaseIdx=(this.phaseIdx+1)%this.phaseOrder.length;
      this.phaseState=this.phaseOrder[this.phaseIdx]; this.phaseTimer=0;
      if (prev==='tiny'&&this.phaseState==='normal') { this.shockwave=60; this.shockwaveR=0; jammedUntilFrame=frameCount+180; if (typeof jamRadius !== 'undefined') jamRadius=180; jamPos={x:this.pos.x,y:this.pos.y}; } // 退出缩小时干扰延长至3秒
    }
    const targets={normal:1.0,giant:this.berserk?5.0:4.5,tiny:this.berserk?0.15:0.18};
    this.targetScale=targets[this.phaseState];
    this.scale+=(this.targetScale-this.scale)*0.08;
    this.radius=this.baseRadius*this.scale;
    const spdMods={normal:1.0,giant:0.35,tiny:this.berserk?1.7:1.4};
    this.spd=this.baseSpd*spdMods[this.phaseState];
    if (this.shockwave>0) { this.shockwave--; this.shockwaveR+=(this.berserk?220:160)/60; }
    if (this.phaseState==='normal') {
      this.shootTimer++;
      if (this.shootTimer>=80) {
        this.shootTimer=0;
        let dx=0,dy=0;
        if (this.seg<this.path.length-1) {
          dx=this.path[this.seg+1].x-this.pos.x; dy=this.path[this.seg+1].y-this.pos.y;
          const l=Math.hypot(dx,dy)||1; dx/=l; dy/=l;
        }
        for (let i=-1;i<=1;i++) {
          const a=Math.atan2(dy,dx)+i*0.25;
          this.bullets.push({x:this.pos.x,y:this.pos.y,vx:cos(a)*6,vy:sin(a)*6,life:1.0});
        }
      }
    }
    this.bullets=this.bullets.filter(b=>b.life>0);
    for (const b of this.bullets) { b.x+=b.vx; b.y+=b.vy; b.life-=0.028; }
    // 应用磁场减速
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    const r=moveAlongPath(this.pos,this.seg,this.path,this.spd * _spdMult);
    this.pos=r.pos; this.seg=r.seg;
    this.progress=calcProgress(this.pos,this.seg,this.path);
    if (this.seg>=this.path.length-1) this.reached=true;
  }
  draw() {
    if (this.shockwave>0) {
      const st=this.shockwave/60; noFill(); stroke(80,255,120,st*200); strokeWeight(4);
      ellipse(this.pos.x,this.pos.y,this.shockwaveR*2,this.shockwaveR*2);
    }
    push(); translate(this.pos.x,this.pos.y); scale(this.scale);
    if (this.phaseState==='giant') {
      noFill(); stroke(80,255,120,55); strokeWeight(14); ellipse(0,0,90,110);
    }

    // ── 正确人体行走骨骼系统 ──
    // 以髋部为原点，腿向下，头向上
    // wt 是步伐相位，两腿相差 PI（正常走路）
    const wt = this.legTime;

    // 身体轻微左右侧倾 & 上下弹跳（重心转移）
    const bodyLean  = sin(wt) * 1.8;           // 侧倾
    const bodyBounce = -abs(sin(wt * 2)) * 1.5; // 走一步弹两次（脚落地时最低）

    // 髋关节位置（身体中心下方）
    const hipY = 8 + bodyBounce;

    // ─ 骨骼绘制函数：从关节A到关节B ─
    const drawLimb = (x1,y1,x2,y2,w,col) => {
      stroke(...col,200); strokeWeight(w); line(x1,y1,x2,y2);
    };
    const drawJoint = (x,y,r,col) => {
      fill(...col,230); noStroke(); ellipse(x,y,r,r);
    };

    // ── 先画腿（在身体后面）──
    // 大腿长18，小腿长17，用前摆角和后摆角
    const legThigh = 18, legShin = 17;

    for (const side of [-1, 1]) {
      // 左腿(side=-1)相位 = wt，右腿(side=1)相位 = wt+PI
      const phase = wt + (side > 0 ? Math.PI : 0);
      const thighAngle = sin(phase) * 0.42;  // 大腿前后摆幅（弧度）
      // 膝盖弯曲：腿向后时弯曲更多（自然步态）
      const kneeBend = max(0.18, -sin(phase) * 0.5 + 0.22);

      // 髋关节
      const hipX = side * 7;
      // 大腿末端（膝盖）
      const kneeX = hipX + sin(thighAngle) * legThigh;
      const kneeY = hipY + cos(thighAngle) * legThigh;
      // 小腿末端（脚踝）
      const shinAngle = thighAngle + kneeBend;
      const footX = kneeX + sin(shinAngle) * legShin;
      const footY = kneeY + cos(shinAngle) * legShin;

      // 大腿
      drawLimb(hipX,hipY, kneeX,kneeY, 5, [25,105,40]);
      // 小腿
      drawLimb(kneeX,kneeY, footX,footY, 4, [20,90,35]);
      // 膝关节
      drawJoint(kneeX,kneeY, 7, [40,160,60]);
      // 靴子（脚掌朝前）
      fill(15,65,28,230); stroke(40,150,60,190); strokeWeight(1);
      push(); translate(footX,footY); rotate(shinAngle * 0.3);
      rectMode(CENTER); rect(2,2,11,5,2); rectMode(CORNER);
      pop();
    }

    // ── 躯干 ──
    const torsoY  = hipY - 16;  // 躯干中心
    const torsoH  = 22;
    push(); translate(bodyLean, 0);

    // 骨盆
    fill(14,40,20); stroke(50,185,70,200); strokeWeight(1.5);
    rectMode(CENTER); rect(0, hipY, 16, 8, 2); rectMode(CORNER);

    // 躯干主体
    fill(16,44,22); stroke(55,200,80,210); strokeWeight(1.8);
    beginShape();
      vertex(-13, hipY-2); vertex(-15, torsoY-4);
      vertex(-11, torsoY-torsoH*0.4); vertex(11, torsoY-torsoH*0.4);
      vertex(15,  torsoY-4); vertex(13, hipY-2);
    endShape(CLOSE);

    // 胸甲细节线条
    stroke(45,165,68,120); strokeWeight(0.8);
    line(-9,torsoY-torsoH*0.3, -9,torsoY+2);
    line( 9,torsoY-torsoH*0.3,  9,torsoY+2);
    line(-11,torsoY-6, 11,torsoY-6);

    // 核心发光块（胸口）
    const coreCol = this.berserk ? color(255,80,50,230) : color(0,215+sin(this.corePulse)*35,65,235);
    fill(coreCol); noStroke(); rectMode(CENTER);
    rect(0, torsoY-4, 10, 14, 2);
    fill(160,255,190,150); rect(0, torsoY-4, 4, 6, 1);
    rectMode(CORNER);

    // 肩膀
    fill(22,60,30); stroke(65,215,88,200); strokeWeight(1.5);
    ellipse(-17, torsoY-torsoH*0.3, 11, 11);
    ellipse( 17, torsoY-torsoH*0.3, 11, 11);

    // ── 手臂（对侧摆动：右腿前迈时左臂前摆）──
    const armLen1 = 14, armLen2 = 13;
    for (const side of [-1, 1]) {
      // 手臂与对侧腿同相
      const armPhase = wt + (side < 0 ? Math.PI : 0);
      const armSwing = sin(armPhase) * 0.38;
      const elbowBend = max(0.1, abs(sin(armPhase)) * 0.35 + 0.12);

      const shldrX = side * 16, shldrY = torsoY - torsoH * 0.3;
      const elbowX = shldrX + sin(armSwing) * armLen1 * side * 0.4;
      const elbowY = shldrY + cos(armSwing) * armLen1 * 0.85 + 6;
      const handAng = armSwing - elbowBend * side;
      const handX   = elbowX + sin(handAng) * armLen2 * side * 0.4;
      const handY   = elbowY + cos(handAng) * armLen2 * 0.85 + 4;

      drawLimb(shldrX,shldrY, elbowX,elbowY, 4, [25,108,44]);
      drawLimb(elbowX,elbowY, handX,handY,   3, [20,92,38]);
      drawJoint(elbowX,elbowY, 5.5, [38,155,58]);
      // 拳头
      fill(18,85,35,225); stroke(42,162,62,180); strokeWeight(1);
      rectMode(CENTER); rect(handX,handY,7,6,2); rectMode(CORNER);
    }

    // ── 头盔（蚁人特征：光滑流线型+眼镜缝+触角）──
    const headY = torsoY - torsoH * 0.4 - 14;
    // 颈部
    fill(14,40,20); stroke(50,180,68,190); strokeWeight(1.2);
    rectMode(CENTER); rect(0, torsoY-torsoH*0.4-4, 8, 8, 2); rectMode(CORNER);
    // 头盔主体
    fill(14,38,20); stroke(62,215,88,225); strokeWeight(2);
    ellipse(0, headY, 24, 28);
    // 面罩分割线（上下半球接缝）
    stroke(45,175,70,160); strokeWeight(1);
    arc(0, headY, 22, 26, 0.1, PI-0.1);
    // 眼镜缝（发光）
    fill(0,230+sin(this.corePulse*1.8)*30,80,240); noStroke();
    rectMode(CENTER);
    rect(-5, headY-1, 7, 3, 1);
    rect( 5, headY-1, 7, 3, 1);
    rectMode(CORNER);
    // 中央鼻梁
    fill(20,60,30,200); noStroke(); rectMode(CENTER); rect(0,headY-1,2,5,1); rectMode(CORNER);
    // 触角
    stroke(52,195,78,195); strokeWeight(1.6);
    const antBase = headY-12;
    line(-4,antBase, -7,antBase-10);
    line( 4,antBase,  7,antBase-10);
    fill(72,245,105,230); noStroke();
    ellipse(-7,antBase-11,5,5); ellipse(7,antBase-11,5,5);

    pop(); // end bodyLean translate

    // ── 护盾 ──
    if (this.shielded) {
      const sp=this.shieldPulse>0?map(this.shieldPulse,25,0,1,0):sin(frameCount*0.045)*0.3+0.7;
      noFill(); stroke(80,255,120,80*sp); strokeWeight(8);
      beginShape(); for(let k=0;k<6;k++) vertex(cos(k*PI/3)*42,sin(k*PI/3)*42); endShape(CLOSE);
    }

    // ── 子弹 ──
    for (const b of this.bullets) {
      push(); translate(b.x-this.pos.x, b.y-this.pos.y);
      rotate(Math.atan2(b.vy,b.vx));
      noStroke(); fill(0,200,80,b.life*230);
      beginShape(); vertex(7,0); vertex(2,-2.5); vertex(-4,0); vertex(2,2.5); endShape(CLOSE);
      pop();
    }
    pop();

    textFont('monospace'); noStroke();
    const labelY=this.pos.y-max(this.radius,20)*this.scale-22;
    if (this.phaseState==='giant') { fill(80,255,120,220); textSize(11); textAlign(CENTER); text('▲ GIANT MODE',this.pos.x,labelY); }
    else if (this.phaseState==='tiny') { fill(200,255,100,220); textSize(11); textAlign(CENTER); text('▼ TINY MODE',this.pos.x,labelY); }
    if (this.berserk) { fill(255,80,80,200); textSize(10); textAlign(CENTER); text('⚡ BERSERK',this.pos.x,labelY-14); }
    textAlign(LEFT,BASELINE);
    this.drawHealthBar();
  }
  drawHealthBar() {
    if (this.hitFlash>0) this.hitFlash--;
    const bw=70,bh=6,bx=this.pos.x-bw/2,by=this.pos.y-max(this.radius,20)-24;
    stroke(40,200,70,150); strokeWeight(1); fill(5,12,8,215); rect(bx-1,by-1,bw+2,bh+2);
    noStroke(); const ratio=max(0,this.hp/this.maxHp);
    fill(this.hitFlash>0?color(255,255,255):color(0,200,80)); rect(bx,by,bw*ratio,bh);
    for (const t of [0.25,0.5,0.75]) { stroke(255,200,100,160); strokeWeight(1); line(bx+bw*t,by,bx+bw*t,by+bh); }
    fill(80,255,120,200); noStroke(); textSize(8); textAlign(CENTER);
    text('FINAL BOSS  ANT-MECH',this.pos.x,by-4); textAlign(LEFT,BASELINE);
  }
}

// ── 机械坦克（新基础怪：高血量，为附近地面怪提供免疫护盾）──
class MechTank extends Monster {
  constructor(path) {
    super(path, 1600, 0.55, 45);
    this.radius = 22; this.deathColor = color(180, 140, 40);
    this.walkTime = 0; this.corePulse = 0;
    this.shieldTimer = 180;    // 出生3秒后激活第一次护盾（而非从0开始等待）
    this.shieldActive = false;
    this.shieldDur = 240;      // 护盾持续4秒（原3秒）
    this.shieldCooldown = 540; // 冷却9秒（原15秒）
    this.shieldFrames = 0;
    this.shieldRadius = 130;
    this.shieldPulse = 0;
    this.turretAngle = 0;
  }
  takeDamage(dmg) {
    // 护盾激活时自身也受到免疫保护
    if (this.shieldActive) return;
    this.hp -= dmg; this.hitFlash = 6;
    if (this.hp <= 0) { this.alive = false; spawnParticles(this.pos.x, this.pos.y, this.deathColor, 30); }
  }
  move() {
    this.walkTime += 0.12; this.corePulse += 0.06; this.shieldPulse += 0.08;
    this.turretAngle += 0.02;

    // 护盾状态机
    if (this.shieldActive) {
      this.shieldFrames--;
      // 每帧给范围内所有地面怪（含BOSS）施加护盾标记
      if (typeof manager !== 'undefined') {
        for (const m of manager.monsters) {
          if (!m.alive || m === this || m.isFlying) continue;
          if (distAB(this.pos, m.pos) <= this.shieldRadius) {
            m._tankShielded = this.shieldFrames + 1; // 只要>0就免疫
          }
        }
      }
      if (this.shieldFrames <= 0) {
        this.shieldActive = false;
        this.shieldTimer = 0;
        // 清除范围内怪的护盾标记
        if (typeof manager !== 'undefined') {
          for (const m of manager.monsters) { m._tankShielded = 0; }
        }
      }
    } else {
      this.shieldTimer++;
      if (this.shieldTimer >= this.shieldCooldown) {
        this.shieldActive = true;
        this.shieldFrames = this.shieldDur;
        spawnParticles(this.pos.x, this.pos.y, color(255, 200, 50), 20);
      }
    }

    // 应用磁场减速
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    // 对空导弹减速
    if (this._airSlowed && this._airSlowed >= frameCount) _spdMult *= this._airSlowFactor || 0.5;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  draw() {
    push(); translate(this.pos.x, this.pos.y);

    // 护盾光环效果
    if (this.shieldActive) {
      const p = sin(this.shieldPulse * 3) * 0.4 + 0.6;
      noFill(); stroke(255, 210, 60, 80 * p); strokeWeight(12);
      ellipse(0, 0, this.shieldRadius * 2, this.shieldRadius * 2);
      stroke(255, 230, 100, 120 * p); strokeWeight(3);
      ellipse(0, 0, this.shieldRadius * 2, this.shieldRadius * 2);
      fill(255, 220, 80, 20 * p); noStroke();
      ellipse(0, 0, this.shieldRadius * 2, this.shieldRadius * 2);
    }

    // 履带（左右）
    const ls = sin(this.walkTime) * 3;
    fill(55, 45, 20); stroke(100, 80, 30, 200); strokeWeight(1.2);
    rect(-20, 8 + ls, 40, 10, 2);
    rect(-20, -18 - ls, 40, 10, 2);
    // 履带齿
    stroke(80, 65, 25, 160); strokeWeight(0.8);
    for (let i = -18; i < 20; i += 6) {
      line(i, 8 + ls, i, 18 + ls);
      line(i, -18 - ls, i, -8 - ls);
    }

    // 主炮塔底座
    fill(60, 50, 20); stroke(120, 100, 40, 200); strokeWeight(1.5);
    ellipse(0, -4, 34, 28);

    // 旋转炮塔
    push(); rotate(this.turretAngle);
    fill(50, 42, 18); stroke(130, 110, 45, 220); strokeWeight(1.3);
    ellipse(0, 0, 26, 26);
    // 主炮管
    fill(40, 34, 14); stroke(120, 100, 40); strokeWeight(1.5);
    rectMode(CENTER); rect(14, 0, 22, 7, 1);
    // 副炮管
    stroke(100, 85, 35); strokeWeight(1);
    rect(10, -8, 14, 4, 1);
    rect(10, 8, 14, 4, 1);
    rectMode(CORNER);
    pop();

    // 核心能量
    const cr = 7 + sin(this.corePulse) * 1.5;
    fill(this.shieldActive ? color(255, 220, 60, 220) : color(220, 170, 40, 200));
    noStroke(); ellipse(0, -4, cr, cr);
    fill(255, 255, 200, 180); ellipse(0, -4, cr * 0.4, cr * 0.4);

    pop();
    this.drawHealthBar();
  }
  drawHealthBar() {
    if (this.hitFlash > 0) this.hitFlash--;
    const bw = 50, bh = 4, bx = this.pos.x - bw/2, by = this.pos.y - this.radius - 16;
    stroke(180, 140, 40, 140); strokeWeight(1); fill(10, 8, 3, 210);
    rect(bx-1, by-1, bw+2, bh+2);
    noStroke();
    const ratio = max(0, this.hp / this.maxHp);
    fill(this.hitFlash > 0 ? color(255,240,180) : lerpColor(color(180,80,5), color(220,180,30), ratio));
    rect(bx, by, bw * ratio, bh);
    if (this.shieldActive) {
      fill(255, 220, 80, 200); noStroke(); textSize(8); textAlign(CENTER);
      text('★ SHIELD', this.pos.x, by - 4); textAlign(LEFT, BASELINE);
    }
  }
}

// ── 幽灵飞鸟（新空中怪：会短暂隐身，隐身期间无法被攻击）──
// ── Boss 钢铁母舰 ──
// 空中形态：定期空投地面小怪，血量节点触发强化空投
// 坠落触发（血量<60%）：落至主路径变为地面超重坦克形态
// 地面形态：护盾覆盖范围内小怪免伤75%+移速加快
// 自保技能：定期激活护盾抵挡一波伤害
class BossCarrier extends Monster {
  constructor(path) {
    super(path, 7200, 0.5, 280);
    this.isFlying = true;
    this.radius = 30; this.deathColor = color(180, 200, 255);

    // 飞行形态
    this.floatY = 0; this.floatTime = 0; this.propAngle = 0;
    this.dropTimer = 0;       // 空投计时
    this.dropInterval = 280;  // 每280帧空投一次
    this.dropThresholds = [0.8, 0.6]; // 血量节点触发强化空投
    this.dropsDone = [];      // 已触发的节点

    // 护盾（自保）
    this.shieldActive = false; this.shieldHp = 0; this.shieldPulse = 0;
    this.shieldCooldown = 600; this.shieldTimer = 0;

    // 坠落/地面形态
    this.grounded = false;       // 是否已坠落
    this.groundedAnim = 0;       // 坠落动画计时
    this.crashParticleDone = false;
    this.groundPath = null;      // 坠落后使用主路径

    // 地面形态护盾光环
    this.auraRadius = 130;
    this.auraPulse = 0;

    // 地面移动
    this.groundSeg = 0;
  }

  takeDamage(dmg) {
    this.hitFlash = 5;
    if (this.shieldActive) {
      this.shieldHp -= dmg; this.shieldPulse = 18;
      if (this.shieldHp <= 0) {
        this.shieldActive = false;
        spawnParticles(this.pos.x, this.pos.y, color(180, 200, 255), 14);
      }
      return;
    }
    this.hp -= dmg;

    // 血量节点强化空投
    for (const t of this.dropThresholds) {
      if (!this.dropsDone.includes(t) && this.hp / this.maxHp <= t) {
        this.dropsDone.push(t);
        this._doAirdrop(true); // 强化空投
      }
    }

    // 坠落触发
    if (!this.grounded && this.hp > 0 && this.hp / this.maxHp <= 0.5) {
      this._crash();
    }

    if (this.hp <= 0) {
      this.alive = false;
      spawnParticles(this.pos.x, this.pos.y, this.deathColor, 50);
    }
  }

  _crash() {
    this.grounded = true;
    this.isFlying = false;
    this.groundedAnim = 40;
    this.spd = 0.42;
    // 落到主路径最近节点
    if (typeof MAIN_PATH_PX !== 'undefined' && MAIN_PATH_PX) {
      this.groundPath = MAIN_PATH_PX;
      // 找最近节点
      let bestSeg = 0, bestDist = Infinity;
      for (let i = 0; i < MAIN_PATH_PX.length; i++) {
        const d = Math.hypot(MAIN_PATH_PX[i].x - this.pos.x, MAIN_PATH_PX[i].y - this.pos.y);
        if (d < bestDist) { bestDist = d; bestSeg = i; }
      }
      this.groundSeg = bestSeg;
      this.pos = { x: MAIN_PATH_PX[bestSeg].x, y: MAIN_PATH_PX[bestSeg].y };
      this.seg = bestSeg;
      this.path = MAIN_PATH_PX;
    }
    spawnParticles(this.pos.x, this.pos.y, color(200, 160, 100), 40);
    // 坠落时也触发一次空投
    this._doAirdrop(true);
  }

  _doAirdrop(enhanced) {
    if (typeof manager === 'undefined' || !MAIN_PATH_PX || !EDGE_PATH_PX) return;
    const pool = enhanced
      ? ['robot','robot','robot','tank','robot','spider']
      : ['robot','robot','spider','robot','spider'];
    const count = enhanced ? 4 : 3;

    for (let i = 0; i < count; i++) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      const chosenPath = Math.random() < 0.5 ? MAIN_PATH_PX : EDGE_PATH_PX;
      let m;
      if (t === 'spider') m = new MechSpider(chosenPath);
      if (t === 'robot')  m = new MechRobot(chosenPath);
      if (t === 'tank')   m = new MechTank(chosenPath);
      if (!m) continue;

      // 找母舰当前位置在路径上最近的节点，从那里开始行进
      let bestSeg = 0, bestDist = Infinity;
      for (let s = 0; s < chosenPath.length - 1; s++) {
        const d = Math.hypot(chosenPath[s].x - this.pos.x, chosenPath[s].y - this.pos.y);
        if (d < bestDist) { bestDist = d; bestSeg = s; }
      }
      m.seg = bestSeg;
      m.pos = { x: chosenPath[bestSeg].x, y: chosenPath[bestSeg].y };
      m.progress = calcProgress(m.pos, bestSeg, chosenPath);
      // 坠落无敌：从母舰位置下落到路径节点，期间无法被攻击
      m._dropping = true;
      m._dropFromY = this.pos.y;        // 坠落起始Y（母舰位置）
      m._dropToY   = m.pos.y;           // 落点Y（路径节点）
      m._dropFrames = 30;               // 坠落动画帧数
      m._dropTimer  = 0;
      manager.monsters.push(m);
      // 空投冲击特效（在母舰正下方）
      spawnParticles(this.pos.x, this.pos.y + 20, color(255, 200, 80), 16);
      spawnParticles(m.pos.x, m.pos.y, color(255, 160, 40), 10);
    }
  }

  move() {
    if (this.grounded) {
      this._moveGround();
      return;
    }
    this._moveAir();
  }

  _moveAir() {
    this.floatTime += 0.04; this.propAngle += 0.18;
    this.floatY = sin(this.floatTime) * 7;
    // 对空导弹减速到期后恢复
    if (this._airSlowApplied && this._airSlowExpire && frameCount >= this._airSlowExpire) {
      this.spd = this._origBaseSpd || 0.5;
      this._airSlowApplied = false; this._airSlowExpire = 0;
    }

    // 护盾冷却
    this.shieldTimer++;
    if (!this.shieldActive && this.shieldTimer >= this.shieldCooldown) {
      this.shieldTimer = 0; this.shieldActive = true;
      this.shieldHp = floor(this.maxHp * 0.1);
      this.shieldPulse = 30;
    }
    if (this.shieldPulse > 0) this.shieldPulse--;

    // 定期空投
    this.dropTimer++;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      this._doAirdrop(false);
    }

    // 应用磁场减速
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    // 对空导弹减速
    if (this._airSlowed && this._airSlowed >= frameCount) _spdMult *= this._airSlowFactor || 0.5;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }

  _moveGround() {
    this.auraPulse += 0.07;
    if (this.groundedAnim > 0) this.groundedAnim--;

    // 护盾冷却（地面形态冷却更短）
    this.shieldTimer++;
    if (!this.shieldActive && this.shieldTimer >= 420) {
      this.shieldTimer = 0; this.shieldActive = true;
      this.shieldHp = floor(this.maxHp * 0.08);
      this.shieldPulse = 25;
    }
    if (this.shieldPulse > 0) this.shieldPulse--;

    // 地面形态光环：让附近小怪免伤75%+移速加快
    if (typeof manager !== 'undefined') {
      for (const m of manager.monsters) {
        if (!m.alive || m.reached || m === this || m.isFlying) continue;
        const d = Math.hypot(m.pos.x - this.pos.x, m.pos.y - this.pos.y);
        if (d <= this.auraRadius) {
          m._carrierAura = frameCount + 2; // 每帧刷新标记
          m._carrierSpd  = true;
        }
      }
    }

    // 应用磁场减速
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    // 对空导弹减速
    if (this._airSlowed && this._airSlowed >= frameCount) _spdMult *= this._airSlowFactor || 0.5;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }

  draw() {
    if (this.grounded) {
      this._drawGround();
      return;
    }
    this._drawAir();
  }

  _drawAir() {
    const fy = this.floatY;
    push(); translate(this.pos.x, this.pos.y + fy);

    // 护盾
    if (this.shieldActive) {
      const sp = this.shieldPulse > 0 ? map(this.shieldPulse,30,0,1,0.4) : sin(frameCount*0.06)*0.3+0.7;
      noFill(); stroke(180,210,255,160*sp); strokeWeight(4+sp*2);
      ellipse(0, 0, 90+sp*8, 60+sp*4);
    }

    // 机身主体
    fill(40,50,70); stroke(120,160,220,200); strokeWeight(1.8);
    beginShape();
      vertex(-38,  0); vertex(-28, -12); vertex(-10, -16);
      vertex( 10, -16); vertex( 28, -12); vertex( 38,  0);
      vertex( 28,  12); vertex(-28,  12);
    endShape(CLOSE);

    // 座舱玻璃
    fill(80,140,220,180); stroke(140,180,255,200); strokeWeight(1);
    ellipse(0, -8, 26, 18);
    fill(140,200,255,100); noStroke(); ellipse(-4,-10,10,7);

    // 引擎挂架
    for (const sx of [-24, 24]) {
      fill(30,40,60); stroke(100,140,200,180); strokeWeight(1.2);
      rectMode(CENTER); rect(sx, 6, 14, 8, 2); rectMode(CORNER);
      // 螺旋桨
      push(); translate(sx, 6); rotate(this.propAngle * (sx>0?1:-1));
      stroke(160,200,255,200); strokeWeight(2);
      line(-10,0,10,0); line(0,-10,0,10);
      noStroke(); fill(180,210,255,160);
      ellipse(10,0,5,5); ellipse(-10,0,5,5);
      ellipse(0,10,5,5); ellipse(0,-10,5,5);
      pop();
    }

    // 尾翼
    fill(35,45,65); stroke(100,140,200,160); strokeWeight(1);
    triangle(-38,0, -48,-14, -42,-2);
    triangle(-38,0, -48,14,  -42, 2);

    // 空投舱门（有空投时闪烁）
    const dropping = this.dropTimer > this.dropInterval - 30;
    fill(dropping ? color(255,200,80,200) : color(20,30,50,200));
    stroke(dropping ? color(255,220,100) : color(80,120,180,150)); strokeWeight(1);
    rectMode(CENTER); rect(0, 10, 20, 6, 1); rectMode(CORNER);

    pop();
    this.drawHealthBar();
  }

  _drawGround() {
    push(); translate(this.pos.x, this.pos.y);

    // 坠落震动效果
    const shake = this.groundedAnim > 0 ? (Math.random()-0.5)*4*(this.groundedAnim/40) : 0;
    translate(shake, shake*0.5);

    // 地面护盾光环
    const ap = sin(this.auraPulse)*0.4+0.6;
    noFill(); stroke(180,210,255,50*ap); strokeWeight(12);
    ellipse(0,0,this.auraRadius*2,this.auraRadius*2);
    stroke(180,210,255,100*ap); strokeWeight(3);
    ellipse(0,0,this.auraRadius*2,this.auraRadius*2);
    // 旋转光点
    push(); rotate(this.auraPulse*0.5);
    for (let i=0;i<6;i++) {
      const a=i*PI/3, rr=this.auraRadius;
      noStroke(); fill(180,210,255,80*ap);
      ellipse(cos(a)*rr, sin(a)*rr, 8, 8);
    }
    pop();

    // 残骸机身（压扁变形）
    fill(50,55,75); stroke(100,140,200,180); strokeWeight(1.5);
    beginShape();
      vertex(-42,  4); vertex(-30, -8); vertex(-10, -12);
      vertex( 10, -12); vertex( 30, -8); vertex( 42,  4);
      vertex( 30,  16); vertex(-30, 16);
    endShape(CLOSE);

    // 受损痕迹
    stroke(255,100,30,180); strokeWeight(2);
    line(-20,-8, -10, 2); line(5,-10, 15,-2); line(-30,4,-18,8);

    // 压碎的座舱（破损玻璃）
    fill(60,100,160,140); stroke(100,160,220,160); strokeWeight(1);
    ellipse(0,-4,22,14);
    stroke(255,80,30,160); strokeWeight(1.5);
    line(-8,-8,2,-2); line(4,-10,10,-4);

    // 护盾
    if (this.shieldActive) {
      const sp = this.shieldPulse>0 ? map(this.shieldPulse,25,0,1,0.4) : sin(frameCount*0.07)*0.3+0.7;
      noFill(); stroke(180,210,255,150*sp); strokeWeight(3+sp*2);
      ellipse(0,0,100+sp*6,60+sp*4);
    }

    // 标签
    if (this.hp/this.maxHp < 0.2) {
      fill(255,80,30,220); noStroke(); textSize(9); textAlign(CENTER);
      text('💥 CRITICAL', 0, -28);
    }
    pop();
    this.drawHealthBar();
  }

  drawHealthBar() {
    if (this.hitFlash>0) this.hitFlash--;
    const fy = this.grounded ? 0 : this.floatY;
    const bw=70,bh=5,bx=this.pos.x-bw/2,by=this.pos.y+fy-this.radius-22;
    stroke(100,140,220,150); strokeWeight(1); fill(5,8,18,210); rect(bx-1,by-1,bw+2,bh+2);
    noStroke(); const ratio=max(0,this.hp/this.maxHp);
    fill(this.hitFlash>0?color(255,255,255):lerpColor(color(180,20,20),color(100,160,255),ratio));
    rect(bx,by,bw*ratio,bh);
    // 60%坠落线改为50%
    stroke(255,200,60,160); strokeWeight(1);
    line(bx+bw*0.5, by, bx+bw*0.5, by+bh);
    fill(140,180,255,200); noStroke(); textSize(8); textAlign(CENTER);
    text(this.grounded?'BOSS  CARRIER [GROUNDED]':'BOSS  IRON CARRIER', this.pos.x, by-4);
    textAlign(LEFT,BASELINE);
  }
}

class GhostBird extends Monster {
  constructor(path) {
    super(path, 120, 2.2, 38);
    this.isFlying = true;
    this.radius = 14; this.deathColor = color(180, 100, 255);
    this.wingTime = 0; this.floatY = 0;
    this.baseSpd = 2.2;
    this.ghostTimer = 0;       // 距下次隐身计时
    this.ghostCooldown = 300;  // 每5秒触发一次隐身
    this.isGhost = false;      // 是否当前隐身
    this.ghostDur = 90;        // 隐身持续1.5秒
    this.ghostFrames = 0;
    this.ghostPulse = 0;
    this.trail = [];
  }
  takeDamage(dmg) {
    if (this.isGhost) return; // 隐身期间完全免疫
    this.hp -= dmg; this.hitFlash = 5;
    if (this.hp <= 0) { this.alive = false; spawnParticles(this.pos.x, this.pos.y, this.deathColor, 22); }
  }
  move() {
    this.wingTime += 0.25; this.ghostPulse += 0.1;
    this.floatY = cos(this.wingTime * 0.4) * 7;

    // 隐身状态机
    if (this.isGhost) {
      this.ghostFrames--;
      if (this.ghostFrames <= 0) {
        this.isGhost = false;
        this.ghostTimer = 0;
        spawnParticles(this.pos.x, this.pos.y + this.floatY, color(180, 100, 255), 12);
      }
    } else {
      this.ghostTimer++;
      if (this.ghostTimer >= this.ghostCooldown) {
        this.isGhost = true;
        this.ghostFrames = this.ghostDur;
        spawnParticles(this.pos.x, this.pos.y + this.floatY, color(200, 150, 255), 15);
      }
    }

    // 对空导弹减速到期后恢复baseSpd
    if (this._airSlowApplied && this._airSlowExpire && frameCount >= this._airSlowExpire) {
      this.baseSpd = this._origBaseSpd || this.baseSpd;
      this._airSlowApplied = false; this._airSlowExpire = 0;
    }
    // 隐身时略微加速
    this.spd = this.isGhost ? this.baseSpd * 1.4 : this.baseSpd;

    this.trail.push({ x: this.pos.x, y: this.pos.y + this.floatY, life: 1.0 });
    if (this.trail.length > 10) this.trail.shift();
    for (const t of this.trail) t.life -= 0.14;

    // 应用磁场减速
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    // 对空导弹减速
    if (this._airSlowed && this._airSlowed >= frameCount) _spdMult *= this._airSlowFactor || 0.5;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  draw() {
    const alpha = this.isGhost ? 55 : 220; // 隐身时半透明
    const cx = this.pos.x, cy = this.pos.y + this.floatY;

    // 尾迹
    for (const t of this.trail) {
      noStroke();
      fill(this.isGhost ? color(180,100,255,t.life*40) : color(200,150,255,t.life*70));
      ellipse(t.x, t.y, 16 * t.life, 16 * t.life);
    }

    // 隐身提示圈
    if (this.isGhost) {
      const p = sin(this.ghostPulse * 5) * 0.4 + 0.6;
      noFill(); stroke(180, 100, 255, 60 * p); strokeWeight(2);
      ellipse(cx, cy, 36, 36);
      fill(180, 100, 255, 30 * p); noStroke(); ellipse(cx, cy, 32, 32);
    }

    push(); translate(cx, cy);
    const wa = sin(this.wingTime) * 0.7;

    // 翅膀
    for (const side of [-1, 1]) {
      push(); scale(side, 1); rotate(-wa * side - 0.3);
      fill(80, 40, 130, alpha); stroke(160, 80, 255, alpha); strokeWeight(1.3);
      beginShape();
      vertex(0, -1); vertex(6, -3); vertex(22, -8); vertex(28, -4);
      vertex(20, 2); vertex(6, 4);
      endShape(CLOSE);
      // 翅膀纹理
      stroke(140, 70, 220, alpha * 0.6); strokeWeight(0.7);
      line(4, 0, 18, -5); line(10, 0, 22, -4);
      pop();
    }

    // 身体
    fill(55, 25, 90, alpha); stroke(150, 70, 240, alpha); strokeWeight(1.4);
    beginShape();
    vertex(0, -10); vertex(7, -6); vertex(9, 0); vertex(7, 7);
    vertex(0, 10); vertex(-7, 7); vertex(-9, 0); vertex(-7, -6);
    endShape(CLOSE);

    // 眼睛（隐身时发光）
    fill(this.isGhost ? color(220, 160, 255, 180) : color(200, 100, 255, 220));
    noStroke(); ellipse(-3, -4, 5, 4); ellipse(3, -4, 5, 4);
    fill(255, 255, 255, this.isGhost ? 100 : 200);
    ellipse(-3, -4, 2, 2); ellipse(3, -4, 2, 2);

    // 隐身标签
    if (this.isGhost) {
      fill(200, 130, 255, 160); noStroke();
      textSize(8); textAlign(CENTER);
      text('GHOST', 0, -22);
    }
    pop();

    if (!this.isGhost) this.drawHealthBar();
  }
  drawHealthBar() {
    if (this.hitFlash > 0) this.hitFlash--;
    const bw = 36, bh = 3, bx = this.pos.x - bw/2, by = this.pos.y + this.floatY - this.radius - 14;
    stroke(160, 80, 255, 120); strokeWeight(1); fill(8, 4, 14, 200);
    rect(bx-1, by-1, bw+2, bh+2);
    noStroke();
    const ratio = max(0, this.hp / this.maxHp);
    fill(lerpColor(color(150, 20, 200), color(200, 130, 255), ratio));
    rect(bx, by, bw * ratio, bh);
  }
}

// ============================================================
//  MonsterManager
// ============================================================
class MonsterManager {
  constructor() { this.monsters=[]; this.queue=[]; this.fc=0; this.onKilled=null; this.onReach=null; }

  enqueueWave(type,count,interval,startDelay) {
    interval=interval||60; startDelay=startDelay||0;
    for (let i=0;i<count;i++) this.queue.push({type,frame:this.fc+startDelay+i*interval});
  }

  spawn(type) {
    // 蛇/蜘蛛/机器人/坦克随机走主路或边路
    const groundPath = () => (random()<0.5 ? MAIN_PATH_PX : EDGE_PATH_PX);
    let m = null;
    if (type==='snake')      m = new MechSnake(groundPath());
    else if (type==='spider')  m = new MechSpider(groundPath());
    else if (type==='robot')   m = new MechRobot(groundPath());
    else if (type==='tank')    m = new MechTank(groundPath());
    else if (type==='phoenix') m = new MechPhoenix(AIR_PATH_PX);
    else if (type==='ghostbird') m = new GhostBird(AIR_PATH_PX);
    else if (type==='boss1')   m = new BossFission(MAIN_PATH_PX);
    else if (type==='boss2')   m = new BossPhantom(MAIN_PATH_PX);
    else if (type==='boss3')   m = new BossAntMech(MAIN_PATH_PX);
    else if (type==='fission') m = new BossFission(MAIN_PATH_PX);
    else if (type==='carrier') m = new BossCarrier(AIR_PATH_PX);
    if (!m) return null;

    // ── 波次成长系数 ──
    // 普通怪：每波 HP×1.13，速度×1.04（Wave10 ≈ HP×3.0，速度×1.4）
    // Boss：每波 HP×1.09（基数大，慢一点）
    // 奖励同步上涨，后期打怪更值钱
    const wave = (typeof waveNum !== 'undefined') ? max(1, waveNum) : 1;
    const n    = wave - 1;
    const isBoss = (m instanceof BossFission)||(m instanceof BossPhantom)||(m instanceof BossAntMech)||(m instanceof FissionCore)||(m instanceof BossCarrier);

    const hpMult  = isBoss ? pow(1.09, n) : pow(1.13, n);
    const spdMult = isBoss ? 1            : min(pow(1.04, n), 1.45); // Boss不加速，普通怪限制上限
    const rewMult = pow(1.10, n);

    const newHp = floor(m.hp * hpMult);
    m.hp = newHp; m.maxHp = newHp;
    m.spd *= spdMult;
    if (m.baseSpd !== undefined) m.baseSpd = m.spd;
    m.reward = floor(m.reward * rewMult);

    return m;
  }

  // 怪物到达终点扣血量（设计：50HP，小怪漏20只死，Boss漏1只损失惨重）
  _reachDmg(m) {
    if (m instanceof BossAntMech)  return 15;
    if (m instanceof BossFission || m instanceof BossPhantom) return 10;
    if (m instanceof MechTank)     return 6;
    if (m instanceof MechRobot)    return 4;
    if (m instanceof MechPhoenix || m instanceof GhostBird)  return 3;
    return 2; // snake / spider
  }

  // ignoreTankBarrier: 无视坦克护盾（链式电弧塔专属）
  // ignoreRobotShield: 无视机器人护盾（快速塔专属，相当于 fromSide=true 且穿透护盾）
  damageAt(tx,ty,dmg,antiAir,fromSide,ignoreTankBarrier,ignoreRobotShield) {
    antiAir=antiAir||false; fromSide=fromSide||false;
    ignoreTankBarrier=ignoreTankBarrier||false; ignoreRobotShield=ignoreRobotShield||false;
    for (const m of this.monsters) {
      if (!m.alive||m.reached) continue;
      if (m._dropping) continue; // 空投坠落中无敌
      if (!ignoreTankBarrier && !m.isFlying && m._tankShielded > 0 && !(m instanceof MechTank)) continue;
      // 幽灵飞鸟隐身期间免疫所有伤害
      if (m instanceof GhostBird && m.isGhost) continue;
      const isFlying = m instanceof MechPhoenix || m instanceof GhostBird || (m instanceof BossCarrier && !m.grounded);
      if (antiAir && !isFlying) continue;
      if (!antiAir && isFlying) continue;
      if (distAB(m.pos,{x:tx,y:ty})<=m.radius+5) {
        // 母舰地面光环：覆盖范围内小怪免伤75%
        const actualDmg = (m._carrierAura && m._carrierAura >= frameCount) ? floor(dmg*0.25) : dmg;
        if (m instanceof MechRobot) {
          if (ignoreRobotShield) m.takeDamage(actualDmg, true, true);
          else m.takeDamage(actualDmg, fromSide);
        } else m.takeDamage(actualDmg);
      }
    }
  }

  damageInRadius(cx,cy,radius,dmg,antiAir,ignoreTankBarrier,ignoreRobotShield) {
    antiAir=antiAir||false;
    ignoreTankBarrier=ignoreTankBarrier||false; ignoreRobotShield=ignoreRobotShield||false;
    for (const m of this.monsters) {
      if (!m.alive||m.reached) continue;
      if (m._dropping) continue; // 空投坠落中无敌
      if (!ignoreTankBarrier && !m.isFlying && m._tankShielded > 0 && !(m instanceof MechTank)) continue;
      if (m instanceof GhostBird && m.isGhost) continue;
      const isFlying = m instanceof MechPhoenix || m instanceof GhostBird || (m instanceof BossCarrier && !m.grounded);
      if (antiAir && !isFlying) continue;
      if (!antiAir && isFlying) continue;
      if (distAB(m.pos,{x:cx,y:cy})<=radius) {
        const actualDmg = (m._carrierAura && m._carrierAura >= frameCount) ? floor(dmg*0.25) : dmg;
        if (m instanceof MechRobot) {
          if (ignoreRobotShield) m.takeDamage(actualDmg, true, true);
          else m.takeDamage(actualDmg, false);
        } else m.takeDamage(actualDmg);
      }
    }
  }

  getMonstersInRange(cx,cy,range,antiAir) {
    antiAir=antiAir||false;
    return this.monsters.filter(m=>{
      if (!m.alive||m.reached) return false;
      const isFlying = m instanceof MechPhoenix || m instanceof GhostBird || (m instanceof BossCarrier && !m.grounded);
      if (antiAir && !isFlying) return false;
      if (!antiAir && isFlying) return false;
      // 隐身的幽灵飞鸟对所有塔不可见（除非是对空且已解锁特殊逻辑）
      if (m instanceof GhostBird && m.isGhost) return false;
      return distAB(m.pos,{x:cx,y:cy})<=range;
    });
  }

  update() {
    this.fc++;
    for (let i=this.queue.length-1;i>=0;i--) {
      if (this.queue[i].frame<=this.fc) {
        const m=this.spawn(this.queue[i].type);
        if (m) this.monsters.push(m);
        this.queue.splice(i,1);
      }
    }

    for (const m of this.monsters) {
      m.update();

      // ── Home塔碰撞：怪物进入基地半径立即死亡并扣血 ──
      if (m.alive && typeof homeTowers !== 'undefined') {
        for (const ht of homeTowers) {
          if (distAB(m.pos, {x:ht.px, y:ht.py}) <= ht.radius + m.radius) {
            const dmg = this._reachDmg(m);
            spawnParticles(m.pos.x, m.pos.y, m.deathColor, 18);
            m.alive = false;
            ht.triggerHit();
            if (this.onReach) this.onReach(m, dmg);
            break;
          }
        }
      }

      // ── 路径终点兜底 ──
      if (m.alive && m.reached) {
        const dmg = this._reachDmg(m);
        m.alive = false;
        if (typeof homeTowers !== 'undefined' && homeTowers.length > 0) homeTowers[0].triggerHit();
        if (this.onReach) this.onReach(m, dmg);
      }

      if (!m.alive && this.onKilled) this.onKilled(m);
    }
    this.monsters = this.monsters.filter(m => m.alive);
  }
}

// ============================================================
//  HomeTower — 科幻风格基地（路径终点）
// ============================================================
class HomeTower {
  constructor(x, y) {
    this.px = x; this.py = y;
    this.pulseTime = 0;
    this.hitFlash  = 0;
    this.shieldAngle = 0;
    this.dmgEffect = 0;
    this.radius = 30;
  }

  update() {
    this.pulseTime  += 0.04;
    this.shieldAngle += 0.013;
    if (this.hitFlash  > 0) this.hitFlash--;
    if (this.dmgEffect > 0) this.dmgEffect--;
  }

  triggerHit() {
    this.hitFlash  = 22;
    this.dmgEffect = 32;
    spawnParticles(this.px, this.py, color(255, 50, 50), 16);
  }

  draw() {
    const p = sin(this.pulseTime) * 0.35 + 0.65;
    push(); translate(this.px, this.py);

    // 外六边形护盾
    push(); rotate(this.shieldAngle);
    const sAlpha = this.hitFlash > 0 ? 240 : 85;
    const sCol   = this.hitFlash > 0 ? color(255,80,80,sAlpha) : color(0,200,255,sAlpha);
    noFill(); stroke(sCol); strokeWeight(this.hitFlash>0 ? 2.5 : 1.5);
    beginShape();
    for (let k=0;k<6;k++) vertex(cos(k*PI/3)*44, sin(k*PI/3)*44);
    endShape(CLOSE);
    pop();

    // 内旋转八边形
    push(); rotate(-this.shieldAngle*1.7);
    noFill(); stroke(0,180,255,55*p); strokeWeight(1);
    beginShape();
    for (let k=0;k<8;k++) vertex(cos(k*PI/4)*33, sin(k*PI/4)*33);
    endShape(CLOSE);
    pop();

    // 受击冲击波
    if (this.dmgEffect > 0) {
      const t = this.dmgEffect/32;
      noFill(); stroke(255,60,60,t*200); strokeWeight(3.5);
      ellipse(0,0,(1-t)*85+8,(1-t)*85+8);
    }

    // 主体底座
    const baseCol = this.hitFlash>0 ? color(75,8,8) : color(8,18,38);
    fill(baseCol); stroke(this.hitFlash>0?color(255,80,80):color(0,160,255),175); strokeWeight(2);
    beginShape();
    vertex(0,-29); vertex(21,-19); vertex(27,0); vertex(21,19);
    vertex(0,27); vertex(-21,19); vertex(-27,0); vertex(-21,-19);
    endShape(CLOSE);

    // 核心塔身
    fill(12,25,52); stroke(0,180,255,195); strokeWeight(1.5);
    beginShape();
    vertex(0,-21); vertex(13,-13); vertex(17,0);
    vertex(13,13); vertex(0,17); vertex(-13,13); vertex(-17,0); vertex(-13,-13);
    endShape(CLOSE);

    // 中央能量核
    const cSize = 9 + sin(this.pulseTime*3)*2.2;
    const cCol  = this.hitFlash>0 ? color(255,80,60) : color(0,220,255);
    fill(cCol); noStroke(); ellipse(0,0,cSize,cSize);
    fill(255,255,255,175); ellipse(0,0,cSize*0.38,cSize*0.38);

    // 四炮台
    for (let k=0;k<4;k++) {
      push(); rotate(k*HALF_PI + this.shieldAngle*0.28);
      fill(15,30,58); stroke(0,155,215,150); strokeWeight(1);
      rectMode(CENTER); rect(15,0,9,7,2);
      fill(0,195,255,130+sin(this.pulseTime+k)*55); noStroke(); ellipse(20,0,4.5,4.5);
      pop();
    }

    // 标签
    noStroke(); fill(0,215,255,195*p);
    textFont('monospace'); textSize(7); textAlign(CENTER,CENTER);
    text('[ HOME BASE ]', 0, -42);
    const hpRatio = baseHp/baseHpMax;
    fill(lerpColor(color(255,30,30),color(0,215,140),hpRatio), 200);
    textSize(6.5); text('HP  '+baseHp+'/'+baseHpMax, 0, -52);
    pop();
  }
}