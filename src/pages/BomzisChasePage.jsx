import { useCallback, useEffect, useState } from 'react';
import BomzisChaseGame, {
  BOMZISCHASE_BRAKE_EVENT,
  BOMZISCHASE_JUMP_EVENT,
} from '../components/BomzisChaseGame';

export default function BomzisChasePage() {
  const [hud, setHud] = useState({ score: 0, gap: 11, braking: false });
  const [gameOver, setGameOver] = useState(null);
  const [touchUi, setTouchUi] = useState(false);

  const onHud = useCallback((h) => setHud(h), []);
  const onGameOver = useCallback((payload) => {
    setGameOver(payload);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const upd = () => setTouchUi(mq.matches || window.innerWidth < 820);
    upd();
    mq.addEventListener('change', upd);
    window.addEventListener('resize', upd);
    return () => {
      mq.removeEventListener('change', upd);
      window.removeEventListener('resize', upd);
    };
  }, []);

  useEffect(() => {
    const m = document.querySelector('meta[name="viewport"]');
    if (!m) return undefined;
    const prev = m.getAttribute('content');
    if (touchUi) {
      m.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no'
      );
    }
    return () => {
      if (prev != null) m.setAttribute('content', prev);
    };
  }, [touchUi]);

  const fireJump = useCallback(() => {
    window.dispatchEvent(new CustomEvent(BOMZISCHASE_JUMP_EVENT));
  }, []);

  const fireBrakeDown = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent(BOMZISCHASE_BRAKE_EVENT, { detail: { down: true } }),
    );
  }, []);

  const fireBrakeUp = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent(BOMZISCHASE_BRAKE_EVENT, { detail: { down: false } }),
    );
  }, []);

  return (
    <div
      className={`app page-bomzischase${touchUi ? ' page-bomzischase--touch' : ''}`}
    >
      <div className="bomzischase-title-bar">
        <h1>Bomža medības</h1>
        <p className="bomzischase-tag">
          Bomžam ir viens uzdevums — <strong>tevi nosist</strong>. Platāks skats rāda viņu
          ar nūju aiz muguras; vari apstāties (<kbd>S</kbd> / <kbd>↓</kbd> vai «Stāvēt»).
          Šķēršļi un lāzeri priekšā
        </p>
      </div>

      <div className="bomzischase-stage">
        <div className="bomzischase-playfield">
          <BomzisChaseGame onHud={onHud} onGameOver={onGameOver} />
          {touchUi && (
            <div className="bomzischase-touch-controls">
              <button
                type="button"
                className="bomzischase-brake-btn"
                aria-label="Stāvēt — turēt, lai apstātos"
                onPointerDown={(e) => {
                  e.preventDefault();
                  fireBrakeDown();
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  fireBrakeUp();
                }}
                onPointerCancel={() => fireBrakeUp()}
                onPointerLeave={() => fireBrakeUp()}
              >
                Stāvēt
              </button>
              <button
                type="button"
                className="bomzischase-jump-btn"
                aria-label="Lēkt"
                onPointerDown={(e) => {
                  e.preventDefault();
                  fireJump();
                }}
              >
                Lēkt
              </button>
            </div>
          )}
        </div>
        <div className="bomzischase-hud">
          <span>
            Punkti: <strong>{hud.score}</strong>
          </span>
          <span>
            Līdz bomzim ~<strong>{hud.gap}</strong> m — viņš cenšas tevi nosist
            {hud.braking && (
              <span className="bomzischase-braking-tag"> · stāvi</span>
            )}
          </span>
          {gameOver && (
            <span className="bomzischase-gameover">
              {gameOver.laser ? (
                <>
                  Lāzers tevi trāpīja — jāsāk no sākuma. Punkti: {gameOver.score}.{' '}
                </>
              ) : (
                <>
                  Bomzis tevi nosita — esi miris, jāsāk no jauna. Punkti:{' '}
                  {gameOver.score}.{' '}
                </>
              )}
              <button
                type="button"
                className="bomzischase-reload"
                onClick={() => window.location.reload()}
              >
                Spēlēt vēlreiz
              </button>
            </span>
          )}
        </div>
      </div>

      <section className="bomzischase-help">
        <p>
          {touchUi ? (
            <>
              «<span className="bomzischase-help-strong">Stāvēt</span>» turēt — apstāties,
              «<span className="bomzischase-help-strong">Lēkt</span>» — leciens. Zemie
              klucīši — trieciens; <span className="bomzischase-help-strong">lāzers</span>{' '}
              vai <span className="bomzischase-help-strong">bomzis tevi nosist</span> —
              no jauna. Bomža uzdevums ir nogalināt tevi — viņš redzams kadrā.
            </>
          ) : (
            <>
              <kbd>Space</kbd> / <kbd>↑</kbd> — lēkt · <kbd>S</kbd> / <kbd>↓</kbd> turēt —
              apstāties (bomzis tuvojas, lai tevi nosistu). Zemie klucīši — trieciens;{' '}
              <span className="bomzischase-help-strong">lāzers</span> vai{' '}
              <span className="bomzischase-help-strong">bomzis tevi nosist</span> —
              spēle no jauna. Bomža uzdevums ir nogalināt tevi.
            </>
          )}
        </p>
      </section>
    </div>
  );
}
