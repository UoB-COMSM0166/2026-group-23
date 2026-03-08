// src/managers/Path.js
export class Path {
  constructor(waypoints = null) {
    // 定义路径点（只存储路径数据，不存储状态）
    this.waypoints = waypoints || [
      createVector(0, 500),      // 起点（左侧）
      createVector(200, 500),    // 向右
      createVector(200, 300),    // 向上
      createVector(400, 300),    // 向右
      createVector(400, 500),    // 向下
      createVector(600, 500),    // 向右
      createVector(600, 300),    // 向上
      createVector(800, 300)     // 终点（右侧）
    ];
    
    // 路径宽度
    this.pathWidth = 55;
    
    // 生成平滑路径点（用于更自然的转弯）
    this.smoothWaypoints = this.generateSmoothPath();
  }

  // 生成平滑路径（在拐角处插入额外的点）
  generateSmoothPath() {
    let smoothPoints = [];
    
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      let p1 = this.waypoints[i];
      let p2 = this.waypoints[i + 1];
      
      // 添加当前点
      if (i === 0) smoothPoints.push(p1);
      
      // 计算距离
      let distance = p5.Vector.dist(p1, p2);
      
      // 如果距离较大，插入中间点使转弯更平滑
      if (distance > 50) {
        let steps = Math.floor(distance / 20);
        for (let j = 1; j < steps; j++) {
          let t = j / steps;
          let interpolated = p5.Vector.lerp(p1, p2, t);
          smoothPoints.push(interpolated);
        }
      }
      
      smoothPoints.push(p2);
    }
    
    return smoothPoints;
  }

  // 获取路径点数量
  getWaypointCount() {
    return this.waypoints.length;
  }

  // 获取指定索引的路径点
  getWaypoint(index) {
    if (index >= 0 && index < this.waypoints.length) {
      return this.waypoints[index];
    }
    return null;
  }

  // 获取所有路径点
  getAllWaypoints() {
    return this.waypoints;
  }

  draw() {
    if (!this.waypoints || this.waypoints.length < 2) return;
    
    push();

    // 绘制主道路
    this.drawMainRoad();
    
    pop();
    
    // 可选：绘制路径点（调试用，可以注释掉）
    // this.drawWaypoints();
  }

  // 绘制主道路
  drawMainRoad() {
    push();
    noStroke();
    
    // 使用更自然的棕色
    fill(101, 67, 33); // 深棕色
    
    // 绘制每个路径段
    for (let i = 0; i < this.smoothWaypoints.length - 1; i++) {
      let p1 = this.smoothWaypoints[i];
      let p2 = this.smoothWaypoints[i + 1];
      
      // 计算方向向量
      let dir = p5.Vector.sub(p2, p1);
      dir.normalize();
      
      // 计算垂直向量
      let perp = createVector(-dir.y, dir.x);
      
      // 计算四个角点
      let halfWidth = this.pathWidth / 2;
      
      let p1Left = p5.Vector.add(p1, p5.Vector.mult(perp, halfWidth));
      let p1Right = p5.Vector.sub(p1, p5.Vector.mult(perp, halfWidth));
      let p2Left = p5.Vector.add(p2, p5.Vector.mult(perp, halfWidth));
      let p2Right = p5.Vector.sub(p2, p5.Vector.mult(perp, halfWidth));
      
      // 绘制道路段
      beginShape();
      vertex(p1Left.x, p1Left.y);
      vertex(p1Right.x, p1Right.y);
      vertex(p2Right.x, p2Right.y);
      vertex(p2Left.x, p2Left.y);
      endShape(CLOSE);
    }
    
    // 在拐角处绘制额外的填充，使转弯更自然
    this.smoothCorners();
    
    pop();
  }

  
  // 平滑拐角处理
  smoothCorners() {
    push();
    noStroke();
    fill(101, 67, 33); // 同主道路颜色
    
    // 在拐角处绘制圆形填充
    for (let i = 1; i < this.waypoints.length - 1; i++) {
      let corner = this.waypoints[i];
      
      // 在拐角处绘制一个大圆，使转弯更自然
      circle(corner.x, corner.y, this.pathWidth);
    }
    
    pop();
  }

  // 绘制路径点（调试用）
  drawWaypoints() {
    push();
    
    for (let i = 0; i < this.waypoints.length; i++) {
      let wp = this.waypoints[i];
      
      // 起点和终点用不同颜色
      if (i === 0) {
        fill(0, 255, 0, 150); // 起点绿色半透明
      } else if (i === this.waypoints.length - 1) {
        fill(255, 0, 0, 150); // 终点红色半透明
      } else {
        fill(255, 255, 0, 150); // 中间点黄色半透明
      }
      
      noStroke();
      circle(wp.x, wp.y, 8);
    }
    
    pop();
  }

  // 设置路径宽度
  setPathWidth(width) {
    this.pathWidth = width;
    // 重新生成平滑路径
    this.smoothWaypoints = this.generateSmoothPath();
  }
  
  // 添加新的路径点（用于编辑器）
  addWaypoint(x, y) {
    this.waypoints.push(createVector(x, y));
    this.smoothWaypoints = this.generateSmoothPath();
  }
  
  // 移除最后一个路径点
  removeLastWaypoint() {
    if (this.waypoints.length > 2) {
      this.waypoints.pop();
      this.smoothWaypoints = this.generateSmoothPath();
    }
  }
}