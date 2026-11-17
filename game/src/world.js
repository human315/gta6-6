// Solano Bay — the city and everyone in it. City generation (roads,
// blocks, buildings, park, beach), traffic, pedestrians, police, combat
// and the wanted system. The game rules live here; the state machine and
// the missions live in main.js / missions.js.
import { CONFIG } from './config.js';
import { makeRng } from './random.js';

const TAU = Math.PI * 2;

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

function clamp(v, min, max) {
  return v < min ? min : (v > max ? max : v);
}

const CAR_COLORS = ['#c0392b', '#2e6fb0', '#e8e8e8', '#f0c040', '#3aa655', '#7a4fa3', '#e67e22', '#222831', '#8bc34a', '#d35400'];
const CAR_MODELS = ['sedan', 'hatch', 'taxi', 'van', 'sport'];
const PED_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#fd79a8'];

function nearestRoadAxis(x, y, roadsV, roadsH) {
  let bestV = roadsV[0];
  let bestD = Infinity;
  for (const rx of roadsV) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; bestV = rx; }
  }
  let bestH = roadsH[0];
  let bestDh = Infinity;
  for (const ry of roadsH) {
    const d = Math.abs(y - ry);
    if (d < bestDh) { bestDh = d; bestH = ry; }
  }
  return bestD <= bestDh ? { axis: 'v', coord: bestV } : { axis: 'h', coord: bestH };
}

