// Solano Bay — the HUD, the minimap and every menu screen. All of it is
// drawn on the same canvas as the game, so the screenshots show the whole
// interface exactly as a player sees it.
import { CONFIG } from './config.js';
import { currentMission, currentStep } from './missions.js';

const C = CONFIG;

function star(cx, cy, r, filled, ctx) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd23f' : 'rgba(0,0,0,0.45)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

export function drawHud(ctx, world, game, missionState) {
  const p = world.player;
  // --- Top right: money, wanted stars, health. ---------------------------
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, C.viewWidth - 268, 14, 252, 108, 10);
  ctx.fill();
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`$${game.money.toLocaleString('en-US')}`, C.viewWidth - 250, 48);
  for (let i = 0; i < C.wanted.maxStars; i++) {
    star(C.viewWidth - 236 + i * 34, 74, 13, i < world.wanted, ctx);
  }
  // Health bar.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, C.viewWidth - 250, 94, 216, 14, 7);
  ctx.fill();
  ctx.fillStyle = p.health > 50 ? '#3aa655' : (p.health > 25 ? '#f0c040' : '#c0392b');
  roundRect(ctx, C.viewWidth - 250, 94, (216 * Math.max(0, p.health)) / 100, 14, 7);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`HEALTH ${Math.ceil(Math.max(0, p.health))}`, C.viewWidth - 250, 90 - 2 + 0);
  // Ammo and speed, bottom left.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, 16, C.viewHeight - 64, 210, 48, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px sans-serif';
  if (p.inCar) {
    ctx.fillText(`${Math.round(Math.abs(p.inCar.speed) * 0.18)} km/h`, 30, C.viewHeight - 34);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#cfd2d6';
    ctx.fillText('E — leave car', 130, C.viewHeight - 34);
  } else {
    const ammo = p.reloading > 0 ? 'RELOADING…' : `${p.ammo} / ${p.reserve}`;
    ctx.fillText(`AMMO ${ammo}`, 30, C.viewHeight - 34);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#cfd2d6';
    ctx.fillText('E — enter car / grab    R — reload', 30, C.viewHeight - 34 + 0);
    ctx.fillText('Click — shoot', 30, C.viewHeight - 16);
  }

  // --- Mission objective banner, top centre. ------------------------------
  if (missionState && missionState.active) {
    const label = missionObjectiveText(missionState);
    ctx.font = 'bold 17px sans-serif';
    const w = Math.min(720, ctx.measureText(label).width + 36);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, (C.viewWidth - w) / 2, 14, w, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.textAlign = 'center';
    ctx.fillText(label, C.viewWidth / 2, 41);
    ctx.textAlign = 'left';
  }

  // --- Briefing card after a mission starts. ------------------------------
  if (missionState && missionState.banner && missionState.bannerTimer > 0) {
    const text = missionState.banner;
    ctx.font = '15px sans-serif';
    const lines = wrapText(ctx, text, 560);
    const h = lines.length * 22 + 44;
    ctx.fillStyle = 'rgba(20,20,28,0.88)';
    roundRect(ctx, (C.viewWidth - 600) / 2, 70, 600, h, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2;
    roundRect(ctx, (C.viewWidth - 600) / 2, 70, 600, h, 12);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    lines.forEach((line, i) => ctx.fillText(line, (C.viewWidth - 600) / 2 + 22, 70 + 34 + i * 22));
  }

  drawMinimap(ctx, world);
}

export function missionObjectiveText(missionState) {
  const m = currentMission(missionState);
  if (!m) return 'All jobs done — Solano Bay is yours.';
  const s = currentStep(missionState);
  return `${m.title}: ${s ? s.label : ''}`;
}

