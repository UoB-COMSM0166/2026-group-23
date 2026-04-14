// ============================================================
//  monsters/bosses/carrier.js — BossCarrier 钢铁母舰 Boss
//  依赖：monsters/core.js (Monster)
// ============================================================

class BossCarrier extends Monster {
  constructor(path) {
    super(path, 7200, 0.5, 280);
    this.isFlying = true;
    this.radius = 30; this.deathColor = color(180, 200, 255);

    // 飞行形态
    this.floatY = 0; this.floatTime = 0; this.propAngle = 0;
    this.dropTimer = 0;       // 空投计时
    this.dropInterval = 280;  // 每280帧空投一次
    this.dropThresholds = [0.8, 0.6]; // 血量节点触发强化空投
    this.dropsDone = [];      // 已触发的节点

    // 护盾（自保）
    this.shieldActive = false; this.shieldHp = 0; this.shieldPulse = 0;
    this.shieldCooldown = 600; this.shieldTimer = 0;

    // 坠落/地面形态
    this.grounded = false;       // 是否已坠落
    this.groundedAnim = 0;       // 坠落动画计时
    this.crashParticleDone = false;
    this.groundPath = null;      // 坠落后使用主路径

    // 地面形态护盾光环
    this.auraRadius = 130;
    this.auraPulse = 0;

    // 地面移动
    this.groundSeg = 0;
  }

  takeDamage(dmg) {
    this.hitFlash = 5;
    if (this.shieldActive) {
      this.shieldHp -= dmg; this.shieldPulse = 18;
      if (this.shieldHp <= 0) {
        this.shieldActive = false;
        spawnParticles(this.pos.x, this.pos.y, color(180, 200, 255), 14);
      }
      return;
    }
    this.hp -= dmg;

    // 血量节点强化空投
    for (const t of this.dropThresholds) {
      if (!this.dropsDone.includes(t) && this.hp / this.maxHp <= t) {
        this.dropsDone.push(t);
        this._doAirdrop(true); // 强化空投
      }
    }

    // 坠落触发
    if (!this.grounded && this.hp > 0 && this.hp / this.maxHp <= 0.5) {
      this._crash();
    }

    if (this.hp <= 0) {
      this.alive = false;
      spawnParticles(this.pos.x, this.pos.y, this.deathColor, 50);
    }
  }

  _crash() {
    this.grounded = true;
    this.isFlying = false;
    this.groundedAnim = 40;
    this.spd = 0.42;
    // 落到主路径最近节点
    if (typeof MAIN_PATH_PX !== 'undefined' && MAIN_PATH_PX) {
      this.groundPath = MAIN_PATH_PX;
      // 找最近节点
      let bestSeg = 0, bestDist = Infinity;
      for (let i = 0; i < MAIN_PATH_PX.length; i++) {
        const d = Math.hypot(MAIN_PATH_PX[i].x - this.pos.x, MAIN_PATH_PX[i].y - this.pos.y);
        if (d < bestDist) { bestDist = d; bestSeg = i; }
      }
      this.groundSeg = bestSeg;
      this.pos = { x: MAIN_PATH_PX[bestSeg].x, y: MAIN_PATH_PX[bestSeg].y };
      this.seg = bestSeg;
      this.path = MAIN_PATH_PX;
    }
    spawnParticles(this.pos.x, this.pos.y, color(200, 160, 100), 40);
    // 坠落时也触发一次空投
    this._doAirdrop(true);
  }

