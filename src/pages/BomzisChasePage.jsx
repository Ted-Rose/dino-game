import { useCallback, useEffect, useState } from 'react';
import BomzisChaseGame, {
  BOMZISCHASE_BRAKE_EVENT,
  BOMZISCHASE_JUMP_EVENT,
} from '../components/BomzisChaseGame';
import {
  SKINS,
  getSkin,
  loadEquipped,
  loadOwned,
  loadWallet,
  saveEquipped,
  saveOwned,
  saveWallet,
} from '../data/bomzischaseSkins';

function hexCss(n) {
  return `#${n.toString(16).padStart(6, '0')}`;
}

export default function BomzisChasePage() {
  const [hud, setHud] = useState({ score: 0, gap: 11, braking: false });
  const [gameOver, setGameOver] = useState(null);
  const [touchUi, setTouchUi] = useState(false);
  const [wallet, setWallet] = useState(() =>
    typeof window !== 'undefined' ? loadWallet() : 0,
  );
  const [owned, setOwned] = useState(() =>
    typeof window !== 'undefined' ? loadOwned() : ['classic'],
  );
  const [equipped, setEquipped] = useState(() =>
    typeof window !== 'undefined' ? loadEquipped() : 'classic',
  );

  const onHud = useCallback((h) => setHud(h), []);
  const onGameOver = useCallback((payload) => {
    setGameOver(payload);
    const earned = Math.floor(payload.score ?? 0);
    if (earned > 0) {
      setWallet((w) => {
        const next = w + earned;
        saveWallet(next);
        return next;
      });
    }
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
        'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no',
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

  const buySkin = useCallback(
    (id) => {
      const s = getSkin(id);
      if (owned.includes(id) || wallet < s.price) return;
      const nextW = wallet - s.price;
      const nextO = [...new Set([...owned, id])];
      saveWallet(nextW);
      saveOwned(nextO);
      setWallet(nextW);
      setOwned(nextO);
    },
    [owned, wallet],
  );

  const equipSkin = useCallback((id) => {
    if (!owned.includes(id)) return;
    saveEquipped(id);
    setEquipped(id);
  }, [owned]);

  return (
    <div
      className={`app page-bomzischase${touchUi ? ' page-bomzischase--touch' : ''}`}
    >
      <div className="bomzischase-title-bar">
        <h1>Bomža medības</h1>
        <p className="bomzischase-tag">
          Bomžam ir viens uzdevums — <strong>tevi nosist</strong>. Skrējienā krāj{' '}
          <strong>naudiņas</strong>, pēc tam nopērc izskatu bodītē zemāk. Platāks skats rāda
          bomzi ar nūju; vari apstāties (<kbd>S</kbd> / <kbd>↓</kbd> vai «Stāvēt»).
        </p>
      </div>

      <section className="bomzischase-shop" aria-label="Izskats">
        <h2 className="bomzischase-shop__title">Izskats par naudiņām</h2>
        <p className="bomzischase-shop__hint">
          Maciņā: <strong>{wallet}</strong> naudiņas · uzvelc izskatu — spēle ar jaunu avatāru
          atsāksies
        </p>
        <ul className="bomzischase-shop__grid">
          {SKINS.map((s) => {
            const has = owned.includes(s.id);
            const on = equipped === s.id;
            return (
              <li
                key={s.id}
                className={`bomzischase-skin-card${on ? ' bomzischase-skin-card--equipped' : ''}`}
              >
                <div className="bomzischase-skin-card__preview" aria-hidden>
                  <span
                    className="bomzischase-skin-card__swatch"
                    style={{ background: hexCss(s.shirt) }}
                  />
                  <span
                    className="bomzischase-skin-card__swatch"
                    style={{ background: hexCss(s.pants) }}
                  />
                  <span
                    className="bomzischase-skin-card__swatch"
                    style={{ background: hexCss(s.skin) }}
                  />
                </div>
                <span className="bomzischase-skin-card__name">{s.name}</span>
                {has ? (
                  <button
                    type="button"
                    className="bomzischase-skin-card__btn bomzischase-skin-card__btn--equip"
                    disabled={on}
                    onClick={() => equipSkin(s.id)}
                  >
                    {on ? 'Izvēlēts' : 'Uzvilkt'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="bomzischase-skin-card__btn"
                    disabled={wallet < s.price}
                    onClick={() => buySkin(s.id)}
                  >
                    Pirkt ({s.price})
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="bomzischase-stage">
        <div className="bomzischase-playfield">
          <BomzisChaseGame
            skinId={equipped}
            onHud={onHud}
            onGameOver={onGameOver}
          />
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
            Šajā skrējienā: <strong>{hud.score}</strong> naudiņas
          </span>
          <span>
            Maciņā: <strong>{wallet}</strong> naudiņas
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
                  Lāzers tevi trāpīja — jāsāk no sākuma. Šajā skrējienā{' '}
                  <strong>{gameOver.score}</strong> naudiņas ieskaitītas maciņā (kopā{' '}
                  <strong>{wallet}</strong>).{' '}
                </>
              ) : (
                <>
                  Bomzis tevi sita ar nūju — spēle no jauna. Šajā skrējienā{' '}
                  <strong>{gameOver.score}</strong> naudiņas ieskaitītas maciņā (kopā{' '}
                  <strong>{wallet}</strong>).{' '}
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
              no jauna. Naudiņas krāj maciņā; bodē iegādājas izskatu.
            </>
          ) : (
            <>
              <kbd>Space</kbd> / <kbd>↑</kbd> — lēkt · <kbd>S</kbd> / <kbd>↓</kbd> turēt —
              apstāties (bomzis tuvojas, lai tevi nosistu). Zemie klucīši — trieciens;{' '}
              <span className="bomzischase-help-strong">lāzers</span> vai{' '}
              <span className="bomzischase-help-strong">bomzis tevi nosist</span> —
              spēle no jauna. Skrējiena punkti kļūst par naudiņām bodē.
            </>
          )}
        </p>
      </section>
    </div>
  );
}
