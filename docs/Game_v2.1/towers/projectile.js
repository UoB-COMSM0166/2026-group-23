// ============================================================
//  towers/projectile.js — Projectile 子弹类（支持 nova 穿透 / chain 跳链 / ghost 追踪 / scatter 对空）
// ============================================================

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
              spawnParticles(m.pos.x, m.pos.y, color(...this.col), 4);   // 补丁 3：8→4
            }
          }
        }
        // 爆炸粒子
        spawnParticles(this.targetX, this.targetY, color(...this.col), 15);   // 补丁 3：30→15
        _cannonBlasts.push({ x: this.targetX, y: this.targetY, r: this.blastRadius, life: 30 });
        playSfx('explode');
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