export function drawMinimap(ctx, world) {
  const mw = 220;
  const mh = 168;
  const mx = C.viewWidth - mw - 16;
  const my = C.viewHeight - mh - 16;
  const sx = mw / C.worldWidth;
  const sy = mh / C.worldHeight;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, mx - 6, my - 6, mw + 12, mh + 12, 10);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  // Sea, beach, grass.
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(mx + C.beachX * sx, my, mw, mh);
  ctx.fillStyle = '#e8d8a8';
  ctx.fillRect(mx + C.beachX * sx - 8, my, 10, mh);
  ctx.fillStyle = '#7fae62';
  ctx.fillRect(mx, my, mw, mh);
  // Roads.
  ctx.fillStyle = '#3d3f45';
  for (const rx of world.roadsV) ctx.fillRect(mx + rx * sx - 2, my, 4, mh);
  for (const ry of world.roadsH) ctx.fillRect(mx, my + ry * sy - 2, mw, 4);
  // Park.
  ctx.fillStyle = '#5d9b4a';
  ctx.fillRect(mx + 800 * sx, my + 800 * sy, 320 * sx, 320 * sy);
  // Hideout.
  ctx.fillStyle = '#f0c040';
  ctx.fillRect(mx + world.hideout.x * sx - 2, my + world.hideout.y * sy - 2, 6, 6);
  // Mission marker, pulsing.
  if (world.missionMarker) {
    const m = world.missionMarker;
    const r = 5 + Math.sin(world.time * 5) * 2;
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(mx + m.x * sx, my + m.y * sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Police, then the player.
  ctx.fillStyle = '#ff2d2d';
  for (const car of world.policeCars) {
    ctx.fillRect(mx + car.x * sx - 2, my + car.y * sy - 2, 4, 4);
  }
  for (const cop of world.footCops) {
    ctx.fillRect(mx + cop.x * sx - 2, my + cop.y * sy - 2, 4, 4);
  }
  const p = world.player;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(mx + p.x * sx, my + p.y * sy, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Facing tick.
  ctx.strokeStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(mx + p.x * sx, my + p.y * sy);
  ctx.lineTo(mx + p.x * sx + Math.cos(p.angle) * 9, my + p.y * sy + Math.sin(p.angle) * 9);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLANO BAY', mx, my - 10);
}

// --- Screens ----------------------------------------------------------------
export function drawTitleScreen(ctx, world, game, hasSave) {
  drawBackdrop(ctx, world);
  ctx.fillStyle = 'rgba(10,14,24,0.62)';
  ctx.fillRect(0, 0, C.viewWidth, C.viewHeight);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('SOLANO BAY', C.viewWidth / 2, 210);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('An open-world crime story — steal, drive, run, and take the city.', C.viewWidth / 2, 258);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#dfe6ee';
  ctx.fillText('Rook Calloway is back in Solano Bay. Five jobs for the fixer Mara Voss stand between', C.viewWidth / 2, 306);
  ctx.fillText('him and the last score — if the Bay PD doesn\'t catch him first.', C.viewWidth / 2, 332);

  // Buttons.
  const buttons = [
    { id: 'start', label: hasSave ? '▶  NEW GAME' : '▶  START THE STORY', y: 420 },
    ...(hasSave ? [{ id: 'continue', label: '↻  CONTINUE — $' + game.saveMoney, y: 486 }] : []),
  ];
  for (const b of buttons) {
    ctx.fillStyle = '#ffd23f';
    roundRect(ctx, C.viewWidth / 2 - 220, b.y - 34, 440, 56, 10);
    ctx.fill();
    ctx.fillStyle = '#1c2733';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(b.label, C.viewWidth / 2, b.y + 4);
  }
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  const cy = hasSave ? 580 : 540;
  ctx.fillText('WASD move / drive  •  Mouse aim, Click shoot  •  E enter car or grab  •  R reload', C.viewWidth / 2, cy);
  ctx.fillText('P pause  •  M mute  •  Progress saves automatically after every job', C.viewWidth / 2, cy + 26);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#9aa5b1';
  ctx.fillText('An original game: Solano Bay, its people and its story were invented for this entry.', C.viewWidth / 2, C.viewHeight - 28);
  ctx.fillText('No Rockstar names, characters, maps or assets. All art is drawn in code; all sound is synthesized.', C.viewWidth / 2, C.viewHeight - 8);
  ctx.textAlign = 'left';
  return buttons;
}

export function drawPausedScreen(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, C.viewWidth, C.viewHeight);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('PAUSED', C.viewWidth / 2, C.viewHeight / 2 - 20);
  ctx.font = '18px sans-serif';
  ctx.fillText('P — resume    •    M — mute    •    Your progress is saved after every job.', C.viewWidth / 2, C.viewHeight / 2 + 24);
  ctx.textAlign = 'left';
}

export function drawEndScreen(ctx, world, game, kind) {
  ctx.fillStyle = 'rgba(10,14,24,0.78)';
  ctx.fillRect(0, 0, C.viewWidth, C.viewHeight);
  ctx.textAlign = 'center';
  if (kind === 'won') {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('THE LAST SCORE', C.viewWidth / 2, 230);
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText('Rook walks out of Bay Central with the cash, the cops behind him,', C.viewWidth / 2, 300);
    ctx.fillText('and Mara Voss waiting at the garage. Solano Bay is theirs.', C.viewWidth / 2, 336);
  } else {
    ctx.fillStyle = '#ff5a4e';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText(game.busted ? 'BUSTED' : 'WASTED', C.viewWidth / 2, 230);
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText('The Bay PD picks Rook up. He keeps the story — and most of the cash.', C.viewWidth / 2, 300);
    ctx.fillText('Press R to get back on the streets.', C.viewWidth / 2, 336);
  }
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`$${game.money.toLocaleString('en-US')}  •  ${world.stats.missionsDone} of 5 jobs done  •  ${world.stats.carsStolen} cars stolen`, C.viewWidth / 2, 420);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(kind === 'won' ? 'R — play again' : 'R — back to the streets', C.viewWidth / 2, 480);
  ctx.textAlign = 'left';
}

// A slow pan over the city behind the title screen.
function drawBackdrop(ctx, world) {
  ctx.save();
  ctx.translate(-world.camera.x + C.viewWidth / 2, -world.camera.y + C.viewHeight / 2);
  ctx.fillStyle = C.palette.grass;
  ctx.fillRect(world.camera.x - C.viewWidth / 2, world.camera.y - C.viewHeight / 2, C.viewWidth, C.viewHeight);
  ctx.fillStyle = C.palette.sea;
  ctx.fillRect(C.beachX + 100, 0, 200, C.worldHeight);
  ctx.fillStyle = C.palette.beach;
  ctx.fillRect(C.beachX, 0, 110, C.worldHeight);
  const hw = C.roadWidth / 2;
  for (const rx of world.roadsV) {
    ctx.fillStyle = C.palette.road;
    ctx.fillRect(rx - hw, 0, C.roadWidth, C.worldHeight);
  }
  for (const ry of world.roadsH) {
    ctx.fillStyle = C.palette.road;
    ctx.fillRect(0, ry - hw, C.beachX, C.roadWidth);
  }
  for (const b of world.buildings) {
    ctx.fillStyle = b.wall;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
