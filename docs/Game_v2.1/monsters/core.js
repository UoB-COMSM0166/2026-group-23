// ============================================================
//  monsters/core.js — 路径工具、粒子系统、Monster 基类
//  依赖：state.js (particles)、p5 全局
// ============================================================

// ============================================================
//  monsters.js — 怪物与路径系统
//  负责人：张洵
//  依赖：globals.js, map.js
// ============================================================

// ============================================================
//  工具函数
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
//  粒子系统
// ============================================================
let particles = [];
const MAX_PARTICLES = 400;   // 硬上限：防止齐射瞬间粒子爆量拖帧

function spawnParticles(x, y, col, count) {
  // 补丁 1：硬上限 + 本次裁剪
  if (particles.length >= MAX_PARTICLES) return;
  count = Math.min(count, MAX_PARTICLES - particles.length);
  // 补丁 2：预解析 col 的 r/g/b，避免 updateParticles 里每帧每粒子调用 red/green/blue
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
    fill(p.r, p.g, p.b, p.life * 220);   // 补丁 2：直接用预解析的 r/g/b
    push(); translate(p.x, p.y); rotate(p.vx * 0.5);
    rectMode(CENTER); rect(0, 0, p.size*p.life*1.4, p.size*p.life*0.7);
    rectMode(CORNER); pop();
  }
}

// ============================================================
//  基类 Monster
// ============================================================
class Monster {
  constructor(path, hp, spd, reward) {
    this.path = path; this.hp = hp; this.maxHp = hp;
    this.spd = spd; this.reward = reward;
    this.seg = 0; this.pos = { x: path[0].x, y: path[0].y };
    this.alive = true; this.reached = false; this.progress = 0;
    this.radius = 14; this.hitFlash = 0;
    this.deathColor = color(180, 20, 10);
    // 方向感动画支持：heading 由 _updateHeading 维护，绘制层可直接用 rotate(this.heading)
    // 初值取自路径首段，避免首帧从 0 弹到目标角的视觉跳变
    const next = path[1] || path[0];
    this.heading = Math.atan2(next.y - path[0].y, next.x - path[0].x);
    this._lastPosForHeading = { x: this.pos.x, y: this.pos.y };
  }
  // 由位置差推 heading，并做角度 lerp 平滑（避免 90° 急转的瞬切）
  _updateHeading() {
    const dx = this.pos.x - this._lastPosForHeading.x;
    const dy = this.pos.y - this._lastPosForHeading.y;
    if (Math.hypot(dx, dy) > 0.05) {
      const newH = Math.atan2(dy, dx);
      let diff = newH - this.heading;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * 0.18;   // ≈5–6 帧追上目标角
    }
    this._lastPosForHeading = { x: this.pos.x, y: this.pos.y };
  }
  takeDamage(dmg) {
    this.hp -= dmg; this.hitFlash = 6;
    if (this.hp <= 0) {
      this.alive = false;
      spawnParticles(this.pos.x, this.pos.y, this.deathColor, 20);
    }
  }
  move() {
    // 应用磁场减速（由 MAGNET 塔每帧设置）
    let spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0) {
      const curFrame = typeof frameCount !== 'undefined' ? frameCount : 0;
      if (this._magnetFrame >= curFrame - 1) {
        spdMult = this._magnetFactor;
      } else {
        this._magnetFactor = 1.0;
      }
    }
    // 母舰地面光环：移速加快30%
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
    // 空投坠落动画：从空中下落到路径节点，期间不移动不受伤
    if (this._dropping) {
      this._dropTimer++;
      const t = this._dropTimer / this._dropFrames;
      const drawY = lerp(this._dropFromY, this._dropToY, t);
      // 画下落中的投放舱
      push(); translate(this.pos.x, drawY);
      const alpha = 200;
      fill(60, 60, 80, alpha); stroke(180, 200, 255, alpha); strokeWeight(1.5);
      rectMode(CENTER); rect(0, 0, 14, 20, 3);
      // 降落伞
      noFill(); stroke(200, 220, 255, alpha * 0.7); strokeWeight(1);
      arc(0, -10, 24, 18, PI, TWO_PI);
      line(-12, -10, -5, -10); line(12, -10, 5, -10);
      // 速度线
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

