/**
 * Pointer handling for the canvas: drag-to-look, tap-to-pick, hover-to-parallax.
 * Distinguishes a tap from a drag so orbiting never fires a click by accident.
 */

const TAP_SLOP = 9;

export function createPointer(target, handlers = {}) {
  let down = false;
  let downX = 0;
  let downY = 0;
  let lastX = 0;
  let lastY = 0;
  let travel = 0;
  let pointerId = null;

  const norm = (cx, cy) => {
    const r = target.getBoundingClientRect();
    return {
      x: cx - r.left,
      y: cy - r.top,
      nx: ((cx - r.left) / r.width) * 2 - 1,
      ny: -(((cy - r.top) / r.height) * 2 - 1),
    };
  };

  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    down = true;
    travel = 0;
    pointerId = e.pointerId;
    downX = lastX = e.clientX;
    downY = lastY = e.clientY;
    if (target.setPointerCapture) {
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    target.classList.add('is-dragging');
    handlers.down?.();
  }

  function onMove(e) {
    const p = norm(e.clientX, e.clientY);

    if (down) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      travel += Math.abs(dx) + Math.abs(dy);
      if (travel > 2) handlers.drag?.(dx, dy);
      handlers.pointerMove?.(p);
      return;
    }

    handlers.hover?.(p);
  }

  function onUp(e) {
    if (!down) return;
    down = false;
    target.classList.remove('is-dragging');

    if (travel <= TAP_SLOP) {
      const p = norm(e.clientX, e.clientY);
      handlers.tap?.(p);
    }
    handlers.up?.();

    if (target.releasePointerCapture && pointerId !== null) {
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
    }
    pointerId = null;
  }

  function onLeave() {
    if (!down) handlers.leave?.();
  }

  function onCancel() {
    down = false;
    target.classList.remove('is-dragging');
    handlers.up?.();
  }

  target.addEventListener('pointerdown', onDown);
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onUp);
  target.addEventListener('pointercancel', onCancel);
  target.addEventListener('pointerleave', onLeave);
  target.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    dispose() {
      target.removeEventListener('pointerdown', onDown);
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onCancel);
      target.removeEventListener('pointerleave', onLeave);
    },
    get dragging() {
      return down;
    },
  };
}
