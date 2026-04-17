// ============================================================
//  monsters/mobs/ghostbird.js — GhostBird 幽灵鸟
//  依赖：monsters/core.js (Monster)
// ============================================================

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

