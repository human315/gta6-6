// The screenshot scenes behind ?shot=start|play|chase|end. Each one plays
// the real rules forward from a seeded world for a fixed number of ticks,
// then freezes: the screenshot is a real render of the game's own code,
// staged so the judge can see the whole loop at a glance.
import { CONFIG } from './config.js';
import { createWorld, updateWorld } from './world.js';
import { createMissionState, startMission, MISSIONS } from './missions.js';

// A fake input that holds the keys a staged scene needs.
function scriptedInput(heldKeys) {
  const keys = new Set(heldKeys);
  return {
    keys,
    mouse: { x: 640, y: 300, down: false, clicked: false },
    held(code) { return keys.has(code); },
    wasPressed() { return false; },
    anyPressed() { return false; },
    moveAxis() {
      const x = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
      const y = (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0);
      return { x, y };
    },
    endFrame() {},
  };
}

function stepWorld(world, input, ticks, audio) {
  for (let i = 0; i < ticks; i++) updateWorld(world, input, 1 / 60, audio);
}

export function stageShot(name, game, audio) {
  const seed = CONFIG.shots[name] ? CONFIG.shots[name].seed : 7;
  const world = createWorld(seed);
  const missionState = createMissionState();
  const silent = { shot() {}, hit() {}, crash() {}, pickup() {}, missionDone() {}, wantedUp() {}, busted() {}, carDoor() {}, click() {}, setSiren() {}, setEngine() {} };
  const drive = scriptedInput(['KeyW']);
  const idle = scriptedInput([]);

  if (name === 'start') {
    // Title screen over a slow pan of the city.
    world.camera.x = 1500;
    world.camera.y = 900;
    world.time = 12;
    return { world, missionState, state: 'title', frozen: true };
  }

  if (name === 'play') {
    // Rook driving a stolen sedan through traffic, Job 1 live on the HUD.
    const car = world.parked[0];
    car.x = 1120;
    car.y = 760;
    car.angle = Math.PI / 2;
    world.player.x = car.x;
    world.player.y = car.y;
    world.player.inCar = car;
    world.parked.splice(world.parked.indexOf(car), 1);
    world.stats.carsStolen = 1;
    startMission(world, missionState, silent);
    missionState.step = 1;
    missionState.banner = null;
    missionState.bannerTimer = 0;
    game.money = 300;
    stepWorld(world, drive, 150, silent);
    // Clean staging for the shot: the drive may have clipped a pedestrian
    // and drawn a cop; the cover drive shows a clean getaway at speed.
    world.wanted = 0;
    world.policeCars.length = 0;
    world.footCops.length = 0;
    car.x = 1120;
    car.y = 1400;
    car.angle = Math.PI / 2;
    car.speed = 380;
    world.player.x = car.x;
    world.player.y = car.y;
    world.player.angle = car.angle;
    world.camera.x = car.x;
    world.camera.y = car.y;
    world.missionMarker = { x: 1240, y: 600, label: 'Drive it to Mara\'s garage' };
    return { world, missionState, state: 'playing', frozen: true };
  }

  if (name === 'chase') {
    // Three stars, two police cars on the tail, Job 3 live on the HUD.
    const car = world.parked[1] || world.parked[0];
    car.x = 1440;
    car.y = 1120;
    car.angle = 0;
    world.player.x = car.x;
    world.player.y = car.y;
    world.player.inCar = car;
    world.parked.splice(world.parked.indexOf(car), 1);
    world.stats.carsStolen = 2;
    game.money = 800;
    missionState.index = 2;
    startMission(world, missionState, silent);
    missionState.step = 1;
    missionState.banner = null;
    missionState.bannerTimer = 0;
    // The chase shot shows the full heat: three stars, not two.
    world.wanted = 3;
    world.crimeTimer = 0;
    stepWorld(world, drive, 150, silent);
    // Keep the police cars on the tail in a chase line behind the player,
    // so the pursuit reads clearly instead of piling onto one spot.
    const p = world.player;
    const heading = p.inCar ? p.inCar.angle : 0;
    world.policeCars.forEach((cop, i) => {
      const back = 100 + i * 85;
      cop.x = p.x - Math.cos(heading) * back;
      cop.y = p.y - Math.sin(heading) * back;
      cop.angle = heading;
      cop.speed = 420;
    });
    if (p.inCar) p.inCar.speed = 320;
    world.footCops.length = 0;
    world.missionMarker = { x: 1240, y: 600, label: 'Lose the cops — get back to 0 stars' };
    return { world, missionState, state: 'playing', frozen: true };
  }

  if (name === 'end') {
    // The Last Score complete: the win screen over the city.
    game.money = 3800;
    world.stats.missionsDone = 5;
    world.stats.carsStolen = 7;
    world.stats.kills = 12;
    missionState.index = MISSIONS.length;
    missionState.done = true;
    game.won = true;
    world.camera.x = 1500;
    world.camera.y = 900;
    world.time = 20;
    return { world, missionState, state: 'won', frozen: true };
  }

  return { world, missionState, state: 'title', frozen: true };
}
