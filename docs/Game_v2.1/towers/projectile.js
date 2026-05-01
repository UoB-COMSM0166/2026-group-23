// ============================================================
//  towers/projectile.js — Projectile bullet class (supports nova piercing / chain jump / ghost homing / scatter AA)
// ============================================================

// ============================================================
//  Projectile - supports nova piercing, chain jump, ghost homing, scatter AA
// ============================================================
class Projectile {
  constructor(x, y, angle, spd, dmg, col, antiAir, towerType, level, chainTarget, ignoreRobotShield) {
    this.x = x; this.y = y;
    this.vx = cos(angle)*spd; this.vy = sin(angle)*spd;
    this.dmg = dmg; this.col = col; this.antiAir = antiAir;
    this.towerType = towerType; this.level = level;
    this.alive = true; this.life = 1.0;
    // Chain locks the target directly
    this.chainTarget = chainTarget || null;
    // Ghost homing
    this.target = null;
    this.turnSpd = 0.08;
    // Nova spread: grows larger as it travels
    this.novaRadius = 4;
    // Rapid-tower exclusive: ignores robot shield
    this.ignoreRobotShield = ignoreRobotShield || false;
    // Rapid-tower exclusive
    this.isOverdrive = false;
    this.srcX = x; this.srcY = y; // Record source coordinates for charge backtrack
    this.isCannonShell = false;
    this.targetX = 0; this.targetY = 0;
    this.blastRadius = 0;
  }

