// ============================================================
//  monsters/mobs/tank.js — MechTank heavy tank
//  Dependencies: monsters/core.js (Monster)
// ============================================================

class MechTank extends Monster {
  constructor(path) {
    super(path, 1600, 0.55, 45);
    this.radius = 22; this.deathColor = color(180, 140, 40);
    this.walkTime = 0; this.corePulse = 0;
    this.shieldTimer = 180;    // Activate the first shield 3 seconds after spawn (instead of waiting from 0)
    this.shieldActive = false;
    this.shieldDur = 240;      // Shield lasts 4 seconds (was 3 seconds)
    this.shieldCooldown = 540; // 9-second cooldown (was 15 seconds)
    this.shieldFrames = 0;
    this.shieldRadius = 130;
    this.shieldPulse = 0;
    this.turretAngle = 0;
  }
  takeDamage(dmg) {
    // While the shield is active, the tank itself is also protected by immunity
    if (this.shieldActive) return;
    this.hp -= dmg; this.hitFlash = 6;
    if (this.hp <= 0) { this.alive = false; spawnParticles(this.pos.x, this.pos.y, this.deathColor, 30); }
  }
  move() {
    this.walkTime += 0.12; this.corePulse += 0.06; this.shieldPulse += 0.08;
    this.turretAngle += 0.02;

    // Shield state machine
    if (this.shieldActive) {
      this.shieldFrames--;
      // Each frame, mark all in-range ground mobs (including bosses)
      if (typeof manager !== 'undefined') {
        for (const m of manager.monsters) {
          if (!m.alive || m === this || m.isFlying) continue;
          if (distAB(this.pos, m.pos) <= this.shieldRadius) {
            m._tankShielded = this.shieldFrames + 1; // Immune as long as the count is > 0
          }
        }
      }
      if (this.shieldFrames <= 0) {
        this.shieldActive = false;
        this.shieldTimer = 0;
        // Clear shield marks on monsters in range
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

    // Apply magnet slow
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    // AA missile slow
    if (this._airSlowed && this._airSlowed >= frameCount) _spdMult *= this._airSlowFactor || 0.5;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  draw() {
    push(); translate(this.pos.x, this.pos.y);

    // -- Shield aura (state layer, world coords, does not rotate with the body) --
    if (this.shieldActive) {
      const p = sin(this.shieldPulse * 3) * 0.4 + 0.6;
      noFill(); stroke(255, 210, 60, 80 * p); strokeWeight(12);
      ellipse(0, 0, this.shieldRadius * 2, this.shieldRadius * 2);
      stroke(255, 230, 100, 120 * p); strokeWeight(3);
      ellipse(0, 0, this.shieldRadius * 2, this.shieldRadius * 2);
      fill(255, 220, 80, 20 * p); noStroke();
      ellipse(0, 0, this.shieldRadius * 2, this.shieldRadius * 2);
    }

    // -- Body (treads + turret + core) rotates with heading --
    push(); rotate(this.heading);

    // Treads (along the body's long axis, two stripes)
    const ls = sin(this.walkTime) * 3;
    fill(55, 45, 20); stroke(100, 80, 30, 200); strokeWeight(1.2);
    rect(-20, 8 + ls, 40, 10, 2);
    rect(-20, -18 - ls, 40, 10, 2);
    // Tread teeth
    stroke(80, 65, 25, 160); strokeWeight(0.8);
    for (let i = -18; i < 20; i += 6) {
      line(i, 8 + ls, i, 18 + ls);
      line(i, -18 - ls, i, -8 - ls);
    }

    // Main turret base
    fill(60, 50, 20); stroke(120, 100, 40, 200); strokeWeight(1.5);
    ellipse(0, -4, 34, 28);

    // Rotating turret (self-rotation, layered on top of the body rotation)
    push(); rotate(this.turretAngle);
    fill(50, 42, 18); stroke(130, 110, 45, 220); strokeWeight(1.3);
    ellipse(0, 0, 26, 26);
    // Main barrel
    fill(40, 34, 14); stroke(120, 100, 40); strokeWeight(1.5);
    rectMode(CENTER); rect(14, 0, 22, 7, 1);
    // Secondary barrel
    stroke(100, 85, 35); strokeWeight(1);
    rect(10, -8, 14, 4, 1);
    rect(10, 8, 14, 4, 1);
    rectMode(CORNER);
    pop();

    // Core energy
    const cr = 7 + sin(this.corePulse) * 1.5;
    fill(this.shieldActive ? color(255, 220, 60, 220) : color(220, 170, 40, 200));
    noStroke(); ellipse(0, -4, cr, cr);
    fill(255, 255, 200, 180); ellipse(0, -4, cr * 0.4, cr * 0.4);

    pop();   // <- end body rotation

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

