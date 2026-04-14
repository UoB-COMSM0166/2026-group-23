// ============================================================
//  map/map-lv4.js  —  关卡4  虚空迷宫
//  风格：量子暗空间 + 悬浮石块 + 能量柱 + 虚空裂缝 + 扭曲粒子
// ============================================================

function _bg_void(lv, theme) {
  background(6, 3, 20);
  const T=frameCount;

  // ── 虚空地面（深紫黑，带量子扭曲纹）──
  for (let gx=0; gx<GRID_COLS; gx++) {
    for (let gy=1; gy<GRID_ROWS; gy++) {
      const px=gx*CELL_SIZE, py=gy*CELL_SIZE;
      if (pathCellSet && pathCellSet.has(gx+','+gy)) continue;
      const {n1,n2,n3,n4}=_floorCache[gx][gy];
      noStroke();
      fill(12+n3*12, 6+n1*6, 30+n4*18, 255);
      rect(px,py,CELL_SIZE,CELL_SIZE);
      if ((gx+gy)%2===0) { fill(0,0,0,20); rect(px,py,CELL_SIZE,CELL_SIZE); }
      // 量子扭曲网格纹（随时间微动）
      const warp=sin(T*.018+gx*.4+gy*.3)*.5+.5;
      stroke(80+n3*40, 30+n1*20, 140+n4*50, 18+warp*12); strokeWeight(.7);
      const cx2=px+CELL_SIZE/2, cy2=py+CELL_SIZE/2;
      line(cx2+n1*16,cy2+n2*14, cx2-n3*14,cy2-n4*16);
      if (n3>0.6) {
        stroke(100,50,200, 12*warp*n3); strokeWeight(.5);
        line(cx2-n2*12,cy2+n1*10, cx2+n4*10,cy2-n3*12);
      }
      // 虚空光点（散布）
      if (n4>0.82) {
        noStroke();
        const vp=sin(T*.05+gx*1.1+gy*.9)*.5+.5;
        fill(140+vp*80, 60+vp*40, 255, (15+vp*20)*n4);
        ellipse(cx2+n1*18,cy2+n2*16, 4+vp*3,4+vp*3);
      }
    }
  }

  // ── 路径底色（深量子紫）──
  noStroke();
  for (let gx=0; gx<GRID_COLS; gx++)
    for (let gy=0; gy<GRID_ROWS; gy++) {
      if (!(pathCellSet&&pathCellSet.has(gx+','+gy))) continue;
      const {n1,n3}=_floorCache[gx][gy];
      fill(20+n3*10, 8+n1*5, 50+n3*20, 255);
      rect(gx*CELL_SIZE, gy*CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

  // ── 虚空深渊背景光（全屏低频闪烁）──
  noStroke();
  const voidPulse=sin(T*.012)*.3+.7;
  fill(60,20,140, 8*voidPulse); rect(0,0,width,height);

  stroke(70,30,160,14); strokeWeight(1);
  for (let x=0;x<=width;x+=CELL_SIZE) line(x,0,x,height);
  for (let y=0;y<=height;y+=CELL_SIZE) line(0,y,width,y);

  _deco_void();
  _drawFog(40,8,110, 70);
  _drawCornerHUD(theme.grid);
  _drawLevelLabel(lv, 130,50,230, 60);
}

function _deco_void() {
  const T=frameCount;
  for (const d of _decoCache) {
    const cx=d.gx*CELL_SIZE+CELL_SIZE/2, cy=d.gy*CELL_SIZE+CELL_SIZE/2;
    const type=Math.floor(d.r1*4);
    const ds=0.85+d.gy/GRID_ROWS*0.3;
    push(); translate(cx,cy);

    if (type===0) {        // 悬浮石块（缓慢上下漂浮）
      const sz=(12+d.r2*11)*ds;
      const bobY=sin(T*.022+d.r1*4)*sz*.18;
      translate(0, bobY);
      // 阴影（偏离石块）
      noStroke(); fill(0,0,0,35+sin(T*.022+d.r1*4)*.5*15);
      ellipse(sz*.1, sz*.55+sz*.18-bobY, sz*1.5, sz*.28);
      // 石块主体
      fill(35+d.r3*18, 18+d.r3*10, 70+d.r3*30, 245);
      beginShape();
      for (let k=0;k<7;k++) {
        const ang=k/7*TWO_PI+d.r4;
        vertex(cos(ang)*sz*(.72+Math.sin(k*2+d.r1)*.28), sin(ang)*sz*.72*(.72+Math.sin(k*2+d.r1)*.28));
      }
      endShape(CLOSE);
      // 量子裂缝（发光）
      const cp=sin(T*.04+d.r1*5)*.5+.5;
      stroke(140+cp*80, 60+cp*30, 255, 50+cp*80); strokeWeight(1.2);
      line(-sz*.28,sz*.08, sz*.12,-sz*.18);
      if (d.r3>0.5) line(sz*.1,sz*.2, -sz*.1,sz*.35);
      // 顶部高光
      noStroke(); fill(100,60,200,90);
      ellipse(-sz*.18,-sz*.2, sz*.3,sz*.2);
      // 量子光晕
      fill(120,50,220, 12*cp);
      ellipse(0,0,sz*2.5,sz*2.5);

    } else if (type===1) { // 虚空裂缝（发光缝隙）
      const sz=(10+d.r2*9)*ds;
      const cp=sin(T*.035+d.r1*6)*.5+.5;
      const cp2=sin(T*.028+d.r2*4+1)*.5+.5;
      noStroke();
      // 裂缝外晕
      fill(100,30,220, 18*cp); ellipse(0,0,sz*2.8,sz*1.4);
      fill(140,60,255, 14*cp2); ellipse(sz*.05*cp2,0,sz*1.8,sz*.9);
      // 裂缝主体（锯齿形）
      fill(200,140,255, 80*cp);
      beginShape();
      vertex(-sz*.06,-sz*.35); vertex(sz*.04,-sz*.18);
      vertex(-sz*.03,sz*.05);  vertex(sz*.08,sz*.28);
      vertex(-sz*.08,sz*.28);  vertex(sz*.03,sz*.05);
      vertex(-sz*.04,-sz*.18); vertex(sz*.06,-sz*.35);
      endShape(CLOSE);
      // 内核白光
      fill(255,240,255, 120*cp);
      beginShape();
      vertex(-sz*.02,-sz*.28); vertex(sz*.02,-sz*.28);
      vertex(sz*.01,sz*.22); vertex(-sz*.01,sz*.22);
      endShape(CLOSE);

    } else if (type===2) { // 能量柱（圆柱形发光体）
      const sz=(14+d.r2*10)*ds;
      const ep=sin(T*.04+d.r1*5)*.35+.65;
      const ep2=sin(T*.033+d.r2*4+2)*.3+.7;
      noStroke();
      // 底部光晕
      fill(100,40,220, 25*ep); ellipse(0,sz*.38,sz*1.8,sz*.45);
      // 柱体侧面（暗）
      fill(22,10,55,240); rect(-sz*.18,-sz*.6,sz*.36,sz*.9,3);
      // 柱体亮面
      fill(45,20,110,220); rect(-sz*.18,-sz*.6,sz*.18,sz*.9,3,0,0,3);
      // 顶部能量核
      fill(160,80,255, 180*ep);
      ellipse(0,-sz*.58,sz*.32,sz*.22);
      fill(220,160,255, 100*ep2);
      ellipse(0,-sz*.6,sz*.18,sz*.14);
      fill(255,240,255, 60*ep*ep2);
      ellipse(0,-sz*.62,sz*.08,sz*.06);
      // 顶部光柱
      for (let ring=4;ring>=1;ring--) {
        fill(130+ring*20,60+ring*15,220, ep*8*ring);
        ellipse(0,-sz*.58,sz*.1*ring,sz*.7*ring);
      }
      // 环形光圈（沿柱体扫动）
      const scanY=(-sz*.6+(sz*.9)*((T*.02+d.r1*3)%1));
      fill(160,90,255,55*ep); ellipse(0,scanY,sz*.38,sz*.1);

    } else {               // 量子碎石（成簇悬浮）
      const sz=(7+d.r2*7)*ds;
      const fp=sin(T*.025+d.r1*3)*.2+.8;
      noStroke(); fill(0,0,0,22); ellipse(sz*.08,sz*.5+sz*.1*(1-fp),sz*1.4,sz*.25);
      // 3颗小石
      for (let k=0;k<3;k++) {
        const kx=(k-1)*sz*.5+d.r3*sz*.1;
        const ky=k%2===0?0:-sz*.18;
        const kbob=sin(T*.025+(k+d.r1)*2.5)*sz*.12;
        const ks=sz*(.38+k*.08);
        fill(30+d.r3*20,14+d.r3*10,65+d.r3*30,240);
        ellipse(kx,ky+kbob,ks,ks*.8);
        // 量子微光
        fill(120,50,220, 20*fp);
        ellipse(kx,ky+kbob,ks*1.8,ks*1.5);
      }
    }
    pop();
  }
}
