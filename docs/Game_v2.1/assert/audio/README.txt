Audio assets — Quantum Drop
============================

Place .mp3 files in the two subfolders below. Files are loaded by
`audio.js` via native HTMLAudioElement, so **any .mp3 that plays in a
browser will work** — no p5.sound or build step involved.

If a file is missing the module silently no-ops (no console spam), so
the game still runs without sounds during development.

bgm/  (background music, looping)
---------------------------------
  launch.mp3   — menus (launch / difficulty / level-map screens)
  level1.mp3   — level 1  (Sector Alpha / 绿野)
  level2.mp3   — level 2  (Nebula Blue / 星云冰蓝)
  level3.mp3   — level 3  (Volcanic Core / 熔岩炽核)
  level4.mp3   — level 4  (Void Maze / 虚空迷宫)
  level5.mp3   — level 5  (Scorched Ruins / 焦土废墟)

sfx/  (one-shot, short)
-----------------------
  click.mp3    — UI button clicks (menu transitions, retry, stages, ...)
  place.mp3    — tower placed on a grid cell
  explode.mp3  — CANNON tower / AA-FAN mortar detonation
  win.mp3      — level cleared
  lose.mp3     — base HP reached 0

Volumes are set in `audio.js` (BGM_VOLUME = 0.45, SFX_VOLUME = 0.7).
The mute toggle lives on the launch screen (speaker icon, top-right,
left of the EN / 中 buttons). Preference persists in
localStorage['qd_muted'].
