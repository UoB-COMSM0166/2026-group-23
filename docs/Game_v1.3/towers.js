// ============================================================
//  towers.js  — 平衡版 v4
//  DPS 对照（60fps）：
//    BASIC   Lv1≈25  Lv2≈52  Lv3≈113
//    RAPID   Lv1≈36  Lv2≈83  Lv3≈180
//    AREA    Lv1≈12  Lv2≈25  Lv3≈53  (群体溅射×8弹)
//    LASER   Lv1≈24  Lv2≈50  Lv3≈96  (多目标锁定 Lv1×1 Lv2×2 Lv3×3)
//    NOVA    Lv1≈22  Lv2≈46  Lv3≈90  (范围光波，全场穿透)
//    FROST   Lv1≈12  Lv2≈26  Lv3≈55  (减速辅助)
//    A-AIR   Lv1≈90  Lv2≈192 Lv3≈400 (仅飞行，凤凰HP=100)
// ============================================================

const TOWER_DEFS = {
  basic: {
    name: '基础塔', label: 'BASIC', cost: 80,
    levels: [
      { dmg: 30,  range: 120, fireRate: 72, upgradeCost: 80  },
      { dmg: 52,  range: 138, fireRate: 60, upgradeCost: 130 },
      { dmg: 90,  range: 160, fireRate: 48, upgradeCost: 0   }
    ],
    projSpd: 8, color: [0, 180, 255], antiAir: false,
  },
  rapid: {
    name: '快速塔', label: 'RAPID', cost: 110,
    levels: [
      { dmg: 12, range: 100, fireRate: 20, upgradeCost: 100 },
      { dmg: 22, range: 115, fireRate: 16, upgradeCost: 160 },
      { dmg: 36, range: 132, fireRate: 12, upgradeCost: 0   }
    ],
    projSpd: 11, color: [255, 200, 0], antiAir: false,
  },
  area: {
    name: '范围塔', label: 'AREA', cost: 140,
    levels: [
      { dmg: 18,  range: 135, fireRate: 90, upgradeCost: 120 },
      { dmg: 32,  range: 155, fireRate: 78, upgradeCost: 190 },
      { dmg: 58,  range: 178, fireRate: 66, upgradeCost: 0   }
    ],
    projSpd: 5, color: [160, 80, 255], antiAir: false,
  },
  sniperAA: {
    name: '对空神弩', label: 'A-AIR', cost: 150,
    levels: [
      { dmg: 60,  range: 240, fireRate: 40, upgradeCost: 150 },
      { dmg: 115, range: 290, fireRate: 36, upgradeCost: 250 },
      { dmg: 200, range: 360, fireRate: 30, upgradeCost: 0   }
    ],
    projSpd: 16, color: [255, 80, 80], antiAir: true, onlyAir: true,
    jamImmune: true,
  },
  laser: {
    name: '激光切割者', label: 'LASER', cost: 180,
    // 多目标锁定：Lv1=1目标  Lv2=2目标  Lv3=3目标
    // DPS（单目标）Lv1≈24  Lv2≈50  Lv3≈96（多目标叠加后非常可观）
    levels: [
      { dmg: 65,  range: 150, fireRate: 163, upgradeCost: 170 }, // ~24/s
      { dmg: 115, range: 170, fireRate: 138, upgradeCost: 280 }, // ~50/s
      { dmg: 210, range: 198, fireRate: 131, upgradeCost: 0   }  // ~96/s MAX
    ],
    projSpd: 0, color: [0, 255, 150], antiAir: false,
  },
  // ── 新塔：Nova光波炮 ──
  // 发射向外扩散的环形光波，波环持续扩张，接触到的所有怪物都受到伤害
  // 穿透型群体攻击，适合路口拥挤场景；升级增加波环数量和伤害
  nova: {
    name: 'Nova光波炮', label: 'NOVA', cost: 200,
    levels: [
      { dmg: 38,  range: 145, fireRate: 105, upgradeCost: 190 }, // 1道光波，DPS≈22/s
      { dmg: 62,  range: 165, fireRate: 90,  upgradeCost: 300 }, // 2道光波，DPS≈41/s×2
      { dmg: 100, range: 188, fireRate: 78,  upgradeCost: 0   }  // 3道光波，DPS≈77/s×3
    ],
    projSpd: 0, color: [255, 140, 30], antiAir: false,
  },
  frost: {
    name: '霜冻塔', label: 'FROST', cost: 120,
    levels: [
      { dmg: 14, range: 112, fireRate: 70, upgradeCost: 100 },
      { dmg: 26, range: 130, fireRate: 60, upgradeCost: 170 },
      { dmg: 46, range: 155, fireRate: 50, upgradeCost: 0   }
    ],
    projSpd: 7, color: [150, 220, 255], antiAir: false, slowEffect: 0.5,
  }
};

