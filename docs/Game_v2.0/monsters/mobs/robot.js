// ============================================================
//  monsters/mobs/robot.js — MechRobot 机器人（带护盾）
//  依赖：monsters/core.js (Monster)
// ============================================================

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