export function createWorld(seed) {
  const rng = makeRng(seed);
  const C = CONFIG;
  const world = {
    seed,
    rng,
    time: 0,
    roadsV: C.roadsV.slice(),
    roadsH: C.roadsH.slice(),
    buildings: [],
    trees: [],
    parked: [],
    traffic: [],
    peds: [],
    enemies: [],
    policeCars: [],
    footCops: [],
    bullets: [],
    particles: [],
    pickups: [],
    events: [],
    player: null,
    camera: { x: 0, y: 0 },
    wanted: 0,
    crimeTimer: 0,
    decayTimer: 0,
    stats: { carsStolen: 0, shotsFired: 0, kills: 0, missionsDone: 0, distanceDriven: 0 },
    hideout: { x: 1120, y: 480, w: 240, h: 240 },
    hospital: { x: 480, y: 1440 },
    bank: { x: 1760, y: 800 },
    warehouse: { x: 2080, y: 1440 },
    garage: { x: 1120, y: 480 },
    maraHouse: { x: 800, y: 1440 },
    missionMarker: null,
    nextId: 1,
  };

  // --- Buildings: one or two per block, with a gap for the park. -------
  const parkBlock = { x0: 800, y0: 800, x1: 1120, y1: 1120 };
  for (let vi = 0; vi < C.roadsV.length - 1; vi++) {
    for (let hi = 0; hi < C.roadsH.length - 1; hi++) {
      const x0 = C.roadsV[vi] + C.roadWidth / 2 + 14;
      const x1 = C.roadsV[vi + 1] - C.roadWidth / 2 - 14;
      const y0 = C.roadsH[hi] + C.roadWidth / 2 + 14;
      const y1 = C.roadsH[hi + 1] - C.roadWidth / 2 - 14;
      if (x1 - x0 < 60 || y1 - y0 < 60) continue;
      // The park block stays green.
      if (x0 >= parkBlock.x0 - 1 && y0 >= parkBlock.y0 - 1 && x1 <= parkBlock.x1 + 1 && y1 <= parkBlock.y1 + 1) {
        continue;
      }
      // The hideout block holds the garage, not towers.
      const h = world.hideout;
      if (x0 < h.x + h.w && x1 > h.x && y0 < h.y + h.h && y1 > h.y) continue;
      const count = rng.chance(0.45) ? 2 : 1;
      if (count === 1) {
        const w = rng.range(90, x1 - x0 - 20);
        const h = rng.range(80, y1 - y0 - 20);
        const x = x0 + rng.range(0, Math.max(0, x1 - x0 - w));
        const y = y0 + rng.range(0, Math.max(0, y1 - y0 - h));
        world.buildings.push({
          x, y, w, h,
          roof: rng.pick(C.palette.buildingRoof),
          wall: rng.pick(C.palette.buildingWall),
          floors: rng.int(2, 9),
        });
      } else {
        const split = rng.chance(0.5) ? 'v' : 'h';
        for (let k = 0; k < 2; k++) {
          let b;
          if (split === 'v') {
            const w = (x1 - x0 - 24) / 2;
            b = { x: x0 + k * (w + 24), y: y0 + 10, w, h: y1 - y0 - 20 };
          } else {
            const h = (y1 - y0 - 24) / 2;
            b = { x: x0 + 10, y: y0 + k * (h + 24), w: x1 - x0 - 20, h };
          }
          world.buildings.push({
            ...b,
            roof: rng.pick(C.palette.buildingRoof),
            wall: rng.pick(C.palette.buildingWall),
            floors: rng.int(2, 7),
          });
        }
      }
    }
  }

  // --- Park trees and beach palms. --------------------------------------
  for (let i = 0; i < 26; i++) {
    world.trees.push({
      x: rng.range(parkBlock.x0 + 20, parkBlock.x1 - 20),
      y: rng.range(parkBlock.y0 + 20, parkBlock.y1 - 20),
      r: rng.range(10, 18),
    });
  }
  for (let i = 0; i < 14; i++) {
    world.trees.push({
      x: rng.range(C.beachX + 24, C.beachX + 120),
      y: rng.range(60, C.worldHeight - 60),
      r: rng.range(9, 14),
      palm: true,
    });
  }

  // --- The player starts on foot outside Mara's garage. -----------------
  world.player = {
    x: 1180, y: 760, angle: -Math.PI / 2, radius: C.player.radius,
    health: C.player.health, ammo: C.player.magSize, reserve: 48,
    reloading: 0, inCar: null, speed: 0, dead: false, muzzle: 0,
  };
  world.camera.x = world.player.x;
  world.camera.y = world.player.y;

  // --- Parked cars along the roads (stealable). -------------------------
  for (let i = 0; i < C.parkedCount; i++) {
    const vertical = rng.chance(0.5);
    const road = vertical ? rng.pick(C.roadsV) : rng.pick(C.roadsH);
    const along = rng.range(220, vertical ? C.worldHeight - 220 : C.worldWidth - 260);
    const side = rng.chance(0.5) ? 1 : -1;
    const x = vertical ? road + side * (C.roadWidth / 2 - 8) : along;
    const y = vertical ? along : road + side * (C.roadWidth / 2 - 8);
    if (x > C.beachX - 40) continue;
    world.parked.push({
      id: world.nextId++, x, y,
      angle: vertical ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI),
      speed: 0, color: rng.pick(CAR_COLORS), model: rng.pick(CAR_MODELS),
      parked: true, owner: null, stolen: false,
    });
  }

  // --- Traffic: cars driving the grid. -----------------------------------
  for (let i = 0; i < C.trafficCount; i++) {
    world.traffic.push(spawnTrafficCar(world, rng));
  }

  // --- Pedestrians on the sidewalks. ------------------------------------
  for (let i = 0; i < C.pedCount; i++) {
    world.peds.push(spawnPed(world, rng));
  }

  return world;
}

function spawnTrafficCar(world, rng) {
  const C = CONFIG;
  const vertical = rng.chance(0.5);
  const road = vertical ? rng.pick(C.roadsV) : rng.pick(C.roadsH);
  const along = rng.range(120, (vertical ? C.worldHeight : C.worldWidth - 220) - 120);
  const dir = rng.chance(0.5) ? 1 : -1;
  const lane = 16;
  return {
    id: world.nextId++,
    x: vertical ? road + dir * lane : along,
    y: vertical ? along : road + dir * lane,
    angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
    speed: rng.range(90, 150),
    road, axis: vertical ? 'v' : 'h', dir,
    color: rng.pick(CAR_COLORS),
    model: rng.pick(CAR_MODELS),
    parked: false,
    honk: 0,
  };
}

function spawnPed(world, rng) {
  const C = CONFIG;
  const road = rng.chance(0.5) ? rng.pick(C.roadsV) : rng.pick(C.roadsH);
  const vertical = C.roadsV.includes(road);
  const along = rng.range(120, (vertical ? C.worldHeight : C.worldWidth - 220) - 120);
  const side = rng.chance(0.5) ? 1 : -1;
  const off = C.roadWidth / 2 + 14;
  return {
    id: world.nextId++,
    x: vertical ? road + side * off : along,
    y: vertical ? along : road + side * off,
    angle: rng.range(0, TAU),
    speed: rng.range(28, 52),
    state: 'walk',
    tx: 0, ty: 0,
    health: 100,
    color: rng.pick(PED_COLORS),
    fleeTimer: 0,
  };
}

