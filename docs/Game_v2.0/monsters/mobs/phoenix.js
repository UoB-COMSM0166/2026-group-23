// ============================================================
//  monsters/mobs/phoenix.js — MechPhoenix 机械凤凰（飞行）
//  依赖：monsters/core.js (Monster)
// ============================================================

class MechPhoenix extends Monster {
  constructor(path) {
    super(path, 190, 1.9, 32);
    this.isFlying = true;
    this.radius = 16; this.deathColor = color(200, 50, 5);
    this.baseSpd = 2.0; this.wingTime = 0; this.diveTimer = 0;
    this.diving = false; this.floatY = 0; this.trail = []; this.boneAngle = 0;
    this.jamTimer = 0; this.jamming = false; this.jamEffect = 0; this.jamRadius = 150;
  }
  move() {
    this.wingTime += 0.22; this.diveTimer++;
    this.floatY = cos(this.wingTime * 0.38) * 8; this.boneAngle += 0.03;
    this.diving = this.diveTimer % 180 < 42;
    // 对空导弹减速到期后恢复baseSpd
    if (this._airSlowApplied && this._airSlowExpire && frameCount >= this._airSlowExpire) {
      this.baseSpd = this._origBaseSpd || 2.0;
      this._airSlowApplied = false; this._airSlowExpire = 0;
    }
    this.spd = this.diving ? this.baseSpd * (3.2/1.85) : this.baseSpd;
    this.jamTimer++;
    if (this.jamTimer >= 360) {
      this.jamTimer = 0; this.jamEffect = 60;
      jammedUntilFrame = frameCount + 90;
      jamPos = { x: this.pos.x, y: this.pos.y };
    }
    if (this.jamEffect > 0) this.jamEffect--;
    this.trail.push({ x:this.pos.x, y:this.pos.y+this.floatY, vx:(random()-0.5)*1.2, vy:(random()-0.5)*1.2+0.5, life:1.0, size:random(5,14) });
    // 应用磁场减速
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    // 对空导弹减速
    if (this._airSlowed && this._airSlowed >= frameCount) _spdMult *= this._airSlowFactor || 0.5;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  draw() {
    if (this.jamEffect > 0) {
      const t = this.jamEffect / 60;
      const r = (1-t) * this.jamRadius;
      noFill(); stroke(255,80,0,t*160); strokeWeight(3); ellipse(this.pos.x,this.pos.y+this.floatY,r*2,r*2);
      fill(255,120,20,t*200); noStroke(); textSize(10); textAlign(CENTER);
      text('JAM!', this.pos.x, this.pos.y+this.floatY-r*0.5-8);
    }
    this.trail = this.trail.filter(p => p.life > 0);
    for (const p of this.trail) {
      p.life -= this.diving ? 0.07 : 0.045; p.x += p.vx; p.y += p.vy;
      noStroke();
      fill(p.life>0.6 ? color(200,lerp(10,80,p.life),5,p.life*200) : color(18,10,6,p.life*150));
      push(); translate(p.x,p.y); rotate(p.vx*0.8);
      const sz = p.size * p.life;
      beginShape(); vertex(0,-sz); vertex(sz*0.45,sz*0.3); vertex(0,sz*0.75); vertex(-sz*0.45,sz*0.3); endShape(CLOSE);
      pop();
    }
    push(); translate(this.pos.x, this.pos.y + this.floatY);
    const wa = sin(this.wingTime) * 0.65;
    for (const side of [-1, 1]) {
      push(); scale(side, 1); rotate(-wa*side-0.4);
      fill(38,13,4); stroke(130,50,10); strokeWeight(1.5);
      beginShape(); vertex(0,-2); vertex(8,-4); vertex(28,-10); vertex(36,-6); vertex(26,0); vertex(8,2); endShape(CLOSE);
      pop();
    }
    fill(26,9,3); stroke(115,42,8); strokeWeight(1.5);
    beginShape(); vertex(0,-13); vertex(10,-9); vertex(13,-1); vertex(11,5); vertex(5,11); vertex(-5,11); vertex(-11,5); vertex(-13,-1); vertex(-10,-9); endShape(CLOSE);
    fill(38,13,4); stroke(125,47,10); strokeWeight(1.5);
    beginShape(); vertex(0,-27); vertex(8,-23); vertex(11,-17); vertex(9,-11); vertex(5,-9); vertex(-5,-9); vertex(-9,-11); vertex(-11,-17); vertex(-8,-23); endShape(CLOSE);
    fill(4,1,1); stroke(170,18,5,175); strokeWeight(1.2);
    beginShape(); vertex(-7,-21); vertex(-3,-25); vertex(1,-21); vertex(-1,-17); vertex(-5,-17); endShape(CLOSE);
    beginShape(); vertex(3,-21); vertex(7,-25); vertex(11,-21); vertex(9,-17); vertex(5,-17); endShape(CLOSE);
    noStroke(); fill(215,22,5,140+sin(this.wingTime*0.8)*55); ellipse(-3,-20,5,4); ellipse(7,-20,5,4);
    pop();
  }
}

// ── Boss 裂变核心 ──
// 技能一：核心护盾——每累积15次命中，激活护盾吸收下一波伤害，护盾期间向周围塔释放干扰脉冲使1~2座塔临时下线
// 技能二：辐射爆发——血量<75%后每240帧向四周扩散一圈辐射波，波及范围内所有塔被干扰120帧
// 技能三：临界分裂——血量降至40%时，分裂出2个小裂变体继续行进，自身移速提升
// 技能四：过热冲刺——血量<20%进入过热状态，移速大幅提升并持续对周围塔造成干扰光环
