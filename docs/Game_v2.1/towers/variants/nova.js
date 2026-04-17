// ============================================================
//  towers/variants/nova.js — NOVA 穿透炮（直线穿透 + 落点爆炸）
//  通过 Tower.prototype 注入；须在 towers/base.js 之后加载
// ============================================================

Tower.prototype._updateNova = function() {
  const target = this.findTarget();
  if (!target) return;
  this.angle = Math.atan2(target.pos.y - this.py, target.pos.x - this.px);
  if (this.timer < this.fireRate) return;
  this.timer = 0; this.shootFlash = 10;
  // 发射发散光波：3条朝目标方向 ±扇角的扩散光环
  const spreadAngles = [-0.18, 0, 0.18];
  for (const da of spreadAngles) {
    projectiles.push(new Projectile(this.px, this.py, this.angle + da, this.projSpd, this.dmg, this.col, false, 'nova', this.level));
  }
};

Tower.prototype._drawNova = function(r, g, b) {
  push(); rotate(this.angle);
  const lv=this.level, pulse=sin(this.pulseTime*4)*0.5+0.5;
  for(let i=0;i<lv+1;i++){
    const s=12+i*5, spd=this.pulseTime*(1+i*0.6)*(i%2===0?1:-1);
    push(); rotate(spd); noFill(); stroke(r,g,b,75-i*12); strokeWeight(1.1); ellipse(0,0,s*2,s*2);
    const nN=3+lv; for(let k=0;k<nN;k++){const a=(TWO_PI/nN)*k;fill(r,g,b,150+pulse*60);noStroke();ellipse(cos(a)*s,sin(a)*s,2,2);}
    pop();
  }
  fill(35,18,5); stroke(r,g,b,160); strokeWeight(1.1);
  rectMode(CENTER); rect(10+lv*2,0,15+lv*3,5+lv,1);
  if(this.shootFlash>0){noStroke();fill(255,200,100,220);ellipse(17+lv*3,0,8,8);}
  const cr=7+lv*1.5+pulse*2;
  fill(r,g,b,80+pulse*70); noStroke(); ellipse(0,0,cr*2,cr*2);
  fill(255,200,100,200); ellipse(0,0,cr*0.55,cr*0.55);
  fill(255,255,255,200); ellipse(0,0,2.5,2.5);
  pop();
};

