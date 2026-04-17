// ============================================================
//  towers/variants/cannon.js — CANNON 轨道巨炮（全图蓄力巨弹）
//  通过 Tower.prototype 注入；须在 towers/base.js 之后加载
// ============================================================

Tower.prototype._updateCannon = function() {
  if (!manager) return;
  // 只在开炮时重新随机目标，蓄力期间锁定目标不变，避免枪头乱甩
  if (!this._cannonTarget || !this._cannonTarget.alive || this._cannonTarget.reached) {
    const allTargets = manager.monsters.filter(m =>
      m.alive && !m.reached && !(m instanceof GhostBird && m.isGhost)
    );
    if (allTargets.length === 0) return;
    this._cannonTarget = allTargets[Math.floor(Math.random() * allTargets.length)];
  }
  const target = this._cannonTarget;
  this.angle = Math.atan2(target.pos.y - this.py, target.pos.x - this.px);
  if (this.timer < this.fireRate) return;
  this.timer = 0; this.shootFlash = 20;
  const def = TOWER_DEFS.cannon;
  const blastR = def.cannonBlastRadius[this.level - 1];
  const shell = new Projectile(this.px, this.py, this.angle, this.projSpd, this.dmg, this.col, false, 'cannon', this.level);
  shell.isCannonShell = true;
  shell.targetX = target.pos.x;
  shell.targetY = target.pos.y;
  shell.blastRadius = blastR;
  shell.life = 1.0;
  projectiles.push(shell);
  // 开炮后重新随机下一个目标
  this._cannonTarget = null;
};

Tower.prototype._drawCannon = function(r, g, b) {
  const lv = this.level;
  const charge = min(this.timer / this.fireRate, 1.0);
  const pulse = sin(this.pulseTime * 3) * 0.5 + 0.5;
  const ready = charge >= 0.97;

  // 旋转光环（比其他塔大20%）
  push(); rotate(this.pulseTime * (0.5 + charge * 3));
  noFill(); strokeWeight(1.2 + lv * 0.42);
  stroke(r, g, b, 55 + charge * 120);
  ellipse(0, 0, (17.28 + lv * 2.88) * 2, (17.28 + lv * 2.88) * 2);
  for (let i = 0; i < 4; i++) {
    const a = (TWO_PI / 4) * i;
    const rr = 17.28 + lv * 2.88;
    fill(r, g, b, 140 + charge * 80); noStroke();
    ellipse(cos(a) * rr, sin(a) * rr, 2.88 + charge * 2.88, 2.88 + charge * 2.88);
  }
  pop();

  // 蓄力满时瞄准线
  if (ready && this._cannonTarget && this._cannonTarget.alive) {
    const tx = this._cannonTarget.pos.x - this.px;
    const ty = this._cannonTarget.pos.y - this.py;
    stroke(r, g, b, 60 + pulse * 40); strokeWeight(0.7); noFill();
    const len = Math.hypot(tx, ty);
    const steps = floor(len / 18);
    for (let s = 0; s < steps; s += 2) {
      line(lerp(0,tx,s/steps), lerp(0,ty,s/steps),
           lerp(0,tx,(s+1)/steps), lerp(0,ty,(s+1)/steps));
    }
    noFill(); stroke(r, g, b, 160 + pulse * 50); strokeWeight(1.2);
    ellipse(tx, ty, 25.92 + pulse * 8.64, 25.92 + pulse * 8.64);
    stroke(r, g, b, 100); strokeWeight(0.7);
    line(tx - 12.96, ty, tx + 12.96, ty); line(tx, ty - 12.96, tx, ty + 12.96);
  }

  push(); rotate(this.angle);
  fill(15, 8, 8); stroke(r, g, b, 200); strokeWeight(1.68);
  rectMode(CENTER);
  rect(2.88, 0, 17.28, 12.96 + lv * 1.44, 2);
  rect(14.4 + lv * 2.88, 0, 20.16 + lv * 2.88, 8.64, 1);
  fill(r, g, b, 50 + charge * 130); noStroke();
  rect(24.48 + lv * 2.88, 0, 5.76, 5.76, 1);
  if (this.shootFlash > 0) {
    noStroke(); fill(255, 180, 80, 230);
    ellipse(27.36 + lv * 2.88, 0, 20.16, 20.16);
    fill(255, 255, 200, 200);
    ellipse(27.36 + lv * 2.88, 0, 8.64, 8.64);
  }
  for (let i = -1; i <= 1; i += 2) {
    fill(20, 10, 10); stroke(r, g, b, 130); strokeWeight(0.9);
    rect(7.2, i * (7.2 + lv * 0.72), 10.08, 4.32, 1);
  }
  pop();

  // 核心
  const cr = 7.2 + lv * 1.44 + charge * 3.6;
  fill(r, floor(g * (1 - charge * 0.8)), floor(b * (1 - charge * 0.8)), 80 + charge * 130);
  noStroke(); ellipse(0, 0, cr * 2, cr * 2);
  fill(ready ? color(255, 100, 60, 240) : color(r, g, b, 180 + pulse * 60));
  ellipse(0, 0, cr * 0.5, cr * 0.5);
  fill(255, 255, 255, 200); ellipse(0, 0, 2.88, 2.88);

  // 蓄力条
  const bW = 25.92 + lv * 4.32, bH = 3.6, bx = -bW / 2, by = 20.16 + lv * 1.44;
  fill(12, 6, 6); stroke(r, g, b, 80); strokeWeight(0.5);
  rectMode(CORNER); rect(bx, by, bW, bH, 1);
  noStroke();
  fill(ready ? color(255, 80, 40) : lerpColor(color(180, 30, 30), color(255, 120, 40), charge));
  rect(bx, by, bW * charge, bH, 1);
  if (ready) { fill(255, 150, 80, 100 + sin(this.pulseTime * 25) * 80); rect(bx, by, bW, bH, 1); }
  rectMode(CENTER);
};