// --- Collision ------------------------------------------------------------
export function pointInBuilding(world, x, y) {
  for (const b of world.buildings) {
    if (x > b.x - 4 && x < b.x + b.w + 4 && y > b.y - 4 && y < b.y + b.h + 4) return b;
  }
  return null;
}

// Push a circle out of buildings; returns true when a wall was hit.
export function collideCircle(world, e, r) {
  let hit = false;
  for (const b of world.buildings) {
    const cx = clamp(e.x, b.x, b.x + b.w);
    const cy = clamp(e.y, b.y, b.y + b.h);
    const dx = e.x - cx;
    const dy = e.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        e.x = cx + (dx / d) * r;
        e.y = cy + (dy / d) * r;
      } else {
        e.x += r;
      }
    }
  }
  return hit;
}

function onRoad(world, x, y) {
  const hw = CONFIG.roadWidth / 2;
  for (const rx of world.roadsV) if (Math.abs(x - rx) < hw && y > -40 && y < CONFIG.worldHeight + 40) return true;
  for (const ry of world.roadsH) if (Math.abs(y - ry) < hw && x > -40 && x < CONFIG.beachX + 40) return true;
  return false;
}

export function addWanted(world, n, why) {
  const before = world.wanted;
  world.wanted = clamp(world.wanted + n, 0, CONFIG.wanted.maxStars);
  world.crimeTimer = 0;
  world.decayTimer = 0;
  if (world.wanted > before) {
    world.events.push({ type: 'wanted', stars: world.wanted, why });
  }
}

export function spawnPoliceCar(world, nearX, nearY) {
  const rng = world.rng;
  const road = nearestRoadAxis(nearX, nearY, world.roadsV, world.roadsH);
  let x;
  let y;
  if (road.axis === 'v') {
    x = road.coord + (rng.chance(0.5) ? 16 : -16);
    y = clamp(nearY + rng.range(-500, -260) * (rng.chance(0.5) ? 1 : -1), 80, CONFIG.worldHeight - 80);
  } else {
    y = road.coord + (rng.chance(0.5) ? 16 : -16);
    x = clamp(nearX + rng.range(-500, -260) * (rng.chance(0.5) ? 1 : -1), 80, CONFIG.beachX - 80);
  }
  const car = {
    id: world.nextId++, x, y, angle: angleTo(x, y, nearX, nearY),
    speed: 0, color: '#1c2733', model: 'police', parked: false,
    siren: true, health: 100,
  };
  world.policeCars.push(car);
  return car;
}

export function spawnFootCop(world, nearX, nearY) {
  const rng = world.rng;
  const cop = {
    id: world.nextId++,
    x: clamp(nearX + rng.range(-160, 160), 40, CONFIG.beachX - 40),
    y: clamp(nearY + rng.range(-160, 160), 40, CONFIG.worldHeight - 40),
    angle: 0, speed: CONFIG.police.footSpeed,
    health: 100, bustTimer: 0, shootCooldown: rng.range(0.5, 1.5),
  };
  world.footCops.push(cop);
  return cop;
}

export function spawnEnemies(world, x, y, count, rng) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const e = {
      id: world.nextId++,
      x: clamp(x + rng.range(-90, 90), 40, CONFIG.beachX - 40),
      y: clamp(y + rng.range(-90, 90), 40, CONFIG.worldHeight - 40),
      angle: rng.range(0, TAU),
      speed: 95,
      health: 100,
      shootCooldown: rng.range(0.4, 1.4),
      state: 'guard',
    };
    world.enemies.push(e);
    list.push(e);
  }
  return list;
}

function spawnParticles(world, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = world.rng.range(0, TAU);
    const s = world.rng.range(speed * 0.3, speed);
    world.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: world.rng.range(0.25, 0.7), maxLife: 0.7, color,
      size: world.rng.range(2, 5),
    });
  }
}

function fireBullet(world, x, y, angle, fromPlayer) {
  world.bullets.push({
    x, y,
    vx: Math.cos(angle) * CONFIG.bullet.speed,
    vy: Math.sin(angle) * CONFIG.bullet.speed,
    life: CONFIG.bullet.range / CONFIG.bullet.speed,
    fromPlayer,
  });
  if (fromPlayer) world.stats.shotsFired += 1;
}

