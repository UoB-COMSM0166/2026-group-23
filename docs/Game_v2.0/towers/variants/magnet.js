// ============================================================
//  towers/variants/magnet.js — MAGNET 磁场干扰塔（无伤害范围减速）
//  通过 Tower.prototype 注入；须在 towers/base.js 之后加载
// ============================================================

Tower.prototype._updateMagnet = function() {
  if (!manager) return;
  const def = TOWER_DEFS.magnet;
  const minFactor = def.slowFactor[this.level - 1];
  for (const m of manager.monsters) {
    if (!m.alive || m.reached || m.isFlying) continue;
    const d = Math.hypot(m.pos.x - this.px, m.pos.y - this.py);
    if (d > this.range) continue;
    const factor = lerp(minFactor, 0.75, d / this.range);
    // 取最强减速
    if (m._magnetFactor === undefined || factor < m._magnetFactor) {
      m._magnetFactor = factor;
      m._magnetFrame  = frameCount;
    }
  }
};

Tower.prototype._drawMagnet = function(r, g, b) {
  const lv=this.level, pulse=sin(this.pulseTime*3)*0.5+0.5;
  // 旋转磁力线
  push(); rotate(this.pulseTime*0.8);
  for(let i=0;i<4+lv;i++){
    const a=(TWO_PI/(4+lv))*i;
    const inner=8, outer=14+lv*3;
    stroke(r,g,b,80+pulse*60); strokeWeight(1.2+lv*0.3);
    line(cos(a)*inner, sin(a)*inner, cos(a)*outer, sin(a)*outer);
  }
  pop();
  // 外干扰圆环（脉冲）
  noFill(); stroke(r,g,b,40+pulse*35); strokeWeight(3+lv);
  ellipse(0,0,(14+lv*4)*2,(14+lv*4)*2);
  // 核心磁铁形状
  fill(20,10,35); stroke(r,g,b,180); strokeWeight(1.4);
  rectMode(CENTER);
  // U形磁铁两臂
  rect(-6, 2, 5, 14+lv*2, 1);
  rect( 6, 2, 5, 14+lv*2, 1);
  rect(0, 9+lv, 17, 5, 2);
  // 磁极颜色
  noStroke();
  fill(255, 80, 80, 200); rect(-6, -4-lv, 5, 4, 1);
  fill(80, 150, 255, 200); rect( 6, -4-lv, 5, 4, 1);
  rectMode(CORNER);
  // 中央场力线
  stroke(r,g,b,60+pulse*50); strokeWeight(0.8);
  for(let i=-3;i<=3;i++){
    const x=i*3, yTop=-8-lv, yBot=5;
    line(x,yTop,x+sin(this.pulseTime+i)*2,yBot);
  }
  fill(r,g,b,120+pulse*80); noStroke(); ellipse(0,4,3,3);
};

