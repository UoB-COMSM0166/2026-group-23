// ============================================================
//  towers/variants/scatter.js — SCATTER Scatter AA Gun (with Mortar skill)
//  Injected via Tower.prototype; must load after towers/base.js
// ============================================================

Tower.prototype._updateScatter = function() {
  this.mortarPulse += 0.06;
  // Cannon charging timer (30s = 1800 frames; upgrades shorten: Lv2=1500, Lv3=1200)
  const mortarCDs = [1800, 1500, 1200];
  if (!this.mortarReady) {
    this.mortarTimer++;
    if (this.mortarTimer >= mortarCDs[this.level - 1]) {
      this.mortarReady = true;
      spawnParticles(this.px, this.py, color(255, 200, 50), 16);
    }
  }

  // Normal fan-shaped fire
  const target = this.findTarget(true);
  if (!target) return;
  this.angle = Math.atan2(target.pos.y - this.py, target.pos.x - this.px);
  if (this.timer < this.fireRate) return;
  this.timer = 0; this.shootFlash = 10;
  const bulletCounts = [3, 5, 7];
  const count = bulletCounts[this.level - 1];
  const spread = 0.28;
  for (let i = 0; i < count; i++) {
    const a = this.angle + lerp(-spread, spread, count > 1 ? i / (count - 1) : 0.5);
    projectiles.push(new Projectile(this.px, this.py, a, this.projSpd, this.dmg, this.col, true, 'scatter', this.level));
  }
};

Tower.prototype.fireMortar = function(tx, ty) {
  if (!this.mortarReady) return;
  this.mortarReady = false;
  this.mortarTimer = 0;
  // Damage and explosion radius per level (high damage)
  const dmgs    = [600, 950, 1400];
  const radii   = [90,  115, 145];
  const dmg     = dmgs[this.level - 1];
  const radius  = radii[this.level - 1];
  _mortarShells.push({
    tx, ty,
    flyFrames: 120,   // 2-second flight; descent is slow and ominous
    timer: 0,
    dmg, radius,
    exploded: false,
    blastLife: 0,
  });
};

Tower.prototype._drawScatter = function(r, g, b) {
  const lv=this.level, pulse=sin(this.pulseTime*4)*0.5+0.5;
  const mortarCDs=[1800,1500,1200];

  // Cannon-ready indicator
  if (this.mortarReady) {
    const mp = sin(this.mortarPulse*4)*0.5+0.5;
    noFill(); stroke(255,220,50,100+mp*120); strokeWeight(3+mp*2);
    ellipse(0,0,52+mp*6,52+mp*6);
    stroke(255,200,30,60+mp*80); strokeWeight(1);
    ellipse(0,0,62+mp*4,62+mp*4);
    fill(255,220,50,200+mp*50); noStroke(); textSize(8); textAlign(CENTER);
    text('★ READY', 0, -34);
  } else {
    // Charge progress arc
    const charge = this.mortarTimer / mortarCDs[lv-1];
    noFill(); stroke(255,200,50,30+charge*60); strokeWeight(1.5);
    arc(0,0,48,48,-HALF_PI,-HALF_PI+TWO_PI*charge);
  }

  push(); rotate(this.angle);
  const bulletCounts=[3,5,7]; const cnt=bulletCounts[lv-1];
  const spread=0.28;
  for(let i=0;i<cnt;i++){
    const a=lerp(-spread,spread,cnt>1?i/(cnt-1):0.5);
    push(); rotate(a);
    fill(28,8,12); stroke(r,g,b,150+pulse*60); strokeWeight(1);
    rectMode(CENTER); rect(10,0,14+lv,4,1);
    if(this.shootFlash>0){noStroke();fill(r,g,b,230);ellipse(17+lv,0,4,4);}
    pop();
  }
  fill(22,8,14); stroke(r,g,b,180+(this.mortarReady?60:0)); strokeWeight(1.3);
  rectMode(CENTER); ellipse(0,0,12+lv*2,12+lv*2);
  noFill(); stroke(r,g,b,120+pulse*80); strokeWeight(1);
  ellipse(0,0,8+lv,8+lv);
  line(-5,0,5,0); line(0,-5,0,5);
  fill(this.mortarReady?color(255,220,50,230):color(r,g,b,200+pulse*50)); noStroke(); ellipse(0,0,3,3);
  pop();
};

