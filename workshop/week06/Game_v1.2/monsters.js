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
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd);
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
    this.move(); this.draw(); this.drawHealthBar();
  }
}

// ── 机械蛇 ──
class MechSnake extends Monster {
  constructor(path) {
    super(path, 120, 0.85, 20);
    this.radius = 9; this.deathColor = color(160, 30, 5);
    this.waveTime = 0; this.breathe = 0;
    this.history = Array(120).fill(null).map(() => ({ x: path[0].x, y: path[0].y }));
    this.healTimer = 0; this.healEffect = 0;
  }
  move() {
    this.waveTime += 0.13; this.breathe += 0.08; this.healTimer++;
    if (this.healTimer >= 900) {
      this.healTimer = 0; this.healEffect = 50;
      if (typeof manager !== 'undefined') {
        for (const m of manager.monsters) {
          if (m.alive && !(m instanceof BossFission) && !(m instanceof BossPhantom) && !(m instanceof BossAntMech))
            m.hp = min(m.maxHp, m.hp + floor(m.maxHp * 0.05));
        }
      }
    }
    if (this.healEffect > 0) this.healEffect--;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd);
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
      const t = this.healEffect / 50;
      noFill(); stroke(30,220,80,t*180); strokeWeight(2);
      ellipse(this.history[0].x, this.history[0].y, (1-t)*120+10, (1-t)*120+10);
      fill(80,255,120,t*200); noStroke(); textSize(10); textAlign(CENTER);
      text('+HEAL ALL', this.history[0].x, this.history[0].y - 28);
    }
  }
}

