# Tower Defense System Based on p5.js  

## 1. Project Overview

Tower defense games are typical strategy-based interactive systems that involve path management, state updates, and object interactions. This project aims to design and implement a **modular and extensible tower defense system** using **p5.js**, serving as a software engineering course project.

The focus of this project is not gameplay complexity or numerical balancing, but system architecture, module decoupling, interface design, and collaborative development.

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

---

### 3.2 Enemy System

- Enemies share a common set of base attributes (position, health, speed)  
- The system supports extensible enemy types  
- Enemies are spawned and managed in waves  

---

### 3.3 Tower System

- Players can place towers in designated buildable areas  
- Towers automatically attack enemies within range  
- Tower attributes (damage, range, attack interval) are defined via configuration  

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

