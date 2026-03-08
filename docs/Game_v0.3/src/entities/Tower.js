// src/entities/Tower.js
import { SpriteEntity } from './Entity.js';
import { Archer } from './Archer.js';
import { animations } from '../../sketch.js'; // 导入全局动画资源

export class Tower extends SpriteEntity {
  constructor(x, y) {
    // 调用父类构造函数，初始化 this.pos 和动画相关变量
    super(x, y); 
    // 每个塔自带一个弓箭手
    this.archer = new Archer(x, y); 
  }

  update(targets, bullets) {
    // 播放 Tower_Base 的动画
    this.animate('Tower_Base', 5);
    
    this.archer.update(targets, bullets);
  }

  display() {
    // 1. 绘制塔基座动画
    push();
    translate(this.pos.x, this.pos.y);
    // 地基不需要翻转，scale 保持 (1, 1)
    image(animations['Tower_Base'][this.frameIdx], 0, 0);
    pop();
    
    // 2. 绘制弓箭手
    this.archer.display();
  }
}