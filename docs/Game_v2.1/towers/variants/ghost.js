// ============================================================
//  towers/variants/ghost.js — GHOST 幽灵导弹塔（追踪导弹）
//  通过 Tower.prototype 注入；须在 towers/base.js 之后加载
// ============================================================

Tower.prototype._updateGhost = function() {
  if (this.timer < this.fireRate) return;
  if (!manager) return;
  const candidates = manager.getMonstersInRange(this.px, this.py, this.range, false)
                            .filter(m => !m.isFlying)
                            .sort((a, b) => b.progress - a.progress);
  if (candidates.length === 0) return;
  this.timer = 0; this.shootFlash = 12;
  this.angle = Math.atan2(candidates[0].pos.y - this.py, candidates[0].pos.x - this.px);
  for (let i = 0; i < this.level; i++) {
    const tgt = candidates[Math.min(i, candidates.length - 1)];
    const a = Math.atan2(tgt.pos.y - this.py, tgt.pos.x - this.px);
    const p = new Projectile(this.px, this.py, a, this.projSpd, this.dmg, this.col, false, 'ghost', this.level);
    p.target = tgt;
    projectiles.push(p);
  }
  // 每发射9发后额外发射一颗对空追踪导弹
  this.ghostShotCount++;
  if (this.ghostShotCount >= 3) {
    this.ghostShotCount = 0;
    // 寻找范围内空中目标（全图范围）
    const airCandidates = manager.monsters.filter(m =>
      m.alive && !m.reached &&
      (m instanceof MechPhoenix || m instanceof GhostBird ||
       (m instanceof BossCarrier && !m.grounded)) &&
      !(m instanceof GhostBird && m.isGhost)
    ).sort((a, b) => b.progress - a.progress);
    if (airCandidates.length > 0) {
      const airTgt = airCandidates[0];
      const a = Math.atan2(airTgt.pos.y - this.py, airTgt.pos.x - this.px);
      // 追踪导弹伤害是普通弹的2倍，速度更快
      const missile = new Projectile(this.px, this.py, a, this.projSpd * 2.2, floor(this.dmg * 0.4), this.col, true, 'ghost', this.level);
      missile.target = airTgt;
      missile.isAirMissile = true;
      projectiles.push(missile);
      spawnParticles(this.px, this.py, color(...this.col), 8);
    }
  }
};

Tower.prototype._drawGhost = function(r, g, b) {
  push(); rotate(this.angle);
  const lv=this.level, pulse=sin(this.pulseTime*5)*0.5+0.5;
  // 导弹发射架
  for(let i=0;i<lv;i++){
    const oy=(i-(lv-1)/2)*7;
    push(); translate(0,oy);
    fill(25,12,38); stroke(r,g,b,160); strokeWeight(1);
    rectMode(CENTER); rect(8,0,14,4,1);
    // 导弹筒
    fill(18,8,28); stroke(r,g,b,130); strokeWeight(0.8);
    rect(12,0,8,3,1);
    if(this.shootFlash>0){noStroke();fill(r,g,b,220);ellipse(16,0,5,5);}
    pop();
  }
  // 核心
  const cr=6+lv*1.5;
  fill(r,g,b,80+pulse*70); noStroke(); ellipse(0,0,cr*2,cr*2);
  fill(220,160,255,200); ellipse(0,0,cr*0.5,cr*0.5);
  // 旋转光环
  push(); rotate(this.pulseTime*2);
  noFill(); stroke(r,g,b,70+pulse*40); strokeWeight(0.9);
  ellipse(0,0,(cr+4)*2,(cr+4)*2);
  pop();
  pop();
};

