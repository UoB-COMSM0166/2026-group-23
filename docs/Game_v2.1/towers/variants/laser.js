// ============================================================
//  towers/variants/laser.js — LASER 激光切割者（多目标锁定蓄力）
//  通过 Tower.prototype 注入；须在 towers/base.js 之后加载
// ============================================================

Tower.prototype._updateLaser = function() {
  const maxT = this.level;
  let inRange = manager ? manager.getMonstersInRange(this.px, this.py, this.range, false) : [];
  inRange = inRange.filter(m => !m.isFlying).sort((a,b) => b.progress - a.progress);
  const targets = inRange.slice(0, maxT);

  this.laserTargets  = targets;
  this.laserBeamEnds = targets.map(t => ({ x: t.pos.x, y: t.pos.y }));

  if (targets.length > 0)
    this.angle = Math.atan2(targets[0].pos.y - this.py, targets[0].pos.x - this.px);
  else
    this.laserBeamEnds = [];

  if (targets.length > 0 && this.timer >= this.fireRate) {
    this.timer = 0; this.shootFlash = 14;
    for (const t of targets) {
      manager.damageAt(t.pos.x, t.pos.y, this.dmg, false, false);
      spawnParticles(t.pos.x, t.pos.y, color(...this.col), 4);
    }
  }
};

Tower.prototype._drawLaser = function(r, g, b) {
  const lv = this.level;
  const charge = min(this.timer / this.fireRate, 1.0);
  const pulse  = sin(this.pulseTime * 7) * 0.5 + 0.5;
  const ready  = charge >= 0.97;
  const flash  = this.shootFlash > 0;

  // 射线：laserBeamEnds 存的是世界坐标，转为本地坐标
  for (const end of this.laserBeamEnds) {
    const ex   = end.x - this.px;
    const ey   = end.y - this.py;
    const bLen = Math.hypot(ex, ey);
    if (bLen < 1) continue;
    const ang  = Math.atan2(ey, ex);
    const bw   = 0.7 + lv * 0.35;
    push(); rotate(ang);
    if (flash) {
      stroke(r,g,b,50);  strokeWeight(bw*7); line(0,0,bLen,0);
      stroke(r,g,b,130); strokeWeight(bw*3); line(0,0,bLen,0);
      stroke(210,255,230,255); strokeWeight(bw); line(0,0,bLen,0);
      noStroke(); fill(r,g,b,250); ellipse(bLen,0,13+lv*3,13+lv*3);
      fill(255,255,255,235); ellipse(bLen,0,5.5,5.5);
      if (lv===3){
        stroke(150,255,190,190); strokeWeight(0.8);
        line(bLen,0,bLen+random(-10,10),random(-9,-3));
        line(bLen,0,bLen+random(-10,10),random(3,9));
      }
    } else {
      const ga = 22+charge*80;
      stroke(r,g,b,ga*0.35); strokeWeight(4.5); line(0,0,bLen,0);
      stroke(r,g,b,ga);       strokeWeight(0.9); line(0,0,bLen,0);
      noStroke(); fill(r,g,b,ga*1.6); ellipse(bLen,0,2.5+charge*4,2.5+charge*4);
    }
    pop();
  }

  // 塔身
  push(); rotate(this.angle);
  for (let i=0;i<lv;i++) {
    const s=10+i*5, rs=this.pulseTime*(0.8+i*0.4)*(1+charge*2.8);
    push(); rotate(i%2===0?rs:-rs);
    noFill(); stroke(r,g,b,55+charge*95-i*16); strokeWeight(1.2);
    ellipse(0,0,s*2,s*2);
    for (let k=0;k<4;k++){const a=k*HALF_PI;fill(r,g,b,110+charge*120);noStroke();ellipse(cos(a)*s,sin(a)*s,1.8+charge*1.4,1.8+charge*1.4);}
    pop();
  }
  // 多管展开
  for (let ti=0;ti<lv;ti++){
    push(); rotate((ti-(lv-1)/2)*0.22);
    fill(10,24,18); stroke(r,g,b,155); strokeWeight(0.9);
    rectMode(CENTER); rect(9+lv*1.4,0,12+lv*2,3.5+lv*0.4,1);
    pop();
  }
  // 核心球
  const cr=5.5+lv*1.1+charge*4, cg=floor(255*(1-charge*0.72));
  fill(r,cg,floor(b*(1-charge*0.85)),50+charge*115); noStroke(); ellipse(0,0,cr*2,cr*2);
  fill(ready?color(255,235,185,238):color(185,255,215,190+pulse*50)); ellipse(0,0,cr*0.6,cr*0.6);
  fill(255,255,255,205); ellipse(0,0,2.2,2.2);
  // 蓄力条
  if (this.laserBeamEnds.length > 0) {
    const bW=20+lv*4,bH=2.8,bx=-bW/2,by=15+lv*1.8;
    fill(8,24,16); stroke(r,g,b,75); strokeWeight(0.6);
    rectMode(CORNER); rect(bx,by,bW,bH,1);
    noStroke(); fill(lerpColor(color(0,175,90),color(255,235,60),charge)); rect(bx,by,bW*charge,bH,1);
    if(ready){fill(255,255,185,110+sin(this.pulseTime*28)*75);rect(bx,by,bW,bH,1);}
    rectMode(CENTER);
  }
  pop();
};