  _doAirdrop(enhanced) {
    if (typeof manager === 'undefined' || !MAIN_PATH_PX || !EDGE_PATH_PX) return;
    const pool = enhanced
      ? ['robot','robot','robot','tank','robot','spider']
      : ['robot','robot','spider','robot','spider'];
    const count = enhanced ? 4 : 3;

    for (let i = 0; i < count; i++) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      const chosenPath = Math.random() < 0.5 ? MAIN_PATH_PX : EDGE_PATH_PX;
      let m;
      if (t === 'spider') m = new MechSpider(chosenPath);
      if (t === 'robot')  m = new MechRobot(chosenPath);
      if (t === 'tank')   m = new MechTank(chosenPath);
      if (!m) continue;

      // 找母舰当前位置在路径上最近的节点，从那里开始行进
      let bestSeg = 0, bestDist = Infinity;
      for (let s = 0; s < chosenPath.length - 1; s++) {
        const d = Math.hypot(chosenPath[s].x - this.pos.x, chosenPath[s].y - this.pos.y);
        if (d < bestDist) { bestDist = d; bestSeg = s; }
      }
      m.seg = bestSeg;
      m.pos = { x: chosenPath[bestSeg].x, y: chosenPath[bestSeg].y };
      m.progress = calcProgress(m.pos, bestSeg, chosenPath);
      // 坠落无敌：从母舰位置下落到路径节点，期间无法被攻击
      m._dropping = true;
      m._dropFromY = this.pos.y;        // 坠落起始Y（母舰位置）
      m._dropToY   = m.pos.y;           // 落点Y（路径节点）
      m._dropFrames = 30;               // 坠落动画帧数
      m._dropTimer  = 0;
      manager.monsters.push(m);
      // 空投冲击特效（在母舰正下方）
      spawnParticles(this.pos.x, this.pos.y + 20, color(255, 200, 80), 16);
      spawnParticles(m.pos.x, m.pos.y, color(255, 160, 40), 10);
    }
  }

  move() {
    if (this.grounded) {
      this._moveGround();
      return;
    }
    this._moveAir();
  }

  _moveAir() {
    this.floatTime += 0.04; this.propAngle += 0.18;
    this.floatY = sin(this.floatTime) * 7;
    // 对空导弹减速到期后恢复
    if (this._airSlowApplied && this._airSlowExpire && frameCount >= this._airSlowExpire) {
      this.spd = this._origBaseSpd || 0.5;
      this._airSlowApplied = false; this._airSlowExpire = 0;
    }

    // 护盾冷却
    this.shieldTimer++;
    if (!this.shieldActive && this.shieldTimer >= this.shieldCooldown) {
      this.shieldTimer = 0; this.shieldActive = true;
      this.shieldHp = floor(this.maxHp * 0.1);
      this.shieldPulse = 30;
    }
    if (this.shieldPulse > 0) this.shieldPulse--;

    // 定期空投
    this.dropTimer++;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      this._doAirdrop(false);
    }

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

  _moveGround() {
    this.auraPulse += 0.07;
    if (this.groundedAnim > 0) this.groundedAnim--;

    // 护盾冷却（地面形态冷却更短）
    this.shieldTimer++;
    if (!this.shieldActive && this.shieldTimer >= 420) {
      this.shieldTimer = 0; this.shieldActive = true;
      this.shieldHp = floor(this.maxHp * 0.08);
      this.shieldPulse = 25;
    }
    if (this.shieldPulse > 0) this.shieldPulse--;

    // 地面形态光环：让附近小怪免伤75%+移速加快
    if (typeof manager !== 'undefined') {
      for (const m of manager.monsters) {
        if (!m.alive || m.reached || m === this || m.isFlying) continue;
        const d = Math.hypot(m.pos.x - this.pos.x, m.pos.y - this.pos.y);
        if (d <= this.auraRadius) {
          m._carrierAura = frameCount + 2; // 每帧刷新标记
          m._carrierSpd  = true;
        }
      }
    }

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
    if (this.grounded) {
      this._drawGround();
      return;
    }
    this._drawAir();
  }

  _drawAir() {
    const fy = this.floatY;
    push(); translate(this.pos.x, this.pos.y + fy);

    // 护盾
    if (this.shieldActive) {
      const sp = this.shieldPulse > 0 ? map(this.shieldPulse,30,0,1,0.4) : sin(frameCount*0.06)*0.3+0.7;
      noFill(); stroke(180,210,255,160*sp); strokeWeight(4+sp*2);
      ellipse(0, 0, 90+sp*8, 60+sp*4);
    }

    // 机身主体
    fill(40,50,70); stroke(120,160,220,200); strokeWeight(1.8);
    beginShape();
      vertex(-38,  0); vertex(-28, -12); vertex(-10, -16);
      vertex( 10, -16); vertex( 28, -12); vertex( 38,  0);
      vertex( 28,  12); vertex(-28,  12);
    endShape(CLOSE);

    // 座舱玻璃
    fill(80,140,220,180); stroke(140,180,255,200); strokeWeight(1);
    ellipse(0, -8, 26, 18);
    fill(140,200,255,100); noStroke(); ellipse(-4,-10,10,7);

    // 引擎挂架
    for (const sx of [-24, 24]) {
      fill(30,40,60); stroke(100,140,200,180); strokeWeight(1.2);
      rectMode(CENTER); rect(sx, 6, 14, 8, 2); rectMode(CORNER);
      // 螺旋桨
      push(); translate(sx, 6); rotate(this.propAngle * (sx>0?1:-1));
      stroke(160,200,255,200); strokeWeight(2);
      line(-10,0,10,0); line(0,-10,0,10);
      noStroke(); fill(180,210,255,160);
      ellipse(10,0,5,5); ellipse(-10,0,5,5);
      ellipse(0,10,5,5); ellipse(0,-10,5,5);
      pop();
    }

    // 尾翼
    fill(35,45,65); stroke(100,140,200,160); strokeWeight(1);
    triangle(-38,0, -48,-14, -42,-2);
    triangle(-38,0, -48,14,  -42, 2);

    // 空投舱门（有空投时闪烁）
    const dropping = this.dropTimer > this.dropInterval - 30;
    fill(dropping ? color(255,200,80,200) : color(20,30,50,200));
    stroke(dropping ? color(255,220,100) : color(80,120,180,150)); strokeWeight(1);
    rectMode(CENTER); rect(0, 10, 20, 6, 1); rectMode(CORNER);

    pop();
    this.drawHealthBar();
  }

  _drawGround() {
    push(); translate(this.pos.x, this.pos.y);

    // 坠落震动效果
    const shake = this.groundedAnim > 0 ? (Math.random()-0.5)*4*(this.groundedAnim/40) : 0;
    translate(shake, shake*0.5);

    // 地面护盾光环
    const ap = sin(this.auraPulse)*0.4+0.6;
    noFill(); stroke(180,210,255,50*ap); strokeWeight(12);
    ellipse(0,0,this.auraRadius*2,this.auraRadius*2);
    stroke(180,210,255,100*ap); strokeWeight(3);
    ellipse(0,0,this.auraRadius*2,this.auraRadius*2);
    // 旋转光点
    push(); rotate(this.auraPulse*0.5);
    for (let i=0;i<6;i++) {
      const a=i*PI/3, rr=this.auraRadius;
      noStroke(); fill(180,210,255,80*ap);
      ellipse(cos(a)*rr, sin(a)*rr, 8, 8);
    }
    pop();

    // 残骸机身（压扁变形）
    fill(50,55,75); stroke(100,140,200,180); strokeWeight(1.5);
    beginShape();
      vertex(-42,  4); vertex(-30, -8); vertex(-10, -12);
      vertex( 10, -12); vertex( 30, -8); vertex( 42,  4);
      vertex( 30,  16); vertex(-30, 16);
    endShape(CLOSE);

    // 受损痕迹
    stroke(255,100,30,180); strokeWeight(2);
    line(-20,-8, -10, 2); line(5,-10, 15,-2); line(-30,4,-18,8);

    // 压碎的座舱（破损玻璃）
    fill(60,100,160,140); stroke(100,160,220,160); strokeWeight(1);
    ellipse(0,-4,22,14);
    stroke(255,80,30,160); strokeWeight(1.5);
    line(-8,-8,2,-2); line(4,-10,10,-4);

    // 护盾
    if (this.shieldActive) {
      const sp = this.shieldPulse>0 ? map(this.shieldPulse,25,0,1,0.4) : sin(frameCount*0.07)*0.3+0.7;
      noFill(); stroke(180,210,255,150*sp); strokeWeight(3+sp*2);
      ellipse(0,0,100+sp*6,60+sp*4);
    }

    // 标签
    if (this.hp/this.maxHp < 0.2) {
      fill(255,80,30,220); noStroke(); textSize(9); textAlign(CENTER);
      text('💥 CRITICAL', 0, -28);
    }
    pop();
    this.drawHealthBar();
  }

  drawHealthBar() {
    if (this.hitFlash>0) this.hitFlash--;
    const fy = this.grounded ? 0 : this.floatY;
    const bw=70,bh=5,bx=this.pos.x-bw/2,by=this.pos.y+fy-this.radius-22;
    stroke(100,140,220,150); strokeWeight(1); fill(5,8,18,210); rect(bx-1,by-1,bw+2,bh+2);
    noStroke(); const ratio=max(0,this.hp/this.maxHp);
    fill(this.hitFlash>0?color(255,255,255):lerpColor(color(180,20,20),color(100,160,255),ratio));
    rect(bx,by,bw*ratio,bh);
    // 60%坠落线改为50%
    stroke(255,200,60,160); strokeWeight(1);
    line(bx+bw*0.5, by, bx+bw*0.5, by+bh);
    fill(140,180,255,200); noStroke(); textSize(8); textAlign(CENTER);
    text(this.grounded?'BOSS  CARRIER [GROUNDED]':'BOSS  IRON CARRIER', this.pos.x, by-4);
    textAlign(LEFT,BASELINE);
  }
}

