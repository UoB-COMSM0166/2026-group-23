// src/minigame/MinigameManager.js

export class MinigameManager {
  constructor(layout, resourceManager) {
    this.layout = layout;
    this.resourceManager = resourceManager;
    this.score = 0;
    this.gameState = 'PLAYING';
    this.totalEarnedGold = 0;
    
    // 小游戏示例：接住掉落物
    this.player = {
      x: layout.width / 2,
      y: layout.height - 50,
      width: 60,
      height: 20
    };
    
    this.items = [];
    this.itemSpawnTimer = 0;
  }
  
  // ... preload 和 update 方法 ...
  
  update() {
    if (this.gameState !== 'PLAYING') return;
    
    // 生成新物品
    this.itemSpawnTimer++;
    if (this.itemSpawnTimer > 30) {
      this.items.push({
        x: random(20, this.layout.width - 20),
        y: 20,
        size: 15,
        speed: 2,
        value: 10 // 每个物品价值10分
      });
      this.itemSpawnTimer = 0;
    }
    
    // 更新物品位置
    for (let i = this.items.length - 1; i >= 0; i--) {
      let item = this.items[i];
      item.y += item.speed;
      
      // 检查是否被玩家接住
      if (item.y + item.size/2 > this.player.y - this.player.height/2 &&
          item.x > this.player.x - this.player.width/2 &&
          item.x < this.player.x + this.player.width/2) {
        
        this.items.splice(i, 1);
        this.score += item.value;
        
        // 每100分兑换一次金币
        if (this.score >= 100) {
          let goldEarned = Math.floor(this.score / 100) * 10;
          this.resourceManager.minigameScoreToGold(this.score);
          this.totalEarnedGold += goldEarned;
          this.score = this.score % 100; // 保留剩余分数
        }
      }
      // 检查是否掉落到屏幕外
      else if (item.y - item.size/2 > this.layout.height) {
        this.items.splice(i, 1);
        this.gameState = 'GAMEOVER';
        
        // 游戏结束扣除血量
        this.resourceManager.takeDamage(1);
      }
    }
    
    // 玩家移动
    this.player.x = constrain(mouseX - this.layout.x, 
                              this.player.width/2, 
                              this.layout.width - this.player.width/2);
  }
  
  display() {
    push();
    
    // 小游戏背景
    fill(50, 50, 80);
    noStroke();
    rect(this.layout.width/2, this.layout.height/2, 
         this.layout.width, this.layout.height);
    
    // 显示当前分数和已获得金币
    fill(255);
    textSize(20);
    text(`Score: ${this.score}`, this.layout.width / 2, 40);
    
    // 显示游戏状态
    if (this.gameState === 'GAMEOVER') {
      fill(255, 0, 0, 200);
      textSize(30);
      text('GAMEOVER', this.layout.width / 2, this.layout.height / 2);
      textSize(16);
      text('Tap to restart', this.layout.width / 2, this.layout.height / 2 + 40);
    }
    
    // 绘制掉落物品
    fill(255, 255, 0);
    noStroke();
    for (let item of this.items) {
      ellipse(item.x, item.y, item.size);
    }
    
    // 绘制玩家挡板
    fill(0, 255, 0);
    rect(this.player.x, this.player.y, this.player.width, this.player.height);
    
    // 绘制小游戏边界
    noFill();
    stroke(255);
    strokeWeight(2);
    rect(this.layout.width/2, this.layout.height/2, 
         this.layout.width - 4, this.layout.height - 4);
    
    pop();
  }
  
  handleMousePressed(localX, localY) {
    if (this.gameState === 'GAMEOVER') {
      // 重新开始游戏
      this.score = 0;
      this.items = [];
      this.gameState = 'PLAYING';
      // 不重置 totalEarnedGold，让玩家保留已获得的金币
    }
  }
}