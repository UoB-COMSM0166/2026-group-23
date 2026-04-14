// ============================================================
//  map/map-lv5.js  —  关卡5  蚁机天劫·焦土废墟
//  风格：血红焦土 + 废墟塔楼 + 枯树 + 断裂地面 + 机械残骸
// ============================================================

function _bg_ruin(lv, theme) {
  background(14, 4, 6);
  const T=frameCount;

  // ── 焦土地面（暗红棕，带龟裂纹）──
  for (let gx=0; gx<GRID_COLS; gx++) {
    for (let gy=1; gy<GRID_ROWS; gy++) {
      const px=gx*CELL_SIZE, py=gy*CELL_SIZE;
      if (pathCellSet && pathCellSet.has(gx+','+gy)) continue;
      const {n1,n2,n3,n4}=_floorCache[gx][gy];
      noStroke();
      fill(32+n3*18, 12+n1*7, 8+n2*5, 255);
      rect(px,py,CELL_SIZE,CELL_SIZE);
      if ((gx+gy)%2===0) { fill(0,0,0,20); rect(px,py,CELL_SIZE,CELL_SIZE); }
      // 龟裂纹（两条随机短线）
      stroke(50+n3*22,18+n1*8,12+n4*6, 50); strokeWeight(1);
      const cx2=px+CELL_SIZE/2, cy2=py+CELL_SIZE/2;
      line(cx2+n1*20,cy2+n2*16, cx2+n3*14,cy2-n4*18);
      if (n3>0.5) line(cx2-n2*16,cy2-n1*14, cx2+n4*18,cy2+n3*12);
      // 血色渗出（低频）
      if (n3>0.78) {
        noStroke();
        const bp=sin(T*.03+gx*.8+gy*.6)*.4+.6;
        fill(160+bp*60, 20+bp*15, 10, (12+bp*18)*n3);
        ellipse(cx2+n1*14,cy2+n2*12, 12+n4*8,7+n4*5);
      }
    }
  }

  // ── 路径底色（暗血石）──
  noStroke();
  for (let gx=0; gx<GRID_COLS; gx++)
    for (let gy=0; gy<GRID_ROWS; gy++) {
      if (!(pathCellSet&&pathCellSet.has(gx+','+gy))) continue;
      const {n1,n3}=_floorCache[gx][gy];
      fill(38+n3*14, 12+n1*5, 10+n1*4, 255);
      rect(gx*CELL_SIZE, gy*CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

  stroke(180,35,40,16); strokeWeight(1);
  for (let x=0;x<=width;x+=CELL_SIZE) line(x,0,x,height);
  for (let y=0;y<=height;y+=CELL_SIZE) line(0,y,width,y);

  _deco_ruin();
  _drawFog(100,8,18, 72);
  _drawCornerHUD(theme.grid);
  _drawLevelLabel(lv, 200,40,55, 65);
}

function _deco_ruin() {
  const T=frameCount;
  for (const d of _decoCache) {
    const cx=d.gx*CELL_SIZE+CELL_SIZE/2, cy=d.gy*CELL_SIZE+CELL_SIZE/2;
    const type=Math.floor(d.r1*4);
    const ds=0.85+d.gy/GRID_ROWS*0.3;
    push(); translate(cx,cy); noStroke();

    if (type===0) {        // 废墟塔楼残段
      const sz=(16+d.r2*12)*ds;
      // 阴影
      fill(0,0,0,38); ellipse(sz*.2,sz*.62,sz*1.5,sz*.3);
      // 塔楼主体（残缺矩形）
      fill(38+d.r3*15,16+d.r3*8,12+d.r3*6, 250);
      // 随机缺口感：用多个矩形拼合
      rect(-sz*.28,-sz*.75, sz*.56, sz*.88, 2);
      // 顶部不规则断口
      fill(14,4,6,255); // 用背景色"切割"
      if (d.r3>0.45) triangle(-sz*.28,-sz*.75, sz*(d.r3*.4-.05),-sz*.75, sz*(d.r3*.4-.05),-sz*.55);
      if (d.r4>0.5)  triangle(sz*.28,-sz*.75,  sz*(d.r4*.3-.15),-sz*.75, sz*(d.r4*.3-.15),-sz*.6);
      // 石砌纹路（横向暗线）
      fill(22,8,6,120);
      for (let k=0;k<3;k++) {
        const ly=-sz*.5+k*sz*.25;
        rect(-sz*.26,ly, sz*.52, 2);
      }
      // 窗洞（黑色矩形）
      if (d.r3>0.35) {
        fill(0,0,0,220);
        rect(-sz*.1,-sz*.5, sz*.2,sz*.14,1);
      }
      // 石面高光
      fill(58+d.r3*18,22+d.r3*10,18+d.r3*8, 70);
      rect(-sz*.26,-sz*.73, sz*.12, sz*.86,1);
      // 顶部余火（随机）
      if (d.r4>0.55) {
        const fp=sin(T*.06+d.r1*5)*.5+.5;
        fill(220+fp*35, 60+fp*30, 10, 40+fp*60);
        ellipse(sz*(d.r4*.3-.12),-sz*.72, sz*.22,sz*.18+fp*sz*.08);
      }

    } else if (type===1) { // 枯树（主干+枝）
      const sz=(14+d.r2*10)*ds;
      // 阴影
      fill(0,0,0,30); ellipse(sz*.12,sz*.65,sz*1.3,sz*.28);
      // 主干
      fill(28,10,8,255);
      rect(-sz*.1,-sz*.15, sz*.2,sz*.72, 2);
      fill(42,16,12,200); rect(-sz*.1,-sz*.15, sz*.08,sz*.72, 2);
      // 枝杈（多根，带断裂感）
      stroke(24,9,7,220); strokeWeight(2);
      // 左枝
      line(-sz*.1,-sz*.0, -sz*.38,-sz*.32);
      line(-sz*.38,-sz*.32, -sz*.48,-sz*.22);
      line(-sz*.38,-sz*.32, -sz*.28,-sz*.48);
      // 右枝
      line(sz*.1,-sz*.08, sz*.36,-sz*.38);
      line(sz*.36,-sz*.38, sz*.5,-sz*.3);
      line(sz*.36,-sz*.38, sz*.3,-sz*.52);
      // 细枝末梢
      strokeWeight(1);
      line(-sz*.48,-sz*.22, -sz*.56,-sz*.16);
      line(-sz*.28,-sz*.48, -sz*.34,-sz*.56);
      line(sz*.5,-sz*.3, sz*.58,-sz*.24);
      // 树皮龟裂纹
      fill(14,5,4,120); noStroke();
      for (let k=0;k<2;k++) rect(-sz*.08+k*sz*.08,-sz*.1+k*sz*.3,sz*.03,sz*.22);

    } else if (type===2) { // 机械残骸（齿轮/钢架）
      const sz=(10+d.r2*9)*ds;
      // 阴影
      fill(0,0,0,32); ellipse(sz*.1,sz*.5,sz*1.5,sz*.3);
      // 齿轮框架（主环）
      stroke(45+d.r3*15, 18+d.r3*8, 14+d.r3*6, 220);
      strokeWeight(sz*.08);
      noFill(); ellipse(0,0,sz*1.2,sz*1.2);
      // 齿牙
      strokeWeight(sz*.06); fill(38+d.r3*12,15+d.r3*6,12+d.r3*5,230);
      const teeth=8+Math.floor(d.r3*4);
      for (let k=0;k<teeth;k++) {
        const ang=k/teeth*TWO_PI+d.r4;
        const r1=sz*.6, r2=sz*.78;
        line(cos(ang)*r1,sin(ang)*r1, cos(ang)*r2,sin(ang)*r2);
      }
      // 中心轴孔
      noStroke(); fill(10,4,3,250); ellipse(0,0,sz*.35,sz*.35);
      fill(22,8,7,200); ellipse(0,0,sz*.2,sz*.2);
      // 十字辐条
      stroke(40+d.r3*12,16+d.r3*6,12+d.r3*5,160); strokeWeight(sz*.05);
      for (let k=0;k<4;k++) {
        const ang=k*HALF_PI+d.r4;
        line(cos(ang)*sz*.16,sin(ang)*sz*.16, cos(ang)*sz*.52,sin(ang)*sz*.52);
      }
      // 锈迹斑点
      noStroke();
      for (let k=0;k<4;k++) {
        const kx=cos(k*1.8+d.r1)*sz*.3, ky=sin(k*1.8+d.r2)*sz*.3;
        fill(100+d.r3*40,28+d.r3*15,8+d.r3*8, 60); ellipse(kx,ky,sz*.12,sz*.1);
      }

    } else {               // 碎石堆
      const sz=(8+d.r2*8)*ds;
      fill(0,0,0,30); ellipse(sz*.1,sz*.5,sz*1.8,sz*.32);
      for (let k=0;k<4;k++) {
        const kx=(k-1.5)*sz*.3+d.r3*sz*.15;
        const ky=k%2===0?sz*.05:-sz*.08;
        const ks=sz*(.28+k*.06+d.r4*.1);
        const kr=38+k*5+d.r3*15, kg=14+k*3+d.r3*6, kb=10+k*2+d.r3*5;
        fill(kr,kg,kb,240);
        beginShape();
        for (let j=0;j<5+k;j++) {
          const ang=j/(5+k)*TWO_PI+d.r4+k;
          vertex(kx+cos(ang)*ks, ky+sin(ang)*ks*.62);
        }
        endShape(CLOSE);
        fill(kr+20,kg+8,kb+6,70);
        ellipse(kx-ks*.22,ky-ks*.2,ks*.35,ks*.22);
      }
    }
    pop();
  }
}
