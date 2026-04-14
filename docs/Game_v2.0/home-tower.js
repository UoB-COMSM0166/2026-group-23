// ============================================================
//  home-tower.js — HomeTower 终点基地塔
//  依赖：towers.js 之后加载；本类原位于 monsters.js，重构迁出
// ============================================================

class HomeTower {
  constructor(x, y) {
    this.px = x; this.py = y;
    this.pulseTime = 0;
    this.hitFlash  = 0;
    this.shieldAngle = 0;
    this.dmgEffect = 0;
    this.radius = 30;
  }

  update() {
    this.pulseTime  += 0.04;
    this.shieldAngle += 0.013;
    if (this.hitFlash  > 0) this.hitFlash--;
    if (this.dmgEffect > 0) this.dmgEffect--;
  }

  triggerHit() {
    this.hitFlash  = 22;
    this.dmgEffect = 32;
    spawnParticles(this.px, this.py, color(255, 50, 50), 16);
  }

  draw() {
    const p = sin(this.pulseTime) * 0.35 + 0.65;
    push(); translate(this.px, this.py);

    // 外六边形护盾
    push(); rotate(this.shieldAngle);
    const sAlpha = this.hitFlash > 0 ? 240 : 85;
    const sCol   = this.hitFlash > 0 ? color(255,80,80,sAlpha) : color(0,200,255,sAlpha);
    noFill(); stroke(sCol); strokeWeight(this.hitFlash>0 ? 2.5 : 1.5);
    beginShape();
    for (let k=0;k<6;k++) vertex(cos(k*PI/3)*44, sin(k*PI/3)*44);
    endShape(CLOSE);
    pop();

    // 内旋转八边形
    push(); rotate(-this.shieldAngle*1.7);
    noFill(); stroke(0,180,255,55*p); strokeWeight(1);
    beginShape();
    for (let k=0;k<8;k++) vertex(cos(k*PI/4)*33, sin(k*PI/4)*33);
    endShape(CLOSE);
    pop();

    // 受击冲击波
    if (this.dmgEffect > 0) {
      const t = this.dmgEffect/32;
      noFill(); stroke(255,60,60,t*200); strokeWeight(3.5);
      ellipse(0,0,(1-t)*85+8,(1-t)*85+8);
    }

    // 主体底座
    const baseCol = this.hitFlash>0 ? color(75,8,8) : color(8,18,38);
    fill(baseCol); stroke(this.hitFlash>0?color(255,80,80):color(0,160,255),175); strokeWeight(2);
    beginShape();
    vertex(0,-29); vertex(21,-19); vertex(27,0); vertex(21,19);
    vertex(0,27); vertex(-21,19); vertex(-27,0); vertex(-21,-19);
    endShape(CLOSE);

    // 核心塔身
    fill(12,25,52); stroke(0,180,255,195); strokeWeight(1.5);
    beginShape();
    vertex(0,-21); vertex(13,-13); vertex(17,0);
    vertex(13,13); vertex(0,17); vertex(-13,13); vertex(-17,0); vertex(-13,-13);
    endShape(CLOSE);

    // 中央能量核
    const cSize = 9 + sin(this.pulseTime*3)*2.2;
    const cCol  = this.hitFlash>0 ? color(255,80,60) : color(0,220,255);
    fill(cCol); noStroke(); ellipse(0,0,cSize,cSize);
    fill(255,255,255,175); ellipse(0,0,cSize*0.38,cSize*0.38);

    // 四炮台
    for (let k=0;k<4;k++) {
      push(); rotate(k*HALF_PI + this.shieldAngle*0.28);
      fill(15,30,58); stroke(0,155,215,150); strokeWeight(1);
      rectMode(CENTER); rect(15,0,9,7,2);
      fill(0,195,255,130+sin(this.pulseTime+k)*55); noStroke(); ellipse(20,0,4.5,4.5);
      pop();
    }

    // 标签（字号与行距加大，便于辨认）
    noStroke(); fill(0,215,255,195*p);
    textFont('monospace'); textAlign(CENTER,CENTER);
    const hpRatio = baseHp/baseHpMax;
    fill(lerpColor(color(255,30,30),color(0,215,140),hpRatio), 200);
    textSize(11);
    text('HP  '+baseHp+'/'+baseHpMax, 0, -58);
    fill(0,215,255,195*p);
    textSize(10);
    text('[ HOME BASE ]', 0, -44);
    pop();
  }
