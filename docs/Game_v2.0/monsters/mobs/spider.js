// ============================================================
//  monsters/mobs/spider.js — MechSpider 机械蜘蛛
//  依赖：monsters/core.js (Monster)
// ============================================================

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
