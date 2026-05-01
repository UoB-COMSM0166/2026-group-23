// ============================================================
//  towers/manager.js — Top-level arrays for towers/projectiles + unified update entry
//  Must load after Tower / Projectile / effects are all loaded
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
