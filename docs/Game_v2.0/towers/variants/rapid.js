// ============================================================
//  towers/variants/rapid.js — RAPID 快速塔（含超级机枪 Overdrive 模式）
//  通过 Tower.prototype 注入；须在 towers/base.js 之后加载
// ============================================================

Tower.prototype._updateGeneric = function() {
  if (this.type !== 'rapid') {
    // 非快速塔走原来逻辑
    const target = this.findTarget();
    if (!target) return;
    this.angle = Math.atan2(target.pos.y - this.py, target.pos.x - this.px);
    if (this.timer < this.fireRate) return;
    this.timer = 0; this.shootFlash = 8;
    const def = TOWER_DEFS[this.type];
    projectiles.push(new Projectile(this.px, this.py, this.angle, this.projSpd, this.dmg, this.col, false, this.type, this.level, null, def.ignoreRobotShield || false));
    return;
  }
  // ── 快速塔专属逻辑 ──
  this.rapidPulse += 0.08;
  if (this.rapidOverdrive) {
    this.rapidFrames--;
    if (this.rapidFrames <= 0) {
      this.rapidOverdrive = false;
      this.rapidCharges   = 0;
    }
  }
  const target = this.findTarget();
  if (!target) return;

  // 提前量瞄准：预测目标下一帧位置，对高速目标（蜘蛛）更准确
  const dist = Math.hypot(target.pos.x - this.px, target.pos.y - this.py);
  const flightTime = dist / this.projSpd; // 子弹飞行帧数估算
  // 用目标速度估算落点偏移（如果目标有速度信息）
  let aimX = target.pos.x, aimY = target.pos.y;
  if (target.seg < target.path.length - 1) {
    const nx = target.path[target.seg + 1].x - target.pos.x;
    const ny = target.path[target.seg + 1].y - target.pos.y;
    const nlen = Math.hypot(nx, ny) || 1;
    const spd = target.spd || 1;
    // 预测提前量 = 飞行时间 × 目标速度 × 方向
    const lead = flightTime * spd * 0.6; // 0.6系数避免过度补偿
    aimX = target.pos.x + (nx / nlen) * lead;
    aimY = target.pos.y + (ny / nlen) * lead;
  }
  this.angle = Math.atan2(aimY - this.py, aimX - this.px);

  const effectiveRate = this.rapidOverdrive ? floor(this.fireRate * 0.5) : this.fireRate;
  if (this.timer < effectiveRate) return;
  this.timer = 0; this.shootFlash = this.rapidOverdrive ? 12 : 8;
  const p = new Projectile(this.px, this.py, this.angle, this.projSpd, this.dmg, this.col, false, 'rapid', this.level, null, true);
  p.isOverdrive = this.rapidOverdrive;
  projectiles.push(p);
};

Tower.prototype.activateOverdrive = function() {
  if (!this.rapidReady) return;
  this.rapidReady     = false;
  this.rapidOverdrive = true;
  this.rapidFrames    = 300; // 5秒
  this.rapidCharges   = 0;
  spawnParticles(this.px, this.py, color(255, 220, 0), 25);
};

Tower.prototype._drawRapid = function(r, g, b) {
  const lv = this.level;

  // 超级机枪光环
  if (this.rapidOverdrive) {
    const ot = this.rapidFrames / 300;
    const op = sin(this.rapidPulse * 6) * 0.4 + 0.6;
    noFill(); stroke(255,220,0, 80*op*ot); strokeWeight(8);
    ellipse(0,0,58,58);
    stroke(255,255,100, 140*op*ot); strokeWeight(2);
    ellipse(0,0,58,58);
  }
  // 充能就绪光环
  if (this.rapidReady && !this.rapidOverdrive) {
    const rp = sin(this.rapidPulse*4)*0.5+0.5;
    noFill(); stroke(255,220,0,80+rp*120); strokeWeight(3+rp*2);
    ellipse(0,0,52+rp*6,52+rp*6);
    fill(255,220,0,180+rp*60); noStroke(); textSize(8); textAlign(CENTER);
    text('★ OVERDRIVE', 0, -30);
  }

  push(); rotate(this.angle);
  const spd = this.pulseTime * (3 + lv) * (this.rapidOverdrive ? 2.5 : 1);
  push(); rotate(-spd*0.4);
  const rc = this.rapidOverdrive ? color(255,255,100) : color(r,g,b);
  stroke(rc,80); fill(16,16,16); strokeWeight(0.7); rectMode(CENTER);
  for (let i=0;i<6;i++){push();rotate(i*PI/3);rect(9+lv,0,4,2.5);pop();}
  pop();
  push(); rotate(spd);
  const cnt=3+lv;
  for (let i=0;i<cnt;i++){
    push(); rotate((TWO_PI/cnt)*i);
    fill(32,32,32); stroke(this.rapidOverdrive?color(255,255,100):color(r,g,b)); strokeWeight(0.8);
    rectMode(CENTER); rect(7+lv*1.5,0,7+lv*2,2.5,1);
    if (this.shootFlash>0){
      fill(this.rapidOverdrive?color(255,255,100):color(255,180,0));
      noStroke(); ellipse(11+lv*2.5,0,this.rapidOverdrive?6:4,this.rapidOverdrive?6:4);
    }
    pop();
  }
  pop();
  fill(this.rapidOverdrive?color(255,255,100):color(r,g,b)); noStroke();
  ellipse(0,0,6+lv,6+lv);
  fill(255,220); ellipse(0,0,2.5,2.5);
  pop();

  // 充能条（快速塔专属）
  const maxCharges = 20;
  const bW=24, bH=3, bx=-bW/2, by=15;
  fill(10,8,2,180); stroke(r,g,b,60); strokeWeight(0.5);
  rectMode(CORNER); rect(bx,by,bW,bH,1);
  noStroke();
  if (this.rapidReady) {
    fill(255,220,0,180+sin(this.rapidPulse*8)*60); rect(bx,by,bW,bH,1);
  } else {
    fill(this.rapidOverdrive?color(255,255,100,200):color(255,180,0,180));
    rect(bx,by,bW*(this.rapidCharges/maxCharges),bH,1);
  }
  rectMode(CENTER);
};

