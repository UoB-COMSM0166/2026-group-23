// ============================================================
//  map/map-lv2.js  —  关卡2  星云冰蓝地
//  风格：冰雪星球地面 + 冰晶柱 + 星云气体 + 冻结岩
// ============================================================

function _bg_nebula(lv, theme) {
  background(4, 8, 24);

  // ── 冰雪地面（蓝白噪声）──
  for (let gx=0; gx<GRID_COLS; gx++) {
    for (let gy=1; gy<GRID_ROWS; gy++) {
      const px=gx*CELL_SIZE, py=gy*CELL_SIZE;
      if (pathCellSet && pathCellSet.has(gx+','+gy)) continue;
      const {n1,n2,n3,n4}=_floorCache[gx][gy];
      noStroke();
      // 蓝灰冰面底色
      fill(12+n3*14, 22+n1*12+n2*8, 48+n4*20, 255);
      rect(px,py,CELL_SIZE,CELL_SIZE);
      if ((gx+gy)%2===0) { fill(0,0,0,15); rect(px,py,CELL_SIZE,CELL_SIZE); }
      // 冰面反光纹（斜向细线）
      stroke(100+n3*60, 160+n1*40, 220+n4*35, 28); strokeWeight(0.8);
      const cx2=px+CELL_SIZE/2, cy2=py+CELL_SIZE/2;
      line(cx2+n1*20,cy2-n3*16, cx2+n2*18,cy2+n4*14);
      // 偶发亮冰面
      if (n3>0.78) {
        noStroke(); fill(180,220,255, n3*25);
        ellipse(cx2+n1*14,cy2+n2*12, 10+n4*8, 6+n4*5);
      }
    }
  }

  // ── 路径底色（暗蓝冰石）──
  noStroke();
  for (let gx=0; gx<GRID_COLS; gx++)
    for (let gy=0; gy<GRID_ROWS; gy++) {
      if (!(pathCellSet&&pathCellSet.has(gx+','+gy))) continue;
      const {n1,n3}=_floorCache[gx][gy];
      fill(8+n3*8, 16+n1*6, 40+n3*15, 255);
      rect(gx*CELL_SIZE, gy*CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

  // ── 星云背景光（大范围柔光团）──
  noStroke();
  const T=frameCount;
  const nebulaDefs=[
    {x:width*.25,y:height*.4, rx:220,ry:160, col:[40,80,200]},
    {x:width*.72,y:height*.3, rx:180,ry:220, col:[80,40,180]},
    {x:width*.5, y:height*.75,rx:260,ry:140, col:[20,60,160]},
  ];
  for (const n of nebulaDefs) {
    const p=sin(T*.006+n.rx*.01)*.4+.6;
    for (let ring=5;ring>=1;ring--) {
      const frac=ring/5;
      fill(n.col[0],n.col[1],n.col[2], 8*frac*frac*p);
      ellipse(n.x,n.y, n.rx*(2-frac*.8), n.ry*(2-frac*.8));
    }
  }

  stroke(30,70,160,16); strokeWeight(1);
  for (let x=0;x<=width;x+=CELL_SIZE) line(x,0,x,height);
  for (let y=0;y<=height;y+=CELL_SIZE) line(0,y,width,y);

  _deco_nebula();
  _drawFog(8,20,80, 65);
  _drawCornerHUD(theme.grid);
  _drawLevelLabel(lv, 60,120,220, 55);
}

function _deco_nebula() {
  const T=frameCount;
  for (const d of _decoCache) {
    const cx=d.gx*CELL_SIZE+CELL_SIZE/2, cy=d.gy*CELL_SIZE+CELL_SIZE/2;
    const type=Math.floor(d.r1*4);
    const ds=0.85+d.gy/GRID_ROWS*0.3;
    push(); translate(cx,cy); noStroke();

    if (type===0) {       // 冰晶柱（高耸）
      const sz=(16+d.r2*12)*ds;
      // 阴影
      fill(0,0,0,28); ellipse(sz*.18,sz*.6,sz*1.4,sz*.35);
      // 晶柱主体（六棱柱感，两侧面）
      const crystalPulse=sin(T*.03+d.r1*5)*.3+.7;
      fill(15,30,75,240); // 暗面
      beginShape();
      vertex(-sz*.18,-sz*.7); vertex(sz*.18,-sz*.7);
      vertex(sz*.25,sz*.3);   vertex(-sz*.25,sz*.3);
      endShape(CLOSE);
      fill(25,55,130,220); // 亮面（左）
      beginShape();
      vertex(-sz*.18,-sz*.7); vertex(-sz*.02,-sz*.7);
      vertex(-sz*.04,sz*.3);  vertex(-sz*.25,sz*.3);
      endShape(CLOSE);
      // 内光（冰晶折射）
      fill(120,180,255, 40*crystalPulse);
      beginShape();
      vertex(-sz*.05,-sz*.5); vertex(sz*.12,-sz*.4);
      vertex(sz*.08,sz*.0);   vertex(-sz*.08,.0);
      endShape(CLOSE);
      // 顶部尖锋高光
      fill(200,230,255,180*crystalPulse);
      triangle(-sz*.05,-sz*.7, sz*.05,-sz*.7, 0,-sz*.92);
      // 底部融水圆
      fill(60,100,200,40); ellipse(0,sz*.32,sz*.5,sz*.15);

    } else if (type===1) { // 星云气体团（动态）
      const sz=(12+d.r2*10)*ds;
      const gp1=sin(T*.025+d.r1*4)*.4+.6;
      const gp2=sin(T*.02+d.r2*3+1.5)*.4+.6;
      fill(40+d.r3*30, 70+d.r3*50, 180+d.r3*60, 20*gp1);
      ellipse(0,0,sz*2.5,sz*2.5);
      fill(60+d.r3*40,100+d.r3*50,220+d.r3*35, 18*gp2);
      ellipse(sz*.1*gp2,sz*.05,sz*1.6,sz*1.3);
      fill(160,200,255, 12*gp1);
      ellipse(-sz*.12,sz*.08*gp1, sz*.9,sz*.7);
      // 星点
      fill(255,255,255,50*gp1*d.r3);
      ellipse(sz*.05,-sz*.1,2.5,2.5);

    } else if (type===2) { // 冻结岩石（冰包裹）
      const sz=(10+d.r2*9)*ds;
      fill(0,0,0,30); ellipse(sz*.1,sz*.5,sz*1.5,sz*.3);
      // 岩石内核
      fill(30,40,70,240);
      beginShape();
      for (let k=0;k<7;k++) {
        const ang=k/7*TWO_PI+d.r4;
        const r=sz*(.7+Math.sin(k*1.9+d.r1)*.3);
        vertex(cos(ang)*r, sin(ang)*r*.65);
      }
      endShape(CLOSE);
      // 冰壳（半透明蓝白）
      const ip=sin(T*.02+d.r1*4)*.2+.8;
      fill(120,180,240, 50*ip);
      beginShape();
      for (let k=0;k<7;k++) {
        const ang=k/7*TWO_PI+d.r4+.1;
        const r=sz*(.85+Math.sin(k*2.1+d.r2)*.15);
        vertex(cos(ang)*r, sin(ang)*r*.7);
      }
      endShape(CLOSE);
      // 冰面高光
      fill(200,230,255,80*ip);
      ellipse(-sz*.2,-sz*.22,sz*.3,sz*.2);

    } else {               // 小冰晶群
      const sz=(6+d.r2*6)*ds;
      fill(0,0,0,22); ellipse(sz*.08,sz*.45,sz*1.6,sz*.28);
      for (let k=0;k<3;k++) {
        const kx=(k-1)*sz*.55+d.r3*sz*.12;
        const ky=k%2===0?0:-sz*.14;
        const ks=sz*(.45+k*.1);
        const cp=sin(T*.04+k*1.2+d.r1*3)*.25+.75;
        fill(20,45,110,220*cp);
        triangle(kx,ky+ks*.35, kx-ks*.22,ky-ks*.3, kx+ks*.22,ky-ks*.3);
        fill(140,190,255,60*cp);
        triangle(kx,ky+ks*.35, kx-ks*.06,ky-ks*.28, kx-ks*.04,ky+ks*.1);
      }
    }
    pop();
  }
}
