// ============================================================
//  monsters/bosses/fission.js — BossFission fission boss + FissionCore
//  Dependencies: monsters/core.js (Monster)
// ============================================================

class BossFission extends Monster {
  constructor(path) {
    super(path, 5400, 0.38, 160);
    this.radius = 28; this.deathColor = color(255,120,20);
    this.armAngle = 0; this.pulseFire = 0;
    // Shield system
    this.hitCount = 0; this.shieldActive = false; this.shieldHp = 0; this.shieldPulse = 0;
    // Radiation wave system
    this.radWaveTimer = 0; this.radWaves = []; // [{r, life}]
    this.radWarning = 0;
    // Split system
    this.splitDone = false;
    // Overheat system
    this.overheating = false;
    this.overheatPulse = 0;
    // Disruption timer
    this.jamTimer = 0;
  }
  takeDamage(dmg) {
    this.hitFlash = 5;
    if (this.shieldActive) {
      this.shieldHp -= dmg; this.shieldPulse = 18;
      if (this.shieldHp <= 0) {
        this.shieldActive = false;
        spawnParticles(this.pos.x, this.pos.y, color(255,180,40), 16);
        // On shield break, release a disruption pulse that disables nearby towers for 150 frames
        jammedUntilFrame = frameCount + 150;
        jamPos = { x: this.pos.x, y: this.pos.y };
        if (typeof jamRadius !== 'undefined') jamRadius = 150;
      }
      return;
    }
    this.hp -= dmg;
    this.hitCount++;
    // Activate the core shield every 15 hits
    if (this.hitCount >= 15 && !this.shieldActive) {
      this.hitCount = 0; this.shieldActive = true;
      this.shieldHp = floor(this.maxHp * 0.12);
      this.shieldPulse = 30;
      spawnParticles(this.pos.x, this.pos.y, color(255,160,20), 12);
    }
    // Critical split: triggers at 40% HP
    if (!this.splitDone && this.hp > 0 && this.hp / this.maxHp <= 0.4) {
      this.splitDone = true;
      this.spd = 0.62; // Speed up after splitting
      if (typeof manager !== 'undefined') {
        for (let i = 0; i < 2; i++) {
          const sub = new FissionCore(this.path.slice(this.seg));
          sub.hp = floor(this.maxHp * 0.18);
          sub.maxHp = sub.hp;
          sub.pos = { x: this.pos.x + (i*2-1)*18, y: this.pos.y };
          manager.monsters.push(sub);
        }
      }
      spawnParticles(this.pos.x, this.pos.y, color(255,100,0), 30);
    }
    if (this.hp <= 0) { this.alive = false; spawnParticles(this.pos.x,this.pos.y,this.deathColor,40); }
  }
  move() {
    this.armAngle += 0.022; this.pulseFire += 0.05;
    if (this.shieldPulse > 0) this.shieldPulse--;
    this.overheatPulse += 0.08;

    // Overheat state: HP < 20%
    this.overheating = this.hp / this.maxHp < 0.20;
    if (this.overheating) {
      this.spd = 0.88;
      // Continuous overheat disruption (every 180 frames)
      this.jamTimer++;
      if (this.jamTimer >= 180) {
        this.jamTimer = 0;
        jammedUntilFrame = frameCount + 100;
        jamPos = { x: this.pos.x, y: this.pos.y };
        if (typeof jamRadius !== 'undefined') jamRadius = 120;
      }
    }

    // Radiation burst: enabled below 75% HP
    if (this.hp / this.maxHp < 0.75) {
      this.radWaveTimer++;
      if (this.radWaveTimer >= 240) {
        this.radWaveTimer = 0;
        this.radWarning = 40; // Warning frames
      }
      if (this.radWarning > 0) {
        this.radWarning--;
        if (this.radWarning === 0) {
          this.radWaves.push({ r: 10, life: 1.0 });
          // Radiation wave disrupts towers for 120 frames
          jammedUntilFrame = frameCount + 120;
          jamPos = { x: this.pos.x, y: this.pos.y };
          if (typeof jamRadius !== 'undefined') jamRadius = 200;
          spawnParticles(this.pos.x, this.pos.y, color(255,140,0), 20);
        }
      }
    }
    // Update radiation waves
    this.radWaves = this.radWaves.filter(w => w.life > 0);
    for (const w of this.radWaves) { w.r += 6; w.life -= 0.035; }

    // Apply magnet slow
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    // AA missile slow
    if (this._airSlowed && this._airSlowed >= frameCount) _spdMult *= this._airSlowFactor || 0.5;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  draw() {
    // Radiation wave visual
    for (const w of this.radWaves) {
      noFill(); stroke(255, 140, 0, w.life * 180); strokeWeight(3 + (1-w.life)*4);
      ellipse(this.pos.x, this.pos.y, w.r*2, w.r*2);
      stroke(255, 80, 0, w.life * 80); strokeWeight(8);
      ellipse(this.pos.x, this.pos.y, w.r*2, w.r*2);
    }
    // Radiation warning flicker
    if (this.radWarning > 0) {
      const t = this.radWarning / 40;
      noFill(); stroke(255, 200, 0, t*200); strokeWeight(2);
      ellipse(this.pos.x, this.pos.y, 60+sin(frameCount*0.5)*8, 60+sin(frameCount*0.5)*8);
    }

    push(); translate(this.pos.x, this.pos.y);

    // Overheat aura
    if (this.overheating) {
      const op = sin(this.overheatPulse*4)*0.5+0.5;
      noFill(); stroke(255,60,0,100+op*120); strokeWeight(5+op*4);
      ellipse(0,0,80+op*14,80+op*14);
      stroke(255,200,0,60+op*80); strokeWeight(2);
      ellipse(0,0,100+op*18,100+op*18);
    }

    // Rotating arms
    const berserk = this.hp/this.maxHp < 0.4;
    const armCount = berserk ? 12 : 8;
    for (let i = 0; i < armCount; i++) {
      const a = this.armAngle*(berserk?1.8:1) + i*(TWO_PI/armCount);
      const len = 30 + sin(this.pulseFire+i)*5;
      const col = berserk ? [255,60,0] : [180,80,20];
      stroke(...col, 200); strokeWeight(3.5); line(0,0,cos(a)*len,sin(a)*len);
      // Arm-tip orbs
      noStroke(); fill(...col, 180); ellipse(cos(a)*len, sin(a)*len, 6, 6);
    }

    // Body
    fill(40,18,5); stroke(200,90,20); strokeWeight(2.2); ellipse(0,0,56,56);
    // Inner core color shifts with HP
    const ratio = this.hp/this.maxHp;
    const coreR = floor(255);
    const coreG = floor(lerp(40, 200, ratio));
    fill(coreR, coreG, 20, 210); noStroke(); ellipse(0,0,24,24);
    fill(255,255,200,150); ellipse(0,0,10,10);

    // Core shield
    if (this.shieldActive) {
      const sp = this.shieldPulse > 0 ? map(this.shieldPulse,30,0,1,0.4) : sin(frameCount*0.06)*0.3+0.7;
      noFill(); stroke(255,180,40,180*sp); strokeWeight(4+sp*3);
      ellipse(0,0,70+sp*6,70+sp*6);
      stroke(255,220,100,100*sp); strokeWeight(1.5);
      for (let i=0;i<6;i++) {
        const a=i*PI/3+frameCount*0.02;
        line(cos(a)*28,sin(a)*28,cos(a)*34,sin(a)*34);
      }
    }

    // State label
    if (this.overheating) {
      fill(255,80,0,230); noStroke(); textSize(9); textAlign(CENTER);
      text('🔥 OVERHEAT', 0, -40);
    } else if (this.shieldActive) {
      fill(255,200,50,230); noStroke(); textSize(9); textAlign(CENTER);
      text('⬡ SHIELD', 0, -40);
    } else if (this.splitDone) {
      fill(255,120,0,200); noStroke(); textSize(9); textAlign(CENTER);
      text('⚡ CRITICAL', 0, -40);
    }
    pop();
    this.drawHealthBar();
  }
  drawHealthBar() {
    if (this.hitFlash > 0) this.hitFlash--;
    const bw=60,bh=5,bx=this.pos.x-bw/2,by=this.pos.y-this.radius-22;
    stroke(200,80,10,150); strokeWeight(1); fill(8,4,2,210); rect(bx-1,by-1,bw+2,bh+2);
    noStroke(); const ratio=max(0,this.hp/this.maxHp);
    fill(this.hitFlash>0?color(255,255,255):lerpColor(color(200,20,5),color(255,160,20),ratio));
    rect(bx,by,bw*ratio,bh);
    // Shield HP bar (orange overlay)
    if (this.shieldActive) {
      const sr = this.shieldHp / (this.maxHp*0.12);
      fill(255,200,40,180); rect(bx,by,bw*sr,bh);
    }
    // Critical HP tick mark
    for (const t of [0.4,0.75]) {
      stroke(255,200,80,150); strokeWeight(1);
      line(bx+bw*t,by,bx+bw*t,by+bh);
    }
    fill(255,120,20,200); noStroke(); textSize(8); textAlign(CENTER);
    text('BOSS  FISSION CORE', this.pos.x, by-4); textAlign(LEFT,BASELINE);
  }
}

// -- Small fission entity (spawned after BossFission split) --
class FissionCore extends Monster {
  constructor(path) {
    super(path, 800, 0.7, 30);
    this.radius = 14; this.deathColor = color(255,100,0);
    this.armAngle = 0; this.pulseFire = 0;
    this.shieldActive = false; this.shieldHp = 0; this.shieldPulse = 0;
  }
  takeDamage(dmg) {
    this.hitFlash = 5;
    if (this.shieldActive) {
      this.shieldHp -= dmg; this.shieldPulse = 10;
      if (this.shieldHp <= 0) { this.shieldActive = false; spawnParticles(this.pos.x,this.pos.y,color(255,140,20),8); }
      return;
    }
    this.hp -= dmg;
    // Trigger one small shield at 50% HP
    if (!this.shieldActive && this.hp > 0 && this.hp/this.maxHp <= 0.5) {
      this.shieldActive = true; this.shieldHp = floor(this.maxHp*0.1); this.shieldPulse = 20;
    }
    if (this.hp <= 0) { this.alive = false; spawnParticles(this.pos.x,this.pos.y,this.deathColor,18); }
  }
  move() {
    this.armAngle += 0.035; this.pulseFire += 0.07;
    if (this.shieldPulse > 0) this.shieldPulse--;
    // Apply magnet slow
    let _spdMult = 1.0;
    if (this._magnetFactor !== undefined && this._magnetFactor < 1.0 && this._magnetFrame >= frameCount - 1) {
      _spdMult = this._magnetFactor;
    } else { this._magnetFactor = 1.0; }
    if (this._carrierAura && this._carrierAura >= frameCount) _spdMult *= 1.3;
    // AA missile slow
    if (this._airSlowed && this._airSlowed >= frameCount) _spdMult *= this._airSlowFactor || 0.5;
    const r = moveAlongPath(this.pos, this.seg, this.path, this.spd * _spdMult);
    this.pos = r.pos; this.seg = r.seg;
    this.progress = calcProgress(this.pos, this.seg, this.path);
    if (this.seg >= this.path.length - 1) this.reached = true;
  }
  draw() {
    push(); translate(this.pos.x, this.pos.y);
    for (let i = 0; i < 5; i++) {
      const a = this.armAngle + i*(TWO_PI/5);
      const len = 18+sin(this.pulseFire+i)*3;
      stroke(200,80,10,180); strokeWeight(2.5); line(0,0,cos(a)*len,sin(a)*len);
      noStroke(); fill(255,100,0,160); ellipse(cos(a)*len,sin(a)*len,5,5);
    }
    fill(35,14,4); stroke(180,70,15); strokeWeight(1.5); ellipse(0,0,28,28);
    fill(255,lerp(40,180,this.hp/this.maxHp),10,200); noStroke(); ellipse(0,0,12,12);
    if (this.shieldActive) {
      const sp = sin(frameCount*0.08)*0.3+0.7;
      noFill(); stroke(255,160,30,160*sp); strokeWeight(2.5); ellipse(0,0,40+sp*4,40+sp*4);
    }
    pop();
    // HP bar
    if (this.hitFlash>0) this.hitFlash--;
    const bw=36,bh=3,bx=this.pos.x-bw/2,by=this.pos.y-this.radius-14;
    fill(8,4,2,200); stroke(180,70,10,130); strokeWeight(1); rect(bx-1,by-1,bw+2,bh+2);
    noStroke(); const ratio=max(0,this.hp/this.maxHp);
    fill(this.hitFlash>0?color(255,255,255):lerpColor(color(180,15,5),color(255,130,15),ratio));
    rect(bx,by,bw*ratio,bh);
    fill(255,100,10,180); noStroke(); textSize(7); textAlign(CENTER);
    text('FISSION', this.pos.x, by-3); textAlign(LEFT,BASELINE);
  }
}

