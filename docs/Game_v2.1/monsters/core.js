// ============================================================
//  monsters/core.js — Path utilities, particle system, Monster base class
//  Dependencies: state.js (particles), p5 globals
// ============================================================

// ============================================================
//  monsters.js — Monster and path system
//  Owner: Zhang Xun
//  Dependencies: globals.js, map.js
// ============================================================

// ============================================================
//  Utility functions
// ============================================================
function moveAlongPath(pos, seg, path, spd) {
  let rem = spd, px = pos.x, py = pos.y, s = seg;
  while (rem > 0 && s < path.length - 1) {
    const tx = path[s+1].x, ty = path[s+1].y;
    const d = Math.hypot(tx - px, ty - py);
    if (d <= rem) { rem -= d; px = tx; py = ty; s++; }
    else { const r = rem/d; px += (tx-px)*r; py += (ty-py)*r; rem = 0; }
  }
  return { pos: { x: px, y: py }, seg: s };
}

function calcProgress(pos, seg, path) {
  let t = 0;
  for (let i = 0; i < seg; i++) t += distAB(path[i], path[i+1]);
  return t + distAB(path[seg], pos);
}

// ============================================================
//  Particle system
// ============================================================
let particles = [];
const MAX_PARTICLES = 400;   // Hard cap: prevents volley bursts from spiking particle counts and dropping frames

function spawnParticles(x, y, col, count) {
  // Patch 1: hard cap + trim this call
  if (particles.length >= MAX_PARTICLES) return;
  count = Math.min(count, MAX_PARTICLES - particles.length);
  // Patch 2: pre-resolve col's r/g/b so updateParticles does not call red/green/blue per particle each frame
  const pr = red(col), pg = green(col), pb = blue(col);
  for (let i = 0; i < count; i++) {
    const a = random(TWO_PI), s = random(1.5, 5);
    particles.push({
      x, y, vx: cos(a)*s, vy: sin(a)*s,
      life: 1.0, r: pr, g: pg, b: pb, size: random(2, 7),
    });
  }
}

function updateParticles() {
  particles = particles.filter(p => p.life > 0);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.88; p.vy *= 0.88;
    p.life -= 0.04;
    noStroke();
    fill(p.r, p.g, p.b, p.life * 220);   // Patch 2: use the pre-resolved r/g/b directly
    push(); translate(p.x, p.y); rotate(p.vx * 0.5);
    rectMode(CENTER); rect(0, 0, p.size*p.life*1.4, p.size*p.life*0.7);
    rectMode(CORNER); pop();
  }
}

