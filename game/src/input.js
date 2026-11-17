// Keyboard and pointer input. Held keys give a steering direction;
// one-shot presses (start, enter a car, interact, reload) are consumed
// once per frame so a single tap never fires twice.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  const GAME_KEYS = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'KeyE', 'KeyR', 'KeyP', 'KeyM', 'Enter', 'Space', 'Escape',
  ]);

  function keyName(e) {
    return e.code;
  }

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(keyName(e));
    keys.add(keyName(e));
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => keys.clear());

  function updateMouse(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  }
  canvas.addEventListener('mousemove', updateMouse);
  canvas.addEventListener('mousedown', (e) => {
    updateMouse(e);
    mouse.down = true;
    mouse.clicked = true;
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    keys,
    mouse,
    held(code) {
      return keys.has(code);
    },
    // One-shot: true only on the frame the key went down.
    wasPressed(code) {
      return pressed.has(code);
    },
    anyPressed(codes) {
      return codes.some((c) => pressed.has(c));
    },
    // WASD / arrows as a -1..1 pair.
    moveAxis() {
      const x = (this.held('KeyD') || this.held('ArrowRight') ? 1 : 0)
        - (this.held('KeyA') || this.held('ArrowLeft') ? 1 : 0);
      const y = (this.held('KeyS') || this.held('ArrowDown') ? 1 : 0)
        - (this.held('KeyW') || this.held('ArrowUp') ? 1 : 0);
      return { x, y };
    },
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
