// ============================================================
//  towers.js  — v5  七座防御塔
// ============================================================
// 塔一览：
//  RAPID   快速塔        — 高频单体子弹
//  LASER   激光切割者    — 蓄力，Lv升一级多锁一个目标，同时多射线击发
//  NOVA    穿透炮        — 朝目标方向发射直线穿透子弹，落点范围爆炸
//  CHAIN   链式电弧塔    — 命中后跳链附近怪物（Lv1跳1次→Lv3跳3次）
//  MAGNET  磁场干扰塔    — 无伤害，持续降低范围内所有怪速度（越近越慢）
//  GHOST   幽灵导弹塔    — 发射追踪导弹（Lv1=1枚→Lv3=3枚），命中小爆炸
//  SCATTER 散射对空炮    — 扇形多弹专打飞行怪（Lv1=3弹→Lv3=7弹）
// ============================================================

const TOWER_DEFS = {
  rapid: {
    name: '快速塔', label: 'RAPID', cost: 110,
    levels: [
      { dmg: 12, range: 100, fireRate: 20, upgradeCost: 100 },
      { dmg: 22, range: 115, fireRate: 16, upgradeCost: 160 },
      { dmg: 36, range: 132, fireRate: 12, upgradeCost: 0   }
    ],
    projSpd: 11, color: [255, 200, 0], antiAir: false,
  },
  laser: {
    name: '激光切割者', label: 'LASER', cost: 180,
    // Lv1=1目标 Lv2=2目标 Lv3=3目标，蓄力后同时对所有目标发射
    levels: [
      { dmg: 65,  range: 150, fireRate: 163, upgradeCost: 170 },
      { dmg: 115, range: 170, fireRate: 138, upgradeCost: 280 },
      { dmg: 210, range: 198, fireRate: 131, upgradeCost: 0   }
    ],
    projSpd: 0, color: [0, 255, 150], antiAir: false,
  },
  nova: {
    name: 'Nova穿透炮', label: 'NOVA', cost: 200,
    // 直线穿透子弹，打穿所有地面怪，落点范围爆炸
    levels: [
      { dmg: 55,  range: 155, fireRate: 95,  upgradeCost: 190 },
      { dmg: 90,  range: 175, fireRate: 82,  upgradeCost: 300 },
      { dmg: 145, range: 200, fireRate: 70,  upgradeCost: 0   }
    ],
    projSpd: 5.5, color: [255, 140, 30], antiAir: false,
  },
  chain: {
    name: '链式电弧塔', label: 'CHAIN', cost: 160,
    // 命中后跳链：Lv1跳1次  Lv2跳2次  Lv3跳3次，每跳伤害×0.72
    levels: [
      { dmg: 75,  range: 135, fireRate: 55,  upgradeCost: 140 },
      { dmg: 120, range: 155, fireRate: 45,  upgradeCost: 220 },
      { dmg: 190, range: 175, fireRate: 36,  upgradeCost: 0   }
    ],
    projSpd: 16, color: [100, 200, 255], antiAir: false,
  },
  magnet: {
    name: '磁场干扰塔', label: 'MAGNET', cost: 130,
    // 无伤害，持续减速：Lv1减50%  Lv2减65%  Lv3减80%（越靠近越慢）
    // range字段当作干扰半径，dmg无效，fireRate无效（每帧持续生效）
    levels: [
      { dmg: 0, range: 110, fireRate: 999, upgradeCost: 110 },
      { dmg: 0, range: 132, fireRate: 999, upgradeCost: 180 },
      { dmg: 0, range: 155, fireRate: 999, upgradeCost: 0   }
    ],
    projSpd: 0, color: [120, 80, 255], antiAir: false,
    slowFactor: [0.5, 0.35, 0.2], // 最近处的速度乘数（距离插值）
  },
  ghost: {
    name: '幽灵导弹塔', label: 'GHOST', cost: 190,
    // 发射追踪导弹：Lv1=1枚  Lv2=2枚  Lv3=3枚，命中范围爆炸
    levels: [
      { dmg: 70,  range: 160, fireRate: 110, upgradeCost: 170 },
      { dmg: 110, range: 180, fireRate: 95,  upgradeCost: 270 },
      { dmg: 170, range: 205, fireRate: 80,  upgradeCost: 0   }
    ],
    projSpd: 3.5, color: [200, 100, 255], antiAir: false,
  },
  scatter: {
    name: '散射对空炮', label: 'SCATTER', cost: 160,
    // 扇形发射多弹专打飞行怪：Lv1=3弹  Lv2=5弹  Lv3=7弹
    levels: [
      { dmg: 45,  range: 200, fireRate: 55,  upgradeCost: 150 },
      { dmg: 72,  range: 230, fireRate: 48,  upgradeCost: 240 },
      { dmg: 115, range: 265, fireRate: 40,  upgradeCost: 0   }
    ],
    projSpd: 14, color: [255, 80, 120], antiAir: true, onlyAir: true,
  },
};

