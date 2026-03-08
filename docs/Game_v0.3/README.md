# 双屏塔防游戏技术文档

## 1. 项目概述

这是一个基于 p5.js 开发的双屏游戏，左侧为塔防主游戏，右侧为休闲小游戏。两个游戏共享同一资源系统（金币、血量），小游戏得分可转换为塔防游戏资源。

### 1.1 核心特性
- **双屏设计**：左右分屏同时运行两种游戏模式
- **资源共享**：金币和血量在两个游戏间共享
- **动画系统**：基于精灵表的帧动画
- **事件驱动**：资源变化通过监听器实时更新UI
- **模块化架构**：清晰的分层设计，便于扩展

### 1.2 技术栈
- **p5.js**：游戏渲染和交互核心
- **JavaScript ES6**：使用类、模块化等特性
- **精灵表动画**：通过图片序列实现动画

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         sketch.js                           │
│                      (主入口/生命周期)                        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  GameManager  │     │MinigameManager│     │ AssetManager  │
│  (塔防主游戏)   │     │  (小游戏)      │     │  (资源管理)    │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                      │
        ▼                     ▼                      ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Entities    │     │ResourceManager│     │  animations   │
│  (游戏实体)    │◄────│  (资源共享)     │────►│  (全局动画)    │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     ▲
        ▼                     │
┌───────────────┐     ┌───────────────┐
│     Path      │     │  ResourceBar  │
│   (路径系统)   │     │    (UI组件)    │
└───────────────┘     └───────────────┘
```

### 2.2 目录结构

```
project/
│
├── sketch.js                    # 主入口文件
│
├── src/
│   ├── constants/               # 常量配置
│   │   ├── GameConfig.js        # 游戏参数配置
│   │   └── LayoutConfig.js      # 布局配置
│   │
│   ├── system/                  # 系统管理类
│   │   ├── GameManager.js       # 塔防主游戏管理器
│   │   ├── AssetManager.js      # 资源加载管理器
│   │   └── MinigameManager.js   # 小游戏管理器
│   │
│   ├── managers/                # 功能管理器
│   │   ├── ResourceManager.js   # 资源管理
│   │   └── Path.js              # 路径管理
│   │
│   ├── entities/                # 游戏实体类
│   │   ├── Entity.js            # 实体基类
│   │   ├── Enemy.js             # 敌人实体
│   │   ├── Tower.js             # 塔实体
│   │   ├── Archer.js            # 弓箭手实体
│   │   └── Bullet.js            # 子弹实体
│   │
│   └── ui/                      # 界面组件
│       └── ResourceBar.js       # 顶部资源条
│
└── assets/                      # 游戏资源文件夹
    ├── enemy/
    ├── tower/
    ├── archer/
    └── Arrow/
```

## 3. 核心模块详解

### 3.1 常量配置模块

#### **GameConfig.js**
游戏核心参数配置，集中管理所有可调参数。

```javascript
// 关键配置项
RESOURCE: {
  INITIAL_GOLD: 100,    // 初始金币
  INITIAL_HP: 20,       // 初始血量
  MAX_WAVE: 10          // 最大波数
}

ENEMY: {
  INITIAL_HP: 100,      // 敌人初始血量
  SPEED: 40            // 移动速度
}

ARCHER: {
  ATTACK_RANGE: 300,    // 攻击范围
  ATTACK_SPEED: 1.0,    // 攻击速度
  DAMAGE: 25           // 攻击力
}
```

#### **LayoutConfig.js**
屏幕布局配置，确保多区域精确定位。

```javascript
// 布局尺寸
CANVAS: {
  width: 1120,  // 800(主游戏) + 320(小游戏)
  height: 660   // 600(游戏区) + 60(资源条)
}
```

### 3.2 实体系统

#### **Entity.js - 实体基类**
所有游戏实体的基础，提供动画管理功能。

```javascript
class SpriteEntity {
  constructor(x, y) {
    this.pos = createVector(x, y);    // 位置
    this.currentAction = null;        // 当前动画
    this.frameIdx = 0;                // 当前帧索引
    this.facing = 1;                  // 朝向(-1:左, 1:右)
  }
  
