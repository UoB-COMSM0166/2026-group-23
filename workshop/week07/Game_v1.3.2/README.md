# 数字塔防 · Number Defense

> 课程项目 | p5.js 2D 网页游戏

---

## 项目简介

《数字塔防》是一款结合**塔防策略**与**数学投球小游戏**的 2D 网页游戏。  
玩家在每波怪物开始前通过投球小游戏获得金币，再用金币建塔、升级塔，抵御怪物进攻。

---

## 如何运行

### 环境要求
- [Visual Studio Code](https://code.visualstudio.com/)
- VSCode 插件：**Live Server**（在插件市场搜索安装）

### 运行步骤

1. 用 VSCode 打开项目文件夹：`文件` → `打开文件夹`
2. 在左侧文件列表中，右键点击 `index.html`
3. 选择 `Open with Live Server`
4. 浏览器自动打开，地址为 `http://127.0.0.1:5500`

> **提示：** 修改代码后按 `Ctrl+S` 保存，浏览器会自动刷新，无需手动重开。  
> **调试：** 按 `F12` 打开浏览器开发者工具，`Console` 标签可查看报错信息。

---

## 文件结构

```
project/
├── index.html       # 入口文件，控制脚本加载顺序（不要随意改动顺序）
├── sketch.js        # 主入口：globals 变量定义、setup()、draw()
├── map.js           # 路径定义、背景绘制、格子判定
├── monsters.js      # 所有怪物类、MonsterManager、粒子系统
├── towers.js        # Tower 类、Projectile 类、塔放置与升级逻辑
├── waves.js         # 波次配置表、波次推进状态机
├── minigame.js      # 投球小游戏（框架已搭好，待实现）
└── ui.js            # 所有 UI：HUD、建造菜单、塔面板、波次提示
```

> **注意：** `index.html` 中脚本加载顺序不能打乱，后面的文件依赖前面的变量。

---

## 团队分工与完成情况

| 模块 | 文件 | 负责人 | 状态 |
|------|------|--------|------|
| 怪物与路径系统 | `monsters.js` `waves.js` `map.js`(路径部分) | 张洵 | ✅ 已完成 |
| 地图布局与塔放置 | `towers.js` `map.js`(格子判定) `ui.js`(建造菜单、升级面板) | 刘博文 | ✅ 已完成 |
| 投球小游戏物理逻辑 | `minigame.js` | 于承印 | 🔲 待实现 |
| 投球小游戏门布局 | `minigame.js` | 朱启昊 | 🔲 待实现 |
| 塔防战斗逻辑 | `towers.js` (底部 TODO 区域) | 张震宇 | 🔲 待实现 |
| UI 与状态整合 | `ui.js` | 李卓伦 | 🔲 待实现 |

---

## 各成员待完成内容

### 于承印 · 投球小游戏物理逻辑
文件：`minigame.js`

需要实现：
- 小球从顶部生成并下落（重力物理）
- 小球与墙壁、门的碰撞检测
- 小球落出底部后触发结算，调用 `endMinigame()`

建议数据结构已在文件内注释中给出，搜索 `TODO：于承印` 查看。

---

### 朱启昊 · 投球小游戏门布局
文件：`minigame.js`

需要实现：
- 随机生成若干"门"分布在画面中段
- 门的类型：`+N`（加法）、`-N`（减法）、`×N`（乘法）
- 小球经过门后改变当前小球数量
- 所有小球落地后将数量转换为金币写入 `minigameResult`

建议数据结构已在文件内注释中给出，搜索 `TODO：朱启昊` 查看。

与于承印对接：共用 `minigame.js`，建议先约定好 `balls[]` 和 `gates[]` 的数据结构再各自开发。

---

### 张震宇 · 塔防战斗逻辑
文件：`towers.js`

需要实现：
- 塔的主动技能（例如：范围塔减速、快速塔连射爆发等）
- 一次性技能道具的逻辑（可选）

扩展方式：
- 在 `Tower` 类中添加 `activateSkill()` 方法
- 新塔类型直接添加到 `TOWER_DEFS`，并在 `Tower._draw__()` 里扩展外观
- 文件底部有 `TODO：张震宇` 注释区域

当前已有的塔：

| 类型 | 标识 | 费用 | 特点 |
|------|------|------|------|
| 基础塔 | `basic` | 80 | 单体，中速 |
| 快速塔 | `rapid` | 120 | 单体，高速双管 |
| 范围塔 | `area` | 150 | 范围爆炸，兼打空中单位 |

---

### 李卓伦 · UI 与状态整合
文件：`ui.js`

需要实现：
- 完善 `drawHUD()`：金币/血条动画、道具栏显示
- 完善 `drawWaveUI()`：波次奖励预览、更丰富的倒计时效果
- 投球小游戏结束后的商店/结算界面 `drawShopPanel()`
- 数值平衡：各塔费用、怪物奖励、升级费用等

关键全局变量（定义在 `sketch.js` 顶部）：

```js
coins        // 当前金币
baseHp       // 当前生命值
baseHpMax    // 最大生命值
waveNum      // 当前波次
waveState    // 波次状态字符串
TOTAL_WAVES  // 总波数
```

文件内搜索 `TODO：李卓伦` 查看具体扩展位置。

---

## 关键接口说明

### 金币系统
```js
coins += n;   // 增加金币
coins -= n;   // 消耗金币（建塔/升级前需先判断 coins >= cost）
```

### 怪物管理器
```js
manager.monsters                                     // 当前场上所有怪物数组
manager.getMonstersInRange(cx, cy, range, antiAir)   // 获取范围内怪物
manager.damageAt(x, y, dmg, antiAir, fromSide)       // 点伤害
manager.damageInRadius(cx, cy, radius, dmg, antiAir) // 范围伤害
```

### 干扰系统（烈焰鸟技能）
```js
jammedUntilFrame   // 干扰持续到第几帧，塔在此期间停止攻击
// 触发干扰写法：
jammedUntilFrame = frameCount + 持续帧数;
```

### 波次结束检测
```js
// waves.js 的 updateWaveSystem() 中：
// 当 manager.queue.length === 0 && manager.monsters.length === 0 时本波结束
```

---

## 数值参考

| 项目 | 当前值 | 所在位置 |
|------|--------|---------|
| 初始金币 | `coins = 120` | `sketch.js` 顶部 |
| 初始/最大生命 | `baseHp = baseHpMax = 50` | `sketch.js` 顶部 |
| 格子大小 | `CELL_SIZE = 75` | `sketch.js` 顶部 |
| 波次间隔 | `COUNTDOWN_FRAMES = 300`（5秒） | `sketch.js` 顶部 |
| 基础塔费用 | `80` | `towers.js` |
| 快速塔费用 | `120` | `towers.js` |
| 范围塔费用 | `150` | `towers.js` |
| 塔拆除退还比例 | `80%` | `towers.js` |