// ============================================================
//  Base Monster class
// ============================================================
class Monster {
  constructor(path, hp, spd, reward) {
    this.path = path; this.hp = hp; this.maxHp = hp;
    this.spd = spd; this.reward = reward;
    this.seg = 0; this.pos = { x: path[0].x, y: path[0].y };
    this.alive = true; this.reached = false; this.progress = 0;
    this.radius = 14; this.hitFlash = 0;
    this.deathColor = color(180, 20, 10);
    // Direction-aware animation support: heading is maintained by _updateHeading; draw layer can use rotate(this.heading) directly
    // Initialize from the first path segment to avoid a visual jump from 0 to the target angle on the first frame
    const next = path[1] || path[0];
    this.heading = Math.atan2(next.y - path[0].y, next.x - path[0].x);
    this._lastPosForHeading = { x: this.pos.x, y: this.pos.y };
    // Heading axis mode: 'h' horizontal-dominant (left/right walk), 'v' vertical-dominant (up/down walk).
    // Used by leg/wing animations that cannot be expressed by pure rotation; provides a 'two-set switch' with hysteresis to prevent 45-degree jitter.
    this._headingMode = (Math.abs(Math.cos(this.heading)) >= Math.abs(Math.sin(this.heading))) ? 'h' : 'v';
  }
  // Derive heading from positional delta and lerp angle to smooth (avoid the jump on a 90-degree turn)
  _updateHeading() {
    const dx = this.pos.x - this._lastPosForHeading.x;
    const dy = this.pos.y - this._lastPosForHeading.y;
    if (Math.hypot(dx, dy) > 0.05) {
      const newH = Math.atan2(dy, dx);
      let diff = newH - this.heading;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * 0.18;   // ~5-6 frames to catch up to the target angle
    }
    this._lastPosForHeading = { x: this.pos.x, y: this.pos.y };
    // Main-axis decision (with 1.2x hysteresis): only switch when one axis is clearly dominant; otherwise keep current
    const cosH = Math.abs(Math.cos(this.heading));
    const sinH = Math.abs(Math.sin(this.heading));
    if (cosH > sinH * 1.2)      this._headingMode = 'h';
    else if (sinH > cosH * 1.2) this._headingMode = 'v';
    // else: keep the previous mode
  }
  takeDamage(dmg) {
    this.hp -= dmg; this.hitFlash = 6;
    if (this.hp <= 0) {
      this.alive = false;
      spawnParticles(this.pos.x, this.pos.y, this.deathColor, 20);
    }
  }
  move() {
    // Apply magnet slow (set each frame by the MAGNET tower)
    let spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0) {
      const curFrame = typeof frameCount !== 'undefined' ? frameCount : 0;
      if (this._magnetFrame >= curFrame - 1) {
        spdMult = this._magnetFactor;
      } else {
        this._magnetFactor = 1.0;
      }
    }
    // Carrier ground aura: +30% movement speed
    if (this._carrierAura && this._carrierAura >= (typeof frameCount !== 'undefined' ? frameCount : 0)) {
      spdMult *= 1.3;
    } else {
      this._carrierSpd = false;
    }
    const effectiveSpd = this.spd * spdMult;
    const r = moveAlongPath(this.pos, this.seg, this.path, effectiveSpd);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  drawHealthBar() {
    if (this.hitFlash > 0) this.hitFlash--;
    const bw = 40, bh = 3, bx = this.pos.x - bw/2, by = this.pos.y - this.radius - 15;
    stroke(0, 180, 255, 100); strokeWeight(1); fill(5, 8, 15, 200);
    rect(bx-1, by-1, bw+2, bh+2);
    noStroke();
    const ratio = this.hp / this.maxHp;
    fill(this.hitFlash > 0 ? color(255,220,180) : lerpColor(color(200,20,5), color(0,220,150), ratio));
    rect(bx, by, bw * ratio, bh);
    fill(255, 255, 255, 40); rect(bx, by, bw * ratio, 1);
  }
  draw() {}
  update() {
    if (!this.alive || this.reached) return;
    // Airdrop falling animation: drop from the sky to the path node; cannot move or take damage during this
    if (this._dropping) {
      this._dropTimer++;
      const t = this._dropTimer / this._dropFrames;
      const drawY = lerp(this._dropFromY, this._dropToY, t);
      // Draw the falling drop pod
      push(); translate(this.pos.x, drawY);
      const alpha = 200;
      fill(60, 60, 80, alpha); stroke(180, 200, 255, alpha); strokeWeight(1.5);
      rectMode(CENTER); rect(0, 0, 14, 20, 3);
      // Parachute
      noFill(); stroke(200, 220, 255, alpha * 0.7); strokeWeight(1);
      arc(0, -10, 24, 18, PI, TWO_PI);
      line(-12, -10, -5, -10); line(12, -10, 5, -10);
      // Speed lines
      stroke(180, 200, 255, alpha * 0.4); strokeWeight(0.8);
      for (let k = -1; k <= 1; k++) {
        line(k*4, 10, k*4, 10 + (1-t)*20);
      }
      pop();
      if (this._dropTimer >= this._dropFrames) {
        this._dropping = false;
        spawnParticles(this.pos.x, this.pos.y, color(200, 180, 100), 10);
      }
      return;
    }
    this.move();
    this._updateHeading();
    this.draw(); this.drawHealthBar();
  }
}