  update() {
    // Ghost homing logic (ground missile)
    if (this.towerType === 'ghost' && !this.isAirMissile && manager) {
      if (!this.target || !this.target.alive || this.target.reached) {
        const inRange = manager.getMonstersInRange(this.x, this.y, 300, false)
                                .filter(m => !m.isFlying);
        this.target = inRange.length > 0
          ? inRange.reduce((best, m) => distAB({x:this.x,y:this.y}, m.pos) < distAB({x:this.x,y:this.y}, best.pos) ? m : best, inRange[0])
          : null;
      }
      if (this.target) {
        const desiredA = Math.atan2(this.target.pos.y - this.y, this.target.pos.x - this.x);
        let curA = Math.atan2(this.vy, this.vx);
        let diff = desiredA - curA;
        while (diff > PI)  diff -= TWO_PI;
        while (diff < -PI) diff += TWO_PI;
        curA += constrain(diff, -this.turnSpd, this.turnSpd);
        const spd = Math.hypot(this.vx, this.vy);
        this.vx = cos(curA) * spd; this.vy = sin(curA) * spd;
      }
    }
    // AA homing missile logic (ghost tower's 9th shot)
    if (this.towerType === 'ghost' && this.isAirMissile && manager) {
      if (!this.target || !this.target.alive || this.target.reached) {
        // Re-acquire the nearest aerial target
        const airTargets = manager.monsters.filter(m =>
          m.alive && !m.reached &&
          (m instanceof MechPhoenix || m instanceof GhostBird ||
           (m instanceof BossCarrier && !m.grounded)) &&
          !(m instanceof GhostBird && m.isGhost)
        );
        this.target = airTargets.length > 0
          ? airTargets.reduce((best, m) => distAB({x:this.x,y:this.y}, m.pos) < distAB({x:this.x,y:this.y}, best.pos) ? m : best, airTargets[0])
          : null;
      }
      if (this.target) {
        const desiredA = Math.atan2(this.target.pos.y - this.y, this.target.pos.x - this.x);
        let curA = Math.atan2(this.vy, this.vx);
        let diff = desiredA - curA;
        while (diff > PI)  diff -= TWO_PI;
        while (diff < -PI) diff += TWO_PI;
        curA += constrain(diff, -this.turnSpd * 4.0, this.turnSpd * 4.0); // AA missile uses high turn rate
        const spd = Math.hypot(this.vx, this.vy);
        this.vx = cos(curA) * spd; this.vy = sin(curA) * spd;
      }
    }

    // Nova: bullets grow as they travel
    if (this.towerType === 'nova') {
      this.novaRadius = 4 + (1.0 - this.life) * 55;
    }

    this.x += this.vx; this.y += this.vy;
    if (this.towerType !== 'cannon' && this.towerType !== 'ghost') {
      this.life -= 0.012;
      if (this.life <= 0) { this.alive = false; return; }
    } else {
      // ghost / cannon bullets only die on hitting the target; do not auto-decay
      // But clear when leaving the map bounds
      if (this.x < -200 || this.x > width + 200 || this.y < -200 || this.y > height + 200) {
        this.alive = false; return;
      }
      this.life = max(this.life - 0.003, 0.1); // Used for visual fade-out, not zeroed
    }

    const isNova    = this.towerType === 'nova';
    const isGhost   = this.towerType === 'ghost';
    const isScatter = this.towerType === 'scatter';

    if (isNova) {
      // Spread light ring: hit detection uses the current radius (bigger = easier to hit)
      if (!this.hitSet) this.hitSet = new Set();
      if (manager) {
        for (const m of manager.monsters) {
          if (!m.alive || m.reached || m.isFlying || this.hitSet.has(m)) continue;
          if (Math.hypot(m.pos.x - this.x, m.pos.y - this.y) <= this.novaRadius + m.radius) {
            this.hitSet.add(m);
            m.takeDamage(this.dmg);
            spawnParticles(m.pos.x, m.pos.y, color(...this.col), 6);
          }
        }
      }
      return; // Nova bullets die naturally when life hits zero
    }

    // Cannon shell: flies to the target point, then explodes in an area on arrival (hits both air and ground)
    if (this.towerType === 'cannon') {
      const dx = this.targetX - this.x, dy = this.targetY - this.y;
      const dist2 = Math.hypot(dx, dy);
      if (dist2 <= Math.hypot(this.vx, this.vy) * 1.5) {
        // Reached the target point; AoE explosion (hits ground + air)
        if (manager) {
          for (const m of manager.monsters) {
            if (!m.alive || m.reached) continue;
            if (m instanceof GhostBird && m.isGhost) continue;
            if (Math.hypot(m.pos.x - this.targetX, m.pos.y - this.targetY) <= this.blastRadius) {
              m.takeDamage(this.dmg);
              spawnParticles(m.pos.x, m.pos.y, color(...this.col), 4);   // Patch 3: 8 -> 4
            }
          }
        }
        // Explosion particles
        spawnParticles(this.targetX, this.targetY, color(...this.col), 15);   // Patch 3: 30 -> 15
        _cannonBlasts.push({ x: this.targetX, y: this.targetY, r: this.blastRadius, life: 30 });
        playSfx('explode');
        this.alive = false;
      }
      return;
    }

    const hitR = isGhost ? 14 : isScatter ? 16 : 10;
    let hits = manager ? manager.getMonstersInRange(this.x, this.y, hitR, this.antiAir) : [];
    if (this.antiAir) hits = hits.filter(m => m.isFlying || (m instanceof BossCarrier && !m.grounded));
    else              hits = hits.filter(m => !m.isFlying);
    // AA missile uses its own range check, does not rely on hits
    if (hits.length === 0 && !this.isAirMissile) return;

    if (isGhost && this.isAirMissile) {
      // AA homing missile: explodes + slows when close to an aerial target
      const airHits = manager.monsters.filter(m =>
        m.alive && !m.reached &&
        (m instanceof MechPhoenix || m instanceof GhostBird ||
         (m instanceof BossCarrier && !m.grounded)) &&
        !(m instanceof GhostBird && m.isGhost) &&
        Math.hypot(m.pos.x - this.x, m.pos.y - this.y) <= 18
      );
      if (airHits.length === 0) return; // Not yet near the target
      for (const m of airHits) {
        // Slow all aerial targets by directly modifying baseSpd; recover after 3 seconds
        if (!m._airSlowApplied) {
          m._origBaseSpd = m.baseSpd || m.spd;
          m.baseSpd = m._origBaseSpd * 0.45;
          if (!m.baseSpd) m.spd = m._origBaseSpd * 0.45; // BossCarrier uses spd
          m._airSlowApplied = true;
          m._airSlowExpire = frameCount + 180;
        }
        m.takeDamage(this.dmg);
        spawnParticles(m.pos.x, m.pos.y, color(100, 200, 255), 10);
      }
      spawnParticles(this.x, this.y, color(100, 200, 255), 12);
      this.alive = false;
    } else if (isGhost) {
      manager.damageInRadius(this.x, this.y, 30 + this.level * 8, this.dmg, false);
      spawnParticles(this.x, this.y, color(...this.col), 10);
      this.alive = false;
    } else if (isScatter) {
      // Scatter shells deal 3x damage to BossCarrier (anti-air boss exclusive bonus)
      const scatterTargets = hits.filter(m => m.isFlying || (m instanceof BossCarrier && !m.grounded));
      for (const m of scatterTargets) {
        const bonusMult = (m instanceof BossCarrier) ? 3.0 : 1.0;
        m.takeDamage(floor(this.dmg * bonusMult));
        spawnParticles(m.pos.x, m.pos.y, color(...this.col), 6);
      }
      this.alive = false;
    } else {
      // rapid and other normal single-target
      manager.damageAt(this.x, this.y, this.dmg, false, false, false, this.ignoreRobotShield);
      spawnParticles(this.x, this.y, color(...this.col), 4);

      // Rapid-tower exclusive: charge on hit + super-machine-gun arc chain
      if (this.towerType === 'rapid') {
        // Find the target hit
        const hitTarget = manager ? manager.monsters.find(m =>
          m.alive && !m.reached && !m.isFlying &&
          Math.hypot(m.pos.x - this.x, m.pos.y - this.y) <= m.radius + 5
        ) : null;

        // Charge (+1 per hit; notify the tower at 20)
        if (towers) {
          const srcTower = towers.find(t =>
            t.type === 'rapid' &&
            Math.hypot(t.px - this.srcX, t.py - this.srcY) < 5
          );
          if (srcTower && !srcTower.rapidOverdrive && !srcTower.rapidReady) {
            srcTower.rapidCharges++;
            if (srcTower.rapidCharges >= 20) {
              srcTower.rapidCharges = 20;
              srcTower.rapidReady   = true;
              spawnParticles(srcTower.px, srcTower.py, color(255,220,0), 16);
            }
          }
        }

        // Super-machine-gun mode: each shot arcs to the 2 nearest mobs, ignoring all shields
        if (this.isOverdrive && hitTarget && manager) {
          let lastPos = { x: hitTarget.pos.x, y: hitTarget.pos.y };
          const hit = new Set([hitTarget]);
          for (let j = 0; j < 2; j++) {
            const nearby = manager.monsters.filter(m =>
              m.alive && !m.reached && !m.isFlying && !hit.has(m) &&
              Math.hypot(m.pos.x - lastPos.x, m.pos.y - lastPos.y) <= 120
            );
            if (nearby.length === 0) break;
            const next = nearby.reduce((a, b) =>
              Math.hypot(b.pos.x-lastPos.x,b.pos.y-lastPos.y) <
              Math.hypot(a.pos.x-lastPos.x,a.pos.y-lastPos.y) ? b : a
            );
            // Arc damage ignores all shields (deduct HP directly)
            next.hp -= floor(this.dmg * 0.6);
            if (next.hp <= 0) { next.alive = false; spawnParticles(next.pos.x,next.pos.y,next.deathColor,20); }
            spawnParticles(next.pos.x, next.pos.y, color(255,220,80), 5);
            _chainArcs.push({ x1: lastPos.x, y1: lastPos.y, x2: next.pos.x, y2: next.pos.y, life: 12, col: [255,220,80] });
            lastPos = { x: next.pos.x, y: next.pos.y };
            hit.add(next);
          }
        }
      }
      this.alive = false;
    }
  }