// ============================================================
//  Tower 类
// ============================================================
class Tower {
  constructor(gridX, gridY, type) {
    this.gx = gridX; this.gy = gridY;
    this.px = gridX * CELL_SIZE + CELL_SIZE / 2;
    this.py = gridY * CELL_SIZE + CELL_SIZE / 2;
    this.type = type;
    this.level = 1;
    this.initStats();
    this.timer      = 0;
    this.angle      = 0;
    this.pulseTime  = 0;
    this.shootFlash = 0;
    this.buildAnim  = 1.0;
    this.upgradeEffect = 0;

    // 激光专用
    this.laserTargets  = [];
    this.laserBeamEnds = [];
  }

  initStats() {
    const def = TOWER_DEFS[this.type];
    const lv  = def.levels[this.level - 1];
    this.dmg         = lv.dmg;
    this.range       = lv.range;
    this.fireRate    = lv.fireRate;
    this.upgradeCost = lv.upgradeCost;
    this.col         = def.color;
    this.antiAir     = def.antiAir || false;
    this.projSpd     = def.projSpd || 0;
  }

  upgrade() {
    if (this.level >= 3 || coins < this.upgradeCost) return false;
    coins -= this.upgradeCost;
    this.level++;
    this.initStats();
    this.upgradeEffect = 40;
    if (typeof spawnParticles === 'function')
      spawnParticles(this.px, this.py, color(255, 215, 0), 20);
    return true;
  }

  // 找范围内进度最高的目标
  findTarget(forceAir) {
    if (!manager) return null;
    const def = TOWER_DEFS[this.type];
    const wantAir = forceAir !== undefined ? forceAir : (def.onlyAir || false);
    let inRange = manager.getMonstersInRange(this.px, this.py, this.range, wantAir);
    if (def.onlyAir) inRange = inRange.filter(m => m.isFlying);
    else             inRange = inRange.filter(m => !m.isFlying);
    if (inRange.length === 0) return null;
    return inRange.reduce((best, m) => m.progress > best.progress ? m : best, inRange[0]);
  }

  update() {
    this.pulseTime += 0.05;
    if (this.shootFlash > 0) this.shootFlash--;
    this.timer++;
    if (this.buildAnim > 0) this.buildAnim = max(0, this.buildAnim - 0.05);

    const jammed = (typeof frameCount !== 'undefined' && typeof jammedUntilFrame !== 'undefined')
                   && frameCount < jammedUntilFrame;
    if (jammed) {
      this.laserTargets = []; this.laserBeamEnds = []; return;
    }

    switch (this.type) {
      case 'rapid':   this._updateGeneric(); break;
      case 'laser':   this._updateLaser();   break;
      case 'nova':    this._updateNova();    break;
      case 'chain':   this._updateChain();   break;
      case 'magnet':  this._updateMagnet();  break;
      case 'ghost':   this._updateGhost();   break;
      case 'scatter': this._updateScatter(); break;
    }
  }

  // ── 通用单体子弹 ──
  _updateGeneric() {
    const target = this.findTarget();
    if (!target) return;
    this.angle = Math.atan2(target.pos.y - this.py, target.pos.x - this.px);
    if (this.timer < this.fireRate) return;
    this.timer = 0; this.shootFlash = 8;
    projectiles.push(new Projectile(this.px, this.py, this.angle, this.projSpd, this.dmg, this.col, false, this.type, this.level));
  }

  // ── 激光多目标蓄力（修复：坐标系完全在塔本地）──
  _updateLaser() {
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
  }

  // ── NOVA 发散光波 ──
  _updateNova() {
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
  }

