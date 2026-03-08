// sketch.js
import { LayoutConfig } from './src/constants/LayoutConfig.js';
import { GameManager } from './src/system/GameManager.js';
import { AssetManager } from './src/system/AssetManager.js';
import { MinigameManager } from './src/minigame/MinigameManager.js';
import { ResourceManager } from './src/managers/ResourceManager.js';
import { ResourceBar } from './src/ui/ResourceBar.js';

// 全局动画引用
export let animations = {};

const assetManager = new AssetManager();
const resourceManager = new ResourceManager();
let gameManager;
let minigameManager;
let resourceBar;

window.preload = preload;
window.setup = setup;
window.draw = draw;
window.mousePressed = mousePressed;

function preload() {
  assetManager.preload();
  
  // 可以在这里预加载小游戏资源
  if (MinigameManager.preload) {
    MinigameManager.preload();
  }
}

function setup() {
  // 使用配置的画布尺寸
  createCanvas(LayoutConfig.CANVAS.width, LayoutConfig.CANVAS.height);
  
  // 处理所有动画
  animations = assetManager.setup();
  
  // 初始化游戏管理器
  gameManager = new GameManager(LayoutConfig.MAIN_GAME, animations);
  minigameManager = new MinigameManager(LayoutConfig.MINIGAME, resourceManager);

  // 初始化资源条（使用资源条布局）
  resourceBar = new ResourceBar(resourceManager, LayoutConfig.RESOURCE_BAR);
  
  imageMode(CENTER);
  textAlign(CENTER, CENTER);
  rectMode(CENTER);
}

function draw() {
  background(50);
  
  // 绘制共享资源条
  resourceBar.display();
  
  // 更新和绘制塔防游戏（左屏）
  push();
  translate(LayoutConfig.MAIN_GAME.x, LayoutConfig.MAIN_GAME.y);
  gameManager.update();
  gameManager.display();
  pop();
  
  // 更新和绘制小游戏（右屏）
  push();
  translate(LayoutConfig.MINIGAME.x, LayoutConfig.MINIGAME.y);
  minigameManager.update();
  minigameManager.display();
  pop();
}

function mousePressed() {
  if (mouseX < LayoutConfig.MAIN_GAME.width) {
    gameManager.handleMousePressed(mouseX, mouseY);
  } else {
    minigameManager.handleMousePressed(
      mouseX - LayoutConfig.MINIGAME.x,
      mouseY - LayoutConfig.MINIGAME.y
    );
  }
}

function keyPressed() {
  gameManager.handleKeyPressed(key);
  minigameManager.handleKeyPressed(key);
}