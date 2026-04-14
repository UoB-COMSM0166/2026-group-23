// ============================================================
//  towers/variants/chain.js — CHAIN 链式电弧塔（命中跳链）
//  通过 Tower.prototype 注入；须在 towers/base.js 之后加载
// ============================================================

Tower.prototype._updateChain = function() {
  // 链式电弧可以穿透坦克护盾屏障，直接搜索范围内怪物（含被屏障覆盖的）
  let inRange = manager ? manager.monsters.filter(m =>
    m.alive && !m.reached && !m.isFlying &&
    Math.hypot(m.pos.x - this.px, m.pos.y - this.py) <= this.range
  ).sort((a,b) => b.progress - a.progress) : [];
  if (inRange.length === 0) return;
  const target = inRange[0];
  this.angle = Math.atan2(target.pos.y - this.py, target.pos.x - this.px);
  if (this.timer < this.fireRate) return;
  this.timer = 0; this.shootFlash = 14;
  // 塔→第一目标（无视坦克屏障）
  target.takeDamage(this.dmg);
  spawnParticles(target.pos.x, target.pos.y, color(...this.col), 6);
  _chainArcs.push({ x1: this.px, y1: this.py, x2: target.pos.x, y2: target.pos.y, life: 16 });
  // 跳链 Lv1=1跳 Lv2=2跳 Lv3=3跳（跳链也无视坦克屏障）
  let lastPos = { x: target.pos.x, y: target.pos.y };
  const hit = new Set([target]);
  for (let j = 0; j < this.level; j++) {
    if (!manager) break;
    const nearby = manager.monsters.filter(m =>
      m.alive && !m.reached && !m.isFlying && !hit.has(m) &&
      Math.hypot(m.pos.x - lastPos.x, m.pos.y - lastPos.y) <= 110
    );
    if (nearby.length === 0) break;
    const next = nearby.reduce((a, b) =>
      Math.hypot(b.pos.x-lastPos.x,b.pos.y-lastPos.y) < Math.hypot(a.pos.x-lastPos.x,a.pos.y-lastPos.y) ? b : a);
    next.takeDamage(floor(this.dmg * pow(0.72, j + 1)));
    spawnParticles(next.pos.x, next.pos.y, color(...this.col), 4);
    _chainArcs.push({ x1: lastPos.x, y1: lastPos.y, x2: next.pos.x, y2: next.pos.y, life: 14 });
    lastPos = { x: next.pos.x, y: next.pos.y };
    hit.add(next);
  }
};

Tower.prototype._drawChain = function(r, g, b) {
  push(); rotate(this.angle);
  const lv=this.level, pulse=sin(this.pulseTime*6)*0.5+0.5;
  push(); rotate(this.pulseTime*2);
  noFill(); stroke(r,g,b,100); strokeWeight(1);
  for(let i=0;i<4;i++){push();rotate(i*HALF_PI);line(6,0,13+lv*2,0);pop();}
  pop();
  fill(20,30,50); stroke(r,g,b); strokeWeight(1.2);
  rectMode(CENTER); rect(10,0,14+lv*2,5,1);
  stroke(r,g,b,80); strokeWeight(0.7); line(5,-2,5,2); line(10,-2,10,2);
  const cr=7+lv*1.5;
  fill(r,g,b,90+pulse*80); noStroke(); ellipse(0,0,cr*2,cr*2);
  if(this.shootFlash>0){fill(180,230,255,240);ellipse(0,0,cr*2.2,cr*2.2);}
  fill(r,g,b,220); ellipse(0,0,cr*0.5,cr*0.5);
  pop();
};

