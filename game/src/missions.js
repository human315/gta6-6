// Solano Bay — the story. Five jobs for Rook Calloway, an ex-getaway
// driver back in Solano Bay, working for the fixer Mara Voss. Each mission
// is a list of steps; the update reads the world and advances them.
// Nothing here names any commercial game: the city, the people and the
// jobs are all invented for this entry.
import { CONFIG } from './config.js';
import { spawnEnemies } from './world.js';

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'Job 1 — First Wheels',
    briefing: 'Mara Voss: "Welcome back to Solano Bay, Rook. You need wheels before you need work. Take any car on the street — parked is quieter — and bring it to my garage."',
    reward: 300,
    steps: [
      { id: 'steal', type: 'enter-car', label: 'Steal a car (walk up and press E)' },
      { id: 'garage', type: 'goto', x: 1240, y: 600, r: 90, label: 'Drive it to Mara\'s garage' },
    ],
  },
  {
    id: 'the-pickup',
    title: 'Job 2 — The Pickup',
    briefing: 'Mara Voss: "A package is waiting at the marina kiosk. Grab it on foot — press E — and run it to the drop point by the park. The package is hot: lifting it trips an alarm, so expect company."',
    reward: 500,
    steps: [
      { id: 'reach', type: 'goto', x: 2080, y: 1760, r: 70, label: 'Reach the marina kiosk' },
      { id: 'grab', type: 'pickup', kind: 'package', label: 'Grab the package (press E)' },
      { id: 'deliver', type: 'goto', x: 1120, y: 1000, r: 80, label: 'Deliver it to the park drop point' },
    ],
  },
  {
    id: 'hot-pursuit',
    title: 'Job 3 — Hot Pursuit',
    briefing: 'Mara Voss: "The Bay PD has your plate from the pickup. Two stars, Rook — lose them. Break line of sight, stay clean, and cool off at the garage if you have to."',
    reward: 600,
    steps: [
      { id: 'heat', type: 'wanted-at-least', stars: 2, label: 'The heat is on — 2 stars' },
      { id: 'cool', type: 'wanted-zero', label: 'Lose the cops — get back to 0 stars' },
    ],
  },
  {
    id: 'warehouse-job',
    title: 'Job 4 — The Warehouse Job',
    briefing: 'Mara Voss: "The Tide crew stashed a case in the east warehouse. Four guards, all jumpy. Clear them, take the case, and drive it back to the garage. No heroes — just the case."',
    reward: 900,
    steps: [
      { id: 'reach', type: 'goto', x: 2080, y: 1440, r: 110, label: 'Reach the east warehouse' },
      { id: 'clear', type: 'kill-all', label: 'Clear the warehouse guards' },
      { id: 'grab', type: 'pickup', kind: 'case', label: 'Take the case (press E)' },
      { id: 'escape', type: 'goto', x: 1240, y: 600, r: 90, label: 'Drive the case to the garage' },
    ],
  },
  {
    id: 'the-last-score',
    title: 'Job 5 — The Last Score',
    briefing: 'Mara Voss: "One last job and we are out. The Bay Central vault, five guards, then the whole department on your tail. Grab the cash, lose three stars, and bring it home. Do this and Solano Bay is ours."',
    reward: 1500,
    steps: [
      { id: 'reach', type: 'goto', x: 1760, y: 800, r: 110, label: 'Reach Bay Central' },
      { id: 'clear', type: 'kill-all', label: 'Clear the vault guards' },
      { id: 'grab', type: 'pickup', kind: 'cash', label: 'Grab the cash (press E)' },
      { id: 'heat', type: 'wanted-at-least', stars: 3, label: 'Three stars — the whole city is coming' },
      { id: 'cool', type: 'wanted-zero', label: 'Lose the cops — get back to 0 stars' },
      { id: 'deliver', type: 'goto', x: 1240, y: 600, r: 90, label: 'Bring the score home to Mara' },
    ],
  },
];

export function createMissionState() {
  return {
    index: 0,
    step: 0,
    active: false,
    banner: null,
    bannerTimer: 0,
    done: false,
  };
}

export function currentMission(state) {
  return MISSIONS[state.index] || null;
}

export function currentStep(state) {
  const m = currentMission(state);
  return m ? m.steps[state.step] : null;
}

export function missionObjective(state) {
  const m = currentMission(state);
  if (!m) return 'All jobs done — Solano Bay is yours.';
  const s = currentStep(state);
  return `${m.title}: ${s.label}`;
}