// ── 机械天蛛 ──
class MechSpider extends Monster {
  constructor(path) {
    super(path, 90, 1.25, 25);
    this.radius = 16; this.deathColor = color(110, 55, 8);
    this.legTime = 0; this.stopTimer = 0; this.stopped = false; this.pulse = 0;
    this.dashTimer = 0; this.dashing = false; this.dashFrames = 0;
    this.dashEffect = 0; this.baseSpd = 1.25;
  }
  move() {
    this.legTime += 0.16; this.stopTimer++; this.pulse += 0.07; this.dashTimer++;
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
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  draw() {
    push(); translate(this.pos.x, this.pos.y);
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
    super(path, 200, 1.0, 25);
    this.radius = 18; this.deathColor = color(60,160,255);
    this.walkTime = 0; this.corePulse = 0;
    this.shielded = false; this.shieldHp = 0; this.shieldPulse = 0; this.shieldTriggered = false;
    this.shootTimer = 0; this.shootCooldown = 100; this.muzzleFlash = 0; this.bullets = [];
    this.aimDx = 1; this.aimDy = 0; this.aimAngle = 0;
  }
  takeDamage(dmg, fromSide) {
    this.hitFlash = 7;
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
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd);
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
    super(path, 70, 1.85, 30);
    this.radius = 16; this.deathColor = color(200, 50, 5);
    this.baseSpd = 1.85; this.wingTime = 0; this.diveTimer = 0;
    this.diving = false; this.floatY = 0; this.trail = []; this.boneAngle = 0;
    this.jamTimer = 0; this.jamming = false; this.jamEffect = 0; this.jamRadius = 120;
  }
  move() {
    this.wingTime += 0.22; this.diveTimer++;
    this.floatY = cos(this.wingTime * 0.38) * 8; this.boneAngle += 0.03;
    this.diving = this.diveTimer % 180 < 42;
    this.spd = this.diving ? this.baseSpd * (3.2/1.85) : this.baseSpd;
    this.jamTimer++;
    if (this.jamTimer >= 360) {
      this.jamTimer = 0; this.jamEffect = 60;
      jammedUntilFrame = frameCount + 90;
      jamPos = { x: this.pos.x, y: this.pos.y };
    }
    if (this.jamEffect > 0) this.jamEffect--;
    this.trail.push({ x:this.pos.x, y:this.pos.y+this.floatY, vx:(random()-0.5)*1.2, vy:(random()-0.5)*1.2+0.5, life:1.0, size:random(5,14) });
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd);
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
class BossFission extends Monster {
  constructor(path) {
    super(path, 2000, 0.4, 150);
    this.radius = 28; this.deathColor = color(255,120,20);
    this.armAngle = 0; this.crackLevel = 0; this.overloading = false;
    this.overloadTimer = 0; this.splitDone = false; this.pulseFire = 0;
    this.shootTimer = 0; this.lavaBalls = []; this.lavaGrounds = [];
  }
  takeDamage(dmg) {
    this.hitFlash = 5;
    const effective = this.overloading ? dmg*1.5 : dmg;
    this.hp -= effective; this.crackLevel = min(20, this.crackLevel+1);
    if (this.crackLevel >= 20 && !this.overloading) {
      this.overloading = true; this.overloadTimer = 300; this.crackLevel = 0;
      spawnParticles(this.pos.x, this.pos.y, color(255,140,20), 20);
    }
    if (!this.splitDone && this.hp <= this.maxHp*0.5 && this.hp > 0) {
      this.splitDone = true;
      if (typeof manager !== 'undefined') {
        for (let i = 0; i < 4; i++) {
          const s = new MechSnake(this.path.slice(this.seg));
          s.hp = 180; s.maxHp = 180; s.spd = 1.4;
          manager.monsters.push(s);
        }
      }
    }
    if (this.hp <= 0) { this.alive = false; spawnParticles(this.pos.x,this.pos.y,this.deathColor,40); }
  }
  move() {
    this.armAngle += 0.02; this.pulseFire += 0.05;
    if (this.overloading) {
      this.overloadTimer--; this.spd = 0.8;
      if (this.overloadTimer <= 0) { this.overloading = false; this.spd = 0.4; }
    }
    this.shootTimer++;
    if (this.shootTimer >= 160) {
      this.shootTimer = 0;
      let dx = 0, dy = 0;
      if (this.seg < this.path.length - 1) {
        dx = this.path[this.seg+1].x - this.pos.x;
        dy = this.path[this.seg+1].y - this.pos.y;
        const l = Math.hypot(dx,dy)||1; dx/=l; dy/=l;
      }
      for (let i = -3; i <= 3; i++) {
        const a = Math.atan2(dy,dx) + i*0.22;
        this.lavaBalls.push({ x:this.pos.x, y:this.pos.y, vx:cos(a)*4, vy:sin(a)*4, life:1.0, r:7 });
      }
    }
    this.lavaBalls = this.lavaBalls.filter(b => b.life > 0);
    for (const b of this.lavaBalls) {
      b.x += b.vx; b.y += b.vy; b.life -= 0.022;
      if (b.life < 0.5) { this.lavaGrounds.push({ x:b.x, y:b.y, life:1.0, r:18 }); b.life = 0; }
    }
    this.lavaGrounds = this.lavaGrounds.filter(g => g.life > 0);
    for (const g of this.lavaGrounds) g.life -= 0.006;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  draw() {
    for (const g of this.lavaGrounds) {
      noStroke(); fill(255,80,0,g.life*120); ellipse(g.x,g.y,g.r*2,g.r*2);
    }
    for (const b of this.lavaBalls) {
      push(); translate(b.x,b.y); noStroke(); fill(255,100,10,b.life*220); ellipse(0,0,b.r*2,b.r*2); pop();
    }
    push(); translate(this.pos.x, this.pos.y);
    if (this.overloading) {
      const p = sin(frameCount*0.3)*0.5+0.5;
      noFill(); stroke(255,200,50,150*p); strokeWeight(6); ellipse(0,0,80+p*12,80+p*12);
    }
    for (let i = 0; i < 8; i++) {
      const a = this.armAngle + i*PI/4;
      const len = 36 + sin(this.pulseFire+i)*4;
      stroke(100,50,15,180); strokeWeight(4); line(0,0,cos(a)*len,sin(a)*len);
    }
    fill(40,18,5); stroke(180,80,20); strokeWeight(2); ellipse(0,0,54,54);
    const crack = this.crackLevel/20;
    fill(255,lerp(80,220,crack),20,200+crack*55); noStroke(); ellipse(0,0,22,22);
    if (this.overloading) { fill(255,220,50,220); noStroke(); textSize(10); textAlign(CENTER); text('OVERLOAD!',0,-38); }
    pop();
    this.drawHealthBar();
  }
  drawHealthBar() {
    if (this.hitFlash > 0) this.hitFlash--;
    const bw=60,bh=5,bx=this.pos.x-bw/2,by=this.pos.y-this.radius-20;
    stroke(200,80,10,150); strokeWeight(1); fill(8,4,2,210); rect(bx-1,by-1,bw+2,bh+2);
    noStroke(); const ratio=this.hp/this.maxHp;
    fill(this.hitFlash>0?color(255,255,255):lerpColor(color(200,20,5),color(255,160,20),ratio));
    rect(bx,by,bw*ratio,bh);
    fill(255,120,20,200); noStroke(); textSize(8); textAlign(CENTER);
    text('BOSS  FISSION CORE', this.pos.x, by-4); textAlign(LEFT,BASELINE);
  }
}

// ── Boss 幽灵协议 ──
class BossPhantom extends Monster {
  constructor(path) {
    super(path, 600, 0.9, 250);
    this.radius = 18; this.deathColor = color(180,220,255);
    this.walkTime = 0; this.corePulse = 0;
    this.hitCount = 0; this.invincible = 0; this.ghost = 0;
    this.ghostPos = { x:this.pos.x, y:this.pos.y };
    this.empTimer = 0; this.empEffect = 0;
    this.clonesDone = false; this.isClone = false; this.clonePulse = 0;
    this.trail = []; this.bullets = []; this.shootTimer = 0;
  }
  takeDamage(dmg) {
    if (this.invincible > 0) return;
    this.hitFlash = 5; this.hitCount++;
    if (this.hitCount >= 3) {
      this.hitCount = 0; this.ghostPos = { x:this.pos.x, y:this.pos.y };
      this.ghost = 40; this.invincible = 30;
      const r = moveAlongPath(this.pos, this.seg, this.path, 60);
      this.pos = r.pos; this.seg = r.seg;
      this.progress = calcProgress(this.pos, this.seg, this.path);
    } else { this.hp -= dmg; }
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
    this.empTimer++;
    if (!this.isClone && this.empTimer >= 1800) {
      this.empTimer = 0; this.empEffect = 60;
      jammedUntilFrame = frameCount + 480;
    }
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
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd);
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
    super(path, 3500, 0.75, 500);
    this.radius = 18; this.deathColor = color(80,255,120);
    this.walkTime = 0; this.corePulse = 0;
    this.phaseState = 'normal'; this.phaseTimer = 0;
    this.normalDur=480; this.giantDur=360; this.tinyDur=300;
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
    if (this.phaseState==='tiny')  dmg=floor(dmg*2.2);
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
      if (prev==='tiny'&&this.phaseState==='normal') { this.shockwave=60; this.shockwaveR=0; jammedUntilFrame=frameCount+90; }
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
    const r=moveAlongPath(this.pos,this.seg,this.path,this.spd);
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
      noFill(); stroke(80,255,120,60); strokeWeight(12); ellipse(0,0,55,70);
    }
    fill(16,34,22); stroke(55,190,80,205); strokeWeight(1.6);
    beginShape(); vertex(-11,-24); vertex(-8,-34); vertex(8,-34); vertex(11,-24); vertex(13,-10); vertex(11,0); vertex(-11,0); vertex(-13,-10); endShape(CLOSE);
    fill(16,35,22); stroke(60,200,85,220); strokeWeight(1.8); ellipse(0,-48,26,28);
    fill(0,200+sin(this.corePulse)*40,50,230); noStroke(); rect(-7,-49,14,3,1);
    stroke(55,200,80,180); strokeWeight(1.5); line(-5,-60,-9,-72); line(5,-60,9,-72);
    fill(80,255,100,220); noStroke(); ellipse(-9,-73,5,5); ellipse(9,-73,5,5);
    pop();
    textFont('monospace'); noStroke();
    const labelY=this.pos.y-max(this.radius,20)-22;
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
    if (type==='snake')   return new MechSnake(MAIN_PATH_PX);
    if (type==='spider')  return new MechSpider(EDGE_PATH_PX);
    if (type==='robot')   return new MechRobot(MAIN_PATH_PX);
    if (type==='phoenix') return new MechPhoenix(AIR_PATH_PX);
    if (type==='boss1')   return new BossFission(MAIN_PATH_PX);
    if (type==='boss2')   return new BossPhantom(MAIN_PATH_PX);
    if (type==='boss3')   return new BossAntMech(MAIN_PATH_PX);
    return null;
  }
  damageAt(tx,ty,dmg,antiAir,fromSide) {
    antiAir=antiAir||false; fromSide=fromSide||false;
    for (const m of this.monsters) {
      if (!m.alive||m.reached) continue;
      if (antiAir&&!(m instanceof MechPhoenix)) continue;
      if (!antiAir&&(m instanceof MechPhoenix)) continue;
      if (distAB(m.pos,{x:tx,y:ty})<=m.radius+5) {
        if (m instanceof MechRobot) m.takeDamage(dmg,fromSide); else m.takeDamage(dmg);
      }
    }
  }
  damageInRadius(cx,cy,radius,dmg,antiAir) {
    antiAir=antiAir||false;
    for (const m of this.monsters) {
      if (!m.alive||m.reached) continue;
      if (antiAir&&!(m instanceof MechPhoenix)) continue;
      if (!antiAir&&(m instanceof MechPhoenix)) continue;
      if (distAB(m.pos,{x:cx,y:cy})<=radius) {
        if (m instanceof MechRobot) m.takeDamage(dmg,false); else m.takeDamage(dmg);
      }
    }
  }
  getMonstersInRange(cx,cy,range,antiAir) {
    antiAir=antiAir||false;
    return this.monsters.filter(m=>{
      if (!m.alive||m.reached) return false;
      if (antiAir&&!(m instanceof MechPhoenix)) return false;
      if (!antiAir&&(m instanceof MechPhoenix)) return false;
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
      if (m.reached&&this.onReach) { this.onReach(m); m.reached=false; }
      if (!m.alive&&this.onKilled) this.onKilled(m);
    }
    this.monsters=this.monsters.filter(m=>m.alive&&!m.reached);
  }
}
