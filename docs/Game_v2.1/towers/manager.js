// ============================================================
//  towers/manager.js — towers/projectiles 顶层数组与统一更新入口
//  须在 Tower / Projectile / effects 全部加载后再加载
// ============================================================

let towers = [], projectiles = [];


function updateAndDrawTowers() {
  for (const t of towers) { t.update(); t.draw(); }
  _drawChainArcs();
  _drawCannonBlasts();
  _updateDrawMortarShells();
  projectiles = projectiles.filter(p => p.alive);
  for (const p of projectiles) { p.update(); p.draw(); }
}

function initTowers() { towers = []; projectiles = []; _chainArcs = []; _cannonBlasts = []; _mortarShells = []; }
