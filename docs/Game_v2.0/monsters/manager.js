// ============================================================
//  monsters/manager.js — MonsterManager 怪物生成与统一更新
//  依赖：各具体怪物类（须先于本文件加载）
// ============================================================

class MonsterManager {
  constructor() { this.monsters=[]; this.queue=[]; this.fc=0; this.onKilled=null; this.onReach=null; }

  enqueueWave(type,count,interval,startDelay) {
    interval=interval||60; startDelay=startDelay||0;
    for (let i=0;i<count;i++) this.queue.push({type,frame:this.fc+startDelay+i*interval});
  }

  spawn(type) {
    // 蛇/蜘蛛/机器人/坦克随机走主路或边路
    const groundPath = () => (random()<0.5 ? MAIN_PATH_PX : EDGE_PATH_PX);
    let m = null;
    if (type==='snake')      m = new MechSnake(groundPath());
    else if (type==='spider')  m = new MechSpider(groundPath());
    else if (type==='robot')   m = new MechRobot(groundPath());
    else if (type==='tank')    m = new MechTank(groundPath());
    else if (type==='phoenix') m = new MechPhoenix(AIR_PATH_PX);
    else if (type==='ghostbird') m = new GhostBird(AIR_PATH_PX);
    else if (type==='boss1')   m = new BossFission(MAIN_PATH_PX);
    else if (type==='boss2')   m = new BossPhantom(MAIN_PATH_PX);
    else if (type==='boss3')   m = new BossAntMech(MAIN_PATH_PX);
    else if (type==='fission') m = new BossFission(MAIN_PATH_PX);
    else if (type==='carrier') m = new BossCarrier(AIR_PATH_PX);
    if (!m) return null;

    // ── 波次成长系数 ──
    // 普通怪：每波 HP×1.13，速度×1.04（Wave10 ≈ HP×3.0，速度×1.4）
    // Boss：每波 HP×1.09（基数大，慢一点）
    // 奖励同步上涨，后期打怪更值钱
    const wave = (typeof waveNum !== 'undefined') ? max(1, waveNum) : 1;
    const n    = wave - 1;
    const isBoss = (m instanceof BossFission)||(m instanceof BossPhantom)||(m instanceof BossAntMech)||(m instanceof FissionCore)||(m instanceof BossCarrier);

    const hpMult  = isBoss ? pow(1.09, n) : pow(1.13, n);
    const spdMult = isBoss ? 1            : min(pow(1.04, n), 1.45); // Boss不加速，普通怪限制上限
    const rewMult = pow(1.10, n);

    const newHp = floor(m.hp * hpMult);
    m.hp = newHp; m.maxHp = newHp;
    m.spd *= spdMult;
    if (m.baseSpd !== undefined) m.baseSpd = m.spd;
    m.reward = floor(m.reward * rewMult);

    return m;
  }

  // 怪物到达终点扣血量（设计：50HP，小怪漏20只死，Boss漏1只损失惨重）
  _reachDmg(m) {
    if (m instanceof BossAntMech)  return 15;
    if (m instanceof BossFission || m instanceof BossPhantom) return 10;
    if (m instanceof MechTank)     return 6;
    if (m instanceof MechRobot)    return 4;
    if (m instanceof MechPhoenix || m instanceof GhostBird)  return 3;
    return 2; // snake / spider
  }

  // ignoreTankBarrier: 无视坦克护盾（链式电弧塔专属）
  // ignoreRobotShield: 无视机器人护盾（快速塔专属，相当于 fromSide=true 且穿透护盾）
  damageAt(tx,ty,dmg,antiAir,fromSide,ignoreTankBarrier,ignoreRobotShield) {
    antiAir=antiAir||false; fromSide=fromSide||false;
    ignoreTankBarrier=ignoreTankBarrier||false; ignoreRobotShield=ignoreRobotShield||false;
    for (const m of this.monsters) {
      if (!m.alive||m.reached) continue;
      if (m._dropping) continue; // 空投坠落中无敌
      if (!ignoreTankBarrier && !m.isFlying && m._tankShielded > 0 && !(m instanceof MechTank)) continue;
      // 幽灵飞鸟隐身期间免疫所有伤害
      if (m instanceof GhostBird && m.isGhost) continue;
      const isFlying = m instanceof MechPhoenix || m instanceof GhostBird || (m instanceof BossCarrier && !m.grounded);
      if (antiAir && !isFlying) continue;
      if (!antiAir && isFlying) continue;
      if (distAB(m.pos,{x:tx,y:ty})<=m.radius+5) {
        // 母舰地面光环：覆盖范围内小怪免伤75%
        const actualDmg = (m._carrierAura && m._carrierAura >= frameCount) ? floor(dmg*0.25) : dmg;
        if (m instanceof MechRobot) {
          if (ignoreRobotShield) m.takeDamage(actualDmg, true, true);
          else m.takeDamage(actualDmg, fromSide);
        } else m.takeDamage(actualDmg);
      }
    }
  }

