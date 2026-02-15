// src/managers/ResourceManager.js
import { GameConfig } from '../constants/GameConfig.js';

export class ResourceManager {
  constructor() {
    this.gold = GameConfig.RESOURCE.INITIAL_GOLD; // 初始金币
    this.maxPlayerHp = GameConfig.RESOURCE.INITIAL_HP; // 玩家血量
    this.playerHp = this.maxPlayerHp;
    this.wave = 1; // 当前波数
    this.maxWave = GameConfig.RESOURCE.MAX_WAVE; // 最大波数
    
    // 事件监听器
    this.listeners = [];
  }

  // 添加金币
  addGold(amount) {
    this.gold += amount;
    this.notifyListeners('gold', amount);
  }

  // 消耗金币
  spendGold(amount) {
    if (this.gold >= amount) {
      this.gold -= amount;
      this.notifyListeners('gold', -amount);
      return true;
    }
    return false;
  }

  // 减少血量
  takeDamage(damage) {
    this.playerHp = Math.max(0, this.playerHp - damage);
    this.notifyListeners('hp', -damage);
    return this.playerHp <= 0;
  }

  // 恢复血量
  heal(amount) {
    this.playerHp = Math.min(this.maxPlayerHp, this.playerHp + amount);
    this.notifyListeners('hp', amount);
  }

  // 小游戏得分转换为金币
  minigameScoreToGold(score) {
    // 每10分换1金币
    let goldEarned = Math.floor(score / 10);
    this.addGold(goldEarned);
    return goldEarned;
  }

  // 注册事件监听
  addListener(callback) {
    this.listeners.push(callback);
  }

  // 通知所有监听器
  notifyListeners(type, amount) {
    for (let listener of this.listeners) {
      listener({
        type: type,
        amount: amount,
        gold: this.gold,
        hp: this.playerHp,
        maxHp: this.maxPlayerHp
      });
    }
  }
}