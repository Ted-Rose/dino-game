import { useCallback, useEffect, useRef } from 'react';

/** @typedef {{ enabled: boolean; joystick: { x: number; y: number }; look: { dx: number; dy: number }; keys: Record<string, boolean> }} TouchInput */

const STICK_MAX = 56;

/**
 * Mobilā vadība: spieķis kustībai, labā zona skatam, pogas darbībām.
 * @param {{ touchInputRef: React.MutableRefObject<TouchInput>; nearMerchant?: boolean }} props
 */
export default function Forest99TouchControls({ touchInputRef, nearMerchant }) {
  const stickWrapRef = useRef(null);
  const knobRef = useRef(null);
  const lookRef = useRef(null);
  const stickTouchId = useRef(null);
  const lookTouchId = useRef(null);
  const lookLast = useRef({ x: 0, y: 0 });

  const ensureKeys = useCallback(() => {
    const t = touchInputRef.current;
    if (!t.keys) t.keys = {};
    return t.keys;
  }, [touchInputRef]);

  const setKey = useCallback(
    (code, down) => {
      const k = ensureKeys();
      if (down) k[code] = true;
      else delete k[code];
    },
    [ensureKeys]
  );

  const onStickStart = useCallback(
    (e) => {
      if (!touchInputRef.current.enabled) return;
      const r = stickWrapRef.current?.getBoundingClientRect();
      if (!r) return;
      for (const tch of e.changedTouches) {
        if (
          tch.clientX >= r.left &&
          tch.clientX <= r.right &&
          tch.clientY >= r.top &&
          tch.clientY <= r.bottom
        ) {
          stickTouchId.current = tch.identifier;
          e.preventDefault();
          break;
        }
      }
    },
    [touchInputRef]
  );

  const onStickMove = useCallback(
    (e) => {
      const id = stickTouchId.current;
      if (id == null) return;
      const r = stickWrapRef.current?.getBoundingClientRect();
      if (!r) return;
      for (const tch of e.changedTouches) {
        if (tch.identifier !== id) continue;
        e.preventDefault();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        let vx = (tch.clientX - cx) / STICK_MAX;
        let vy = (tch.clientY - cy) / STICK_MAX;
        const m = Math.hypot(vx, vy);
        if (m > 1) {
          vx /= m;
          vy /= m;
        }
        touchInputRef.current.joystick.x = vx;
        touchInputRef.current.joystick.y = vy;
        break;
      }
    },
    [touchInputRef]
  );

  const endStick = useCallback(
    (e) => {
      for (const tch of e.changedTouches) {
        if (tch.identifier === stickTouchId.current) {
          stickTouchId.current = null;
          touchInputRef.current.joystick.x = 0;
          touchInputRef.current.joystick.y = 0;
          break;
        }
      }
    },
    [touchInputRef]
  );

  const onLookStart = useCallback(
    (e) => {
      if (!touchInputRef.current.enabled) return;
      const lr = lookRef.current?.getBoundingClientRect();
      if (!lr) return;
      for (const tch of e.changedTouches) {
        if (tch.identifier === stickTouchId.current) continue;
        if (
          tch.clientX >= lr.left &&
          tch.clientX <= lr.right &&
          tch.clientY >= lr.top &&
          tch.clientY <= lr.bottom
        ) {
          lookTouchId.current = tch.identifier;
          lookLast.current = { x: tch.clientX, y: tch.clientY };
          e.preventDefault();
          break;
        }
      }
    },
    [touchInputRef]
  );

  const onLookMove = useCallback(
    (e) => {
      const id = lookTouchId.current;
      if (id == null) return;
      for (const tch of e.changedTouches) {
        if (tch.identifier !== id) continue;
        e.preventDefault();
        const dx = tch.clientX - lookLast.current.x;
        const dy = tch.clientY - lookLast.current.y;
        lookLast.current = { x: tch.clientX, y: tch.clientY };
        touchInputRef.current.look.dx += dx;
        touchInputRef.current.look.dy += dy;
        break;
      }
    },
    [touchInputRef]
  );

  const endLook = useCallback((e) => {
    for (const tch of e.changedTouches) {
      if (tch.identifier === lookTouchId.current) {
        lookTouchId.current = null;
        break;
      }
    }
  }, []);

  useEffect(() => {
    let raf = 0;
    const syncKnob = () => {
      const k = knobRef.current;
      const j = touchInputRef.current.joystick;
      if (k && j) {
        k.style.transform = `translate(${j.x * 44}px, ${j.y * 44}px)`;
      }
      raf = requestAnimationFrame(syncKnob);
    };
    raf = requestAnimationFrame(syncKnob);
    return () => cancelAnimationFrame(raf);
  }, [touchInputRef]);

  useEffect(() => {
    const stick = stickWrapRef.current;
    const look = lookRef.current;
    if (!stick || !look) return undefined;

    stick.addEventListener('touchstart', onStickStart, { passive: false });
    stick.addEventListener('touchmove', onStickMove, { passive: false });
    stick.addEventListener('touchend', endStick);
    stick.addEventListener('touchcancel', endStick);

    look.addEventListener('touchstart', onLookStart, { passive: false });
    look.addEventListener('touchmove', onLookMove, { passive: false });
    look.addEventListener('touchend', endLook);
    look.addEventListener('touchcancel', endLook);

    return () => {
      stick.removeEventListener('touchstart', onStickStart);
      stick.removeEventListener('touchmove', onStickMove);
      stick.removeEventListener('touchend', endStick);
      stick.removeEventListener('touchcancel', endStick);
      look.removeEventListener('touchstart', onLookStart);
      look.removeEventListener('touchmove', onLookMove);
      look.removeEventListener('touchend', endLook);
      look.removeEventListener('touchcancel', endLook);
    };
  }, [onStickStart, onStickMove, endStick, onLookStart, onLookMove, endLook]);

  const btn = (label, code, title) => (
    <button
      type="button"
      className="forest99-touch-btn"
      title={title}
      aria-label={title || label}
      onTouchStart={(e) => {
        e.preventDefault();
        setKey(code, true);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        setKey(code, false);
      }}
      onTouchCancel={(e) => {
        e.preventDefault();
        setKey(code, false);
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="forest99-touch-root">
      <div ref={lookRef} className="forest99-touch-look" />

      <div ref={stickWrapRef} className="forest99-touch-stick-wrap">
        <div className="forest99-touch-stick-base">
          <div ref={knobRef} className="forest99-touch-stick-knob" />
        </div>
      </div>

      <div className="forest99-touch-actions">
        <div className="forest99-touch-actions__row">
          {btn('Kr', 'Space', 'Uzbrukt')}
          {btn('E', 'KeyE', 'Lasīt / cirpt')}
          {btn('F', 'KeyF', 'Malka ugunī')}
        </div>
        <div className="forest99-touch-actions__row">
          {btn('Q', 'KeyQ', 'Šķēps')}
          {btn('R', 'KeyR', 'Ēst ogas')}
          {btn('H', 'KeyH', 'Pajumte')}
        </div>
        <div className="forest99-touch-actions__row">
          {btn('Sm', 'Tab', 'Soma')}
          {btn('Sk', 'ShiftLeft', 'Skriet')}
          {btn('1', 'Digit1', 'Tirgotājs: ogas')}
          {btn('2', 'Digit2', 'Tirgotājs: malka')}
        </div>
        {nearMerchant && <p className="forest99-touch-actions__hint">Tirgotājs: 1 un 2</p>}
      </div>
    </div>
  );
}