  damageInRadius(cx,cy,radius,dmg,antiAir,ignoreTankBarrier,ignoreRobotShield) {
    antiAir=antiAir||false;
    ignoreTankBarrier=ignoreTankBarrier||false; ignoreRobotShield=ignoreRobotShield||false;
    for (const m of this.monsters) {
      if (!m.alive||m.reached) continue;
      if (m._dropping) continue; // 空投坠落中无敌
      if (!ignoreTankBarrier && !m.isFlying && m._tankShielded > 0 && !(m instanceof MechTank)) continue;
      if (m instanceof GhostBird && m.isGhost) continue;
      const isFlying = m instanceof MechPhoenix || m instanceof GhostBird || (m instanceof BossCarrier && !m.grounded);
      if (antiAir && !isFlying) continue;
      if (!antiAir && isFlying) continue;
      if (distAB(m.pos,{x:cx,y:cy})<=radius) {
        const actualDmg = (m._carrierAura && m._carrierAura >= frameCount) ? floor(dmg*0.25) : dmg;
        if (m instanceof MechRobot) {
          if (ignoreRobotShield) m.takeDamage(actualDmg, true, true);
          else m.takeDamage(actualDmg, false);
        } else m.takeDamage(actualDmg);
      }
    }
  }

  getMonstersInRange(cx,cy,range,antiAir) {
    antiAir=antiAir||false;
    return this.monsters.filter(m=>{
      if (!m.alive||m.reached) return false;
      const isFlying = m instanceof MechPhoenix || m instanceof GhostBird || m instanceof BossCarrier;
      if (antiAir && !isFlying) return false;
      if (!antiAir && isFlying) return false;
      // 隐身的幽灵飞鸟对所有塔不可见（除非是对空且已解锁特殊逻辑）
      if (m instanceof GhostBird && m.isGhost) return false;
      return distAB(m.pos,{x:cx,y:cy})<=range;
    });
  }

  update() {
    this.fc++;
    for (let i=this.queue.length-1;i>=0;i--) {
      if (this.queue[i].frame<=this.fc) {
        const m=this.spawn(this.queue[i].type);
        if (m) this.monsters.push(m);
        this.queue.splice(i,1);
      }
    }

    for (const m of this.monsters) {
      m.update();

      // ── Home塔碰撞：怪物进入基地半径立即死亡并扣血 ──
      if (m.alive && typeof homeTowers !== 'undefined') {
        for (const ht of homeTowers) {
          if (distAB(m.pos, {x:ht.px, y:ht.py}) <= ht.radius + m.radius) {
            const dmg = this._reachDmg(m);
            spawnParticles(m.pos.x, m.pos.y, m.deathColor, 18);
            m.alive = false;
            ht.triggerHit();
            if (this.onReach) this.onReach(m, dmg);
            break;
          }
        }
      }

      // ── 路径终点兜底 ──
      if (m.alive && m.reached) {
        const dmg = this._reachDmg(m);
        m.alive = false;
        if (typeof homeTowers !== 'undefined' && homeTowers.length > 0) homeTowers[0].triggerHit();
        if (this.onReach) this.onReach(m, dmg);
      }

      if (!m.alive && this.onKilled) this.onKilled(m);
    }
    this.monsters = this.monsters.filter(m => m.alive);
  }
}

// ============================================================
//  HomeTower — 科幻风格基地（路径终点）
// ============================================================
