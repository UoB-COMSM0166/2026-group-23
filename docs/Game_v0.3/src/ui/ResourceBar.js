// src/ui/ResourceBar.js

export class ResourceBar {
  constructor(resourceManager, layout) {
    this.resourceManager = resourceManager;
    this.layout = layout; // 整个画布的布局
    this.height = 60; // 资源条高度
    
    // 注册资源变化监听
    this.resourceManager.addListener((data) => {
      this.updateData(data);
    });
    
    // 当前数据
    this.gold = resourceManager.gold;
    this.hp = resourceManager.playerHp;
    this.maxHp = resourceManager.maxPlayerHp;
    this.wave = resourceManager.wave;
    this.maxWave = resourceManager.maxWave;
    
    this.lastGoldEarned = 0;
  }

  updateData(data) {
    this.gold = data.gold;
    this.hp = data.hp;
    this.maxHp = data.maxHp;
  }

  display() {
    push();
    
    // 金币显示
    this.drawGold();
    
    // 血量显示
    this.drawHealth();

    // 波次显示
    this.drawWave();
    
    pop();
  }

  drawGold() {
    push();
    
    // 金币图标 (使用绝对坐标)
    fill(255, 215, 0);
    noStroke();
    ellipse(50, this.height / 2, 30, 30);
    
    // 金币符号
    fill(0);
    textSize(20);
    text('💰', 50, this.height / 2);
    
    // 金币数量
    fill(255, 215, 0);
    textSize(24);
    textAlign(LEFT, CENTER);
    text(this.gold, 70, this.height / 2);
    
    // 金币获取提示
    if (this.lastGoldEarned && this.lastGoldEarned > 0) {
      fill(0, 255, 0);
      textSize(16);
      text(`+${this.lastGoldEarned}`, 170, this.height / 2 - 15);
    }
    
    pop();
  }

  drawHealth() {
    push();
    
    // 血量图标
    fill(255);
    noStroke();
    ellipse(150, this.height / 2, 30, 30);

    // 血量符号
    fill(255, 0, 0);
    textSize(20);
    text('❤️', 150, this.height / 2 + 2);
    
    // 血量数字
    fill(255);
    textSize(24);
    textAlign(LEFT, CENTER);
    text(this.hp, 180, this.height / 2 + 1);
    
    pop();
  }

  drawWave() {
    push();
    
    // 波次图标
    fill(255);
    noStroke();
    ellipse(250, this.height / 2, 30, 30);

    // 波次符号
    fill(255, 0, 0);
    textSize(20);
    text('⚔️', 250, this.height / 2 + 2);
    
    // 波次数字
    fill(255);
    textSize(24);
    textAlign(LEFT, CENTER);
    text(`WAVE: ${this.wave}/${this.maxWave}`, 280, this.height / 2 + 1);
    
    pop();
  }

  showGoldEarned(amount) {
    this.lastGoldEarned = amount;
    setTimeout(() => {
      this.lastGoldEarned = 0;
    }, 2000);
  }
}