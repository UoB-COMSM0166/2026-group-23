# Tower Defense System Based on p5.js  

## 1. Project Overview

Tower defense games are typical strategy-based interactive systems that involve path management, state updates, and object interactions. This project aims to design and implement a **modular and extensible tower defense system** using **p5.js**, serving as a software engineering course project.

The focus of this project is not gameplay complexity or numerical balancing, but system architecture, module decoupling, interface design, and collaborative development.

塔防游戏属于策略类 2D 游戏，玩家通过在地图上建造防御塔阻挡敌人进攻，以保护基地或核心目标。游戏强调战略布局、资源管理和塔升级，适合中度休闲玩家及策略类爱好者。

---

## 2. Project Objectives

- Build a tower defense system with a clear and decoupled architecture  
- Use p5.js for basic rendering and main loop control  
- Support extensibility of towers, enemies, and levels via configuration files  
- Validate team collaboration, interface coordination, and iterative development  

---

## 3. Functional Requirements

### 3.1 Map and Path System

- The system shall support a tile-based map representation  
- The map distinguishes enemy paths, buildable areas, and obstacles  
- Enemies move along predefined paths; dynamic pathfinding is not required initially  

- **Tile Map**：
  - 采用二维数组或网格布局表示地图
  - 区分可放置区域、敌人路径和障碍区域  
- **路径规划**：
  - 敌人使用 A* 算法或预定义路径移动
  - 保证敌人智能避开障碍和动态变化区域

---

### 3.2 Enemy System

- Enemies share a common set of base attributes (position, health, speed)  
- The system supports extensible enemy types  
- Enemies are spawned and managed in waves 

- **波次管理**：
  - 每一波敌人数量、速度和血量可自定义
  - 支持多波次、不同类型敌人组合
- **移动与行为**：
  - 按路径移动，并支持简单 AI 行为（如优先攻击塔或躲避障碍）
  - 移动轨迹跟踪便于绘制子弹碰撞

---

### 3.3 Tower System

- Players can place towers in designated buildable areas  
- Towers automatically attack enemies within range  
- Tower attributes (damage, range, attack interval) are defined via configuration 

- **核心属性**：
  - 射程、攻击力、攻击速度
  - 特殊效果：减速、溅射伤害、穿透等  
- **投射物管理**：
  - 子弹或激光绘制与碰撞检测
  - 多塔、多子弹同时存在，需要优化绘制与计算

---

### 3.4 Projectile and Combat System

- Tower attacks generate projectile objects  
- Projectiles support movement updates and collision detection  
- Damage is applied upon collision and projectiles are removed  

---

### 3.5 Resource and Game State Management

- The system maintains player resources such as gold and lives  
- Defeating enemies grants gold rewards  
- Enemies reaching the endpoint reduce player lives  

- **资源管理**：
  - 金币、生命值管理
  - 塔升级、购买和出售系统  
- **界面交互**：
  - 升级面板、波次提示、暂停和重置功能
  - 反馈信息清晰，便于玩家策略决策

---

## 4. Non-Functional Requirements

- Modules should be loosely coupled and interact via well-defined interfaces  
- New content can be added without modifying core logic  
- Code structure supports teamwork and maintainability  
- The system runs stably in mainstream web browsers  

---

## 5. System Architecture (Initial)

The system adopts a modular architecture with the following core components:

GameCore

├── MapSystem

├── EnemySystem

├── TowerSystem

├── ProjectileSystem

├── WaveManager

├── ResourceManager

├── UIManager


Modules communicate through interfaces rather than direct access to internal implementations.

---

## 6. Technology Stack

- **p5.js** for 2D rendering and main loop control  
- JavaScript with object-oriented or modular programming  
- JSON or similar configuration files for extensible data  

---

## 7. Development Plan and Team Roles (Example)

| Phase | Content |
|----|----|
| Phase 1 | Core architecture and basic map |
| Phase 2 | Enemy, tower, and combat systems |
| Phase 3 | UI and configuration support |
| Phase 4 | Testing, refactoring, and documentation |

---

## 8. Extensibility and Risk Analysis

- The system supports adding new towers, enemies, and levels  
- The main risk lies in increasing state management complexity  
- Risks are mitigated through modular isolation and unified lifecycle management  