  // ── CHAIN 链式电弧（无子弹，瞬间伤害+电弧视觉）──
  _updateChain() {
    const target = this.findTarget();
    if (!target) return;
    this.angle = Math.atan2(target.pos.y - this.py, target.pos.x - this.px);
    if (this.timer < this.fireRate) return;
    this.timer = 0; this.shootFlash = 14;
    // 塔→第一目标
    target.takeDamage(this.dmg);
    spawnParticles(target.pos.x, target.pos.y, color(...this.col), 6);
    _chainArcs.push({ x1: this.px, y1: this.py, x2: target.pos.x, y2: target.pos.y, life: 16 });
    // 跳链 Lv1=1跳 Lv2=2跳 Lv3=3跳
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
  }

  // ── MAGNET 磁场减速（每帧主动作用，无子弹）──
  _updateMagnet() {
    if (!manager) return;
    const def = TOWER_DEFS.magnet;
    const minFactor = def.slowFactor[this.level - 1];
    for (const m of manager.monsters) {
      if (!m.alive || m.reached || m.isFlying) continue;
      const d = Math.hypot(m.pos.x - this.px, m.pos.y - this.py);
      if (d > this.range) continue;
      const factor = lerp(minFactor, 0.92, d / this.range);
      // 取最强减速
      if (m._magnetFactor === undefined || factor < m._magnetFactor) {
        m._magnetFactor = factor;
        m._magnetFrame  = frameCount;
      }
    }
  }

  // ── GHOST 追踪导弹（Lv1=1枚 Lv2=2枚 Lv3=3枚，每枚独立锁定不同目标）──
  _updateGhost() {
    if (this.timer < this.fireRate) return;
    if (!manager) return;
    const candidates = manager.getMonstersInRange(this.px, this.py, this.range, false)
                              .filter(m => !m.isFlying)
                              .sort((a, b) => b.progress - a.progress);
    if (candidates.length === 0) return;
    this.timer = 0; this.shootFlash = 12;
    this.angle = Math.atan2(candidates[0].pos.y - this.py, candidates[0].pos.x - this.px);
    for (let i = 0; i < this.level; i++) {
      const tgt = candidates[Math.min(i, candidates.length - 1)];
      const a = Math.atan2(tgt.pos.y - this.py, tgt.pos.x - this.px);
      const p = new Projectile(this.px, this.py, a, this.projSpd, this.dmg, this.col, false, 'ghost', this.level);
      p.target = tgt;
      projectiles.push(p);
    }
  }

  // ── SCATTER 散射对空 ──
  _updateScatter() {
    const target = this.findTarget(true);
    if (!target) return;
    this.angle = Math.atan2(target.pos.y - this.py, target.pos.x - this.px);
    if (this.timer < this.fireRate) return;
    this.timer = 0; this.shootFlash = 10;
    const bulletCounts = [3, 5, 7];
    const count = bulletCounts[this.level - 1];
    const spread = 0.28; // 总扇角的一半
    for (let i = 0; i < count; i++) {
      const a = this.angle + lerp(-spread, spread, count > 1 ? i / (count - 1) : 0.5);
      projectiles.push(new Projectile(this.px, this.py, a, this.projSpd, this.dmg, this.col, true, 'scatter', this.level));
    }
  }

  // ============================================================
  //  draw()
  // ============================================================
  draw() {
    push(); translate(this.px, this.py);
    const [r, g, b] = this.col;

    // 范围圈
    if (dist(mouseX, mouseY, this.px, this.py) < CELL_SIZE * 0.5) {
      noFill(); stroke(r, g, b, 45); strokeWeight(1);
      ellipse(0, 0, this.range * 2, this.range * 2);
    }

    scale(1 - this.buildAnim * 0.55);

    // 升级光效
    if (this.upgradeEffect > 0) {
      const t = this.upgradeEffect / 40; this.upgradeEffect--;
      noFill(); stroke(255, 240, 180, t * 220); strokeWeight(1.5 + t * 3);
      rectMode(CENTER); rect(0, 0, CELL_SIZE*(0.92-t*0.18), CELL_SIZE*(0.92-t*0.18));
    }

    // 底座
    fill(10, 15, 25); stroke(r, g, b, 110); strokeWeight(0.8 + this.level * 0.4);
    rectMode(CENTER); rect(0, 0, CELL_SIZE * 0.62, CELL_SIZE * 0.62, 4);

    switch (this.type) {
      case 'rapid':   this._drawRapid(r, g, b);   break;
      case 'laser':   this._drawLaser(r, g, b);   break;
      case 'nova':    this._drawNova(r, g, b);     break;
      case 'chain':   this._drawChain(r, g, b);   break;
      case 'magnet':  this._drawMagnet(r, g, b);  break;
      case 'ghost':   this._drawGhost(r, g, b);   break;
      case 'scatter': this._drawScatter(r, g, b); break;
    }

    this._drawRankStars();
    pop();
  }

