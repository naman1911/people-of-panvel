// Keyboard, mouse and touch input, reduced to what the game needs:
// a move vector, look deltas, zoom, run, and one-shot key presses.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.lookX = 0;
    this.lookY = 0;
    this.zoom = 0;
    this.stick = { x: 0, y: 0 };
    this.run = false;
    this.onPress = null; // (code) => void
    this.enabled = true;
    this.dragging = false;
    this.touchLook = null;
    this.touchMove = null;
    this.locked = false;
    this.wantLock = null; // () => boolean
    this.onLock = null;

    window.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.code === 'Escape') this.onPress?.('Escape');
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.onPress?.(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.dragging = false;
    });

    canvas.addEventListener('mousedown', (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      canvas.focus();
      // In first person a click captures the mouse, so you look around just by moving it.
      if (this.wantLock?.() && document.pointerLockElement !== canvas) canvas.requestPointerLock?.()?.catch?.(() => {});
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.onLock?.(this.locked);
    });
    window.addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.lookX += e.movementX || 0;
        this.lookY += e.movementY || 0;
        return;
      }
      if (!this.dragging) return;
      this.lookX += e.clientX - this.lastX;
      this.lookY += e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    window.addEventListener('mouseup', () => (this.dragging = false));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom += Math.sign(e.deltaY);
    }, { passive: false });

    // Touch: left half of the screen is a floating joystick, right half looks around.
    const tstart = (e) => {
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth * 0.45 && !this.touchMove) {
          this.touchMove = { id: t.identifier, ox: t.clientX, oy: t.clientY };
          this.onStick?.(t.clientX, t.clientY, 0, 0, true);
        } else if (!this.touchLook) {
          this.touchLook = { id: t.identifier, x: t.clientX, y: t.clientY };
        }
      }
      e.preventDefault();
    };
    const tmove = (e) => {
      for (const t of e.changedTouches) {
        if (this.touchMove && t.identifier === this.touchMove.id) {
          const dx = t.clientX - this.touchMove.ox, dy = t.clientY - this.touchMove.oy;
          const d = Math.hypot(dx, dy), max = 52;
          const k = d > max ? max / d : 1;
          this.stick.x = (dx * k) / max;
          this.stick.y = (-dy * k) / max;
          this.run = d > max * 1.5;
          this.onStick?.(this.touchMove.ox, this.touchMove.oy, dx * k, dy * k, true);
        } else if (this.touchLook && t.identifier === this.touchLook.id) {
          this.lookX += (t.clientX - this.touchLook.x) * 1.4;
          this.lookY += (t.clientY - this.touchLook.y) * 1.4;
          this.touchLook.x = t.clientX;
          this.touchLook.y = t.clientY;
        }
      }
      e.preventDefault();
    };
    const tend = (e) => {
      for (const t of e.changedTouches) {
        if (this.touchMove && t.identifier === this.touchMove.id) {
          this.touchMove = null;
          this.stick.x = this.stick.y = 0;
          this.run = false;
          this.onStick?.(0, 0, 0, 0, false);
        }
        if (this.touchLook && t.identifier === this.touchLook.id) this.touchLook = null;
      }
    };
    canvas.addEventListener('touchstart', tstart, { passive: false });
    canvas.addEventListener('touchmove', tmove, { passive: false });
    canvas.addEventListener('touchend', tend);
    canvas.addEventListener('touchcancel', tend);
  }

  /** Movement intent: x = strafe right, y = forward, each in [-1, 1]. */
  move() {
    if (!this.enabled) return { x: 0, y: 0, run: false };
    const k = this.keys;
    let x = this.stick.x, y = this.stick.y;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    if (k.has('KeyD')) x += 1;
    if (k.has('KeyA')) x -= 1;
    const l = Math.hypot(x, y);
    if (l > 1) (x /= l), (y /= l);
    return { x, y, run: this.run || k.has('ShiftLeft') || k.has('ShiftRight') };
  }

  /** Arrow-key turning, for keyboard-only players. */
  turn() {
    if (!this.enabled) return 0;
    return (this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('ArrowLeft') ? 1 : 0);
  }

  unlock() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
  }

  consumeLook() {
    const r = { x: this.lookX, y: this.lookY, zoom: this.zoom };
    this.lookX = this.lookY = this.zoom = 0;
    return r;
  }
}