// Set up a mission's scripted world state (pickups, guards, heat).
export function startMission(world, state, audio) {
  const m = currentMission(state);
  if (!m) return;
  state.active = true;
  state.step = 0;
  state.banner = m.briefing;
  state.bannerTimer = 6;
  const rng = world.rng;
  if (m.id === 'the-pickup') {
    world.pickups.push({ x: 2080, y: 1760, kind: 'package' });
  }
  if (m.id === 'warehouse-job') {
    spawnEnemies(world, 2080, 1440, 4, rng);
    world.pickups.push({ x: 2080, y: 1440, kind: 'case' });
  }
  if (m.id === 'the-last-score') {
    spawnEnemies(world, 1760, 800, 5, rng);
    world.pickups.push({ x: 1760, y: 800, kind: 'cash' });
  }
  // A mission that opens on a heat step brings the heat at once.
  const first = m.steps[0];
  if (first && first.type === 'wanted-at-least') {
    world.wanted = Math.max(world.wanted, first.stars);
    world.crimeTimer = 0;
    world.events.push({ type: 'wanted', stars: world.wanted, why: 'heat' });
  }
  if (audio) audio.click();
}

export function completeMission(world, state, game, audio) {
  const m = currentMission(state);
  if (!m) return;
  game.money += m.reward;
  world.stats.missionsDone += 1;
  state.banner = `Job done — ${m.title}. Mara paid $${m.reward}.`;
  state.bannerTimer = 5;
  state.index += 1;
  state.step = 0;
  state.active = false;
  world.missionMarker = null;
  if (state.index >= MISSIONS.length) {
    state.done = true;
    game.won = true;
  }
  if (audio) audio.missionDone();
  world.events.push({ type: 'mission-complete', mission: m.id, reward: m.reward });
}

function stepTarget(state) {
  const s = currentStep(state);
  if (!s) return null;
  if (s.type === 'goto') return { x: s.x, y: s.y, r: s.r };
  if (s.type === 'pickup') {
    return { x: s.kind === 'package' ? 2080 : (s.kind === 'case' ? 2080 : 1760),
      y: s.kind === 'package' ? 1760 : (s.kind === 'case' ? 1440 : 800), r: 90 };
  }
  return null;
}

export function updateMissions(world, state, game, audio) {
  if (state.bannerTimer > 0) state.bannerTimer -= 1 / 60;
  if (!state.active || state.done) return;
  const m = currentMission(state);
  const step = currentStep(state);
  if (!m || !step) return;

  // The minimap and the world arrow point at the current objective.
  const target = stepTarget(state);
  world.missionMarker = target ? { x: target.x, y: target.y, label: step.label } : null;

  const p = world.player;
  let advance = false;

  if (step.type === 'enter-car') {
    if (p.inCar) advance = true;
  } else if (step.type === 'goto') {
    if (dist(p.x, p.y, step.x, step.y) < step.r) advance = true;
  } else if (step.type === 'pickup') {
    if (game.flags && game.flags.pickedUp === step.kind) advance = true;
  } else if (step.type === 'wanted-at-least') {
    if (world.wanted >= step.stars) advance = true;
  } else if (step.type === 'wanted-zero') {
    if (world.wanted === 0) advance = true;
  } else if (step.type === 'kill-all') {
    if (world.enemies.filter((e) => e.health > 0).length === 0) advance = true;
  }

  if (advance) {
    // Scripted beats fire when the step is reached.
    if (step.id === 'grab' && m.id === 'the-pickup') {
      world.events.push({ type: 'alarm' });
      if (world.wanted < 1) {
        world.wanted = 1;
        world.crimeTimer = 0;
        world.events.push({ type: 'wanted', stars: 1, why: 'alarm' });
      }
    }
    if (game.flags) game.flags.pickedUp = null;
    state.step += 1;
    if (audio) audio.pickup();
    // Entering a heat step brings the heat at once: the job escalates
    // the moment the player reaches that point in the story.
    const next = currentStep(state);
    if (next && next.type === 'wanted-at-least') {
      world.wanted = Math.max(world.wanted, next.stars);
      world.crimeTimer = 0;
      world.events.push({ type: 'wanted', stars: world.wanted, why: 'heat' });
    }
    if (state.step >= m.steps.length) {
      completeMission(world, state, game, audio);
    }
  }
}