  _drawRankStars() {
    const gap = 9, ox = -(this.level - 1) * gap * 0.5;
    for (let i = 0; i < this.level; i++) {
      fill(255, 210, 30); noStroke();
      ellipse(ox + i * gap, CELL_SIZE * 0.28, 4, 4);
    }
  }

  // ── RAPID ──
  _drawRapid(r, g, b) {
    push(); rotate(this.angle);
    const lv = this.level, spd = this.pulseTime * (3 + lv);
    push(); rotate(-spd*0.4);
    stroke(r,g,b,80); fill(16,16,16); strokeWeight(0.7); rectMode(CENTER);
    for (let i=0;i<6;i++){push();rotate(i*PI/3);rect(9+lv,0,4,2.5);pop();}
    pop();
    push(); rotate(spd);
    const cnt=3+lv;
    for (let i=0;i<cnt;i++){
      push(); rotate((TWO_PI/cnt)*i);
      fill(32,32,32); stroke(r,g,b); strokeWeight(0.8);
      rectMode(CENTER); rect(7+lv*1.5,0,7+lv*2,2.5,1);
      if (this.shootFlash>0){fill(255,180,0);noStroke();ellipse(11+lv*2.5,0,4,4);}
      pop();
    }
    pop();
    fill(r,g,b); noStroke(); ellipse(0,0,6+lv,6+lv);
    fill(255,220); ellipse(0,0,2.5,2.5);
    pop();
  }

  // ── LASER（完全在本地坐标系，无二次translate）──
  _drawLaser(r, g, b) {
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
  }

  // ── NOVA ──
  _drawNova(r, g, b) {
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
  }

  // ── CHAIN ──
  _drawChain(r, g, b) {
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
  }

  // ── MAGNET ──
  _drawMagnet(r, g, b) {
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
  }

  // ── GHOST 幽灵导弹 ──
  _drawGhost(r, g, b) {
    push(); rotate(this.angle);
    const lv=this.level, pulse=sin(this.pulseTime*5)*0.5+0.5;
    // 导弹发射架
    for(let i=0;i<lv;i++){
      const oy=(i-(lv-1)/2)*7;
      push(); translate(0,oy);
      fill(25,12,38); stroke(r,g,b,160); strokeWeight(1);
      rectMode(CENTER); rect(8,0,14,4,1);
      // 导弹筒
      fill(18,8,28); stroke(r,g,b,130); strokeWeight(0.8);
      rect(12,0,8,3,1);
      if(this.shootFlash>0){noStroke();fill(r,g,b,220);ellipse(16,0,5,5);}
      pop();
    }
    // 核心
    const cr=6+lv*1.5;
    fill(r,g,b,80+pulse*70); noStroke(); ellipse(0,0,cr*2,cr*2);
    fill(220,160,255,200); ellipse(0,0,cr*0.5,cr*0.5);
    // 旋转光环
    push(); rotate(this.pulseTime*2);
    noFill(); stroke(r,g,b,70+pulse*40); strokeWeight(0.9);
    ellipse(0,0,(cr+4)*2,(cr+4)*2);
    pop();
    pop();
  }

  // ── SCATTER 散射对空 ──
  _drawScatter(r, g, b) {
    push(); rotate(this.angle);
    const lv=this.level, pulse=sin(this.pulseTime*4)*0.5+0.5;
    // 扇形炮管阵列
    const bulletCounts=[3,5,7]; const cnt=bulletCounts[lv-1];
    const spread=0.28;
    for(let i=0;i<cnt;i++){
      const a=lerp(-spread,spread,cnt>1?i/(cnt-1):0.5);
      push(); rotate(a);
      fill(28,8,12); stroke(r,g,b,150+pulse*60); strokeWeight(1);
      rectMode(CENTER); rect(10,0,14+lv,4,1);
      if(this.shootFlash>0){noStroke();fill(r,g,b,230);ellipse(17+lv,0,4,4);}
      pop();
    }
    // 中央底座
    fill(22,8,14); stroke(r,g,b,180); strokeWeight(1.3);
    rectMode(CENTER); ellipse(0,0,12+lv*2,12+lv*2);
    // 瞄准镜
    noFill(); stroke(r,g,b,120+pulse*80); strokeWeight(1);
    ellipse(0,0,8+lv,8+lv);
    line(-5,0,5,0); line(0,-5,0,5);
    fill(r,g,b,200+pulse*50); noStroke(); ellipse(0,0,3,3);
    pop();
  }
}

