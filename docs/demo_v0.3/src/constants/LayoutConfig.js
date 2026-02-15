// src/constants/LayoutConfig.js

export const LayoutConfig = {
  // 资源条区域（顶部）
  RESOURCE_BAR: {
    x: 0,
    y: 0,
    width: 1120,  // 800 + 320 = 总宽度
    height: 60
  },
  
  // 主游戏区域（塔防）- 向下偏移60px给资源条
  MAIN_GAME: {
    x: 0,
    y: 60,
    width: 800,
    height: 600
  },
  
  // 小游戏区域 - 向下偏移60px给资源条
  MINIGAME: {
    x: 800,
    y: 60,
    width: 320,
    height: 600
  },
  
  // 总画布尺寸
  CANVAS: {
    width: 1120,  // 800 + 320
    height: 660   // 600 + 60 (资源条)
  }
};