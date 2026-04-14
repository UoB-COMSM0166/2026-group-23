// ============================================================
//  towers/effects.js — 跳链电弧 / 轨道炮爆炸 / 迫击炮弹视觉特效
// ============================================================

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