// ============================================================
//  Projectile — 支持 nova穿透、chain跳链、ghost追踪、scatter对空
// ============================================================
class Projectile {
  constructor(x, y, angle, spd, dmg, col, antiAir, towerType, level, chainTarget) {
    this.x = x; this.y = y;
    this.vx = cos(angle)*spd; this.vy = sin(angle)*spd;
    this.dmg = dmg; this.col = col; this.antiAir = antiAir;
    this.towerType = towerType; this.level = level;
    this.alive = true; this.life = 1.0;
    // Chain 直接锁定目标
    this.chainTarget = chainTarget || null;
    // Ghost 追踪
    this.target = null;
    this.turnSpd = 0.08;
    // Nova 发散：越飞越大
    this.novaRadius = 4;
  }

  update() {
    // Ghost 追踪逻辑
    if (this.towerType === 'ghost' && manager) {
      if (!this.target || !this.target.alive || this.target.reached) {
        const inRange = manager.getMonstersInRange(this.x, this.y, 300, false)
                                .filter(m => !m.isFlying);
        this.target = inRange.length > 0
          ? inRange.reduce((best, m) => distAB({x:this.x,y:this.y}, m.pos) < distAB({x:this.x,y:this.y}, best.pos) ? m : best, inRange[0])
          : null;
      }
      if (this.target) {
        const desiredA = Math.atan2(this.target.pos.y - this.y, this.target.pos.x - this.x);
        let curA = Math.atan2(this.vy, this.vx);
        let diff = desiredA - curA;
        while (diff > PI)  diff -= TWO_PI;
        while (diff < -PI) diff += TWO_PI;
        curA += constrain(diff, -this.turnSpd, this.turnSpd);
        const spd = Math.hypot(this.vx, this.vy);
        this.vx = cos(curA) * spd; this.vy = sin(curA) * spd;
      }
    }

    // Nova：子弹越飞越大
    if (this.towerType === 'nova') {
      this.novaRadius = 4 + (1.0 - this.life) * 55;
    }

    this.x += this.vx; this.y += this.vy;
    this.life -= 0.012;
    if (this.life <= 0) { this.alive = false; return; }

    const isNova    = this.towerType === 'nova';
    const isGhost   = this.towerType === 'ghost';
    const isScatter = this.towerType === 'scatter';

    if (isNova) {
      // 发散光波：用当前半径判断命中（越飞越大越容易命中）
      if (!this.hitSet) this.hitSet = new Set();
      if (manager) {
        for (const m of manager.monsters) {
          if (!m.alive || m.reached || m.isFlying || this.hitSet.has(m)) continue;
          if (Math.hypot(m.pos.x - this.x, m.pos.y - this.y) <= this.novaRadius + m.radius) {
            this.hitSet.add(m);
            m.takeDamage(this.dmg);
            spawnParticles(m.pos.x, m.pos.y, color(...this.col), 6);
          }
        }
      }
      return; // nova子弹自然消亡（life归零）
    }

    const hitR = isGhost ? 14 : isScatter ? 16 : 10;
    let hits = manager ? manager.getMonstersInRange(this.x, this.y, hitR, this.antiAir) : [];
    if (this.antiAir) hits = hits.filter(m => m.isFlying);
    else              hits = hits.filter(m => !m.isFlying);
    if (hits.length === 0) return;

    if (isGhost) {
      manager.damageInRadius(this.x, this.y, 30 + this.level * 8, this.dmg, false);
      spawnParticles(this.x, this.y, color(...this.col), 10);
      this.alive = false;
    } else if (isScatter) {
      manager.damageAt(this.x, this.y, this.dmg, true, false);
      spawnParticles(this.x, this.y, color(...this.col), 6);
      this.alive = false;
    } else {
      // rapid 等普通单体
      manager.damageAt(this.x, this.y, this.dmg, false, false);
      spawnParticles(this.x, this.y, color(...this.col), 4);
      this.alive = false;
    }
  }

