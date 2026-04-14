// ============================================================
//  towers/base.js — Tower 基类（构造 / 属性 / 升级 / 选目标 / 调度 / 共享绘制）
//  变种行为分散在 towers/variants/*.js 中，通过 Tower.prototype 注入
// ============================================================

// 干扰半径（由 Boss 设置，Tower.update 读取做范围判断）
let jamRadius = 180;

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

}