// --- The per-frame update -------------------------------------------------
export function updateWorld(world, input, dt, audio) {
  const C = CONFIG;
  const p = world.player;
  world.time += dt;
  world.events.length = 0;
  // One-shot keys are read once per frame: without this, the same E press
  // would enter a car in the on-foot branch and exit it again in the
  // driving branch of the same update.
  const ePressed = input.wasPressed('KeyE');
  let enteredThisFrame = false;

  // --- Player on foot -----------------------------------------------------
  if (!p.inCar && !p.dead) {
    const axis = input.moveAxis();
    const len = Math.hypot(axis.x, axis.y) || 1;
    const moving = axis.x !== 0 || axis.y !== 0;
    if (moving) {
      p.x += (axis.x / len) * C.player.walkSpeed * dt;
      p.y += (axis.y / len) * C.player.walkSpeed * dt;
      p.angle = Math.atan2(axis.y, axis.x);
    }
    p.x = clamp(p.x, 16, C.beachX + 130);
    p.y = clamp(p.y, 16, C.worldHeight - 16);
    collideCircle(world, p, p.radius);
    p.speed = moving ? C.player.walkSpeed : 0;

    // Aim with the mouse (screen space -> world space via the camera).
    const cam = world.camera;
    const mx = input.mouse.x + cam.x - C.viewWidth / 2;
    const my = input.mouse.y + cam.y - C.viewHeight / 2;
    p.aimAngle = Math.atan2(my - p.y, mx - p.x);

    if (p.reloading > 0) {
      p.reloading -= dt;
      if (p.reloading <= 0) {
        p.ammo = C.player.magSize;
        p.reserve = Math.max(0, p.reserve);
      }
    }
    if (input.wasPressed('KeyR') && p.ammo < C.player.magSize && p.reloading <= 0) {
      p.reloading = C.player.reloadSeconds;
    }
    if (input.mouse.down && p.reloading <= 0 && p.ammo > 0 && !p.shootCooldown) {
      p.shootCooldown = 0.16;
      p.ammo -= 1;
      p.muzzle = 0.06;
      fireBullet(world, p.x + Math.cos(p.aimAngle) * 20, p.y + Math.sin(p.aimAngle) * 20, p.aimAngle, true);
      if (audio) audio.shot();
      // Firing in the open resets the quiet timer; firing where a cop can
      // see it is a crime on its own.
      if (nearestCopDist(world) < CONFIG.wanted.copSightRange) {
        addWanted(world, 1, 'shots-fired');
      } else {
        world.crimeTimer = 0;
        world.decayTimer = 0;
      }
    }
    if (p.shootCooldown) p.shootCooldown -= dt;
    if (p.muzzle > 0) p.muzzle -= dt;

    // Enter a car: nearest car within reach. Stealing a driven car is a
    // crime; a parked car taken with no cop in sight is a clean getaway.
    if (ePressed) {
      const car = nearestCar(world, p.x, p.y, 56);
      if (car) {
        enterCar(world, car, audio);
        enteredThisFrame = true;
      } else {
        const pickup = nearestPickup(world, p.x, p.y, 48);
        if (pickup) {
          world.pickups.splice(world.pickups.indexOf(pickup), 1);
          world.events.push({ type: 'pickup', kind: pickup.kind });
          if (audio) audio.pickup();
        }
      }
    }
  }

  // --- Player driving -----------------------------------------------------
  if (p.inCar && !p.dead) {
    const car = p.inCar;
    const fwd = input.held('KeyW') || input.held('ArrowUp') ? 1 : 0;
    const back = input.held('KeyS') || input.held('ArrowDown') ? 1 : 0;
    const steer = (input.held('KeyA') || input.held('ArrowLeft') ? -1 : 0)
      + (input.held('KeyD') || input.held('ArrowRight') ? 1 : 0);
    if (fwd) car.speed += C.car.accel * dt;
    if (back) car.speed -= (car.speed > 0 ? C.car.brake : C.car.accel * 0.6) * dt;
    if (!fwd && !back) car.speed -= Math.sign(car.speed) * 260 * dt;
    if (Math.abs(car.speed) < 8 && !fwd && !back) car.speed = 0;
    car.speed = clamp(car.speed, -C.car.reverseMax, C.car.maxSpeed);
    const steerFactor = clamp(Math.abs(car.speed) / 220, 0, 1) * Math.sign(car.speed || 1);
    car.angle += steer * C.car.turnRate * steerFactor * dt;
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const probe = { x: nx, y: ny };
    const wallHit = collideCircle(world, probe, C.car.radius);
    if (!wallHit && nx > 10 && nx < C.beachX + 120 && ny > 10 && ny < C.worldHeight - 10) {
      world.stats.distanceDriven += Math.abs(car.speed) * dt;
      car.x = nx;
      car.y = ny;
    } else {
      if (Math.abs(car.speed) > 240 && audio) audio.crash();
      spawnParticles(world, car.x, car.y, '#cfd2d6', 6, 120);
      car.speed *= -0.25;
    }
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    p.speed = Math.abs(car.speed);
    if (audio) audio.setEngine(Math.abs(car.speed) / C.car.maxSpeed);
    if (ePressed && !enteredThisFrame) exitCar(world, audio);
    if (input.wasPressed('KeyR')) { /* no reload while driving */ }
  } else if (audio) {
    audio.setEngine(0);
  }

  // --- Traffic: follow the grid, slow near the player, honk on a jam. ----
  for (const car of world.traffic) {
    const targetSpeed = 120;
    car.speed += (targetSpeed - car.speed) * 0.5 * dt;
    let nx = car.x + Math.cos(car.angle) * car.speed * dt;
    let ny = car.y + Math.sin(car.angle) * car.speed * dt;
    // At an intersection, sometimes turn onto the crossing road.
    const onV = car.axis === 'v';
    const cross = onV ? world.roadsH : world.roadsV;
    const along = onV ? car.y : car.x;
    for (const c of cross) {
      if (Math.abs(along - c) < car.speed * dt + 2 && world.rng.chance(0.22)) {
        const dir = world.rng.chance(0.5) ? 1 : -1;
        car.axis = onV ? 'h' : 'v';
        car.dir = dir;
        if (car.axis === 'v') {
          car.x = c + dir * 16;
          car.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          car.y = c + dir * 16;
          car.angle = dir > 0 ? 0 : Math.PI;
        }
        nx = car.x;
        ny = car.y;
        break;
      }
    }
    // Wrap around the map edges so the streets never empty out.
    if (nx < -60 || nx > C.beachX + 160 || ny < -60 || ny > C.worldHeight + 60) {
      const fresh = spawnTrafficCar(world, world.rng);
      Object.assign(car, fresh);
      continue;
    }
    // Don't drive through the player's car or another car.
    let blocked = false;
    for (const other of world.traffic) {
      if (other === car) continue;
      if (dist(nx, ny, other.x, other.y) < 44) { blocked = true; break; }
    }
    if (p.inCar && dist(nx, ny, p.inCar.x, p.inCar.y) < 46) blocked = true;
    if (!blocked) {
      car.x = nx;
      car.y = ny;
    } else {
      car.speed *= 0.4;
      if (world.rng.chance(0.01)) car.honk = 0.4;
    }
    if (car.honk > 0) car.honk -= dt;
    // A traffic car the player rams hard stops and its driver bails.
    if (p.inCar && dist(car.x, car.y, p.inCar.x, p.inCar.y) < 40 && Math.abs(p.inCar.speed) > 200) {
      if (world.rng.chance(0.5)) {
        world.events.push({ type: 'ram', car });
        spawnParticles(world, car.x, car.y, '#f0c040', 8, 160);
      }
    }
  }

  // --- Pedestrians: stroll the sidewalks, flee gunfire and fast cars. ----
  for (const ped of world.peds) {
    if (ped.health <= 0) continue;
    if (ped.fleeTimer > 0) {
      ped.fleeTimer -= dt;
      const away = angleTo(p.x, p.y, ped.x, ped.y);
      ped.x += Math.cos(away) * ped.speed * 2.1 * dt;
      ped.y += Math.sin(away) * ped.speed * 2.1 * dt;
      ped.angle = away;
    } else {
      if (world.rng.chance(dt * 0.12)) {
        const road = nearestRoadAxis(ped.x, ped.y, world.roadsV, world.roadsH);
        ped.angle = road.axis === 'v'
          ? (world.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2)
          : (world.rng.chance(0.5) ? 0 : Math.PI);
      }
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
    }
    ped.x = clamp(ped.x, 20, C.beachX + 120);
    ped.y = clamp(ped.y, 20, C.worldHeight - 20);
    collideCircle(world, ped, 10);
    // Run over by a speeding car: a crime, and the ped goes down.
    if (p.inCar && Math.abs(p.inCar.speed) > 160 && dist(ped.x, ped.y, p.inCar.x, p.inCar.y) < 26) {
      ped.health = 0;
      addWanted(world, 1, 'hit-pedestrian');
      world.events.push({ type: 'kill', who: 'pedestrian' });
      world.stats.kills += 1;
      spawnParticles(world, ped.x, ped.y, '#c0392b', 10, 140);
      if (audio) audio.hit();
    }
    // Gunfire nearby scatters the crowd.
    if (world.bullets.length && dist(ped.x, ped.y, p.x, p.y) < 320) {
      ped.fleeTimer = 2.5;
    }
  }

  // --- Police: spawn to match the wanted level, chase, ram, bust. -------
  const wantCars = world.wanted === 0 ? 0 : Math.min(1 + Math.floor(world.wanted / 2), 4);
  while (world.policeCars.length < wantCars) spawnPoliceCar(world, p.x, p.y);
  while (world.policeCars.length > wantCars) world.policeCars.pop();
  const wantFoot = world.wanted >= 3 ? Math.min(world.wanted - 1, 3) : 0;
  while (world.footCops.length < wantFoot) spawnFootCop(world, p.x, p.y);
  while (world.footCops.length > wantFoot) world.footCops.pop();

  for (const cop of world.policeCars) {
    const d = dist(cop.x, cop.y, p.x, p.y);
    const target = angleTo(cop.x, cop.y, p.x, p.y);
    cop.angle += clamp(angleDiff(target, cop.angle), -2.4 * dt, 2.4 * dt);
    const top = world.wanted >= 3 ? C.police.carSpeedHigh : C.police.carSpeed;
    cop.speed += (top - cop.speed) * 0.8 * dt;
    const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
    const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
    const probe = { x: nx, y: ny };
    if (!collideCircle(world, probe, C.car.radius) && nx > 10 && nx < C.beachX + 100 && ny > 10 && ny < C.worldHeight - 10) {
      cop.x = nx;
      cop.y = ny;
    } else {
      cop.speed *= 0.4;
      cop.angle += 0.6 * dt;
    }
    // Ram the player's car.
    if (p.inCar && d < 48) {
      p.inCar.speed *= 0.82;
      cop.speed *= 0.7;
      if (world.rng.chance(dt * 2)) {
        p.health -= C.police.ramDamage * dt * 4;
        spawnParticles(world, p.x, p.y, '#f0c040', 4, 120);
        if (audio) audio.crash();
      }
    }
    // On foot, a cop car that stops beside the player busts them.
    if (!p.inCar && d < 42 && cop.speed < 60) {
      p.health -= 26 * dt;
      world.events.push({ type: 'bust-pressure' });
    }
  }

  for (const cop of world.footCops) {
    const d = dist(cop.x, cop.y, p.x, p.y);
    const target = angleTo(cop.x, cop.y, p.x, p.y);
    cop.angle = target;
    if (d > 34) {
      cop.x += Math.cos(target) * cop.speed * dt;
      cop.y += Math.sin(target) * cop.speed * dt;
      collideCircle(world, cop, 12);
    } else if (!p.inCar) {
      cop.bustTimer += dt;
      if (cop.bustTimer > C.police.bustSeconds) {
        world.events.push({ type: 'busted' });
        p.health = 0;
      }
    }
    // Foot cops shoot at an armed, wanted player on foot.
    cop.shootCooldown -= dt;
    if (!p.inCar && world.wanted >= 2 && d < 420 && d > 60 && cop.shootCooldown <= 0) {
      cop.shootCooldown = world.rng.range(0.9, 1.6);
      fireBullet(world, cop.x, cop.y, target + world.rng.range(-0.12, 0.12), false);
      if (audio) audio.shot();
    }
  }

  // --- Mission guards: hold ground, shoot the player on sight. ----------
  for (const e of world.enemies) {
    if (e.health <= 0) continue;
    const d = dist(e.x, e.y, p.x, p.y);
    const target = angleTo(e.x, e.y, p.x, p.y);
    e.angle = target;
    if (d < 380 && d > 90) {
      e.x += Math.cos(target) * e.speed * dt;
      e.y += Math.sin(target) * e.speed * dt;
      collideCircle(world, e, 12);
    }
    e.shootCooldown -= dt;
    if (d < 420 && e.shootCooldown <= 0) {
      e.shootCooldown = world.rng.range(0.8, 1.5);
      fireBullet(world, e.x, e.y, target + world.rng.range(-0.1, 0.1), false);
      if (audio) audio.shot();
    }
  }

  // --- Bullets ------------------------------------------------------------
  for (let i = world.bullets.length - 1; i >= 0; i--) {
    const b = world.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < 0 || b.x > C.worldWidth || b.y < 0 || b.y > C.worldHeight;
    if (!dead && pointInBuilding(world, b.x, b.y)) {
      spawnParticles(world, b.x, b.y, '#b9b3a4', 4, 90);
      dead = true;
    }
    if (!dead && b.fromPlayer) {
      for (const ped of world.peds) {
        if (ped.health > 0 && dist(b.x, b.y, ped.x, ped.y) < 14) {
          ped.health -= C.bullet.damage;
          dead = true;
          spawnParticles(world, b.x, b.y, '#c0392b', 6, 130);
          if (ped.health <= 0) {
            addWanted(world, 1, 'shot-pedestrian');
            world.events.push({ type: 'kill', who: 'pedestrian' });
            world.stats.kills += 1;
          } else if (audio) audio.hit();
          break;
        }
      }
      if (!dead) {
        for (const cop of world.footCops) {
          if (cop.health > 0 && dist(b.x, b.y, cop.x, cop.y) < 14) {
            cop.health -= C.bullet.damage;
            dead = true;
            spawnParticles(world, b.x, b.y, '#2e6fb0', 6, 130);
            if (cop.health <= 0) {
              addWanted(world, 1, 'shot-cop');
              world.events.push({ type: 'kill', who: 'cop' });
              world.stats.kills += 1;
            } else if (audio) audio.hit();
            break;
          }
        }
      }
      if (!dead) {
        for (const copCar of world.policeCars) {
          if (dist(b.x, b.y, copCar.x, copCar.y) < 24) {
            copCar.health -= C.bullet.damage;
            dead = true;
            spawnParticles(world, b.x, b.y, '#f0c040', 6, 130);
            if (copCar.health <= 0) {
              world.policeCars.splice(world.policeCars.indexOf(copCar), 1);
              addWanted(world, 1, 'disabled-police-car');
              world.events.push({ type: 'kill', who: 'police-car' });
              world.stats.kills += 1;
            }
            break;
          }
        }
      }
      if (!dead) {
        for (const e of world.enemies) {
          if (e.health > 0 && dist(b.x, b.y, e.x, e.y) < 14) {
            e.health -= C.bullet.damage;
            dead = true;
            spawnParticles(world, b.x, b.y, '#c0392b', 6, 130);
            if (e.health <= 0) {
              world.events.push({ type: 'kill', who: 'guard' });
              world.stats.kills += 1;
            } else if (audio) audio.hit();
            break;
          }
        }
      }
    }
    if (!dead && !b.fromPlayer && dist(b.x, b.y, p.x, p.y) < 14) {
      p.health -= C.bullet.damage * 0.6;
      spawnParticles(world, b.x, b.y, '#c0392b', 5, 120);
      dead = true;
      if (audio) audio.hit();
    }
    if (dead) world.bullets.splice(i, 1);
  }

  // --- Particles ----------------------------------------------------------
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }

  // --- Wanted decay: stay clean and out of sight and the heat fades. -----
  if (world.wanted > 0) {
    world.crimeTimer += dt;
    const nearestCop = nearestCopDist(world);
    const h = world.hideout;
    // Inside the garage hideout the player is out of sight: the cops
    // lose the trail even while they are still close by.
    const hidden = p.x > h.x && p.x < h.x + h.w && p.y > h.y && p.y < h.y + h.h;
    if (world.crimeTimer > C.wanted.decayQuietSeconds && (nearestCop > C.wanted.copSightRange || hidden)) {
      world.decayTimer += dt;
      if (hidden) world.decayTimer += dt;
      if (world.decayTimer > C.wanted.decayStepSeconds) {
        world.decayTimer = 0;
        world.wanted -= 1;
        world.events.push({ type: 'wanted', stars: world.wanted, why: 'cooling-off' });
      }
    }
  }

  // --- Death ---------------------------------------------------------------
  if (p.health <= 0 && !p.dead) {
    p.dead = true;
    p.health = 0;
    world.events.push({ type: 'player-down' });
    if (audio) audio.busted();
  }

  // --- Camera follows the player, clamped to the map. --------------------
  const tx = clamp(p.x, C.viewWidth / 2, C.worldWidth - C.viewWidth / 2);
  const ty = clamp(p.y, C.viewHeight / 2, C.worldHeight - C.viewHeight / 2);
  world.camera.x += (tx - world.camera.x) * Math.min(1, dt * 6);
  world.camera.y += (ty - world.camera.y) * Math.min(1, dt * 6);

  if (audio) audio.setSiren(world.wanted > 0);
}

