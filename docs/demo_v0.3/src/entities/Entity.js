// src/entities/Entity.js
import { animations } from '../../sketch.js'; // 导入全局动画资源

export class SpriteEntity {
  constructor(x, y, configName) {
    this.pos = createVector(x, y);
    this.currentAction = configName;
    this.frameIdx = 0;
    this.timer = 0;
    this.facing = 1;
  }

  animate(actionName, fps = 10) {
    if (this.currentAction !== actionName) {
      this.currentAction = actionName;
      this.frameIdx = 0;
    }
    this.timer += deltaTime / 1000;
    if (this.timer > 1 / fps) {
      // 检查动画是否存在
      if (animations[this.currentAction]) {
        this.frameIdx = (this.frameIdx + 1) % animations[this.currentAction].length;
      }
      this.timer = 0;
    }
  }
}