  // 动画管理
  animate(actionName, fps = 10) {
    // 切换动画时重置帧索引
    if (this.currentAction !== actionName) {
      this.currentAction = actionName;
      this.frameIdx = 0;
    }
    // 按帧率更新动画帧
    this.timer += deltaTime / 1000;
    if (this.timer > 1 / fps) {
      this.frameIdx = (this.frameIdx + 1) % animations[this.currentAction].length;
      this.timer = 0;
    }
  }
}
```

#### **Enemy.js - 敌人系统**
- **路径跟随**：沿预设路径移动，支持个性化偏移
- **状态管理**：行走、死亡状态切换
- **血条显示**：动态血条，颜色随血量变化

关键特性：路径偏移系统
```javascript
// 为每个敌人生成独特的偏移路径
generateOffsetPath() {
  // 起点终点保持不变
  // 中间点根据拐角方向进行平行偏移
  // 实现多人并行行走效果
}
```

#### **Archer.js - 弓箭手系统**
- **自动索敌**：在攻击范围内寻找最近敌人
- **攻击冷却**：基于攻击速度的冷却系统
- **动画同步**：攻击动画与子弹发射同步

#### **Bullet.js - 子弹系统**
- **方向计算**：8方向/13种角度的子弹图片选择
- **目标追踪**：实时追踪移动的敌人
- **碰撞检测**：距离判定命中

```javascript
// 子弹方向计算算法
calculateDirectionAndFlip() {
  // 根据速度向量计算角度
  let angleDeg = atan2(this.velocity.y, this.velocity.x) * 180 / PI;
  // 转换为0-360度
  if (angleDeg < 0) angleDeg += 360;
  
  // 根据象限选择对应的子弹图片和翻转方式
  // 实现13种角度的平滑过渡
}
```

### 3.3 管理器系统

#### **AssetManager.js - 资源管理器**
- **图片加载**：预加载所有精灵表
- **动画切割**：将精灵表分割为动画帧
- **资源缓存**：提供统一的动画访问接口

#### **ResourceManager.js - 资源管理器**
采用观察者模式，资源变化时通知UI更新。

```javascript
class ResourceManager {
  constructor() {
    this.gold = 100;
    this.playerHp = 20;
    this.listeners = [];  // 事件监听器
  }
  
  // 资源变更方法
  addGold(amount) {
    this.gold += amount;
    this.notifyListeners('gold', amount);
  }
  
  // 通知所有监听器
  notifyListeners(type, amount) {
    for (let listener of this.listeners) {
      listener({
        type, amount,
        gold: this.gold,
        hp: this.playerHp
      });
    }
  }
}
```

#### **Path.js - 路径系统**
- **路径定义**：通过关键点定义路径
- **平滑处理**：在拐角处插入中间点
- **可视化**：绘制道路和拐角

### 3.4 小游戏系统

#### **MinigameManager.js**
实现简单的接物游戏，与主游戏共享资源。

```javascript
class MinigameManager {
  update() {
    // 物品生成
    // 碰撞检测
    // 得分累积
    // 资源转换
  }
  
  // 分数转金币逻辑
  minigameScoreToGold(score) {
    let goldEarned = Math.floor(score / 10);
    this.resourceManager.addGold(goldEarned);
    return goldEarned;
  }
}
```

### 3.5 UI组件

#### **ResourceBar.js**
- **实时更新**：通过监听器响应资源变化
- **视觉反馈**：金币获取时的浮动提示
- **多元素显示**：金币、血量、波次

## 4. 核心流程

### 4.1 游戏初始化流程

```javascript
// preload阶段：加载资源
AssetManager.preload() → 加载所有精灵表

// setup阶段：初始化
AssetManager.setup() → 切割动画帧 → 生成animations对象
new ResourceManager() → 初始化资源
new GameManager() → 创建塔、路径
new MinigameManager() → 初始化小游戏
new ResourceBar() → 注册监听器

// draw循环：每帧更新
ResourceBar.display() → 显示顶部资源条
GameManager.update() → 更新塔防游戏
GameManager.display() → 绘制塔防游戏
MinigameManager.update() → 更新小游戏
MinigameManager.display() → 绘制小游戏
```

### 4.2 战斗流程

```
敌人生成 (GameManager)
    ↓
