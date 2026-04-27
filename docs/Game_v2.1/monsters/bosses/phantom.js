// ============================================================
//  monsters/bosses/phantom.js — BossPhantom 幻影 Boss
//  依赖：monsters/core.js (Monster)
// ============================================================

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
    if (this._headingMode === 'h') {
      // 水平行走：腿前后摆（脚位移在 X 轴）
      beginShape(); vertex(-4,2); vertex(-8,4); vertex(-9+ls,20); vertex(-4+ls,22); vertex(-2,5); endShape(CLOSE);
      beginShape(); vertex( 4,2); vertex( 8,4); vertex( 9-ls,20); vertex( 4-ls,22); vertex( 2,5); endShape(CLOSE);
    } else {
      // 垂直行走：腿上下抬（脚位移在 Y 轴）—— 原始动画
      beginShape(); vertex(-4,2); vertex(-8,4); vertex(-9,20+ls); vertex(-4,22+ls); vertex(-2,5); endShape(CLOSE);
      beginShape(); vertex( 4,2); vertex( 8,4); vertex( 9,20-ls); vertex( 4,22-ls); vertex( 2,5); endShape(CLOSE);
    }
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

