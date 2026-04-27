// ============================================================
//  monsters/bosses/antmech.js — BossAntMech 蚁型机甲 Boss
//  依赖：monsters/core.js (Monster)
// ============================================================

class BossAntMech extends Monster {
  constructor(path) {
    super(path, 9000, 0.72, 520);
    this.radius = 18; this.deathColor = color(80,255,120);
    this.walkTime = 0; this.corePulse = 0;
    this.phaseState = 'normal'; this.phaseTimer = 0;
    this.normalDur=480; this.giantDur=360; this.tinyDur=240;
    this.phaseOrder=['normal','giant','normal','tiny']; this.phaseIdx=0;
    this.scale=1.0; this.targetScale=1.0; this.baseSpd=0.75; this.baseRadius=18;
    this.shockwave=0; this.shockwaveR=0;
    this.antReleaseCount=0; this.antThresholds=[0.75,0.5,0.25];
    this.bullets=[]; this.shootTimer=0; this.berserk=false;
    this.legTime=0; this.antennaPulse=0;
    this.shieldTriggered=false; this.shielded=false; this.shieldHp=0; this.shieldPulse=0;
  }
  takeDamage(dmg) {
    if (this.phaseState==='giant') dmg=floor(dmg*0.15);
    if (this.phaseState==='normal') dmg=floor(dmg*1.5); // 正常形态受到1.5倍伤害
    if (this.phaseState==='tiny' && Math.random() < 0.6) return; // 缩小形态60%概率闪避
    this.hitFlash=5;
    if (this.shielded) {
      this.shieldHp-=dmg; this.shieldPulse=14;
      if (this.shieldHp<=0) { this.shielded=false; spawnParticles(this.pos.x,this.pos.y,color(80,255,120),14); }
    } else {
      this.hp-=dmg;
      if (!this.shieldTriggered&&this.hp>0&&this.hp/this.maxHp<=0.5) {
        this.shieldTriggered=true; this.shielded=true;
        this.shieldHp=floor(this.maxHp*0.2); this.shieldPulse=25;
      }
    }
    for (let i=this.antReleaseCount;i<this.antThresholds.length;i++) {
      if (this.hp/this.maxHp<=this.antThresholds[i]) {
        this.antReleaseCount=i+1;
        if (typeof manager!=='undefined') {
          for (let j=0;j<5;j++) {
            const s=new MechSpider(this.path.slice(this.seg));
            s.hp=40; s.maxHp=40; s.spd=2.2; manager.monsters.push(s);
          }
        }
        break;
      }
    }
    if (this.hp<=0) { this.alive=false; spawnParticles(this.pos.x,this.pos.y,this.deathColor,50); }
  }
  move() {
    this.walkTime+=0.18; this.corePulse+=0.07; this.antennaPulse+=0.1; this.legTime+=0.2;
    if (this.shieldPulse>0) this.shieldPulse--;
    this.berserk=this.hp/this.maxHp<=0.5;
    this.phaseTimer++;
    const phaseDurs={normal:this.berserk?200:this.normalDur,giant:this.berserk?240:this.giantDur,tiny:this.berserk?180:this.tinyDur};
    if (this.phaseTimer>=phaseDurs[this.phaseState]) {
      const prev=this.phaseState;
      this.phaseIdx=(this.phaseIdx+1)%this.phaseOrder.length;
      this.phaseState=this.phaseOrder[this.phaseIdx]; this.phaseTimer=0;
      if (prev==='tiny'&&this.phaseState==='normal') { this.shockwave=60; this.shockwaveR=0; jammedUntilFrame=frameCount+180; if (typeof jamRadius !== 'undefined') jamRadius=180; jamPos={x:this.pos.x,y:this.pos.y}; } // 退出缩小时干扰延长至3秒
    }
    const targets={normal:1.0,giant:this.berserk?5.0:4.5,tiny:this.berserk?0.15:0.18};
    this.targetScale=targets[this.phaseState];
    this.scale+=(this.targetScale-this.scale)*0.08;
    this.radius=this.baseRadius*this.scale;
    const spdMods={normal:1.0,giant:0.35,tiny:this.berserk?1.7:1.4};
    this.spd=this.baseSpd*spdMods[this.phaseState];
    if (this.shockwave>0) { this.shockwave--; this.shockwaveR+=(this.berserk?220:160)/60; }
    if (this.phaseState==='normal') {
      this.shootTimer++;
      if (this.shootTimer>=80) {
        this.shootTimer=0;
        let dx=0,dy=0;
        if (this.seg<this.path.length-1) {
          dx=this.path[this.seg+1].x-this.pos.x; dy=this.path[this.seg+1].y-this.pos.y;
          const l=Math.hypot(dx,dy)||1; dx/=l; dy/=l;
        }
        for (let i=-1;i<=1;i++) {
          const a=Math.atan2(dy,dx)+i*0.25;
          this.bullets.push({x:this.pos.x,y:this.pos.y,vx:cos(a)*6,vy:sin(a)*6,life:1.0});
        }
      }
    }
    this.bullets=this.bullets.filter(b=>b.life>0);
    for (const b of this.bullets) { b.x+=b.vx; b.y+=b.vy; b.life-=0.028; }
    // 应用磁场减速
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    const r=moveAlongPath(this.pos,this.seg,this.path,this.spd * _spdMult);
    this.pos=r.pos; this.seg=r.seg;
    this.progress=calcProgress(this.pos,this.seg,this.path);
    if (this.seg>=this.path.length-1) this.reached=true;
  }
  draw() {
    if (this.shockwave>0) {
      const st=this.shockwave/60; noFill(); stroke(80,255,120,st*200); strokeWeight(4);
      ellipse(this.pos.x,this.pos.y,this.shockwaveR*2,this.shockwaveR*2);
    }
    push(); translate(this.pos.x,this.pos.y); scale(this.scale);
    if (this.phaseState==='giant') {
      noFill(); stroke(80,255,120,55); strokeWeight(14); ellipse(0,0,90,110);
    }

    // ── 正确人体行走骨骼系统 ──
    // 以髋部为原点，腿向下，头向上
    // wt 是步伐相位，两腿相差 PI（正常走路）
    const wt = this.legTime;

    // 身体轻微左右侧倾 & 上下弹跳（重心转移）
    const bodyLean  = sin(wt) * 1.8;           // 侧倾
    const bodyBounce = -abs(sin(wt * 2)) * 1.5; // 走一步弹两次（脚落地时最低）

    // 髋关节位置（身体中心下方）
    const hipY = 8 + bodyBounce;

    // ─ 骨骼绘制函数：从关节A到关节B ─
    const drawLimb = (x1,y1,x2,y2,w,col) => {
      stroke(...col,200); strokeWeight(w); line(x1,y1,x2,y2);
    };
    const drawJoint = (x,y,r,col) => {
      fill(...col,230); noStroke(); ellipse(x,y,r,r);
    };

    // ── 先画腿（在身体后面）──
    // 大腿长18，小腿长17，用前摆角和后摆角
    const legThigh = 18, legShin = 17;

    for (const side of [-1, 1]) {
      // 左腿(side=-1)相位 = wt，右腿(side=1)相位 = wt+PI
      const phase = wt + (side > 0 ? Math.PI : 0);
      const thighAngle = sin(phase) * 0.42;  // 大腿前后摆幅（弧度）
      // 膝盖弯曲：腿向后时弯曲更多（自然步态）
      const kneeBend = max(0.18, -sin(phase) * 0.5 + 0.22);

      const hipX = side * 7;
      const shinAngle = thighAngle + kneeBend;

      // 关节位置：根据 _headingMode 切换主摆动轴
      let kneeX, kneeY, footX, footY, bootRot;
      if (this._headingMode === 'h') {
        // 水平行走：脚向前/后摆（X 轴）—— 原侧视骨骼
        kneeX = hipX + sin(thighAngle) * legThigh;
        kneeY = hipY + cos(thighAngle) * legThigh;
        footX = kneeX + sin(shinAngle) * legShin;
        footY = kneeY + cos(shinAngle) * legShin;
        bootRot = shinAngle * 0.3;
      } else {
        // 垂直行走：腿径直向下（X 锁在 hip），脚在 Y 轴前后摆
        // 一只脚向前迈（更靠下），另一只向后撤（缩回上抬），相位反相
        const yLead = sin(phase) * 5;          // ±5px 的前后位移
        const liftKnee = max(0, sin(phase)) * 3;
        kneeX = hipX;
        kneeY = hipY + cos(thighAngle) * legThigh - liftKnee + yLead * 0.4;
        footX = kneeX;
        footY = kneeY + cos(shinAngle) * legShin + yLead * 0.6;
        // 靴子方向跟随脚的位移：往前(+Y)迈时朝下，往后撤时略翘
        bootRot = yLead * 0.05;
      }

      // 大腿
      drawLimb(hipX,hipY, kneeX,kneeY, 5, [25,105,40]);
      // 小腿
      drawLimb(kneeX,kneeY, footX,footY, 4, [20,90,35]);
      // 膝关节
      drawJoint(kneeX,kneeY, 7, [40,160,60]);
      // 靴子
      fill(15,65,28,230); stroke(40,150,60,190); strokeWeight(1);
      push(); translate(footX,footY); rotate(bootRot);
      rectMode(CENTER); rect(2,2,11,5,2); rectMode(CORNER);
      pop();
    }

    // ── 躯干 ──
    const torsoY  = hipY - 16;  // 躯干中心
    const torsoH  = 22;
    push(); translate(bodyLean, 0);

    // 骨盆
    fill(14,40,20); stroke(50,185,70,200); strokeWeight(1.5);
    rectMode(CENTER); rect(0, hipY, 16, 8, 2); rectMode(CORNER);

    // 躯干主体
    fill(16,44,22); stroke(55,200,80,210); strokeWeight(1.8);
    beginShape();
      vertex(-13, hipY-2); vertex(-15, torsoY-4);
      vertex(-11, torsoY-torsoH*0.4); vertex(11, torsoY-torsoH*0.4);
      vertex(15,  torsoY-4); vertex(13, hipY-2);
    endShape(CLOSE);

    // 胸甲细节线条
    stroke(45,165,68,120); strokeWeight(0.8);
    line(-9,torsoY-torsoH*0.3, -9,torsoY+2);
    line( 9,torsoY-torsoH*0.3,  9,torsoY+2);
    line(-11,torsoY-6, 11,torsoY-6);

    // 核心发光块（胸口）
    const coreCol = this.berserk ? color(255,80,50,230) : color(0,215+sin(this.corePulse)*35,65,235);
    fill(coreCol); noStroke(); rectMode(CENTER);
    rect(0, torsoY-4, 10, 14, 2);
    fill(160,255,190,150); rect(0, torsoY-4, 4, 6, 1);
    rectMode(CORNER);

    // 肩膀
    fill(22,60,30); stroke(65,215,88,200); strokeWeight(1.5);
    ellipse(-17, torsoY-torsoH*0.3, 11, 11);
    ellipse( 17, torsoY-torsoH*0.3, 11, 11);

    // ── 手臂（对侧摆动：右腿前迈时左臂前摆）──
    const armLen1 = 14, armLen2 = 13;
    for (const side of [-1, 1]) {
      // 手臂与对侧腿同相
      const armPhase = wt + (side < 0 ? Math.PI : 0);
      const armSwing = sin(armPhase) * 0.38;
      const elbowBend = max(0.1, abs(sin(armPhase)) * 0.35 + 0.12);

      const shldrX = side * 16, shldrY = torsoY - torsoH * 0.3;
      const elbowX = shldrX + sin(armSwing) * armLen1 * side * 0.4;
      const elbowY = shldrY + cos(armSwing) * armLen1 * 0.85 + 6;
      const handAng = armSwing - elbowBend * side;
      const handX   = elbowX + sin(handAng) * armLen2 * side * 0.4;
      const handY   = elbowY + cos(handAng) * armLen2 * 0.85 + 4;

      drawLimb(shldrX,shldrY, elbowX,elbowY, 4, [25,108,44]);
      drawLimb(elbowX,elbowY, handX,handY,   3, [20,92,38]);
      drawJoint(elbowX,elbowY, 5.5, [38,155,58]);
      // 拳头
      fill(18,85,35,225); stroke(42,162,62,180); strokeWeight(1);
      rectMode(CENTER); rect(handX,handY,7,6,2); rectMode(CORNER);
    }

    // ── 头盔（蚁人特征：光滑流线型+眼镜缝+触角）──
    const headY = torsoY - torsoH * 0.4 - 14;
    // 颈部
    fill(14,40,20); stroke(50,180,68,190); strokeWeight(1.2);
    rectMode(CENTER); rect(0, torsoY-torsoH*0.4-4, 8, 8, 2); rectMode(CORNER);
    // 头盔主体
    fill(14,38,20); stroke(62,215,88,225); strokeWeight(2);
    ellipse(0, headY, 24, 28);
    // 面罩分割线（上下半球接缝）
    stroke(45,175,70,160); strokeWeight(1);
    arc(0, headY, 22, 26, 0.1, PI-0.1);
    // 眼镜缝（发光）
    fill(0,230+sin(this.corePulse*1.8)*30,80,240); noStroke();
    rectMode(CENTER);
    rect(-5, headY-1, 7, 3, 1);
    rect( 5, headY-1, 7, 3, 1);
    rectMode(CORNER);
    // 中央鼻梁
    fill(20,60,30,200); noStroke(); rectMode(CENTER); rect(0,headY-1,2,5,1); rectMode(CORNER);
    // 触角
    stroke(52,195,78,195); strokeWeight(1.6);
    const antBase = headY-12;
    line(-4,antBase, -7,antBase-10);
    line( 4,antBase,  7,antBase-10);
    fill(72,245,105,230); noStroke();
    ellipse(-7,antBase-11,5,5); ellipse(7,antBase-11,5,5);

    pop(); // end bodyLean translate

    // ── 护盾 ──
    if (this.shielded) {
      const sp=this.shieldPulse>0?map(this.shieldPulse,25,0,1,0):sin(frameCount*0.045)*0.3+0.7;
      noFill(); stroke(80,255,120,80*sp); strokeWeight(8);
      beginShape(); for(let k=0;k<6;k++) vertex(cos(k*PI/3)*42,sin(k*PI/3)*42); endShape(CLOSE);
    }

    // ── 子弹 ──
    for (const b of this.bullets) {
      push(); translate(b.x-this.pos.x, b.y-this.pos.y);
      rotate(Math.atan2(b.vy,b.vx));
      noStroke(); fill(0,200,80,b.life*230);
      beginShape(); vertex(7,0); vertex(2,-2.5); vertex(-4,0); vertex(2,2.5); endShape(CLOSE);
      pop();
    }
    pop();

    textFont('monospace'); noStroke();
    const labelY=this.pos.y-max(this.radius,20)*this.scale-22;
    if (this.phaseState==='giant') { fill(80,255,120,220); textSize(11); textAlign(CENTER); text('▲ GIANT MODE',this.pos.x,labelY); }
    else if (this.phaseState==='tiny') { fill(200,255,100,220); textSize(11); textAlign(CENTER); text('▼ TINY MODE',this.pos.x,labelY); }
    if (this.berserk) { fill(255,80,80,200); textSize(10); textAlign(CENTER); text('⚡ BERSERK',this.pos.x,labelY-14); }
    textAlign(LEFT,BASELINE);
    this.drawHealthBar();
  }
  drawHealthBar() {
    if (this.hitFlash>0) this.hitFlash--;
    const bw=70,bh=6,bx=this.pos.x-bw/2,by=this.pos.y-max(this.radius,20)-24;
    stroke(40,200,70,150); strokeWeight(1); fill(5,12,8,215); rect(bx-1,by-1,bw+2,bh+2);
    noStroke(); const ratio=max(0,this.hp/this.maxHp);
    fill(this.hitFlash>0?color(255,255,255):color(0,200,80)); rect(bx,by,bw*ratio,bh);
    for (const t of [0.25,0.5,0.75]) { stroke(255,200,100,160); strokeWeight(1); line(bx+bw*t,by,bx+bw*t,by+bh); }
    fill(80,255,120,200); noStroke(); textSize(8); textAlign(CENTER);
    text('FINAL BOSS  ANT-MECH',this.pos.x,by-4); textAlign(LEFT,BASELINE);
  }
}

