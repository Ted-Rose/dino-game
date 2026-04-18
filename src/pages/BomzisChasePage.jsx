import { useCallback, useEffect, useState } from 'react';
import BomzisChaseGame, {
  BOMZISCHASE_JUMP_EVENT,
} from '../components/BomzisChaseGame';

export default function BomzisChasePage() {
  const [hud, setHud] = useState({ score: 0, gap: 11 });
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

  return (
    <div
      className={`app page-bomzischase${touchUi ? ' page-bomzischase--touch' : ''}`}
    >
      <div className="bomzischase-title-bar">
        <h1>Bomža medības</h1>
        <p className="bomzischase-tag">
          Tu redzi savu klucīšu avatāru un no sāna palīdzīgi arī bomzi ar garu nūju,
          kas dzenas pakaļ — šķēršļi un pulsējoši sarkanie lāzeri priekšā
        </p>
      </div>

      <div className="bomzischase-stage">
        <div className="bomzischase-playfield">
          <BomzisChaseGame onHud={onHud} onGameOver={onGameOver} />
          {touchUi && (
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
          )}
        </div>
        <div className="bomzischase-hud">
          <span>
            Punkti: <strong>{hud.score}</strong>
          </span>
          <span>
            Attālums līdz bomzim: ~<strong>{hud.gap}</strong> m
          </span>
          {gameOver && (
            <span className="bomzischase-gameover">
              Bomzis noķēra! Punkti: {gameOver.score}.{' '}
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
              Pieskaršanās pa spēles lauku vai poga{' '}
              <span className="bomzischase-help-strong">«Lēkt»</span> apakšā —
              leciet; zemie klucīši un augstāki lāzeri — augstāk pie lāzeriem. Bomzis
              ar nūju dzenas pa pēdām.
            </>
          ) : (
            <>
              <kbd>Space</kbd> vai <kbd>↑</kbd> — lēkt · skārienekrānā pieskaries
              laukumam. Zemie klucīši un augstāki lāzeru starojumi — lēciens jāsaņem
              augstāk pie lāzeriem. Bomzis ar nūju dzenas pa pēdām — trieciens viņu
              pietuvina.
            </>
          )}
        </p>
      </section>
    </div>
  );
}
