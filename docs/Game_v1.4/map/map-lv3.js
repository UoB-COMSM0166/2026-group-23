// ============================================================
//  map/map-lv3.js  —  关卡3  熔岩炽核地
//  从 map.js 迁移，保持逻辑不变
// ============================================================

function _bg_inferno(lv, theme) {
  background(24, 8, 2);

  for (let gx=0; gx<GRID_COLS; gx++) {
    for (let gy=1; gy<GRID_ROWS; gy++) {
      const px=gx*CELL_SIZE, py=gy*CELL_SIZE;
      if (pathCellSet && pathCellSet.has(gx+','+gy)) continue;
      const {n1,n2,n3,n4}=_floorCache[gx][gy];
      noStroke();
      fill(38+n3*20, 18+n1*8, 4+n2*4, 255); rect(px,py,CELL_SIZE,CELL_SIZE);
      if ((gx+gy)%2===0) { fill(0,0,0,22); rect(px,py,CELL_SIZE,CELL_SIZE); }
      // 岩裂纹
      stroke(55+n3*20,22+n1*8,5+n4*4,45); strokeWeight(1);
      const cx2=px+CELL_SIZE/2, cy2=py+CELL_SIZE/2;
      line(cx2+n1*18,cy2+n2*18, cx2+n3*18-8,cy2+n4*18-8);
      if (n3>0.55) line(cx2-n2*14,cy2+n1*12, cx2+n4*12,cy2-n3*14);
      // 熔岩光池
      if (n3>0.72) {
        noStroke();
        const lp=sin(frameCount*.04+gx*.7+gy*.5)*.5+.5;
        fill(200+lp*55, 60+lp*30, 0, (20+lp*30)*n3);
        ellipse(cx2+n1*12,cy2+n2*12, 14+lp*8+n4*10, 8+lp*5+n4*6);
      }
    }
  }

  noStroke();
  for (let gx=0; gx<GRID_COLS; gx++)
    for (let gy=0; gy<GRID_ROWS; gy++) {
      if (!(pathCellSet&&pathCellSet.has(gx+','+gy))) continue;
      const {n1,n3}=_floorCache[gx][gy];
      fill(45+n3*15, 22+n1*6, 8+n1*4, 255);
      rect(gx*CELL_SIZE, gy*CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

  stroke(180,60,10,20); strokeWeight(1);
  for (let x=0;x<=width;x+=CELL_SIZE) line(x,0,x,height);
  for (let y=0;y<=height;y+=CELL_SIZE) line(0,y,width,y);

  _deco_inferno();
  _drawFog(80,18,2, 70);
  _drawCornerHUD(theme.grid);
  _drawLevelLabel(lv, 200,80,20, 60);
}

function _deco_inferno() {
  const T=frameCount;
  for (const d of _decoCache) {
    const cx=d.gx*CELL_SIZE+CELL_SIZE/2, cy=d.gy*CELL_SIZE+CELL_SIZE/2;
    const type=Math.floor(d.r1*4);
    const ds=0.85+d.gy/GRID_ROWS*0.3;
    push(); translate(cx,cy);

    if (type===0) {        // 火山岩
      const sz=(14+d.r2*12)*ds;
      noStroke(); fill(0,0,0,40); ellipse(sz*.15,sz*.55,sz*1.6,sz*.38);
      fill(55+d.r3*20, 25+d.r3*10, 8+d.r3*5, 245);
      beginShape();
      for (let k=0;k<7+Math.floor(d.r3*3);k++) {
        const ang=k/(7+Math.floor(d.r3*3))*TWO_PI+d.r4;
        vertex(cos(ang)*sz*(.75+Math.sin(k*1.7+d.r1)*.25), sin(ang)*sz*.7*(.75+Math.sin(k*1.7+d.r1)*.25));
      }
      endShape(CLOSE);
      const lp=sin(T*.05+d.r1*6)*.5+.5;
      stroke(255,80+lp*40,0, 60+lp*60); strokeWeight(1.5);
      line(-sz*.3,sz*.05, sz*.1,-sz*.15);
      if (d.r3>0.5) line(sz*.15,sz*.18, -sz*.05,sz*.3);
      noStroke(); fill(80,35,12,100); ellipse(-sz*.2,-sz*.2,sz*.3,sz*.22);

    } else if (type===1) { // 熔岩池（动态）
      const sz=(8+d.r2*8)*ds;
      const lp=sin(T*.06+d.r1*4)*.5+.5, lp2=sin(T*.04+d.r2*3+1)*.5+.5;
      noStroke();
      fill(40,15,5,240); ellipse(0,0,sz*2.2,sz*1.5);
      fill(180+lp*40, 45+lp*25, 0, 220); ellipse(sz*.05*lp2,0,sz*1.7,sz*1.1);
      fill(220+lp*35, 80+lp*30, 5, 180); ellipse(-sz*.08+sz*.06*lp,-sz*.1,sz*1.0,sz*.65);
      fill(255, 140+lp*40, 20, 140); ellipse(sz*.05,-sz*.15,sz*.55,sz*.35);
      if (d.r3>0.45) {
        const bp=(T*.03+d.r4*6)%1;
        fill(255,180,40, sin(bp*PI)*150);
        ellipse(d.r1*sz*.5-sz*.25,-sz*.3*bp, sz*.22,sz*.22);
      }
      fill(255,100,0, 25+lp*20); ellipse(0,0,sz*3.2,sz*2.2);

    } else if (type===2) { // 焦木
      const sz=(10+d.r2*8)*ds;
      noStroke(); fill(0,0,0,30); ellipse(sz*.1,sz*.6,sz*1.2,sz*.28);
      fill(22,12,6,250); rect(-sz*.22,-sz*.1,sz*.44,sz*.72,2);
      fill(12,6,2,180);
      for (let k=0;k<3;k++) rect(-sz*.18+k*sz*.12,-sz*.08,sz*.04,sz*.68);
      stroke(18,10,4,220); strokeWeight(2.5);
      line(-sz*.1,-sz*.1, -sz*.3,-sz*.35); line(sz*.08,-sz*.05, sz*.28,-sz*.22);
      const ep=sin(T*.07+d.r1*5)*.5+.5;
      noStroke(); fill(180+ep*40,30+ep*15,0, 60+ep*80);
      ellipse(0,-sz*.12+ep*sz*.04, sz*.3,sz*.15);

    } else {               // 小岩石
      const sz=(6+d.r2*7)*ds;
      noStroke(); fill(0,0,0,35); ellipse(sz*.1,sz*.5,sz*1.4,sz*.3);
      fill(45+d.r3*18,20+d.r3*8,6+d.r3*4,240);
      beginShape();
      for (let k=0;k<6;k++) {
        const ang=k/6*TWO_PI+d.r4, r=sz*(.78+Math.sin(k*2.1+d.r1)*.22);
        vertex(cos(ang)*r, sin(ang)*r*.62);
      }
      endShape(CLOSE);
      fill(65+d.r3*20,30+d.r3*10,8,90); ellipse(-sz*.22,-sz*.2,sz*.32,sz*.22);
    }
    pop();
  }
}
