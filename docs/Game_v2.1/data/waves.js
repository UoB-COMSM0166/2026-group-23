// ============================================================
//  data/waves.js — Per-level wave configuration for the 5 levels (pure data)
//  (extracted from waves.js)
//
//  Format: [type, count, interval, delay]
//  type: snake / spider / tank / robot / phoenix /
//        ghostbird / boss1 / boss2 / boss3 / fission / carrier
// ============================================================
const WAVE_CONFIGS = {
  // -- Level 1: SECTOR ALPHA - Beginner, 6 waves, mostly snakes and spiders --
  1: [
    // W1 Pure infantry
    [ ['snake',5,200,0] ],
    // W2 Spiders join in
    [ ['snake',6,185,0], ['spider',3,200,80] ],
    // W3 Two-lane assault
    [ ['snake',7,175,0], ['spider',5,190,60] ],
    // W4 First flying threat
    [ ['snake',6,165,0], ['spider',5,180,50], ['phoenix',2,220,110] ],
    // W5 Robots arrive
    [ ['snake',8,155,0], ['spider',6,165,40], ['robot',3,190,90], ['phoenix',2,210,130] ],
    // W6 Mini-boss closer
    [ ['snake',8,145,0], ['spider',7,155,35], ['robot',4,175,80], ['phoenix',3,200,120], ['boss1',1,9999,30] ],
  ],

  // -- Level 2: NEBULA RIFT - Intermediate, 7 waves, lots of fliers; Fission Core debuts as a recurring elite --
  2: [
    // W1 Mixed opener
    [ ['snake',6,180,0], ['spider',4,190,70] ],
    // W2 Aerial vanguard
    [ ['snake',7,170,0], ['spider',5,180,55], ['phoenix',3,210,100] ],
    // W3 Ghost Birds + Fission Core debut (elite)
    [ ['snake',7,160,0], ['spider',6,170,45], ['phoenix',3,205,95], ['ghostbird',2,215,155], ['fission',1,9999,200] ],
    // W4 Heavy armor joins + Iron Carrier first appearance
    [ ['snake',8,150,0], ['spider',6,158,40], ['tank',2,230,75], ['phoenix',4,195,115], ['ghostbird',3,205,175], ['carrier',1,9999,220] ],
    // W5 Boss1 + Fission Core together
    [ ['snake',7,140,0], ['spider',7,148,35], ['robot',4,170,80], ['phoenix',4,185,120], ['fission',1,9999,60], ['boss1',1,9999,180] ],
    // W6 Twin flying elites
    [ ['snake',9,130,0], ['spider',8,138,30], ['robot',5,158,70], ['phoenix',5,178,110], ['ghostbird',5,168,160] ],
    // W7 Boss2 finale + Fission Core in support
    [ ['snake',8,120,0], ['spider',8,128,28], ['robot',5,148,65], ['tank',3,185,55], ['phoenix',5,168,105], ['ghostbird',5,158,155], ['fission',1,9999,80], ['boss2',1,9999,280] ],
  ],

  // -- Level 3: IRON CITADEL - Advanced, 8 waves; Fission Core becomes a regular elite, appearing more often --
  3: [
    [ ['snake',6,190,0], ['spider',4,185,60] ],
    [ ['snake',7,175,0], ['spider',6,185,60], ['tank',2,240,90], ['fission',1,9999,150] ],
    [ ['snake',5,160,0], ['spider',4,170,50], ['phoenix',2,220,100], ['ghostbird',2,220,160], ['boss1',1,9999,20] ],
    [ ['snake',8,155,0], ['spider',7,160,40], ['robot',5,180,80], ['phoenix',3,210,130], ['ghostbird',3,200,185], ['fission',1,9999,100] ],
    [ ['snake',6,145,0], ['spider',5,150,30], ['robot',5,165,80], ['tank',3,200,60], ['phoenix',4,195,120], ['ghostbird',4,185,175], ['boss2',1,9999,40] ],
    [ ['snake',9,140,0], ['spider',8,145,35], ['robot',6,160,80], ['tank',3,190,60], ['phoenix',5,185,110], ['ghostbird',5,175,165], ['fission',1,9999,120] ],
    [ ['snake',10,125,0], ['spider',9,130,30], ['robot',8,145,65], ['tank',4,175,50], ['phoenix',6,170,100], ['ghostbird',6,160,150] ],
    [ ['snake',10,110,0], ['spider',9,115,25], ['robot',8,128,58], ['tank',4,160,44], ['phoenix',7,148,88], ['ghostbird',7,138,138], ['fission',1,9999,60], ['boss3',1,9999,240] ],
  ],

  // -- Level 4: VOID MAZE - High-speed maze, 9 waves; Fission Core appears repeatedly, sometimes 2 at a time --
  4: [
    // W1 Fast spider swarm
    [ ['spider',8,170,0], ['snake',5,190,60] ],
    // W2 Spiders + birds
    [ ['spider',9,160,0], ['snake',6,175,50], ['phoenix',3,200,100] ],
    // W3 Robots + Fission Core
    [ ['snake',8,150,0], ['spider',10,155,35], ['robot',5,168,80], ['phoenix',3,195,120], ['fission',1,9999,130] ],
    // W4 Ghost Bird raid
    [ ['snake',9,140,0], ['spider',10,145,30], ['robot',6,160,72], ['ghostbird',5,175,130] ],
    // W5 Boss1 + Fission Core double pressure + Iron Carrier
    [ ['snake',9,130,0], ['spider',10,135,28], ['tank',4,190,55], ['phoenix',4,175,110], ['carrier',1,9999,60], ['fission',1,9999,200], ['boss1',1,9999,360] ],
    // W6 All elites + double Fission Core
    // Double Fission Core: do NOT use count=2 + interval=9999 (the second one would only spawn ~166s later, the wave never ends)
    [ ['snake',10,122,0], ['spider',11,127,25], ['robot',7,148,66], ['tank',4,178,52], ['phoenix',5,165,105], ['ghostbird',5,155,155], ['fission',1,9999,80], ['fission',1,9999,200] ],
    // W7 Boss2 + Fission Core
    [ ['snake',10,112,0], ['spider',11,117,22], ['robot',8,138,62], ['tank',5,168,48], ['phoenix',6,155,98], ['ghostbird',6,145,148], ['fission',1,9999,60], ['boss2',1,9999,220] ],
    // W8 Double Fission Core breakthrough
    [ ['snake',11,100,0], ['spider',12,105,20], ['robot',9,125,55], ['tank',5,158,44], ['phoenix',7,142,88], ['ghostbird',7,132,135], ['fission',1,9999,70], ['fission',1,9999,190] ],
    // W9 Final tide + Fission Core in support
    [ ['snake',12,92,0], ['spider',13,97,18], ['robot',10,115,50], ['tank',6,148,40], ['phoenix',8,132,82], ['ghostbird',8,122,128], ['fission',1,9999,40], ['boss3',1,9999,280] ],
  ],

  // -- Level 5: OMEGA GATE - Final, 10 waves; Fission Core appears throughout --
  5: [
    // W1 Elite vanguard + Fission Core opening
    [ ['snake',8,175,0], ['spider',7,180,55], ['robot',3,200,100], ['fission',1,9999,150] ],
    // W2 Air-and-ground pressure
    [ ['snake',9,165,0], ['spider',8,170,48], ['robot',4,188,90], ['phoenix',4,205,130], ['ghostbird',3,195,180] ],
    // W3 Boss1 + Fission Core together
    [ ['snake',8,155,0], ['spider',8,160,42], ['robot',5,175,84], ['tank',3,215,65], ['phoenix',4,192,118], ['fission',1,9999,50], ['boss1',1,9999,200] ],
    // W4 Heavy armor breakthrough + double Fission Core
    [ ['snake',10,145,0], ['spider',9,150,38], ['robot',6,165,78], ['tank',4,200,60], ['phoenix',5,182,112], ['ghostbird',5,172,162], ['fission',1,9999,80], ['fission',1,9999,200] ],
    // W5 Boss2 + every unit type
    [ ['snake',9,135,0], ['spider',9,140,34], ['robot',6,155,72], ['tank',4,188,56], ['phoenix',5,172,108], ['ghostbird',5,162,155], ['boss2',1,9999,48] ],
    // W6 Reinforced elites + Fission Core + Iron Carrier
    [ ['snake',11,125,0], ['spider',10,130,30], ['robot',8,145,68], ['tank',4,178,52], ['phoenix',6,162,102], ['ghostbird',6,152,148], ['carrier',1,9999,50], ['fission',1,9999,220] ],
    // W7 Final high-speed wave + double Fission Core
    [ ['snake',12,115,0], ['spider',11,120,26], ['robot',9,135,62], ['tank',5,165,48], ['phoenix',7,150,95], ['ghostbird',7,140,142], ['fission',1,9999,70], ['fission',1,9999,190] ],
    // W8 Boss3 vanguard + Fission Core
    [ ['snake',11,105,0], ['spider',11,110,23], ['robot',9,125,58], ['tank',5,158,44], ['phoenix',7,140,88], ['ghostbird',7,130,135], ['fission',1,9999,45], ['boss3',1,9999,200] ],
    // W9 Full assault + double Fission Core
    [ ['snake',13,95,0], ['spider',12,100,20], ['robot',10,115,52], ['tank',6,148,40], ['phoenix',8,130,82], ['ghostbird',8,120,128], ['fission',1,9999,55], ['fission',1,9999,175] ],
    // W10 OMEGA finale: full Boss roster + Fission Core + Iron Carrier in support
    [ ['snake',10,115,0], ['spider',9,120,28], ['robot',8,135,65], ['tank',4,175,48], ['phoenix',6,155,98], ['ghostbird',6,145,148], ['carrier',1,9999,30], ['fission',1,9999,150], ['fission',1,9999,320], ['boss1',1,9999,280], ['boss2',1,9999,420], ['boss3',1,9999,560] ],
  ],
};

// Compatibility: also keep WAVE_CONFIG (referenced from ui.js)
const WAVE_CONFIG = WAVE_CONFIGS[3]; // Defaults to the level 3 configuration
