// Solano Bay — everything the player sees, drawn on one 2D canvas.
// Top-down sun-soaked city: grass, roads with lane paint, blocky
// buildings with shaded roofs, a park, a beach and the sea.
import { CONFIG } from './config.js';

const TAU = Math.PI * 2;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const C = CONFIG;

  function visible(world, x, y, margin) {
    const cam = world.camera;
    return x > cam.x - C.viewWidth / 2 - margin && x < cam.x + C.viewWidth / 2 + margin
      && y > cam.y - C.viewHeight / 2 - margin && y < cam.y + C.viewHeight / 2 + margin;
  }

  function drawCar(x, y, angle, color, model, police, lightsOn) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    roundRect(2, -11 + 3, 48, 22, 7);
    ctx.fill();
    // Body.
    ctx.fillStyle = color;
    roundRect(0, -11, 48, 22, 7);
    ctx.fill();
    if (police) {
      ctx.fillStyle = '#f5f5f5';
      roundRect(8, -11, 18, 22, 4);
      ctx.fill();
      // Flashing light bar.
      ctx.fillStyle = lightsOn ? '#ff2d2d' : '#2d7bff';
      roundRect(-2, -11, 6, 9, 2);
      ctx.fill();
      ctx.fillStyle = lightsOn ? '#2d7bff' : '#ff2d2d';
      roundRect(-2, 2, 6, 9, 2);
      ctx.fill();
    } else if (model === 'taxi') {
      ctx.fillStyle = '#f0c040';
      roundRect(14, -11, 8, 22, 3);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 18, 2);
    }
    // Windshield and rear window.
    ctx.fillStyle = 'rgba(180,220,240,0.85)';
    roundRect(12, -8, 8, 16, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,140,160,0.8)';
    roundRect(-12, -8, 7, 16, 3);
    ctx.fill();
    // Wheels.
    ctx.fillStyle = '#16181c';
    ctx.fillRect(14, -14, 9, 4);
    ctx.fillRect(14, 10, 9, 4);
    ctx.fillRect(-14, -14, 9, 4);
    ctx.fillRect(-14, 10, 9, 4);
    // Headlights.
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(23, -8, 2, 4);
    ctx.fillRect(23, 4, 2, 4);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawPed(x, y, angle, color, down) {
    ctx.save();
    ctx.translate(x, y);
    if (down) {
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 6, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      return;
    }
    // Shadow and body.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(1, 2, 9, 8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, TAU);
    ctx.fill();
    // Head and shoulders, facing the walk direction.
    ctx.rotate(angle);
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(3, 0, 4.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(4, 0, 4.5, -1.2, 1.2);
    ctx.fill();
    ctx.restore();
  }

  function drawWorld(world) {
    const cam = world.camera;
    ctx.save();
    ctx.translate(-cam.x + C.viewWidth / 2, -cam.y + C.viewHeight / 2);

    // Ground: grass with a subtle checker of mowing strips.
    ctx.fillStyle = C.palette.grass;
    ctx.fillRect(cam.x - C.viewWidth / 2 - 40, cam.y - C.viewHeight / 2 - 40, C.viewWidth + 80, C.viewHeight + 80);
    ctx.fillStyle = C.palette.grassDark;
    const strip = 160;
    const sx0 = Math.floor((cam.x - C.viewWidth / 2) / strip) * strip;
    const sy0 = Math.floor((cam.y - C.viewHeight / 2) / strip) * strip;
    for (let x = sx0; x < cam.x + C.viewWidth / 2; x += strip) {
      for (let y = sy0; y < cam.y + C.viewHeight / 2; y += strip) {
        if (((x / strip + y / strip) % 2 + 2) % 2 === 0) ctx.fillRect(x, y, strip, strip);
      }
    }

    // Sea and beach on the east edge.
    ctx.fillStyle = C.palette.seaDeep;
    ctx.fillRect(C.beachX + 110, 0, C.worldWidth - C.beachX, C.worldHeight);
    ctx.fillStyle = C.palette.sea;
    ctx.fillRect(C.beachX + 100, 0, 30, C.worldHeight);
    ctx.fillStyle = C.palette.beach;
    ctx.fillRect(C.beachX, 0, 110, C.worldHeight);
    // Animated wave line.
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const wave = Math.sin(world.time * 1.4) * 4;
    ctx.moveTo(C.beachX + 100 + wave, 0);
    ctx.lineTo(C.beachX + 100 + wave, C.worldHeight);
    ctx.stroke();

    // Park block: lawn, paths and trees.
    ctx.fillStyle = C.palette.park;
    ctx.fillRect(800, 800, 320, 320);
    ctx.fillStyle = '#c9b18a';
    ctx.fillRect(944, 800, 32, 320);
    ctx.fillRect(800, 944, 320, 32);
    for (const t of world.trees) {
      if (!visible(world, t.x, t.y, 30)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(t.x + 3, t.y + 4, t.r, t.r * 0.8, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = t.palm ? '#3f9e57' : '#2f7d3a';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#57b06a';
      ctx.beginPath();
      ctx.arc(t.x - 3, t.y - 3, t.r * 0.55, 0, TAU);
      ctx.fill();
    }

    // Roads: asphalt, edge lines and dashed centres.
    const hw = C.roadWidth / 2;
    for (const rx of world.roadsV) {
      ctx.fillStyle = C.palette.roadEdge;
      ctx.fillRect(rx - hw, 0, C.roadWidth, C.worldHeight);
      ctx.fillStyle = C.palette.road;
      ctx.fillRect(rx - hw + 3, 0, C.roadWidth - 6, C.worldHeight);
      ctx.fillStyle = '#d8d8d8';
      ctx.fillRect(rx - hw + 3, 0, 2, C.worldHeight);
      ctx.fillRect(rx + hw - 5, 0, 2, C.worldHeight);
      ctx.fillStyle = C.palette.lane;
      for (let y = 0; y < C.worldHeight; y += 56) ctx.fillRect(rx - 2, y, 4, 28);
    }
    for (const ry of world.roadsH) {
      ctx.fillStyle = C.palette.roadEdge;
      ctx.fillRect(0, ry - hw, C.beachX, C.roadWidth);
      ctx.fillStyle = C.palette.road;
      ctx.fillRect(0, ry - hw + 3, C.beachX, C.roadWidth - 6);
      ctx.fillStyle = '#d8d8d8';
      ctx.fillRect(0, ry - hw + 3, C.beachX, 2);
      ctx.fillRect(0, ry + hw - 5, C.beachX, 2);
      ctx.fillStyle = C.palette.lane;
      for (let x = 0; x < C.beachX; x += 56) ctx.fillRect(x, ry - 2, 28, 4);
    }
    // Sidewalk strips along every road.
    ctx.fillStyle = C.palette.sidewalk;
    for (const rx of world.roadsV) {
      ctx.fillRect(rx - hw - 12, 0, 9, C.worldHeight);
      ctx.fillRect(rx + hw + 3, 0, 9, C.worldHeight);
    }
    for (const ry of world.roadsH) {
      ctx.fillRect(0, ry - hw - 12, C.beachX, 9);
      ctx.fillRect(0, ry + hw + 3, C.beachX, 9);
    }

    // Landmarks: garage hideout, bank, warehouse, marina kiosk.
    drawLandmark(world.hideout.x, world.hideout.y, world.hideout.w, world.hideout.h, '#7a5a34', 'MARA\'S GARAGE', '#f0c040');
    drawLandmark(1700, 740, 120, 120, '#5d6d7e', 'BAY CENTRAL', '#e8e8e8');
    drawLandmark(2020, 1380, 120, 120, '#7e5a3a', 'EAST WAREHOUSE', '#f0c040');
    drawLandmark(2040, 1720, 80, 80, '#3a6d8f', 'MARINA KIOSK', '#9fd8ef');

    // Buildings: wall, shaded roof, windows by floor count.
    for (const b of world.buildings) {
      if (!visible(world, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = b.wall;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      const cols = Math.max(2, Math.floor(b.w / 26));
      const rows = Math.max(2, Math.min(b.floors, Math.floor(b.h / 26)));
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          ctx.fillRect(b.x + 10 + cx * ((b.w - 20) / cols), b.y + 10 + cy * ((b.h - 20) / rows), 9, 7);
        }
      }
    }

    // Pickups: a glowing marker and label.
    for (const pk of world.pickups) {
      if (!visible(world, pk.x, pk.y, 40)) continue;
      const pulse = 1 + Math.sin(world.time * 5) * 0.15;
      ctx.save();
      ctx.translate(pk.x, pk.y);
      ctx.fillStyle = 'rgba(240,192,64,0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 26 * pulse, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#f0c040';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pk.kind === 'cash' ? '$' : '!', 0, 0);
      ctx.restore();
    }

    // Mission marker: pulsing ring on the ground.
    if (world.missionMarker) {
      const m = world.missionMarker;
      const pulse = 1 + Math.sin(world.time * 4) * 0.2;
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 34 * pulse, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y - 52);
      ctx.lineTo(m.x - 10, m.y - 30);
      ctx.lineTo(m.x + 10, m.y - 30);
      ctx.closePath();
      ctx.fill();
    }

    // Parked cars, traffic and police.
    for (const car of world.parked) {
      if (visible(world, car.x, car.y, 40)) drawCar(car.x, car.y, car.angle, car.color, car.model, false, false);
    }
    for (const car of world.traffic) {
      if (visible(world, car.x, car.y, 40)) drawCar(car.x, car.y, car.angle, car.color, car.model, false, false);
    }
    const lightsOn = Math.floor(world.time * 3) % 2 === 0;
    for (const car of world.policeCars) {
      if (visible(world, car.x, car.y, 40)) drawCar(car.x, car.y, car.angle, car.color, car.model, true, lightsOn);
    }

    // Pedestrians, guards, foot cops.
    for (const ped of world.peds) {
      if (visible(world, ped.x, ped.y, 30)) drawPed(ped.x, ped.y, ped.angle, ped.color, ped.health <= 0);
    }
    for (const e of world.enemies) {
      if (e.health > 0 && visible(world, e.x, e.y, 30)) {
        drawPed(e.x, e.y, e.angle, '#8e2f2f', false);
        drawHealthBar(e.x, e.y - 20, 26, e.health);
      }
    }
    for (const cop of world.footCops) {
      if (visible(world, cop.x, cop.y, 30)) {
        drawPed(cop.x, cop.y, cop.angle, '#1c2733', cop.health <= 0);
        // Police cap.
        ctx.fillStyle = '#1c2733';
        ctx.beginPath();
        ctx.arc(cop.x + 3, cop.y, 5, 0, TAU);
        ctx.fill();
        if (cop.health > 0) drawHealthBar(cop.x, cop.y - 20, 26, cop.health);
      }
    }

    // The player's car, then the player on foot.
    const p = world.player;
    if (p.inCar) {
      drawCar(p.inCar.x, p.inCar.y, p.inCar.angle, p.inCar.color, p.inCar.model, p.inCar.model === 'police', lightsOn);
    } else if (!p.dead) {
      drawPed(p.x, p.y, p.angle, '#e8e8e8', false);
      // The pistol in hand, aimed at the mouse.
      const aim = p.aimAngle || 0;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(aim);
      ctx.fillStyle = '#222';
      ctx.fillRect(8, -2, 12, 4);
      if (p.muzzle > 0) {
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(32, -5);
        ctx.lineTo(32, 5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // Aim reticle at the mouse.
      const cam = world.camera;
      const mx = world._mouseX ?? p.x;
      const my = world._mouseY ?? p.y;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mx, my, 9, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - 13, my);
      ctx.lineTo(mx - 5, my);
      ctx.moveTo(mx + 5, my);
      ctx.lineTo(mx + 13, my);
      ctx.moveTo(mx, my - 13);
      ctx.lineTo(mx, my - 5);
      ctx.moveTo(mx, my + 5);
      ctx.lineTo(mx, my + 13);
      ctx.stroke();
    }

    // Bullets as tracers.
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    for (const b of world.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Particles.
    for (const pt of world.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function drawLandmark(x, y, w, h, color, label, labelColor) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 4, y + 5, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = labelColor;
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  function drawHealthBar(x, y, w, health) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - w / 2, y, w, 5);
    ctx.fillStyle = health > 50 ? '#3aa655' : '#c0392b';
    ctx.fillRect(x - w / 2, y, (w * Math.max(0, health)) / 100, 5);
  }

  return { drawWorld, drawCar };
}
