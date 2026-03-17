# Technical Challenges — Quantum Drop

**Module:** Games Development Project  
**Team:** [Insert team name]

---

## Overview

This document describes the two primary **technical challenges** encountered and addressed during the development of Quantum Drop. These are challenges rooted in algorithmic complexity, rendering architecture, or system design — distinct from team coordination or workflow issues.

---

## Technical Challenge 1: Real-Time Pathfinding Synchronisation Across Multiple Dynamic Enemy Lanes

### Description

Quantum Drop features up to three simultaneous enemy paths (main, edge, and air), each populated with monsters that must navigate the correct path at every frame. As the game scales to later levels — where 10+ monsters of different types are active simultaneously, some with speed modifiers, some under slow effects from Magnet towers — maintaining smooth, deterministic path progression became a significant challenge.

The core problem is that each monster stores its position as a **continuous progress value** (0.0 to 1.0) along a pre-computed array of pixel waypoints. At every update tick, the engine must:

1. Advance each monster's progress value by its current speed (modified by slow effects)
2. Interpolate its pixel position from the waypoint array
3. Check if it has reached a waypoint node (to trigger turning animations)
4. Check if it has reached the endpoint (to trigger base damage)
5. Handle the case where a single frame's movement overshoots multiple waypoints

Step 5 is where bugs emerged. Early builds used a naïve position update that advanced progress by a fixed delta, which caused fast enemies (MechPhoenix, BossAntMech) to "tunnel through" sharp corners at high frame rates — visually jumping past bends in the path rather than following them.

### Solution

The solution was to implement a **sub-step integration loop** within `monster.moveAlongPath()`. Instead of advancing the full delta in one step, each update subdivides the movement into micro-steps of at most one waypoint segment's length:

```javascript
// Pseudocode — actual implementation in monsters.js
moveAlongPath(dt) {
  let remaining = this.speed * dt * slowFactor;
  while (remaining > 0) {
    const segLen = distToNextWaypoint(this.progress, this.pathArray);
    const step   = min(remaining, segLen);
    this.progress += step / totalPathLength;
    remaining     -= step;
    if (reachedWaypoint()) triggerTurnAnimation();
    if (reachedEnd())      { triggerBaseDamage(); break; }
  }
}
```

This ensures monsters always follow the path geometry exactly, regardless of speed. The trade-off is a higher per-frame computation cost proportional to monster speed, which was acceptable given the maximum enemy count.

### Outcome

After implementing sub-step integration, all tunnelling artefacts were eliminated. Boss-class enemies (which move at 2–3× normal speed) now correctly navigate all five level geometries including the tight bends in Level 4 (Void Labyrinth). Performance remained within budget at 60 fps with 20+ simultaneous monsters.

---

## Technical Challenge 2: Canvas-Based Pseudo-3D Rendering Without a 3D Engine

### Description

A key design goal was a visually distinctive mission-select screen featuring **five 3D-looking planets** with real-time lighting, self-rotating cloud bands, and atmospheric glow — all rendered in p5.js's 2D canvas API, without WebGL or a 3D library.

The challenge has two layers:

**Layer A — Faking spherical lighting on a 2D canvas.**  
A sphere under point-source lighting has a smooth radial gradient from bright (facing the light) to dark (facing away). Canvas has no built-in sphere primitive. Using a single radial gradient `fillStyle` produces a flat, washed-out disc rather than a convincing sphere, because the gradient origin is fixed at the centre rather than offset toward the light source.

**Layer B — Clipping arbitrary shapes to a circular mask.**  
The self-rotating cloud bands are rendered as tilted rectangles. Without clipping, these overflow the planet boundary, visually breaking the illusion that the planet is a solid sphere.

### Solution — Layer A: Multi-layer offset ellipse compositing

Instead of a gradient, the lighting is approximated by stacking **10 overlapping ellipses** whose centres are progressively offset toward the light source (upper-left, at angle ~220°). Each ellipse shrinks as it moves closer to the light origin, producing a naturally smooth intensity falloff:

```javascript
// From _lm_drawPlanets() in screens/level-map.js
const lx = -pd.r * 0.32;   // light source offset X
const ly = -pd.r * 0.30;   // light source offset Y

for (let ring = 1; ring <= 10; ring++) {
  const frac = ring / 10;                       // 0.1 → 1.0
  const rr   = pd.r * (1.05 - frac * 0.75);    // shrinks toward light
  fill(lightCol[0], lightCol[1], lightCol[2], frac * frac * 190);
  ellipse(lx * frac * 0.9, ly * frac * 0.9, rr * 2, rr * 2);
}
```

The `frac²` alpha curve ensures the brightest ellipses (near the light source) have significantly higher opacity, and the quadratic curve mirrors the inverse-square falloff of real light more accurately than a linear ramp.

### Solution — Layer B: Native canvas clipping path

p5.js exposes the underlying `CanvasRenderingContext2D` via `drawingContext`. A circular clipping region is established before drawing the cloud bands, then released with `restore()`:

```javascript
drawingContext.save();
drawingContext.beginPath();
drawingContext.arc(0, 0, pd.r, 0, Math.PI * 2);
drawingContext.clip();

// All drawing here is clipped to the circle
rotate(T * 0.005 + i * 0.5);
for (const band of pd.bandCols) {
  fill(band[0], band[1], band[2], band[3]);
  rectMode(CENTER);
  rect(0, bandOffset, pd.r * 2.6, bandWidth);
}

drawingContext.restore();  // clip is released
```

The key insight is that `drawingContext.clip()` operates in **canvas pixel space** after p5's transform stack has been applied, so the arc correctly tracks the planet's translated position. `save()`/`restore()` correctly scopes the clip to just the cloud-band pass — subsequent drawing (edge stroke, planet ring, labels) is unaffected.

### Outcome

The combination of offset-ellipse compositing and canvas clip paths produces a convincing pseudo-3D sphere with no WebGL dependency. The technique scales cleanly with planet size (the light offset and ellipse radii are all `pd.r`-relative) and the clip-based cloud rendering is sufficiently fast that all five planets animate at 60 fps with no measurable frame-time impact.

A secondary benefit is portability: because the implementation uses only the standard 2D canvas API, the game runs in any modern browser without feature detection or fallbacks.

---

## Summary

| Challenge | Domain | Core technique used |
|-----------|--------|---------------------|
| Multi-lane pathfinding with speed modifiers | Simulation / numerics | Sub-step integration loop to prevent waypoint tunnelling |
| Pseudo-3D sphere rendering in 2D canvas | Graphics / rendering | Offset ellipse compositing + `drawingContext.clip()` |

Both challenges required moving beyond the default p5.js abstractions — the first into explicit numerical integration, the second into the underlying browser canvas API. In both cases the solution was found by understanding the limitations of the higher-level tool and reaching for a lower-level primitive.
