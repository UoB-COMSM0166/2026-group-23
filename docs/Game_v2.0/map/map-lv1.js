// ============================================================
//  map/map-lv1.js  —  关卡1  青草地
//  调用方：map-core.js drawBackground() → _bg_grassland()
//  依赖：_floorCache  _decoCache  _drawFog  _drawCornerHUD  _drawLevelLabel
// ============================================================

function _bg_grassland(lv, theme) {
  background(22, 38, 14);

  // ── 草地地面（噪声色偏 + 草纹）──
  for (let gx=0; gx<GRID_COLS; gx++) {
    for (let gy=1; gy<GRID_ROWS; gy++) {
      const px=gx*CELL_SIZE, py=gy*CELL_SIZE;
      if (pathCellSet && pathCellSet.has(gx+','+gy)) continue;
      const {n1,n2,n3,n4} = _floorCache[gx][gy];
      noStroke();
      fill(28+n3*18, 52+n1*14+n2*8, 16+n4*10, 255);
      rect(px, py, CELL_SIZE, CELL_SIZE);
      if ((gx+gy)%2===0) { fill(0,0,0,18); rect(px,py,CELL_SIZE,CELL_SIZE); }
      // 草纹
      stroke(40+n3*20, 80+n1*15, 20+n4*12, 55); strokeWeight(1);
      const blades=4+Math.floor(n3*3);
      for (let k=0; k<blades; k++) {
        const bx=px+(n1*0.5+0.5+k/blades)*CELL_SIZE;
        const by=py+(n2*0.3+0.35)*CELL_SIZE;
        const ang=-HALF_PI+(n1+k)*0.35;
        line(bx,by, bx+cos(ang)*(4+n4*5), by+sin(ang)*(4+n4*5));
      }
    }
  }

  // ── 路径格子底色（泥土）──
  noStroke();
  for (let gx=0; gx<GRID_COLS; gx++)
    for (let gy=0; gy<GRID_ROWS; gy++) {
      if (!(pathCellSet&&pathCellSet.has(gx+','+gy))) continue;
      const {n1,n2,n3}=_floorCache[gx][gy];
      fill(55+n3*15, 38+n1*8, 18+n2*6, 255);
      rect(gx*CELL_SIZE, gy*CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

  stroke(50,90,30,22); strokeWeight(1);
  for (let x=0;x<=width;x+=CELL_SIZE) line(x,0,x,height);
  for (let y=0;y<=height;y+=CELL_SIZE) line(0,y,width,y);

  _deco_grassland();
  _drawFog(10,30,8, 65);
  _drawCornerHUD(theme.grid);
  _drawLevelLabel(lv, 80,130,50, 55);
}

// ── 草地装饰物 ──
function _deco_grassland() {
  for (const d of _decoCache) {
    const cx=d.gx*CELL_SIZE+CELL_SIZE/2, cy=d.gy*CELL_SIZE+CELL_SIZE/2;
    const type=Math.floor(d.r1*4);
    const ds=0.85+d.gy/GRID_ROWS*0.3; // 透视深度缩放
    push(); translate(cx,cy); noStroke();

    if (type===0) {         // 橡树
      const sz=(22+d.r2*10)*ds;
      fill(0,0,0,30); ellipse(sz*0.22,sz*0.18,sz*1.6,sz*0.5);
      for (const [ox,oy,r,c] of [
        [0,0,sz,[25,55,12]],[-sz*.18,-sz*.12,sz*.75,[30,68,16]],
        [sz*.14,-sz*.15,sz*.72,[32,72,18]],[0,-sz*.28,sz*.62,[36,80,20]],[0,-sz*.42,sz*.42,[42,90,22]]
      ]) { fill(c[0],c[1],c[2],240); ellipse(ox,oy,r,r*0.92); }
      fill(55,110,28,120); ellipse(-sz*.2,-sz*.35,sz*.28,sz*.22);
      fill(55,35,15,240); rect(-sz*.08,sz*.28,sz*.16,sz*.38,2);
      fill(70,48,22,180); rect(-sz*.08,sz*.28,sz*.06,sz*.38,2);
      fill(0,0,0,40); rect(-sz*.08,sz*.62,sz*.16,sz*.08,1);

    } else if (type===1) {  // 松树
      const sz=(14+d.r2*7)*ds;
      fill(0,0,0,25); ellipse(sz*.15,sz*.5,sz*1.2,sz*.3);
      for (let ti=0; ti<3; ti++) {
        const [tx,ty,ts]=[[0,sz*.5,sz],[0,sz*.1,sz*.78],[0,-sz*.2,sz*.5]][ti];
        const c=[[22,55,14],[28,68,18],[34,78,20]][ti];
        fill(c[0],c[1],c[2],240);
        triangle(tx,ty-ts*.1, tx-ts*.5,ty+ts*.4, tx+ts*.5,ty+ts*.4);
        fill(c[0]+12,c[1]+15,c[2]+8,80);
        triangle(tx,ty-ts*.1, tx-ts*.12,ty+ts*.05, tx+ts*.05,ty-ts*.05);
      }
      fill(50,30,12,220); rect(-sz*.06,sz*.48,sz*.12,sz*.22,1);

    } else if (type===2) {  // 灌木
      const sz=(10+d.r2*6)*ds;
      fill(0,0,0,22); ellipse(sz*.1,sz*.35,sz*1.8,sz*.4);
      for (let bi=0; bi<3; bi++) {
        const bx=(bi-1)*sz*.45+d.r3*sz*.1, by=bi%2===0?0:-sz*.12;
        const br=sz*(.55+bi*.08), bc=[[28,60,14],[33,72,18],[25,52,12]][bi%3];
        fill(bc[0],bc[1],bc[2],230); ellipse(bx,by,br,br*.82);
        fill(bc[0]+10,bc[1]+12,bc[2]+6,80); ellipse(bx-br*.2,by-br*.2,br*.35,br*.28);
      }

    } else {                // 石头
      const sz=(8+d.r2*8)*ds;
      fill(0,0,0,35); ellipse(sz*.12,sz*.55,sz*1.5,sz*.35);
      const sr=95+d.r3*25, sg=88+d.r3*20, sb=78+d.r3*18;
      fill(sr,sg,sb,235);
      beginShape();
      for (let k=0;k<6+Math.floor(d.r3*3);k++) {
        const ang=k/(6+Math.floor(d.r3*3))*TWO_PI+d.r4;
        const r=sz*(.8+Math.sin(k*2.3+d.r1)*.2);
        vertex(cos(ang)*r, sin(ang)*r*.65);
      }
      endShape(CLOSE);
      fill(sr+25,sg+22,sb+20,120);
      beginShape(); vertex(-sz*.3,-sz*.28);vertex(sz*.05,-sz*.38);vertex(sz*.1,-sz*.05);vertex(-sz*.35,-sz*.05); endShape(CLOSE);
      fill(sr-25,sg-22,sb-20,100);
      beginShape(); vertex(sz*.1,sz*.05);vertex(sz*.35,sz*.1);vertex(sz*.25,sz*.38);vertex(-sz*.05,sz*.35); endShape(CLOSE);
    }
    pop();
  }
}