敌人沿路径移动 (Enemy.update)
    ↓
弓箭手索敌 (Archer.findNearest)
    ↓
进入攻击范围 → 发射子弹 (Archer.startAttack)
    ↓
子弹追踪 (Bullet.update)
    ↓
命中敌人 (Bullet碰撞检测)
    ↓
敌人扣血 (Enemy.takeDamage)
    ↓
血量归零 → 播放死亡动画 (Enemy.playDeathAnimation)
    ↓
移除敌人 (GameManager)
```

### 4.3 资源流转

```
小游戏得分 (MinigameManager)
    ↓
分数累积 (score积累)
    ↓
达到阈值 → 转换为金币 (minigameScoreToGold)
    ↓
ResourceManager.addGold()
    ↓
通知监听器 (notifyListeners)
    ↓
ResourceBar更新显示
```

## 5. 关键算法

### 5.1 动画系统
基于精灵表的帧动画，支持不同帧率。

```javascript
// 动画帧计算
timer += deltaTime / 1000;
if (timer > 1 / fps) {
  frameIdx = (frameIdx + 1) % totalFrames;
  timer = 0;
}
```

### 5.2 路径偏移算法
```javascript
// 计算垂直向量
let perpendicular = createVector(-avgDir.y, avgDir.x);
// 根据拐角方向决定偏移方向
let cross = dirIn.x * dirOut.y - dirIn.y * dirOut.x;
let offsetMultiplier = cross > 0 ? 1 : -1;
// 应用偏移
offsetPoint = createVector(
  wp.x + perpendicular.x * offsetX * offsetMultiplier,
  wp.y + perpendicular.y * offsetY * offsetMultiplier
);
```

### 5.3 子弹方向算法
```javascript
// 角度映射到13张图片
// 0°(上) → 图片1
// 90°(右) → 图片13
// 根据不同象限组合翻转
if (angleDeg >= 0 && angleDeg <= 90) {
  // 第一象限：无需翻转
  bulletIndex = floor(angleDeg / (90 / 13)) + 1;
  bulletIndex = 14 - bulletIndex; // 转换为13-1
}
```

## 6. 事件系统

### 6.1 观察者模式实现
```javascript
// 注册监听器
addListener(callback) {
  this.listeners.push(callback);
}

// 触发事件
notifyListeners(type, amount) {
  const event = {
    type, amount,
    gold: this.gold,
    hp: this.playerHp,
    maxHp: this.maxPlayerHp
  };
  
  this.listeners.forEach(listener => listener(event));
}
```

## 7. 配置与扩展

### 7.1 添加新敌人
1. 在 `GameConfig.js` 中添加敌人属性
2. 在 `AssetManager.js` 中添加资源配置
3. 在 `assets/` 中添加对应精灵表

### 7.2 添加新塔类型
1. 创建新的塔类继承 `SpriteEntity`
2. 在 `GameConfig.js` 中配置属性
3. 在 `GameManager` 中实例化

## 8. 性能优化

### 8.1 当前优化
- 对象池（待实现）
- 离屏渲染（待实现）
- 碰撞检测优化（待实现）

### 8.2 建议优化方向
- 使用 `requestAnimationFrame` 替代 `draw` 循环
- 实现视口裁剪，只渲染可见区域
- 批量处理相似实体的绘制

## 9. 调试功能

内置调试功能（可注释）：
```javascript
// 显示路径点
this.drawWaypoints();

// 显示子弹编号和翻转状态
text(this.bulletIndex + flipText, 20, -20);

// 绘制敌人的偏移路径
this.drawOffsetPath();
```

## 10. 未来扩展建议

1. **多人游戏支持**：添加网络同步
2. **更多小游戏**：扩展 `MinigameManager` 支持多种游戏类型
3. **塔类型扩展**：添加魔法塔、炮塔等
4. **技能系统**：为弓箭手添加特殊技能
5. **存档系统**：保存游戏进度
6. **音效系统**：添加背景音乐和音效
7. **粒子效果**：增强视觉效果

---

**版本历史**
- v0.1.0：基础塔防实现
- v0.2.0：添加子弹与道路管理
- v0.3.0：双屏架构实现与资源转换