  draw() {
    const [r, g, b] = this.col;
    push(); translate(this.x, this.y); rotate(Math.atan2(this.vy, this.vx));
    const sz = 4 + this.level * 1.5;
    noStroke(); fill(r, g, b, this.life * 240);

    if (this.towerType === 'nova') {
      // 发散光波：中心圆+向外扩散的光环（越飞越大）
      pop(); // 先退出 rotate push，用世界坐标画圆环
      push(); translate(this.x, this.y);
      const nr = this.novaRadius;
      const alpha = this.life * 200;
      // 外光环
      noFill(); stroke(r, g, b, alpha * 0.7); strokeWeight(2.5 + this.level);
      ellipse(0, 0, nr * 2, nr * 2);
      // 内发光核
      noStroke(); fill(r, g, b, alpha * 0.9);
      ellipse(0, 0, min(nr * 0.6, 14), min(nr * 0.6, 14));
      // 中心亮点
      fill(255, 230, 180, alpha);
      ellipse(0, 0, 5, 5);
      pop();
      return; // 不执行后面的pop
    } else if (this.towerType === 'ghost') {
      // 追踪导弹：紫色+发光尾迹
      fill(r,g,b,this.life*230);
      beginShape(); vertex(sz*1.2,0); vertex(-sz*0.4,sz*0.5); vertex(-sz*0.4,-sz*0.5); endShape(CLOSE);
      fill(255,200,255,this.life*160); ellipse(0,0,sz*0.7,sz*0.7);
      stroke(r,g,b,this.life*80); strokeWeight(sz*0.6); line(-sz*1.5,0,0,0); noStroke();
    } else if (this.towerType === 'scatter') {
      // 散射弹：细长红色
      fill(r,g,b,this.life*230);
      rectMode(CENTER); rect(0,0,sz*2.2,sz*0.4,1);
      fill(255,180,200,this.life*180); ellipse(sz*1.0,0,sz*0.55,sz*0.55);
    } else {
      // 默认（rapid等）
      rectMode(CENTER); rect(0,0,sz*2,sz*0.45,2);
    }
    pop();
  }
}

// 跳链电弧视觉（全局列表，每帧衰减）
let _chainArcs = [];

function _drawChainArcs() {
  _chainArcs = _chainArcs.filter(a => a.life > 0);
  for (const a of _chainArcs) {
    a.life--;
    const t = a.life / 16;
    const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    // 生成5段折线锯齿电弧
    const segs = 5;
    const pts = [{x: a.x1, y: a.y1}];
    for (let i = 1; i < segs; i++) {
      const frac = i / segs;
      const bx = a.x1 + dx * frac, by = a.y1 + dy * frac;
      // 垂直方向随机抖动
      const perp = random(-len * 0.18, len * 0.18);
      const nx = -dy / len, ny = dx / len;
      pts.push({ x: bx + nx * perp, y: by + ny * perp });
    }
    pts.push({x: a.x2, y: a.y2});
    push();
    // 外发光层（宽）
    noFill();
    stroke(80, 180, 255, t * 60); strokeWeight(6);
    beginShape();
    for (const p of pts) vertex(p.x, p.y);
    endShape();
    // 中层
    stroke(140, 210, 255, t * 140); strokeWeight(2.5);
    beginShape();
    for (const p of pts) vertex(p.x, p.y);
    endShape();
    // 内核白线
    stroke(220, 245, 255, t * 220); strokeWeight(1);
    beginShape();
    for (const p of pts) vertex(p.x, p.y);
    endShape();
    // 起点电击爆散
    noStroke(); fill(100, 200, 255, t * 180);
    ellipse(a.x1, a.y1, 7 * t, 7 * t);
    // 终点命中爆散
    fill(180, 235, 255, t * 200);
    ellipse(a.x2, a.y2, 10 * t, 10 * t);
    fill(255, 255, 255, t * 160);
    ellipse(a.x2, a.y2, 4 * t, 4 * t);
    // 辐射短线（命中点）
    stroke(100, 200, 255, t * 120); strokeWeight(1);
    for (let k = 0; k < 6; k++) {
      const ang = k * PI / 3 + a.life * 0.3;
      const r1 = 4, r2 = 8 + t * 4;
      line(a.x2 + cos(ang)*r1, a.y2 + sin(ang)*r1,
           a.x2 + cos(ang)*r2, a.y2 + sin(ang)*r2);
    }
    pop();
  }
}

let towers = [], projectiles = [];

function updateAndDrawTowers() {
  for (const t of towers) { t.update(); t.draw(); }
  // 磁场减速：每帧生效后消费掉（怪物移动前已被设置）
  // 跳链电弧视觉
  _drawChainArcs();
  projectiles = projectiles.filter(p => p.alive);
  for (const p of projectiles) { p.update(); p.draw(); }
}

function initTowers() { towers = []; projectiles = []; _chainArcs = []; }