function nearestCopDist(world) {
  const p = world.player;
  let best = Infinity;
  for (const c of world.policeCars) best = Math.min(best, dist(c.x, c.y, p.x, p.y));
  for (const c of world.footCops) best = Math.min(best, dist(c.x, c.y, p.x, p.y));
  return best;
}

function nearestCar(world, x, y, range) {
  let best = null;
  let bestD = range;
  const all = world.parked.concat(world.traffic, world.policeCars);
  for (const car of all) {
    if (car === world.player.inCar) continue;
    const d = dist(x, y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function nearestPickup(world, x, y, range) {
  let best = null;
  let bestD = range;
  for (const pk of world.pickups) {
    const d = dist(x, y, pk.x, pk.y);
    if (d < bestD) { bestD = d; best = pk; }
  }
  return best;
}

function enterCar(world, car, audio) {
  const p = world.player;
  const wasParked = car.parked === true;
  const wasTraffic = world.traffic.includes(car);
  const wasPolice = world.policeCars.includes(car);
  if (wasParked) world.parked.splice(world.parked.indexOf(car), 1);
  if (wasTraffic) world.traffic.splice(world.traffic.indexOf(car), 1);
  if (wasPolice) world.policeCars.splice(world.policeCars.indexOf(car), 1);
  car.parked = false;
  car.stolen = true;
  p.inCar = car;
  p.x = car.x;
  p.y = car.y;
  world.stats.carsStolen += 1;
  world.events.push({ type: 'enter-car', car, wasParked, wasTraffic, wasPolice });
  if (audio) audio.carDoor();
  // Carjacking a driven car, or stealing a police car, is seen immediately.
  if (wasTraffic || wasPolice) addWanted(world, 1, 'carjacking');
  // A parked car is only a crime if a cop is watching.
  if (wasParked && nearestCopDist(world) < CONFIG.wanted.copSightRange) {
    addWanted(world, 1, 'theft-witnessed');
  }
}

function exitCar(world, audio) {
  const p = world.player;
  const car = p.inCar;
  if (!car) return;
  p.inCar = null;
  const side = { x: p.x + Math.cos(car.angle + Math.PI / 2) * 34, y: p.y + Math.sin(car.angle + Math.PI / 2) * 34 };
  if (!pointInBuilding(world, side.x, side.y)) {
    p.x = side.x;
    p.y = side.y;
  } else {
    p.x = car.x + Math.cos(car.angle - Math.PI / 2) * 34;
    p.y = car.y + Math.sin(car.angle - Math.PI / 2) * 34;
  }
  car.speed = 0;
  car.parked = true;
  world.parked.push(car);
  world.events.push({ type: 'exit-car', car });
  if (audio) audio.carDoor();
}

export function worldSnapshot(world) {
  const p = world.player;
  return {
    time: Math.round(world.time * 10) / 10,
    x: Math.round(p.x),
    y: Math.round(p.y),
    health: Math.round(p.health),
    wanted: world.wanted,
    inCar: !!p.inCar,
    ammo: p.ammo,
    traffic: world.traffic.length,
    peds: world.peds.filter((e) => e.health > 0).length,
    policeCars: world.policeCars.length,
    footCops: world.footCops.length,
    enemies: world.enemies.filter((e) => e.health > 0).length,
    bullets: world.bullets.length,
    pickups: world.pickups.length,
    carsStolen: world.stats.carsStolen,
    kills: world.stats.kills,
  };
}