  draw() {
    const [r, g, b] = this.col;
    push(); translate(this.x, this.y); rotate(Math.atan2(this.vy, this.vx));
    const sz = 4 + this.level * 1.5;
    noStroke(); fill(r, g, b, this.life * 240);

    if (this.towerType === 'nova') {
      // Spread light ring: center circle + outward expanding halo (grows as it travels)
      pop(); // Exit the rotate push first; draw the ring in world coordinates
      push(); translate(this.x, this.y);
      const nr = this.novaRadius;
      const alpha = this.life * 200;
      // Outer halo
      noFill(); stroke(r, g, b, alpha * 0.7); strokeWeight(2.5 + this.level);
      ellipse(0, 0, nr * 2, nr * 2);
      // Inner glow core
      noStroke(); fill(r, g, b, alpha * 0.9);
      ellipse(0, 0, min(nr * 0.6, 14), min(nr * 0.6, 14));
      // Center highlight
      fill(255, 230, 180, alpha);
      ellipse(0, 0, 5, 5);
      pop();
      return; // Skip the trailing pop
    } else if (this.towerType === 'cannon') {
      // Cannon shell: large round ball + flame trail
      pop(); push(); translate(this.x, this.y); rotate(Math.atan2(this.vy, this.vx));
      const cs = 7 + this.level * 2;
      // Trail flame
      noStroke(); fill(r, g, b, this.life * 80);
      ellipse(-cs * 2, 0, cs * 3, cs * 1.5);
      fill(255, 160, 60, this.life * 140);
      ellipse(-cs * 1.2, 0, cs * 2, cs);
      // Shell body
      fill(r, g, b, this.life * 240);
      ellipse(0, 0, cs * 2, cs * 1.6);
      fill(255, 200, 120, this.life * 200);
      ellipse(0, 0, cs * 0.8, cs * 0.8);
      fill(255, 255, 255, this.life * 180);
      ellipse(0, 0, 3, 3);
      pop();
      return;
    } else if (this.towerType === 'ghost' && this.isAirMissile) {
      // AA homing missile: blue-white, slim conical body + ice-blue trail
      fill(100, 220, 255, this.life*230);
      beginShape(); vertex(sz*1.4,0); vertex(-sz*0.3,sz*0.45); vertex(-sz*0.3,-sz*0.45); endShape(CLOSE);
      fill(220, 245, 255, this.life*180); ellipse(0,0,sz*0.6,sz*0.6);
      stroke(100,200,255,this.life*100); strokeWeight(sz*0.8); line(-sz*2,0,0,0); noStroke();
      // Slowing ice-crystal speckles
      fill(180,240,255,this.life*120); noStroke();
      ellipse(-sz*0.8, sz*0.3, sz*0.35, sz*0.35);
      ellipse(-sz*0.8, -sz*0.3, sz*0.35, sz*0.35);
    } else if (this.towerType === 'ghost') {
      // Homing missile (ground): purple + glowing trail
      fill(r,g,b,this.life*230);
      beginShape(); vertex(sz*1.2,0); vertex(-sz*0.4,sz*0.5); vertex(-sz*0.4,-sz*0.5); endShape(CLOSE);
      fill(255,200,255,this.life*160); ellipse(0,0,sz*0.7,sz*0.7);
      stroke(r,g,b,this.life*80); strokeWeight(sz*0.6); line(-sz*1.5,0,0,0); noStroke();
    } else if (this.towerType === 'scatter') {
      // Scatter shell: slim red
      fill(r,g,b,this.life*230);
      rectMode(CENTER); rect(0,0,sz*2.2,sz*0.4,1);
      fill(255,180,200,this.life*180); ellipse(sz*1.0,0,sz*0.55,sz*0.55);
    } else {
      // Default (rapid etc.)
      rectMode(CENTER); rect(0,0,sz*2,sz*0.45,2);
    }
    pop();
  }
}
