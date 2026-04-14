// ============================================================
//  towers.js  — v5  七座防御塔
// ============================================================
// 干扰半径（由Boss设置，towers读取做范围判断）
let jamRadius = 180;
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
    // ★ 唯一能无视机器人护盾的塔；充能20次可激活超级机枪模式
    levels: [
      { dmg: 16, range: 130, fireRate: 20, upgradeCost: 100 },
      { dmg: 28, range: 150, fireRate: 16, upgradeCost: 160 },
      { dmg: 44, range: 170, fireRate: 12, upgradeCost: 0   }
    ],
    projSpd: 16, color: [255, 200, 0], antiAir: false,
    ignoreRobotShield: true,
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
    // ★ 唯一能无视坦克护盾屏障的塔
    levels: [
      { dmg: 75,  range: 135, fireRate: 55,  upgradeCost: 140 },
      { dmg: 120, range: 155, fireRate: 45,  upgradeCost: 220 },
      { dmg: 190, range: 175, fireRate: 36,  upgradeCost: 0   }
    ],
    projSpd: 16, color: [100, 200, 255], antiAir: false,
    ignoreTankBarrier: true, // 无视坦克护盾屏障
  },
  magnet: {
    name: '磁场干扰塔', label: 'MAGNET', cost: 130,
    // 无伤害，持续减速：Lv1减50%  Lv2减65%  Lv3减80%（越靠近越慢）
    levels: [
      { dmg: 0, range: 140, fireRate: 999, upgradeCost: 110 },
      { dmg: 0, range: 165, fireRate: 999, upgradeCost: 180 },
      { dmg: 0, range: 190, fireRate: 999, upgradeCost: 0   }
    ],
    projSpd: 0, color: [120, 80, 255], antiAir: false,
    slowFactor: [0.5, 0.35, 0.2],
  },
  ghost: {
    name: '幽灵导弹塔', label: 'GHOST', cost: 190,
    // 发射追踪导弹：Lv1=1枚  Lv2=2枚  Lv3=3枚，命中范围爆炸
    // ★ 攻击范围几乎覆盖大半张地图（升级后接近全图）
    levels: [
      { dmg: 35,  range: 380, fireRate: 120, upgradeCost: 170 },
      { dmg: 55,  range: 440, fireRate: 100, upgradeCost: 270 },
      { dmg: 80,  range: 520, fireRate: 85,  upgradeCost: 0   }
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
  cannon: {
    name: '轨道巨炮', label: 'CANNON', cost: 350,
    // 全图攻击范围，超大范围爆炸，同时打击地面与空中
    // 蓄力时间最长，随机选择目标
    levels: [
      { dmg: 200, range: 9999, fireRate: 300, upgradeCost: 320 },
      { dmg: 300, range: 9999, fireRate: 240, upgradeCost: 500 },
      { dmg: 420, range: 9999, fireRate: 180, upgradeCost: 0   }
    ],
    projSpd: 18, color: [255, 60, 60], antiAir: false,
    cannonBlastRadius: [90, 115, 145], // 各等级爆炸半径
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

    // 散射对空炮加农炮专用
    this.mortarTimer     = 0;
    this.mortarReady     = false;
    this.mortarPulse     = 0;

    // 快速塔超级机枪专用
    this.rapidCharges    = 0;    // 当前充能次数（满20激活）
    this.rapidReady      = false; // 是否等待玩家点击激活
    this.rapidOverdrive  = false; // 超级机枪模式是否激活
    this.rapidFrames     = 0;    // 超级机枪剩余帧数
    this.rapidPulse      = 0;

    // 幽灵塔追踪导弹计数
    this.ghostShotCount  = 0;
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

    const jammed = (typeof frameCount !== 'undefined' && typeof jammedUntilFrame !== 'undefined'
                   && frameCount < jammedUntilFrame)
                   && (typeof jamPos === 'undefined' || jamPos === null ||
                       Math.hypot(this.px - jamPos.x, this.py - jamPos.y) <= (typeof jamRadius !== 'undefined' ? jamRadius : 180));
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
      case 'cannon':  this._updateCannon();  break;
    }
  }

  // ── 通用单体子弹 ──
  _updateGeneric() {
    if (this.type !== 'rapid') {
      // 非快速塔走原来逻辑
      const target = this.findTarget();
      if (!target) return;
      this.angle = Math.atan2(target.pos.y - this.py, target.pos.x - this.px);
      if (this.timer < this.fireRate) return;
      this.timer = 0; this.shootFlash = 8;
      const def = TOWER_DEFS[this.type];
      projectiles.push(new Projectile(this.px, this.py, this.angle, this.projSpd, this.dmg, this.col, false, this.type, this.level, null, def.ignoreRobotShield || false));
      return;
    }
    // ── 快速塔专属逻辑 ──
    this.rapidPulse += 0.08;
    if (this.rapidOverdrive) {
      this.rapidFrames--;
      if (this.rapidFrames <= 0) {
        this.rapidOverdrive = false;
        this.rapidCharges   = 0;
      }
    }
    const target = this.findTarget();
    if (!target) return;

    // 提前量瞄准：预测目标下一帧位置，对高速目标（蜘蛛）更准确
    const dist = Math.hypot(target.pos.x - this.px, target.pos.y - this.py);
    const flightTime = dist / this.projSpd; // 子弹飞行帧数估算
    // 用目标速度估算落点偏移（如果目标有速度信息）
    let aimX = target.pos.x, aimY = target.pos.y;
    if (target.seg < target.path.length - 1) {
      const nx = target.path[target.seg + 1].x - target.pos.x;
      const ny = target.path[target.seg + 1].y - target.pos.y;
      const nlen = Math.hypot(nx, ny) || 1;
      const spd = target.spd || 1;
      // 预测提前量 = 飞行时间 × 目标速度 × 方向
      const lead = flightTime * spd * 0.6; // 0.6系数避免过度补偿
      aimX = target.pos.x + (nx / nlen) * lead;
      aimY = target.pos.y + (ny / nlen) * lead;
    }
    this.angle = Math.atan2(aimY - this.py, aimX - this.px);

    const effectiveRate = this.rapidOverdrive ? floor(this.fireRate * 0.5) : this.fireRate;
    if (this.timer < effectiveRate) return;
    this.timer = 0; this.shootFlash = this.rapidOverdrive ? 12 : 8;
    const p = new Projectile(this.px, this.py, this.angle, this.projSpd, this.dmg, this.col, false, 'rapid', this.level, null, true);
    p.isOverdrive = this.rapidOverdrive;
    projectiles.push(p);
  }

  // 超级机枪模式激活（由UI点击调用）
  activateOverdrive() {
    if (!this.rapidReady) return;
    this.rapidReady     = false;
    this.rapidOverdrive = true;
    this.rapidFrames    = 300; // 5秒
    this.rapidCharges   = 0;
    spawnParticles(this.px, this.py, color(255, 220, 0), 25);
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

  // ── CHAIN 链式电弧（无子弹，瞬间伤害+电弧视觉）── ★无视坦克护盾屏障
  _updateChain() {
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
      const factor = lerp(minFactor, 0.75, d / this.range);
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
    // 每发射9发后额外发射一颗对空追踪导弹
    this.ghostShotCount++;
    if (this.ghostShotCount >= 3) {
      this.ghostShotCount = 0;
      // 寻找范围内空中目标（全图范围）
      const airCandidates = manager.monsters.filter(m =>
        m.alive && !m.reached &&
        (m instanceof MechPhoenix || m instanceof GhostBird ||
         (m instanceof BossCarrier && !m.grounded)) &&
        !(m instanceof GhostBird && m.isGhost)
      ).sort((a, b) => b.progress - a.progress);
      if (airCandidates.length > 0) {
        const airTgt = airCandidates[0];
        const a = Math.atan2(airTgt.pos.y - this.py, airTgt.pos.x - this.px);
        // 追踪导弹伤害是普通弹的2倍，速度更快
        const missile = new Projectile(this.px, this.py, a, this.projSpd * 2.2, floor(this.dmg * 0.4), this.col, true, 'ghost', this.level);
        missile.target = airTgt;
        missile.isAirMissile = true;
        projectiles.push(missile);
        spawnParticles(this.px, this.py, color(...this.col), 8);
      }
    }
  }

  // ── SCATTER 散射对空 ──
  _updateScatter() {
    this.mortarPulse += 0.06;
    // 加农炮蓄力计时（30秒=1800帧，升级缩短：Lv2=1500，Lv3=1200）
    const mortarCDs = [1800, 1500, 1200];
    if (!this.mortarReady) {
      this.mortarTimer++;
      if (this.mortarTimer >= mortarCDs[this.level - 1]) {
        this.mortarReady = true;
        spawnParticles(this.px, this.py, color(255, 200, 50), 16);
      }
    }

    // 普通扇形射击
    const target = this.findTarget(true);
    if (!target) return;
    this.angle = Math.atan2(target.pos.y - this.py, target.pos.x - this.px);
    if (this.timer < this.fireRate) return;
    this.timer = 0; this.shootFlash = 10;
    const bulletCounts = [3, 5, 7];
    const count = bulletCounts[this.level - 1];
    const spread = 0.28;
    for (let i = 0; i < count; i++) {
      const a = this.angle + lerp(-spread, spread, count > 1 ? i / (count - 1) : 0.5);
      projectiles.push(new Projectile(this.px, this.py, a, this.projSpd, this.dmg, this.col, true, 'scatter', this.level));
    }
  }

  // 加农炮发射（由UI点击调用）
  fireMortar(tx, ty) {
    if (!this.mortarReady) return;
    this.mortarReady = false;
    this.mortarTimer = 0;
    // 各等级伤害和爆炸半径（高伤害）
    const dmgs    = [600, 950, 1400];
    const radii   = [90,  115, 145];
    const dmg     = dmgs[this.level - 1];
    const radius  = radii[this.level - 1];
    _mortarShells.push({
      tx, ty,
      flyFrames: 120,   // 飞行2秒，下落过程慢而有压迫感
      timer: 0,
      dmg, radius,
      exploded: false,
      blastLife: 0,
    });
  }

  // ── CANNON 轨道巨炮 —— 全图，空陆两用，随机攻击目标，蓄力最久 ──
  _updateCannon() {
    if (!manager) return;
    // 只在开炮时重新随机目标，蓄力期间锁定目标不变，避免枪头乱甩
    if (!this._cannonTarget || !this._cannonTarget.alive || this._cannonTarget.reached) {
      const allTargets = manager.monsters.filter(m =>
        m.alive && !m.reached && !(m instanceof GhostBird && m.isGhost)
      );
      if (allTargets.length === 0) return;
      this._cannonTarget = allTargets[Math.floor(Math.random() * allTargets.length)];
    }
    const target = this._cannonTarget;
    this.angle = Math.atan2(target.pos.y - this.py, target.pos.x - this.px);
    if (this.timer < this.fireRate) return;
    this.timer = 0; this.shootFlash = 20;
    const def = TOWER_DEFS.cannon;
    const blastR = def.cannonBlastRadius[this.level - 1];
    const shell = new Projectile(this.px, this.py, this.angle, this.projSpd, this.dmg, this.col, false, 'cannon', this.level);
    shell.isCannonShell = true;
    shell.targetX = target.pos.x;
    shell.targetY = target.pos.y;
    shell.blastRadius = blastR;
    shell.life = 1.0;
    projectiles.push(shell);
    // 开炮后重新随机下一个目标
    this._cannonTarget = null;
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
      case 'cannon':  this._drawCannon(r, g, b);  break;
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
    const lv = this.level;

    // 超级机枪光环
    if (this.rapidOverdrive) {
      const ot = this.rapidFrames / 300;
      const op = sin(this.rapidPulse * 6) * 0.4 + 0.6;
      noFill(); stroke(255,220,0, 80*op*ot); strokeWeight(8);
      ellipse(0,0,58,58);
      stroke(255,255,100, 140*op*ot); strokeWeight(2);
      ellipse(0,0,58,58);
    }
    // 充能就绪光环
    if (this.rapidReady && !this.rapidOverdrive) {
      const rp = sin(this.rapidPulse*4)*0.5+0.5;
      noFill(); stroke(255,220,0,80+rp*120); strokeWeight(3+rp*2);
      ellipse(0,0,52+rp*6,52+rp*6);
      fill(255,220,0,180+rp*60); noStroke(); textSize(8); textAlign(CENTER);
      text('★ OVERDRIVE', 0, -30);
    }

    push(); rotate(this.angle);
    const spd = this.pulseTime * (3 + lv) * (this.rapidOverdrive ? 2.5 : 1);
    push(); rotate(-spd*0.4);
    const rc = this.rapidOverdrive ? color(255,255,100) : color(r,g,b);
    stroke(rc,80); fill(16,16,16); strokeWeight(0.7); rectMode(CENTER);
    for (let i=0;i<6;i++){push();rotate(i*PI/3);rect(9+lv,0,4,2.5);pop();}
    pop();
    push(); rotate(spd);
    const cnt=3+lv;
    for (let i=0;i<cnt;i++){
      push(); rotate((TWO_PI/cnt)*i);
      fill(32,32,32); stroke(this.rapidOverdrive?color(255,255,100):color(r,g,b)); strokeWeight(0.8);
      rectMode(CENTER); rect(7+lv*1.5,0,7+lv*2,2.5,1);
      if (this.shootFlash>0){
        fill(this.rapidOverdrive?color(255,255,100):color(255,180,0));
        noStroke(); ellipse(11+lv*2.5,0,this.rapidOverdrive?6:4,this.rapidOverdrive?6:4);
      }
      pop();
    }
    pop();
    fill(this.rapidOverdrive?color(255,255,100):color(r,g,b)); noStroke();
    ellipse(0,0,6+lv,6+lv);
    fill(255,220); ellipse(0,0,2.5,2.5);
    pop();

    // 充能条（快速塔专属）
    const maxCharges = 20;
    const bW=24, bH=3, bx=-bW/2, by=15;
    fill(10,8,2,180); stroke(r,g,b,60); strokeWeight(0.5);
    rectMode(CORNER); rect(bx,by,bW,bH,1);
    noStroke();
    if (this.rapidReady) {
      fill(255,220,0,180+sin(this.rapidPulse*8)*60); rect(bx,by,bW,bH,1);
    } else {
      fill(this.rapidOverdrive?color(255,255,100,200):color(255,180,0,180));
      rect(bx,by,bW*(this.rapidCharges/maxCharges),bH,1);
    }
    rectMode(CENTER);
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
    const lv=this.level, pulse=sin(this.pulseTime*4)*0.5+0.5;
    const mortarCDs=[1800,1500,1200];

    // 加农炮就绪指示
    if (this.mortarReady) {
      const mp = sin(this.mortarPulse*4)*0.5+0.5;
      noFill(); stroke(255,220,50,100+mp*120); strokeWeight(3+mp*2);
      ellipse(0,0,52+mp*6,52+mp*6);
      stroke(255,200,30,60+mp*80); strokeWeight(1);
      ellipse(0,0,62+mp*4,62+mp*4);
      fill(255,220,50,200+mp*50); noStroke(); textSize(8); textAlign(CENTER);
      text('★ READY', 0, -34);
    } else {
      // 充能进度弧
      const charge = this.mortarTimer / mortarCDs[lv-1];
      noFill(); stroke(255,200,50,30+charge*60); strokeWeight(1.5);
      arc(0,0,48,48,-HALF_PI,-HALF_PI+TWO_PI*charge);
    }

    push(); rotate(this.angle);
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
    fill(22,8,14); stroke(r,g,b,180+(this.mortarReady?60:0)); strokeWeight(1.3);
    rectMode(CENTER); ellipse(0,0,12+lv*2,12+lv*2);
    noFill(); stroke(r,g,b,120+pulse*80); strokeWeight(1);
    ellipse(0,0,8+lv,8+lv);
    line(-5,0,5,0); line(0,-5,0,5);
    fill(this.mortarReady?color(255,220,50,230):color(r,g,b,200+pulse*50)); noStroke(); ellipse(0,0,3,3);
    pop();
  }

  // ── CANNON 轨道巨炮 ──
  _drawCannon(r, g, b) {
    const lv = this.level;
    const charge = min(this.timer / this.fireRate, 1.0);
    const pulse = sin(this.pulseTime * 3) * 0.5 + 0.5;
    const ready = charge >= 0.97;

    // 旋转光环（比其他塔大20%）
    push(); rotate(this.pulseTime * (0.5 + charge * 3));
    noFill(); strokeWeight(1.2 + lv * 0.42);
    stroke(r, g, b, 55 + charge * 120);
    ellipse(0, 0, (17.28 + lv * 2.88) * 2, (17.28 + lv * 2.88) * 2);
    for (let i = 0; i < 4; i++) {
      const a = (TWO_PI / 4) * i;
      const rr = 17.28 + lv * 2.88;
      fill(r, g, b, 140 + charge * 80); noStroke();
      ellipse(cos(a) * rr, sin(a) * rr, 2.88 + charge * 2.88, 2.88 + charge * 2.88);
    }
    pop();

    // 蓄力满时瞄准线
    if (ready && this._cannonTarget && this._cannonTarget.alive) {
      const tx = this._cannonTarget.pos.x - this.px;
      const ty = this._cannonTarget.pos.y - this.py;
      stroke(r, g, b, 60 + pulse * 40); strokeWeight(0.7); noFill();
      const len = Math.hypot(tx, ty);
      const steps = floor(len / 18);
      for (let s = 0; s < steps; s += 2) {
        line(lerp(0,tx,s/steps), lerp(0,ty,s/steps),
             lerp(0,tx,(s+1)/steps), lerp(0,ty,(s+1)/steps));
      }
      noFill(); stroke(r, g, b, 160 + pulse * 50); strokeWeight(1.2);
      ellipse(tx, ty, 25.92 + pulse * 8.64, 25.92 + pulse * 8.64);
      stroke(r, g, b, 100); strokeWeight(0.7);
      line(tx - 12.96, ty, tx + 12.96, ty); line(tx, ty - 12.96, tx, ty + 12.96);
    }

    push(); rotate(this.angle);
    fill(15, 8, 8); stroke(r, g, b, 200); strokeWeight(1.68);
    rectMode(CENTER);
    rect(2.88, 0, 17.28, 12.96 + lv * 1.44, 2);
    rect(14.4 + lv * 2.88, 0, 20.16 + lv * 2.88, 8.64, 1);
    fill(r, g, b, 50 + charge * 130); noStroke();
    rect(24.48 + lv * 2.88, 0, 5.76, 5.76, 1);
    if (this.shootFlash > 0) {
      noStroke(); fill(255, 180, 80, 230);
      ellipse(27.36 + lv * 2.88, 0, 20.16, 20.16);
      fill(255, 255, 200, 200);
      ellipse(27.36 + lv * 2.88, 0, 8.64, 8.64);
    }
    for (let i = -1; i <= 1; i += 2) {
      fill(20, 10, 10); stroke(r, g, b, 130); strokeWeight(0.9);
      rect(7.2, i * (7.2 + lv * 0.72), 10.08, 4.32, 1);
    }
    pop();

    // 核心
    const cr = 7.2 + lv * 1.44 + charge * 3.6;
    fill(r, floor(g * (1 - charge * 0.8)), floor(b * (1 - charge * 0.8)), 80 + charge * 130);
    noStroke(); ellipse(0, 0, cr * 2, cr * 2);
    fill(ready ? color(255, 100, 60, 240) : color(r, g, b, 180 + pulse * 60));
    ellipse(0, 0, cr * 0.5, cr * 0.5);
    fill(255, 255, 255, 200); ellipse(0, 0, 2.88, 2.88);

    // 蓄力条
    const bW = 25.92 + lv * 4.32, bH = 3.6, bx = -bW / 2, by = 20.16 + lv * 1.44;
    fill(12, 6, 6); stroke(r, g, b, 80); strokeWeight(0.5);
    rectMode(CORNER); rect(bx, by, bW, bH, 1);
    noStroke();
    fill(ready ? color(255, 80, 40) : lerpColor(color(180, 30, 30), color(255, 120, 40), charge));
    rect(bx, by, bW * charge, bH, 1);
    if (ready) { fill(255, 150, 80, 100 + sin(this.pulseTime * 25) * 80); rect(bx, by, bW, bH, 1); }
    rectMode(CENTER);
  }
} // end class Tower

// ============================================================
//  Projectile — 支持 nova穿透、chain跳链、ghost追踪、scatter对空
// ============================================================
class Projectile {
  constructor(x, y, angle, spd, dmg, col, antiAir, towerType, level, chainTarget, ignoreRobotShield) {
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
    // 快速塔专属：无视机器人护盾
    this.ignoreRobotShield = ignoreRobotShield || false;
    // 快速塔专属
    this.isOverdrive = false;
    this.srcX = x; this.srcY = y; // 记录发射源坐标用于充能回溯
    this.isCannonShell = false;
    this.targetX = 0; this.targetY = 0;
    this.blastRadius = 0;
  }

  update() {
    // Ghost 追踪逻辑（地面导弹）
    if (this.towerType === 'ghost' && !this.isAirMissile && manager) {
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
    // 对空追踪导弹逻辑（幽灵塔第9发）
    if (this.towerType === 'ghost' && this.isAirMissile && manager) {
      if (!this.target || !this.target.alive || this.target.reached) {
        // 重新寻找最近空中目标
        const airTargets = manager.monsters.filter(m =>
          m.alive && !m.reached &&
          (m instanceof MechPhoenix || m instanceof GhostBird ||
           (m instanceof BossCarrier && !m.grounded)) &&
          !(m instanceof GhostBird && m.isGhost)
        );
        this.target = airTargets.length > 0
          ? airTargets.reduce((best, m) => distAB({x:this.x,y:this.y}, m.pos) < distAB({x:this.x,y:this.y}, best.pos) ? m : best, airTargets[0])
          : null;
      }
      if (this.target) {
        const desiredA = Math.atan2(this.target.pos.y - this.y, this.target.pos.x - this.x);
        let curA = Math.atan2(this.vy, this.vx);
        let diff = desiredA - curA;
        while (diff > PI)  diff -= TWO_PI;
        while (diff < -PI) diff += TWO_PI;
        curA += constrain(diff, -this.turnSpd * 4.0, this.turnSpd * 4.0); // 对空导弹高转向速率
        const spd = Math.hypot(this.vx, this.vy);
        this.vx = cos(curA) * spd; this.vy = sin(curA) * spd;
      }
    }

    // Nova：子弹越飞越大
    if (this.towerType === 'nova') {
      this.novaRadius = 4 + (1.0 - this.life) * 55;
    }

    this.x += this.vx; this.y += this.vy;
    if (this.towerType !== 'cannon' && this.towerType !== 'ghost') {
      this.life -= 0.012;
      if (this.life <= 0) { this.alive = false; return; }
    } else {
      // ghost/cannon 子弹只在命中目标时消亡，不自动衰减
      // 但超出地图边界时清除
      if (this.x < -200 || this.x > width + 200 || this.y < -200 || this.y > height + 200) {
        this.alive = false; return;
      }
      this.life = max(this.life - 0.003, 0.1); // 视觉淡出用，不归零
    }

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

    // 大炮炮弹：飞向目标点，到达后范围爆炸（同时伤害空中和地面）
    if (this.towerType === 'cannon') {
      const dx = this.targetX - this.x, dy = this.targetY - this.y;
      const dist2 = Math.hypot(dx, dy);
      if (dist2 <= Math.hypot(this.vx, this.vy) * 1.5) {
        // 到达目标点，范围爆炸（同时打击地面+空中）
        if (manager) {
          for (const m of manager.monsters) {
            if (!m.alive || m.reached) continue;
            if (m instanceof GhostBird && m.isGhost) continue;
            if (Math.hypot(m.pos.x - this.targetX, m.pos.y - this.targetY) <= this.blastRadius) {
              m.takeDamage(this.dmg);
              spawnParticles(m.pos.x, m.pos.y, color(...this.col), 8);
            }
          }
        }
        // 爆炸粒子
        spawnParticles(this.targetX, this.targetY, color(...this.col), 30);
        _cannonBlasts.push({ x: this.targetX, y: this.targetY, r: this.blastRadius, life: 30 });
        this.alive = false;
      }
      return;
    }

    const hitR = isGhost ? 14 : isScatter ? 16 : 10;
    let hits = manager ? manager.getMonstersInRange(this.x, this.y, hitR, this.antiAir) : [];
    if (this.antiAir) hits = hits.filter(m => m.isFlying || (m instanceof BossCarrier && !m.grounded));
    else              hits = hits.filter(m => !m.isFlying);
    // 对空导弹用自己的范围检测，不依赖hits
    if (hits.length === 0 && !this.isAirMissile) return;

    if (isGhost && this.isAirMissile) {
      // 对空追踪导弹：靠近空中目标时爆炸+减速
      const airHits = manager.monsters.filter(m =>
        m.alive && !m.reached &&
        (m instanceof MechPhoenix || m instanceof GhostBird ||
         (m instanceof BossCarrier && !m.grounded)) &&
        !(m instanceof GhostBird && m.isGhost) &&
        Math.hypot(m.pos.x - this.x, m.pos.y - this.y) <= 18
      );
      if (airHits.length === 0) return; // 还没靠近目标
      for (const m of airHits) {
        // 对所有空中目标直接修改baseSpd实现减速，3秒后恢复
        if (!m._airSlowApplied) {
          m._origBaseSpd = m.baseSpd || m.spd;
          m.baseSpd = m._origBaseSpd * 0.45;
          if (!m.baseSpd) m.spd = m._origBaseSpd * 0.45; // BossCarrier用spd
          m._airSlowApplied = true;
          m._airSlowExpire = frameCount + 180;
        }
        m.takeDamage(this.dmg);
        spawnParticles(m.pos.x, m.pos.y, color(100, 200, 255), 10);
      }
      spawnParticles(this.x, this.y, color(100, 200, 255), 12);
      this.alive = false;
    } else if (isGhost) {
      manager.damageInRadius(this.x, this.y, 30 + this.level * 8, this.dmg, false);
      spawnParticles(this.x, this.y, color(...this.col), 10);
      this.alive = false;
    } else if (isScatter) {
      // 散射弹对BossCarrier造成3倍伤害（对空Boss专属加成）
      const scatterTargets = hits.filter(m => m.isFlying || (m instanceof BossCarrier && !m.grounded));
      for (const m of scatterTargets) {
        const bonusMult = (m instanceof BossCarrier) ? 3.0 : 1.0;
        m.takeDamage(floor(this.dmg * bonusMult));
        spawnParticles(m.pos.x, m.pos.y, color(...this.col), 6);
      }
      this.alive = false;
    } else {
      // rapid 等普通单体
      manager.damageAt(this.x, this.y, this.dmg, false, false, false, this.ignoreRobotShield);
      spawnParticles(this.x, this.y, color(...this.col), 4);

      // 快速塔专属：命中充能 + 超级机枪电弧跳链
      if (this.towerType === 'rapid') {
        // 找到命中的目标
        const hitTarget = manager ? manager.monsters.find(m =>
          m.alive && !m.reached && !m.isFlying &&
          Math.hypot(m.pos.x - this.x, m.pos.y - this.y) <= m.radius + 5
        ) : null;

        // 充能（每次命中+1，满20通知对应塔）
        if (towers) {
          const srcTower = towers.find(t =>
            t.type === 'rapid' &&
            Math.hypot(t.px - this.srcX, t.py - this.srcY) < 5
          );
          if (srcTower && !srcTower.rapidOverdrive && !srcTower.rapidReady) {
            srcTower.rapidCharges++;
            if (srcTower.rapidCharges >= 20) {
              srcTower.rapidCharges = 20;
              srcTower.rapidReady   = true;
              spawnParticles(srcTower.px, srcTower.py, color(255,220,0), 16);
            }
          }
        }

        // 超级机枪模式：每弹电弧跳链最近2只怪，无视所有护盾
        if (this.isOverdrive && hitTarget && manager) {
          let lastPos = { x: hitTarget.pos.x, y: hitTarget.pos.y };
          const hit = new Set([hitTarget]);
          for (let j = 0; j < 2; j++) {
            const nearby = manager.monsters.filter(m =>
              m.alive && !m.reached && !m.isFlying && !hit.has(m) &&
              Math.hypot(m.pos.x - lastPos.x, m.pos.y - lastPos.y) <= 120
            );
            if (nearby.length === 0) break;
            const next = nearby.reduce((a, b) =>
              Math.hypot(b.pos.x-lastPos.x,b.pos.y-lastPos.y) <
              Math.hypot(a.pos.x-lastPos.x,a.pos.y-lastPos.y) ? b : a
            );
            // 电弧伤害无视所有护盾（直接扣HP）
            next.hp -= floor(this.dmg * 0.6);
            if (next.hp <= 0) { next.alive = false; spawnParticles(next.pos.x,next.pos.y,next.deathColor,20); }
            spawnParticles(next.pos.x, next.pos.y, color(255,220,80), 5);
            _chainArcs.push({ x1: lastPos.x, y1: lastPos.y, x2: next.pos.x, y2: next.pos.y, life: 12, col: [255,220,80] });
            lastPos = { x: next.pos.x, y: next.pos.y };
            hit.add(next);
          }
        }
      }
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
    } else if (this.towerType === 'cannon') {
      // 大炮炮弹：大圆球+火焰尾迹
      pop(); push(); translate(this.x, this.y); rotate(Math.atan2(this.vy, this.vx));
      const cs = 7 + this.level * 2;
      // 尾迹火焰
      noStroke(); fill(r, g, b, this.life * 80);
      ellipse(-cs * 2, 0, cs * 3, cs * 1.5);
      fill(255, 160, 60, this.life * 140);
      ellipse(-cs * 1.2, 0, cs * 2, cs);
      // 炮弹主体
      fill(r, g, b, this.life * 240);
      ellipse(0, 0, cs * 2, cs * 1.6);
      fill(255, 200, 120, this.life * 200);
      ellipse(0, 0, cs * 0.8, cs * 0.8);
      fill(255, 255, 255, this.life * 180);
      ellipse(0, 0, 3, 3);
      pop();
      return;
    } else if (this.towerType === 'ghost' && this.isAirMissile) {
      // 对空追踪导弹：蓝白色，细长锥形+冰蓝尾迹
      fill(100, 220, 255, this.life*230);
      beginShape(); vertex(sz*1.4,0); vertex(-sz*0.3,sz*0.45); vertex(-sz*0.3,-sz*0.45); endShape(CLOSE);
      fill(220, 245, 255, this.life*180); ellipse(0,0,sz*0.6,sz*0.6);
      stroke(100,200,255,this.life*100); strokeWeight(sz*0.8); line(-sz*2,0,0,0); noStroke();
      // 减速冰晶特效小点
      fill(180,240,255,this.life*120); noStroke();
      ellipse(-sz*0.8, sz*0.3, sz*0.35, sz*0.35);
      ellipse(-sz*0.8, -sz*0.3, sz*0.35, sz*0.35);
    } else if (this.towerType === 'ghost') {
      // 追踪导弹（地面）：紫色+发光尾迹
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
// 大炮爆炸效果（全局列表）
let _cannonBlasts = [];
// 加农炮炮弹（全局列表）
let _mortarShells = [];

function _updateDrawMortarShells() {
  _mortarShells = _mortarShells.filter(s => !s.exploded || s.blastLife > 0);
  for (const s of _mortarShells) {
    if (s.exploded) {
      // 爆炸扩散动画
      s.blastLife--;
      const t = s.blastLife / 30;
      push(); translate(s.tx, s.ty);
      noFill(); stroke(255,180,40,t*180); strokeWeight(4+(1-t)*8);
      ellipse(0,0,s.radius*2*(2-t),s.radius*2*(2-t));
      stroke(255,100,20,t*120); strokeWeight(10);
      ellipse(0,0,s.radius*(1.5-t*0.5)*2,s.radius*(1.5-t*0.5)*2);
      noStroke(); fill(255,200,80,t*100);
      ellipse(0,0,s.radius*t*1.2*2,s.radius*t*1.2*2);
      fill(255,255,200,t*200); ellipse(0,0,18*t,18*t);
      pop();
      continue;
    }

    s.timer++;
    const t = s.timer / s.flyFrames; // 0→1飞行进度

    // 抛物线轨迹：先从屏幕上方高空入场，再加速下落
    // 高空起点（屏幕外很高的位置）
    const startX = s.tx + 80;     // 从目标右上方入场
    const startY = -200;
    // 抛物线：缓入快出（ease-in）
    const ease = t * t;           // 加速下落感
    const cx = lerp(startX, s.tx, t);
    const cy = lerp(startY, s.ty, ease);

    // 炮弹朝向（沿飞行方向旋转）
    const angle = Math.atan2(s.ty - startY, s.tx - startX);

    // 画炮弹
    push(); translate(cx, cy); rotate(angle + HALF_PI);

    // 尾焰（越接近落点越长越亮）
    const flameLen = 20 + ease * 40;
    for (let k = 0; k < 3; k++) {
      const fw = (3-k) * 4;
      const falpha = (1 - k*0.25) * (100 + ease * 140);
      noStroke(); fill(255, lerp(200,80,k*0.5), 20, falpha);
      ellipse(0, flameLen * (0.3 + k*0.25), fw, flameLen * 0.5);
    }
    fill(255, 255, 180, 180 + ease * 60); noStroke();
    ellipse(0, 8, 6, 10); // 核心亮点

    // 弹体（圆润炮弹形）
    fill(60, 40, 15); stroke(200, 150, 50, 230); strokeWeight(1.5);
    rectMode(CENTER); rect(0, 0, 14, 22, 4);
    // 弹头
    fill(220, 160, 40); noStroke();
    ellipse(0, -11, 14, 14);
    // 弹体高光
    fill(255, 220, 100, 120); noStroke();
    ellipse(-3, -6, 4, 10);
    // 弹尾稳定翼
    fill(100, 70, 20); stroke(180, 130, 40, 180); strokeWeight(1);
    triangle(-7, 11, -10, 18, -5, 14);
    triangle( 7, 11,  10, 18,  5, 14);

    pop();

    // 落点预警圈（越接近落点越亮越大，营造压迫感）
    const warnAlpha = 60 + ease * 160;
    const warnScale = 0.6 + ease * 0.5; // 圈从小变大
    noFill();
    stroke(255, 60, 0, warnAlpha * 0.8); strokeWeight(6 + ease * 4);
    ellipse(s.tx, s.ty, s.radius * 2 * warnScale, s.radius * 2 * warnScale);
    stroke(255, 160, 30, warnAlpha); strokeWeight(2);
    ellipse(s.tx, s.ty, s.radius * 2 * warnScale, s.radius * 2 * warnScale);
    // 内圈十字
    stroke(255, 100, 20, warnAlpha * 0.6); strokeWeight(1);
    const cr = s.radius * warnScale;
    line(s.tx - cr, s.ty, s.tx + cr, s.ty);
    line(s.tx, s.ty - cr, s.tx, s.ty + cr);
    // 影子（落点中心小圆，给玩家视觉落点参考）
    noStroke(); fill(255, 80, 0, 40 + ease * 80);
    ellipse(s.tx, s.ty, 20 + ease * 20, 20 + ease * 20);

    if (s.timer >= s.flyFrames) {
      // 命中爆炸
      s.exploded = true;
      s.blastLife = 30;
      spawnParticles(s.tx, s.ty, color(255,160,20), 35);
      // 范围伤害：无视坦克护盾（除坦克自身护盾激活时）
      if (typeof manager !== 'undefined') {
        for (const m of manager.monsters) {
          if (!m.alive || m.reached) continue;
          if (m instanceof GhostBird && m.isGhost) continue;
          if (Math.hypot(m.pos.x - s.tx, m.pos.y - s.ty) <= s.radius) {
            // 坦克护盾屏障范围内的地面怪免疫（但坦克自身受伤）
            if (!m.isFlying && m._tankShielded > 0 && !(m instanceof MechTank)) continue;
            m.takeDamage(s.dmg);
            spawnParticles(m.pos.x, m.pos.y, color(255,140,20), 8);
          }
        }
      }
    }
  }
}

function _drawChainArcs() {
  _chainArcs = _chainArcs.filter(a => a.life > 0);
  for (const a of _chainArcs) {
    a.life--;
    const maxLife = a.col ? 12 : 16;
    const t = a.life / maxLife;
    const cr = a.col ? a.col[0] : 80;
    const cg = a.col ? a.col[1] : 180;
    const cb = a.col ? a.col[2] : 255;
    const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
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
    noFill();
    stroke(cr*0.3, cg*0.7, cb, t * 60); strokeWeight(6);
    beginShape();
    for (const p of pts) vertex(p.x, p.y);
    endShape();
    stroke(cr*0.55, cg*0.83, cb, t * 140); strokeWeight(2.5);
    beginShape();
    for (const p of pts) vertex(p.x, p.y);
    endShape();
    stroke(220, 245, 255, t * 220); strokeWeight(1);
    beginShape();
    for (const p of pts) vertex(p.x, p.y);
    endShape();
    noStroke(); fill(cr*0.4, cg*0.78, cb, t * 180);
    ellipse(a.x1, a.y1, 7 * t, 7 * t);
    fill(cr*0.7, cg*0.92, cb, t * 200);
    ellipse(a.x2, a.y2, 10 * t, 10 * t);
    fill(255, 255, 255, t * 160);
    ellipse(a.x2, a.y2, 4 * t, 4 * t);
    stroke(cr*0.4, cg*0.78, cb, t * 120); strokeWeight(1);
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

function _drawCannonBlasts() {
  _cannonBlasts = _cannonBlasts.filter(b => b.life > 0);
  for (const b of _cannonBlasts) {
    b.life--;
    const t = b.life / 30;
    push(); translate(b.x, b.y);
    // 外冲击波环
    noFill(); stroke(255, 100, 40, t * 180); strokeWeight(3 + (1 - t) * 6);
    ellipse(0, 0, b.r * 2 * (1.4 - t * 0.4), b.r * 2 * (1.4 - t * 0.4));
    // 内爆炸圆
    noStroke(); fill(255, 80, 20, t * 120);
    ellipse(0, 0, b.r * 1.2 * t, b.r * 1.2 * t);
    fill(255, 200, 100, t * 160);
    ellipse(0, 0, b.r * 0.5 * t, b.r * 0.5 * t);
    // 核心白点
    fill(255, 255, 255, t * 200);
    ellipse(0, 0, 12 * t, 12 * t);
    pop();
  }
}

function updateAndDrawTowers() {
  for (const t of towers) { t.update(); t.draw(); }
  _drawChainArcs();
  _drawCannonBlasts();
  _updateDrawMortarShells();
  projectiles = projectiles.filter(p => p.alive);
  for (const p of projectiles) { p.update(); p.draw(); }
}

function initTowers() { towers = []; projectiles = []; _chainArcs = []; _cannonBlasts = []; _mortarShells = []; }