class Tower {
  constructor(gridX, gridY, type) {
    this.gx = gridX; this.gy = gridY;
    this.px = gridX * CELL_SIZE + CELL_SIZE / 2;
    this.py = gridY * CELL_SIZE + CELL_SIZE / 2;
    this.type = type;
    this.level = 1;
    this.initStats();
    this.timer = 0;
    this.angle = 0;
    this.pulseTime = 0;
    this.shootFlash = 0;
    this.buildAnim = 1.0;
    this.upgradeEffect = 0;
    // 激光多目标
    this.laserTargets  = [];   // 当前帧锁定的目标列表
    this.laserBeamEnds = [];   // 对应的射线终点
    this.laserTarget   = null; // 向后兼容（主目标）
    this.laserBeamEnd  = null;
    // Nova 光波环列表
    this.novaWaves = [];  // [{r, maxR, dmg, col, damaged:[]}]
  }

  initStats() {
    const def = TOWER_DEFS[this.type];
    const lv  = def.levels[this.level - 1];
    this.dmg         = lv.dmg;
    this.range       = lv.range;
    this.fireRate    = lv.fireRate;
    this.upgradeCost = lv.upgradeCost;
    this.col         = def.color;
    this.antiAir     = def.antiAir;
    this.projSpd     = def.projSpd;
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

  findTarget() {
    if (!manager) return null;
    const def = TOWER_DEFS[this.type];
    let inRange = manager.getMonstersInRange(this.px, this.py, this.range, this.antiAir);
    if (def.onlyAir)      inRange = inRange.filter(m =>  m.isFlying);
    else if (!this.antiAir) inRange = inRange.filter(m => !m.isFlying);
    if (inRange.length === 0) return null;
    return inRange.reduce((best, m) => m.progress > best.progress ? m : best, inRange[0]);
  }

  update() {
    this.pulseTime += 0.05;
    if (this.shootFlash > 0) this.shootFlash--;
    this.timer++;
    if (this.buildAnim > 0) this.buildAnim = max(0, this.buildAnim - 0.05);

    const def    = TOWER_DEFS[this.type];
    const jammed = (typeof frameCount !== 'undefined' && typeof jammedUntilFrame !== 'undefined')
                   && frameCount < jammedUntilFrame;
    if (jammed && !def.jamImmune) {
      this.laserTargets = []; this.laserBeamEnds = [];
      this.laserTarget = null; this.laserBeamEnd = null;
      // Nova波环继续运动（干扰不影响已发射的波环）
      this._updateNovaWaves(); return;
    }

    // ── Nova 光波炮逻辑 ──
    if (this.type === 'nova') {
      this._updateNovaWaves();
      const target = this.findTarget();
      if (!target) return;
      if (this.timer >= this.fireRate) {
        this.timer = 0; this.shootFlash = 14;
        // 每级多发一道光波，所有波同心发射
        const waveCount = this.level; // Lv1=1, Lv2=2, Lv3=3
        for (let w = 0; w < waveCount; w++) {
          this.novaWaves.push({
            r:        w * 14,          // 多道波稍微错开起始半径
            maxR:     this.range,
            dmg:      this.dmg,
            col:      [...this.col],
            spd:      3.2 + this.level * 0.4,
            damaged:  new Set(),       // 已伤害过的怪物（每道波只打一次）
            life:     1.0,
            waveIdx:  w,
          });
        }
        spawnParticles(this.px, this.py, color(...this.col), 6);
      }
      return;
    }

    // ── 激光多目标逻辑 ──
    if (this.type === 'laser') {
      const maxTargets = this.level; // Lv1=1, Lv2=2, Lv3=3
      // 找范围内进度最高的 N 个地面怪
      let inRange = manager ? manager.getMonstersInRange(this.px, this.py, this.range, false) : [];
      inRange = inRange.filter(m => !m.isFlying);
      inRange.sort((a, b) => b.progress - a.progress);
      const targets = inRange.slice(0, maxTargets);

      this.laserTargets  = targets;
      this.laserBeamEnds = targets.map(t => ({ x: t.pos.x, y: t.pos.y }));
      this.laserTarget   = targets[0] || null;
      this.laserBeamEnd  = this.laserTarget ? { x: this.laserTarget.pos.x, y: this.laserTarget.pos.y } : null;

      if (this.laserTarget)
        this.angle = Math.atan2(this.laserTarget.pos.y - this.py, this.laserTarget.pos.x - this.px);

      if (this.laserTargets.length > 0 && this.timer >= this.fireRate) {
        this.timer = 0; this.shootFlash = 12;
        for (const t of this.laserTargets) {
          manager.damageAt(t.pos.x, t.pos.y, this.dmg, false, false);
          spawnParticles(t.pos.x, t.pos.y, color(...this.col), 3);
        }
      }
      return;
    }

    // ── 其他塔通用逻辑 ──
    const target = this.findTarget();
    if (!target) return;
    this.angle = Math.atan2(target.pos.y - this.py, target.pos.x - this.px);

    if (this.timer < this.fireRate) return;
    this.timer = 0; this.shootFlash = 10;

    if (this.type === 'area') {
      for (let i = 0; i < 8; i++) {
        const a = (TWO_PI / 8) * i + this.pulseTime;
        projectiles.push(new Projectile(this.px, this.py, a, this.projSpd, this.dmg, this.col, this.antiAir, this.type, this.level));
      }
    } else if (this.type === 'sniperAA') {
      const lead = 10;
      const pred = { x: target.pos.x + (target.spd||0)*lead, y: target.pos.y + (target.floatY||0) };
      const aa = Math.atan2(pred.y - this.py, pred.x - this.px);
      projectiles.push(new Projectile(this.px, this.py, aa, this.projSpd, this.dmg, this.col, this.antiAir, this.type, this.level));
    } else {
      projectiles.push(new Projectile(this.px, this.py, this.angle, this.projSpd, this.dmg, this.col, this.antiAir, this.type, this.level));
    }
  }

  // Nova 波环物理更新 + 伤害检测
  _updateNovaWaves() {
    if (!this.novaWaves) { this.novaWaves = []; return; }
    for (const w of this.novaWaves) {
      w.r    += w.spd;
      w.life  = 1 - w.r / w.maxR;
      // 检测所有怪物是否在波环上（内外各 ringThick/2 范围内）
      const ringThick = 10 + this.level * 2;
      if (manager) {
        for (const m of manager.monsters) {
          if (!m.alive || m.reached || m.isFlying) continue;
          if (w.damaged.has(m)) continue;
          const d = Math.hypot(m.pos.x - this.px, m.pos.y - this.py);
          if (d >= w.r - ringThick * 0.5 && d <= w.r + ringThick * 0.5) {
            m.takeDamage(w.dmg);
            w.damaged.add(m);
            spawnParticles(m.pos.x, m.pos.y, color(...w.col), 3);
          }
        }
      }
    }
    this.novaWaves = this.novaWaves.filter(w => w.r < w.maxR + 5);
  }

  draw() {
    push(); translate(this.px, this.py);
    const [r, g, b] = this.col;

    // 范围圈（在缩放外）
    if (dist(mouseX, mouseY, this.px, this.py) < CELL_SIZE * 0.5) {
      noFill(); stroke(r, g, b, 45); strokeWeight(1);
      ellipse(0, 0, this.range * 2, this.range * 2);
    }

    // 建造入场
    scale(1 - this.buildAnim * 0.55);

    // 升级光效
    if (this.upgradeEffect > 0) {
      const t = this.upgradeEffect / 40; this.upgradeEffect--;
      noFill(); stroke(255, 240, 180, t * 220); strokeWeight(1.5 + t * 3);
      rectMode(CENTER); rect(0, 0, CELL_SIZE * (0.92 - t*0.18), CELL_SIZE * (0.92 - t*0.18));
    }

    // 底座
    fill(10, 15, 25); stroke(r, g, b, 110); strokeWeight(0.8 + this.level * 0.4);
    rectMode(CENTER); rect(0, 0, CELL_SIZE * 0.62, CELL_SIZE * 0.62, 4);

    if      (this.type === 'basic')    this._drawBasic(r, g, b);
    else if (this.type === 'rapid')    this._drawRapid(r, g, b);
    else if (this.type === 'area')     this._drawArea(r, g, b);
    else if (this.type === 'laser')    this._drawLaser(r, g, b);
    else if (this.type === 'nova')     this._drawNova(r, g, b);
    else if (this.type === 'frost')    this._drawFrost(r, g, b);
    else if (this.type === 'sniperAA') this._drawSniper(r, g, b);

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

  _drawBasic(r, g, b) {
    push(); rotate(this.angle);
    const lv = this.level, cr = 9 + lv * 1.5;
    fill(18, 22, 38); stroke(r, g, b); strokeWeight(1 + lv * 0.3);
    rectMode(CENTER);
    if (lv === 1) { rect(cr+7, 0, 13, 4.5, 1); }
    else if (lv === 2) { rect(cr+7, -4, 14, 3.5, 1); rect(cr+7, 4, 14, 3.5, 1); }
    else {
      rect(cr+8, -6, 15, 3, 1); rect(cr+9, 0, 17, 3, 1); rect(cr+8, 6, 15, 3, 1);
      fill(r, g, b, 70); noStroke();
      triangle(0,-10, 7,-7, 0,-4); triangle(0,10, 7,7, 0,4);
    }
    fill(16, 22, 40); stroke(r, g, b, 170); strokeWeight(1.2);
    ellipse(0, 0, cr*2, cr*2);
    fill(r, g, b, 160 + sin(this.pulseTime*4)*60); noStroke();
    ellipse(0, 0, cr*0.65, cr*0.65);
    pop();
  }

  _drawRapid(r, g, b) {
    push(); rotate(this.angle);
    const lv = this.level, spd = this.pulseTime * (3 + lv);
    push(); rotate(-spd*0.4);
    stroke(r,g,b,80); fill(16,16,16); strokeWeight(0.7); rectMode(CENTER);
    for (let i=0;i<6;i++){push();rotate(i*PI/3);rect(9+lv,0,4,2.5);pop();}
    pop();
    push(); rotate(spd);
    const cnt = 3+lv;
    for (let i=0;i<cnt;i++){
      push(); rotate((TWO_PI/cnt)*i);
      fill(32,32,32); stroke(r,g,b); strokeWeight(0.8);
      rectMode(CENTER); rect(7+lv*1.5, 0, 7+lv*2, 2.5, 1);
      if (this.shootFlash>0){fill(255,140,0);noStroke();ellipse(11+lv*2.5,0,4,4);}
      pop();
    }
    pop();
    fill(r,g,b); noStroke(); ellipse(0,0,6+lv,6+lv);
    fill(255,220); ellipse(0,0,2.5,2.5);
    pop();
  }

  _drawArea(r, g, b) {
    const lv = this.level, bounce = sin(this.pulseTime*2)*2, orbR = 13+lv*2.5;
    noFill(); stroke(r,g,b,65); strokeWeight(0.8); ellipse(0,0,orbR*2,orbR*2);
    for (let i=0;i<2+lv;i++){
      const a=(TWO_PI/(2+lv))*i+this.pulseTime, d=orbR+bounce;
      push(); translate(cos(a)*d,sin(a)*d); rotate(a+HALF_PI);
      fill(12,10,26); stroke(r,g,b,195); strokeWeight(0.7); rectMode(CENTER);
      if (lv<3){rect(0,0,4.5,7.5,1);}
      else{beginShape();vertex(0,-7);vertex(3.5,4);vertex(-3.5,4);endShape(CLOSE);}
      stroke(r,g,b,38); strokeWeight(0.5); line(0,0,-cos(a)*d,-sin(a)*d);
      pop();
    }
    fill(16,12,32); stroke(r,g,b,190); strokeWeight(1.3);
    rectMode(CENTER); rect(0,0,9+lv*2,9+lv*2,2);
    fill(r,g,b,130+bounce*12); noStroke(); ellipse(0,0,4.5+lv*1.2,4.5+lv*1.2);
  }

  _drawLaser(r, g, b) {
    const lv = this.level;
    const charge = min(this.timer / this.fireRate, 1.0);
    const pulse  = sin(this.pulseTime * 7) * 0.5 + 0.5;
    const ready  = charge >= 0.97;
    const flash  = this.shootFlash > 0;

    // ── 先在世界坐标绘制所有射线（不受塔的 rotate 影响）──
    // 这样多条射线能分别指向各自目标
    if (this.laserBeamEnds && this.laserBeamEnds.length > 0) {
      push(); translate(this.px, this.py);
      for (let ti = 0; ti < this.laserBeamEnds.length; ti++) {
        const end  = this.laserBeamEnds[ti];
        const bLen = Math.hypot(end.x - this.px, end.y - this.py);
        const ang  = Math.atan2(end.y - this.py, end.x - this.px);
        const bw   = 0.7 + lv * 0.35;

        push(); rotate(ang);
        const sx = 14 + lv * 2;

        if (flash) {
          stroke(r,g,b,50);  strokeWeight(bw*7); line(sx,0,bLen,0);
          stroke(r,g,b,130); strokeWeight(bw*3); line(sx,0,bLen,0);
          stroke(210,255,230,255); strokeWeight(bw); line(sx,0,bLen,0);
          noStroke();
          fill(r,g,b,250); ellipse(bLen,0,13+lv*3,13+lv*3);
          fill(255,255,255,235); ellipse(bLen,0,5.5,5.5);
          if (lv===3){
            stroke(150,255,190,190); strokeWeight(0.8);
            line(bLen,0,bLen+random(-10,10),random(-9,-3));
            line(bLen,0,bLen+random(-10,10),random(3,9));
          }
        } else {
          const ga = 22 + charge * 80;
          stroke(r,g,b,ga*0.35); strokeWeight(4.5); line(sx,0,bLen,0);
          stroke(r,g,b,ga);      strokeWeight(0.9); line(sx,0,bLen,0);
          noStroke(); fill(r,g,b,ga*1.6);
          ellipse(bLen,0,2.5+charge*4,2.5+charge*4);
        }
        pop();
      }
      pop();
    }

    // ── 塔身本体（rotate 到主目标方向）──
    push(); rotate(this.angle);

    // 旋转约束环（蓄力越高转越快）
    for (let i = 0; i < lv; i++) {
      const s = 10 + i * 5;
      const rotSpd = this.pulseTime * (0.8 + i*0.4) * (1 + charge * 2.8);
      push(); rotate(i%2===0 ? rotSpd : -rotSpd);
      noFill(); stroke(r,g,b,55+charge*95-i*16); strokeWeight(1.2);
      ellipse(0,0,s*2,s*2);
      for (let k=0;k<4;k++){
        const a=k*HALF_PI;
        fill(r,g,b,110+charge*120); noStroke();
        ellipse(cos(a)*s,sin(a)*s,1.8+charge*1.4,1.8+charge*1.4);
      }
      pop();
    }

    // 炮管（随目标数量展开）
    for (let ti = 0; ti < lv; ti++) {
      const spreadA = (ti - (lv-1)/2) * 0.22; // 多管展开角度
      push(); rotate(spreadA);
      fill(10,24,18); stroke(r,g,b,155); strokeWeight(0.9);
      rectMode(CENTER); rect(9+lv*1.4, 0, 12+lv*2, 3.5+lv*0.4, 1);
      stroke(r,g,b,60); strokeWeight(0.6);
      for (let k=0;k<3;k++) line(5+k*3.5,-1.5,5+k*3.5,1.5);
      pop();
    }

    // 核心球（蓄力膨胀变红热）
    const cr = 5.5 + lv*1.1 + charge*4;
    const cg = floor(255*(1-charge*0.72));
    fill(r,cg,floor(b*(1-charge*0.85)),50+charge*115); noStroke();
    ellipse(0,0,cr*2,cr*2);
    fill(ready ? color(255,235,185,238) : color(185,255,215,190+pulse*50));
    ellipse(0,0,cr*0.6,cr*0.6);
    fill(255,255,255,205); ellipse(0,0,2.2,2.2);

    // 蓄力进度条
    if (this.laserBeamEnds && this.laserBeamEnds.length > 0) {
      const barW=20+lv*4, barH=2.8, bx=-barW/2, by=15+lv*1.8;
      fill(8,24,16); stroke(r,g,b,75); strokeWeight(0.6);
      rectMode(CORNER); rect(bx,by,barW,barH,1);
      noStroke();
      fill(lerpColor(color(0,175,90),color(255,235,60),charge));
      rect(bx,by,barW*charge,barH,1);
      if (ready){fill(255,255,185,110+sin(this.pulseTime*28)*75);rect(bx,by,barW,barH,1);}
      rectMode(CENTER);
    }
    pop();
  }

  _drawSniper(r, g, b) {
    push(); rotate(this.angle);
    const lv = this.level;
    for (let i=0;i<lv;i++){
      const off=i*4; stroke(r,g,b,170-i*35); strokeWeight(1); noFill();
      bezier(0,0,4,-7-off,8,-12-off,-3,-16-off);
      bezier(0,0,4,7+off,8,12+off,-3,16+off);
    }
    fill(22,22,38); stroke(r,g,b); strokeWeight(1.3);
    rectMode(CENTER); rect(9,0,17+lv*2,4.5,1);
    stroke(r,30,30,60); strokeWeight(0.7);
    for (let i=18;i<38;i+=5) line(i,0,i+2.5,0);
    fill(r,g,b,200); noStroke(); rectMode(CENTER); rect(1.5,0,6.5,6.5,1);
    fill(255,210,210,220); ellipse(1.5,0,2.8,2.8);
    if (lv===3&&random()<0.25){stroke(255,255,255,170);strokeWeight(0.7);line(1.5,-3.2,1.5+random(-3.5,3.5),-8);line(1.5,3.2,1.5+random(-3.5,3.5),8);}
    pop();
  }

  _drawFrost(r, g, b) {
    const lv=this.level, rot=this.pulseTime*0.5;
    noFill(); stroke(r,g,b,35); strokeWeight(4+lv*2); ellipse(0,0,34+lv*3);
    const cR=12+lv*1.8;
    for (let i=0;i<3+lv;i++){
      const a=rot+(TWO_PI/(3+lv))*i;
      push(); translate(cos(a)*cR,sin(a)*cR); rotate(a+QUARTER_PI);
      fill(210,235,255,175); stroke(r,g,b); strokeWeight(0.7);
      beginShape(); vertex(0,-4.5-lv*0.8); vertex(2.5,0); vertex(0,4.5+lv*0.8); vertex(-2.5,0); endShape(CLOSE);
      pop();
    }
    fill(r,g,b,85); noStroke(); push(); rotate(rot);
    rectMode(CENTER); rect(0,0,8+lv*2,8+lv*2,2); pop();
    fill(210,235,255,195); noStroke(); ellipse(0,0,3.5,3.5);
  }

  // ── NOVA 光波炮 ──
  _drawNova(r, g, b) {
    const lv = this.level;
    const pulse = sin(this.pulseTime * 5) * 0.5 + 0.5;

    // 1. 外旋能量环（等级数量的旋转光环）
    for (let i = 0; i < lv + 1; i++) {
      const s = 14 + i * 5;
      const spd = this.pulseTime * (1.2 + i * 0.7) * (i%2===0 ? 1 : -1);
      push(); rotate(spd);
      noFill(); stroke(r, g, b, 80 - i*15); strokeWeight(1.1);
      ellipse(0, 0, s*2, s*2);
      // 环上发光节点
      const nNodes = 4 + lv;
      for (let k = 0; k < nNodes; k++) {
        const a = (TWO_PI / nNodes) * k;
        fill(r, g, b, 160 + pulse*60); noStroke();
        ellipse(cos(a)*s, sin(a)*s, 2.2, 2.2);
      }
      pop();
    }

    // 2. 八方能量导槽（显示波的发射方向）
    for (let i = 0; i < 8; i++) {
      const a = (TWO_PI / 8) * i + this.pulseTime * 0.3;
      const inner = 8, outer = 13 + lv * 2;
      stroke(r, g, b, 55 + pulse*40); strokeWeight(1);
      line(cos(a)*inner, sin(a)*inner, cos(a)*outer, sin(a)*outer);
      if (this.shootFlash > 0) {
        stroke(r, g, b, 200); strokeWeight(1.5);
        line(cos(a)*inner, sin(a)*inner, cos(a)*(outer+6), sin(a)*(outer+6));
      }
    }

    // 3. 中央核心（击发时爆光）
    const baseR = 7 + lv * 1.5 + pulse * 2;
    fill(r, g, b, 70 + pulse * 60); noStroke(); ellipse(0, 0, baseR*2, baseR*2);
    if (this.shootFlash > 0) {
      fill(255, 220, 140, 230); ellipse(0, 0, (baseR + 6)*2, (baseR + 6)*2);
    }
    fill(r, g, b, 200); ellipse(0, 0, baseR*0.6, baseR*0.6);
    fill(255, 245, 200, 220); ellipse(0, 0, 3, 3);

    // 4. 绘制正在扩散的光波环（在世界坐标，需要 pop 出塔的 translate 后画）
    // 注意：这里直接在塔内坐标系绘制，因为 translate(px,py) 已经在 draw() 里做了
    for (const w of (this.novaWaves || [])) {
      const alpha = w.life * 200;
      const thick = (10 + lv * 2) * w.life;
      const [wr, wg, wb] = w.col;

      // 外光晕
      noFill(); stroke(wr, wg, wb, alpha * 0.35); strokeWeight(thick * 2.2);
      ellipse(0, 0, w.r * 2, w.r * 2);
      // 主环
      stroke(wr, wg, wb, alpha * 0.75); strokeWeight(thick);
      ellipse(0, 0, w.r * 2, w.r * 2);
      // 内亮边
      stroke(255, 235, 180, alpha * 0.9); strokeWeight(thick * 0.25);
      ellipse(0, 0, w.r * 2, w.r * 2);

      // 环上等间距火花
      const sparkCount = 8 + lv * 4;
      const offset = this.pulseTime * 0.8 + w.waveIdx * PI / 4;
      noStroke();
      for (let k = 0; k < sparkCount; k++) {
        const sa = (TWO_PI / sparkCount) * k + offset;
        fill(255, 245, 200, alpha * (0.4 + w.life * 0.5));
        ellipse(cos(sa)*w.r, sin(sa)*w.r, 2.5*w.life, 2.5*w.life);
      }
    }
  }
} // end class Tower

// ============================================================
//  Projectile
// ============================================================
class Projectile {
  constructor(x, y, angle, spd, dmg, col, antiAir, towerType, level) {
    this.x=x; this.y=y;
    this.vx=cos(angle)*spd; this.vy=sin(angle)*spd;
    this.dmg=dmg; this.col=col; this.antiAir=antiAir;
    this.towerType=towerType; this.level=level;
    this.alive=true; this.life=1.0;
  }
  update() {
    this.x+=this.vx; this.y+=this.vy; this.life-=0.012;
    if (this.life<=0){this.alive=false;return;}
    const isArea=(this.towerType==='area'), isAA=(this.towerType==='sniperAA');
    const hitR=isArea?16:isAA?18:10;
    let hits=manager.getMonstersInRange(this.x,this.y,hitR,this.antiAir);
    if (isAA) hits=hits.filter(m=>{const vy=m.floatY||0;return Math.hypot(m.pos.x-this.x,(m.pos.y+vy)-this.y)<=hitR;});
    if (hits.length>0){
      if (isArea){manager.damageInRadius(this.x,this.y,38+this.level*8,this.dmg,this.antiAir);spawnParticles(this.x,this.y,color(...this.col),7);}
      else{manager.damageAt(this.x,this.y,this.dmg,this.antiAir,false);spawnParticles(this.x,this.y,color(...this.col),isAA?9:4);}
      this.alive=false;
    }
  }
  draw() {
    const [r,g,b]=this.col;
    push(); translate(this.x,this.y); rotate(Math.atan2(this.vy,this.vx));
    const sz=4+this.level*1.5; noStroke(); fill(r,g,b,this.life*240);
    if (this.towerType==='area'){ellipse(0,0,sz*1.4,sz*1.4);fill(255,160);ellipse(0,0,sz*0.7,sz*0.7);}
    else if (this.towerType==='sniperAA'){rectMode(CENTER);rect(0,0,sz*2.5,sz*0.4,1);fill(255,200,200,this.life*180);ellipse(sz*1.2,0,sz*0.6,sz*0.6);}
    else{rectMode(CENTER);rect(0,0,sz*2,sz*0.45,2);}
    pop();
  }
}

let towers=[], projectiles=[];

function updateAndDrawTowers(){
  for (const t of towers){t.update();t.draw();}
  projectiles=projectiles.filter(p=>p.alive);
  for (const p of projectiles){p.update();p.draw();}
}

function initTowers(){ towers=[]; projectiles=[]; }