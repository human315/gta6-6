// Solano Bay — tuning and world layout. One place for every number the
// rest of the game reads, so balancing never means hunting through files.
export const CONFIG = {
  viewWidth: 1280,
  viewHeight: 800,

  // The city is one fixed map, 2560 x 1920 world units. Roads form a grid;
  // blocks between them hold buildings, a park, and the garage hideout.
  // The east edge is a beach and the sea.
  worldWidth: 2560,
  worldHeight: 1920,
  roadWidth: 72,
  roadsV: [160, 480, 800, 1120, 1440, 1760, 2080, 2380],
  roadsH: [160, 480, 800, 1120, 1440, 1760],
  beachX: 2400,

  player: {
    walkSpeed: 185,
    radius: 13,
    health: 100,
    magSize: 12,
    reloadSeconds: 1.1,
  },

  car: {
    accel: 460,
    brake: 700,
    reverseMax: 170,
    maxSpeed: 540,
    turnRate: 2.6,
    radius: 20,
    length: 46,
    width: 22,
  },

  trafficCount: 15,
  pedCount: 26,
  parkedCount: 11,

  // Wanted stars decay only when the player stays clean and unseen.
  wanted: {
    decayQuietSeconds: 11,
    decayStepSeconds: 6,
    copSightRange: 520,
    maxStars: 5,
  },

  police: {
    carSpeed: 470,
    carSpeedHigh: 560,
    ramDamage: 9,
    bustSeconds: 2.2,
    footSpeed: 165,
  },

  bullet: { speed: 920, range: 560, damage: 34 },

  // Screenshot scenes: ?shot=start|play|chase|end&seed=N
  shots: {
    start: { seed: 7 },
    play: { seed: 7 },
    chase: { seed: 7 },
    end: { seed: 7 },
  },

  saveKey: 'solano-bay-save-v1',

  palette: {
    grass: '#7fae62',
    grassDark: '#6d9c52',
    park: '#5d9b4a',
    sidewalk: '#b9b3a4',
    road: '#3d3f45',
    roadEdge: '#2c2e33',
    lane: '#e8d44d',
    beach: '#e8d8a8',
    sea: '#2f7fb8',
    seaDeep: '#1f5f92',
    buildingRoof: ['#b0563f', '#4f6d8f', '#8a7a5c', '#6d8f6a', '#96689a', '#c08a4e', '#5d7a6a', '#a85f5f'],
    buildingWall: ['#d8cfc0', '#c9b8a3', '#b7c4cc', '#d0c6b4', '#c4b49a'],
  },
};
