// ============================================================
//  monsters/mobs/snake.js — MechSnake 机械蛇
//  依赖：monsters/core.js (Monster)
// ============================================================

class MechSnake extends Monster {
  constructor(path) {
    super(path, 500, 0.95, 18);
    this.radius = 9; this.deathColor = color(160, 30, 5);
    this.waveTime = 0; this.breathe = 0;
    this.history = Array(120).fill(null).map(() => ({ x: path[0].x, y: path[0].y }));
    this.healTimer = 240; this.healEffect = 0; // 出生4秒后触发第一次（原10秒）
    this.HEAL_RADIUS = 260;
  }
  move() {
    this.waveTime += 0.13; this.breathe += 0.08; this.healTimer++;
    if (this.healTimer >= 360) { // 冷却6秒（原10秒）
      this.healTimer = 0; this.healEffect = 60;
      if (typeof manager !== 'undefined') {
        for (const m of manager.monsters) {
          if (!m.alive || m === this) continue;
          const d = distAB(this.pos, m.pos);
          if (d > this.HEAL_RADIUS) continue;
          // 只给小怪回血，Boss不回血
          const isBoss = (m instanceof BossFission)||(m instanceof BossPhantom)||
                         (m instanceof BossAntMech)||(m instanceof FissionCore)||
                         (m instanceof BossCarrier);
          if (isBoss) continue;
          m.hp = min(m.maxHp, m.hp + floor(m.maxHp * 0.15));
        }
      }
    }
    if (this.healEffect > 0) this.healEffect--;
    // 应用磁场减速
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
    this.history.unshift({ x: this.pos.x, y: this.pos.y });
    if (this.history.length > 120) this.history.pop();
  }
  draw() {
    push();
    const n = 14;
    for (let i = n-1; i >= 0; i--) {
      const idx = min(i*6, this.history.length-1);
      const nd = this.history[idx];
      const wave = sin(this.waveTime - i*0.5) * 11;
      const nx = nd.x + wave, ny = nd.y;
      const t = 1 - i/n, w = lerp(4, 16, t);
      push(); translate(nx, ny);
      fill(lerpColor(color(28,8,4), color(75,18,7), t));
      stroke(110, 30, 8, 150 + t*80); strokeWeight(0.8);
      beginShape(); vertex(0,-w*0.9); vertex(w*0.55,0); vertex(0,w*0.65); vertex(-w*0.55,0); endShape(CLOSE);
      if (i%2===0 && t>0.3) {
        fill(55,12,4); stroke(140,35,8,140); strokeWeight(0.8);
        beginShape(); vertex(0,-w*0.9); vertex(w*0.25,-w*1.85); vertex(-w*0.25,-w*1.85); endShape(CLOSE);
      }
      if (t > 0.5) { noFill(); stroke(190,25,5,55*t); strokeWeight(1); line(-w*0.35,-w*0.25,w*0.35,w*0.25); }
      pop();
    }
    const h = this.history[0];
    push(); translate(h.x, h.y);
    fill(42,11,4); stroke(170,38,8); strokeWeight(1.2);
    beginShape(); vertex(0,-13); vertex(9,-7); vertex(11,0); vertex(8,6); vertex(2,11); vertex(-2,11); vertex(-8,6); vertex(-11,0); vertex(-9,-7); endShape(CLOSE);
    fill(28,7,2); stroke(140,32,7,170); strokeWeight(1);
    beginShape(); vertex(-9,5); vertex(-4,13); vertex(0,15); vertex(4,13); vertex(9,5); endShape();
    fill(190,155,90); noStroke();
    for (const tx of [-4,0,4]) { beginShape(); vertex(tx,9); vertex(tx+2,15); vertex(tx-2,15); endShape(CLOSE); }
    fill(4,1,1); stroke(170,28,5,190); strokeWeight(1);
    beginShape(); vertex(-5,-4); vertex(-1,-8); vertex(3,-4); vertex(1,-1); vertex(-3,-1); endShape(CLOSE);
    beginShape(); vertex(3,-4); vertex(7,-8); vertex(11,-4); vertex(9,-1); vertex(5,-1); endShape(CLOSE);
    noStroke(); fill(210,38,8, 120+sin(this.breathe)*50); ellipse(-1,-4,4,3); ellipse(7,-4,4,3);
    pop(); pop();
    if (this.healEffect > 0) {
      const t = this.healEffect / 60;
      noFill(); stroke(30,220,80,t*150); strokeWeight(2.5);
      ellipse(this.history[0].x, this.history[0].y, (1-t)*this.HEAL_RADIUS*2+10, (1-t)*this.HEAL_RADIUS*2+10);
      noFill(); stroke(80,255,120,t*80); strokeWeight(1);
      ellipse(this.history[0].x, this.history[0].y, (1-t)*this.HEAL_RADIUS*2+40, (1-t)*this.HEAL_RADIUS*2+40);
      fill(80,255,120,t*210); noStroke(); textSize(10); textAlign(CENTER);
      text('+AREA HEAL', this.history[0].x, this.history[0].y - 28);
    }
  }
}

