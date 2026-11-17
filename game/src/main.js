// Solano Bay — entry point: the game loop, the state machine, save/load
// and the screenshot modes. Wires input, audio, world, missions and
// rendering together; it holds no game rules of its own.
import { CONFIG } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld, updateWorld, worldSnapshot } from './world.js';
import { createMissionState, startMission, updateMissions, currentMission } from './missions.js';
import { createRenderer } from './render.js';
import {
  drawHud, drawTitleScreen, drawPausedScreen, drawEndScreen,
} from './ui.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const W = CONFIG.viewWidth;
const H = CONFIG.viewHeight;
canvas.width = W;
canvas.height = H;

const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);

// Fit the 1280x800 field into the window, letterboxed, keeping its shape.
function fitCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// --- Save / load ------------------------------------------------------------
function loadSave() {
  try {
    const raw = window.localStorage.getItem(CONFIG.saveKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

function writeSave(game, missionState) {
  try {
    window.localStorage.setItem(CONFIG.saveKey, JSON.stringify({
      money: game.money,
      missionIndex: missionState.index,
      missionsDone: game.missionsDone,
      carsStolen: game.carsStolen,
      savedAt: Date.now(),
    }));
  } catch { /* offline-safe */ }
}

// --- State ------------------------------------------------------------------
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed')) || 7;

const saved = loadSave();
const game = {
  money: 0,
  won: false,
  busted: false,
  saveMoney: saved ? saved.money : 0,
  flags: { pickedUp: null },
  missionsDone: 0,
  carsStolen: 0,
};

let world = createWorld(seed);
let missionState = createMissionState();
let state = 'title'; // title | playing | paused | gameover | won
let paused = false;
let frozen = false;
let titleButtons = [];

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

function startNewGame() {
  audio.unlock();
  audio.click();
  world = createWorld((seed + Math.floor(Math.random() * 900) + 1) % 100000);
  missionState = createMissionState();
  game.money = 0;
  game.won = false;
  game.busted = false;
  game.flags.pickedUp = null;
  game.missionsDone = 0;
  game.carsStolen = 0;
  startMission(world, missionState, audio);
  state = 'playing';
  paused = false;
  announce('Job 1: steal a car and bring it to Mara\'s garage.');
}

function continueGame() {
  audio.unlock();
  audio.click();
  world = createWorld((seed + 11) % 100000);
  missionState = createMissionState();
  missionState.index = Math.min(saved.missionIndex, 4);
  game.money = saved.money;
  game.won = false;
  game.busted = false;
  game.flags.pickedUp = null;
  startMission(world, missionState, audio);
  state = 'playing';
  paused = false;
  announce(`Welcome back. ${currentMission(missionState).title} is waiting.`);
}

function respawn() {
  audio.click();
  const keepMoney = Math.max(0, game.money - 200);
  game.money = keepMoney;
  world.player.health = CONFIG.player.health;
  world.player.dead = false;
  world.player.x = world.hospital.x;
  world.player.y = world.hospital.y;
  world.player.inCar = null;
  world.wanted = 0;
  world.policeCars.length = 0;
  world.footCops.length = 0;
  world.camera.x = world.player.x;
  world.camera.y = world.player.y;
  game.busted = false;
  state = 'playing';
  announce('Back on the streets. The hospital patched you up — minus $200.');
}

// Drain the world's event queue into game-level effects.
function drainEvents() {
  for (const ev of world.events) {
    if (ev.type === 'pickup') game.flags.pickedUp = ev.kind;
    if (ev.type === 'wanted' && ev.stars > 0) audio.wantedUp();
    if (ev.type === 'mission-complete') {
      writeSave(game, missionState);
      game.missionsDone = world.stats.missionsDone;
      game.carsStolen = world.stats.carsStolen;
      // The next job starts at once: the story runs job to job.
      if (!missionState.done) startMission(world, missionState, audio);
    }
    if (ev.type === 'player-down') {
      game.busted = ev.busted === true;
      state = 'gameover';
      writeSave(game, missionState);
    }
    if (ev.type === 'busted') {
      game.busted = true;
      world.player.health = 0;
      world.player.dead = true;
      state = 'gameover';
      writeSave(game, missionState);
    }
  }
  world.events.length = 0;
  if (missionState.done && !game.won) game.won = true;
  if (game.won && state === 'playing') {
    state = 'won';
    writeSave(game, missionState);
  }
}

// --- Screenshot modes (?shot=...) -------------------------------------------
let shotReady = false;
if (shotName) {
  const staged = stageShot(shotName, game, audio);
  world = staged.world;
  missionState = staged.missionState;
  state = staged.state;
  frozen = staged.frozen;
  if (shotName === 'end') game.won = true;
}

// --- The loop ----------------------------------------------------------------
let last = performance.now();
let frames = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (!frozen) {
    if (state === 'title') {
      // Slow pan over the city behind the menu.
      world.time += dt;
      world.camera.x = 1280 + Math.sin(world.time * 0.05) * 500;
      world.camera.y = 960 + Math.cos(world.time * 0.04) * 320;
      if (input.wasPressed('Enter') || input.mouse.clicked) {
        const m = input.mouse;
        let hit = null;
        for (const b of titleButtons) {
          if (m.x > W / 2 - 220 && m.x < W / 2 + 220 && m.y > b.y - 34 && m.y < b.y + 22) hit = b.id;
        }
        if (hit === 'continue') continueGame();
        else if (hit === 'start' || input.wasPressed('Enter')) startNewGame();
      }
    } else if (state === 'playing') {
      if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
        paused = !paused;
        audio.click();
      }
      if (input.wasPressed('KeyM')) {
        const muted = audio.toggleMute();
        announce(muted ? 'Sound muted.' : 'Sound on.');
      }
      if (!paused) {
        // Mouse position in world space, for aiming and the reticle.
        world._mouseX = input.mouse.x + world.camera.x - W / 2;
        world._mouseY = input.mouse.y + world.camera.y - H / 2;
        updateWorld(world, input, dt, audio);
        updateMissions(world, missionState, game, audio);
        drainEvents();
      }
    } else if (state === 'gameover' || state === 'won') {
      if (input.wasPressed('KeyR') || input.wasPressed('Enter')) {
        if (state === 'won') startNewGame();
        else respawn();
      }
    }
  }

  // --- Render ---------------------------------------------------------------
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  if (state === 'title') {
    titleButtons = drawTitleScreen(ctx, world, game, !!saved);
  } else {
    renderer.drawWorld(world);
    if (state === 'playing') drawHud(ctx, world, game, missionState);
    if (paused && state === 'playing') drawPausedScreen(ctx);
    if (state === 'gameover') drawEndScreen(ctx, world, game, 'down');
    if (state === 'won') drawEndScreen(ctx, world, game, 'won');
  }

  input.endFrame();
  frames += 1;
  if (shotName && !shotReady && frames >= 2) {
    shotReady = true;
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// --- Debug hooks for the self-test (never part of the game itself). ----------
window.__game = {
  snapshot() {
    return {
      ...worldSnapshot(world),
      state: paused ? 'paused' : state,
      money: game.money,
      mission: missionState.index,
      missionStep: missionState.step,
      missionDone: missionState.done,
      won: game.won,
    };
  },
  debug: {
    giveMoney(n) { game.money += n; },
    setWanted(n) { world.wanted = n; world.crimeTimer = 0; },
    teleport(x, y) {
      world.player.x = x;
      world.player.y = y;
      if (world.player.inCar) { world.player.inCar.x = x; world.player.inCar.y = y; }
      world.camera.x = x;
      world.camera.y = y;
    },
    spawnCopNear() {
      world.wanted = Math.max(world.wanted, 1);
    },
    startMission(i) {
      missionState.index = i;
      missionState.step = 0;
      startMission(world, missionState, audio);
    },
    skipTo(x, y) { this.teleport(x, y); },
    teleportToParked() {
      const car = world.parked[0] || world.traffic[0];
      if (!car) return null;
      world.player.x = car.x + 20;
      world.player.y = car.y;
      world.camera.x = car.x;
      world.camera.y = car.y;
      return { x: car.x, y: car.y };
    },
    parkedCars() {
      return world.parked.map((c) => ({ x: Math.round(c.x), y: Math.round(c.y) }));
    },
    killEnemies() {
      for (const e of world.enemies) e.health = 0;
      return world.enemies.length;
    },
  },
};
