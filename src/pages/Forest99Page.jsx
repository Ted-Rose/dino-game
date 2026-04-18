import { useCallback, useEffect, useRef, useState } from 'react';
import Forest99Game from '../components/Forest99Game';
import Forest99TouchControls from '../components/Forest99TouchControls';

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

const defaultHud = {
  isDay: true,
  survivedNights: 0,
  nightGoal: 99,
  phaseLeft: 32,
  phaseLen: 32,
  hp: 100,
  hunger: 92,
  stamina: 100,
  sanity: 100,
  wood: 2,
  stone: 1,
  berries: 2,
  coins: 5,
  fireFuel: 84,
  spearOwned: false,
  shelterLevel: 0,
  torchUnlocked: false,
  canFeedFire: false,
  canCraftSpear: false,
  canEat: true,
  canShelter: false,
  nearMerchant: false,
  storyLine: '',
  bagOpen: false,
  hasAxe: true,
  bagHint: '',
};

export default function Forest99Page() {
  const [session, setSession] = useState(0);
  const [end, setEnd] = useState(null);
  const [hud, setHud] = useState(defaultHud);
  const [touchUi, setTouchUi] = useState(false);

  const touchInputRef = useRef({
    enabled: false,
    joystick: { x: 0, y: 0 },
    look: { dx: 0, dy: 0 },
    keys: {},
  });

  useEffect(() => {
    touchInputRef.current.enabled = touchUi;
  }, [touchUi]);

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

  const handleHud = useCallback((next) => setHud(next), []);

  const handleEnd = useCallback((won) => setEnd(won ? 'win' : 'lose'), []);

  const restart = () => {
    setEnd(null);
    setSession((k) => k + 1);
  };

  const phaseLabel = hud.isDay ? 'Diena' : 'Nakts';

  return (
    <div className={`app page-forest99${touchUi ? ' page-forest99--touch' : ''}`}>
      <Forest99Game key={session} touchInputRef={touchInputRef} onHudUpdate={handleHud} onGameEnd={handleEnd} />

      {touchUi && <Forest99TouchControls touchInputRef={touchInputRef} nearMerchant={hud.nearMerchant} />}

      {hud.storyLine && (
        <div className="forest99-story" role="status">
          {hud.storyLine}
        </div>
      )}

      {hud.bagOpen && (
        <div className="forest99-bag" role="dialog" aria-modal="true" aria-labelledby="forest99-bag-title">
          <div className="forest99-bag__panel">
            <h2 id="forest99-bag-title" className="forest99-bag__title">
              Soma
            </h2>
            <p className="forest99-bag__axe">
              {hud.hasAxe ? (
                <>
                  <span className="forest99-bag__axe-icon" aria-hidden>
                    🪓
                  </span>{' '}
                  Cirvis — kokus cirp ar <kbd>E</kbd>
                </>
              ) : (
                'Nav cirvja — kokus nevar nocirst.'
              )}
            </p>
            <ul className="forest99-bag__list">
              <li>
                Malka <strong>{hud.wood}</strong>
              </li>
              <li>
                Akmens <strong>{hud.stone}</strong>
              </li>
              <li>
                Ogas <strong>{hud.berries}</strong>
              </li>
              <li>
                Monētas <strong>{hud.coins}</strong>
              </li>
              {hud.spearOwned && (
                <li>
                  Šķēps <strong>ir</strong>
                </li>
              )}
              {hud.shelterLevel > 0 && (
                <li>
                  Pajumte <strong>{hud.shelterLevel}</strong>. līmenis
                </li>
              )}
            </ul>
            {hud.bagHint ? <p className="forest99-bag__ground">{hud.bagHint}</p> : null}
            <p className="forest99-bag__footer">
              Apkārt ir lādes — tuvumā spied <kbd>E</kbd>, lai tās atvērtu.
            </p>
            <p className="forest99-bag__close-hint">Tab vai Sm — aizvērt somu</p>
          </div>
        </div>
      )}

      <div className="forest99-hud" aria-live="polite">
        <div className="forest99-hud__block">
          <span className="forest99-hud__label">{phaseLabel}</span>
          <span className="forest99-hud__value">{formatTime(hud.phaseLeft)}</span>
        </div>
        <div className="forest99-hud__block">
          <span className="forest99-hud__label">Naktis</span>
          <span className="forest99-hud__value">
            {hud.survivedNights} / {hud.nightGoal}
          </span>
          {hud.torchUnlocked && <span className="forest99-hud__sub">Lāpa aktivizēta</span>}
        </div>
        <div className="forest99-hud__block">
          <span className="forest99-hud__label">Monētas</span>
          <span className="forest99-hud__value">{hud.coins}</span>
        </div>

        <div className="forest99-hud__statgrid">
          <div className="forest99-hud__block forest99-hud__block--wide">
            <span className="forest99-hud__label">HP</span>
            <div className="forest99-hud__bar forest99-hud__bar--hp">
              <div className="forest99-hud__bar-fill forest99-hud__bar-fill--hp" style={{ width: `${hud.hp}%` }} />
            </div>
          </div>
          <div className="forest99-hud__block forest99-hud__block--wide">
            <span className="forest99-hud__label">Izsalkums</span>
            <div className="forest99-hud__bar forest99-hud__bar--hunger">
              <div className="forest99-hud__bar-fill forest99-hud__bar-fill--hunger" style={{ width: `${hud.hunger}%` }} />
            </div>
          </div>
          <div className="forest99-hud__block forest99-hud__block--wide">
            <span className="forest99-hud__label">Izturība</span>
            <div className="forest99-hud__bar forest99-hud__bar--sta">
              <div className="forest99-hud__bar-fill forest99-hud__bar-fill--sta" style={{ width: `${hud.stamina}%` }} />
            </div>
          </div>
          <div className="forest99-hud__block forest99-hud__block--wide">
            <span className="forest99-hud__label">Sapratne {!hud.isDay && '(nakts)'}</span>
            <div className="forest99-hud__bar forest99-hud__bar--san">
              <div className="forest99-hud__bar-fill forest99-hud__bar-fill--san" style={{ width: `${hud.sanity}%` }} />
            </div>
          </div>
        </div>

        <div className="forest99-hud__inv">
          <span className="forest99-hud__label">Inventārs</span>
          <span className="forest99-hud__inv-row">
            Malka {hud.wood} · Akmens {hud.stone} · Ogas {hud.berries}
            {hud.spearOwned && <span className="forest99-hud__spear"> · šķēps ✓</span>}
            {hud.shelterLevel > 0 && <span> · pajumte {hud.shelterLevel}</span>}
          </span>
        </div>

        <div className="forest99-hud__block forest99-hud__block--wide">
          <span className="forest99-hud__label">Ugunskura spēks</span>
          <div className="forest99-hud__bar forest99-hud__bar--fire">
            <div className="forest99-hud__bar-fill forest99-hud__bar-fill--fire" style={{ width: `${Math.min(100, hud.fireFuel)}%` }} />
          </div>
        </div>

        <div className="forest99-hud__hints">
          {hud.canFeedFire && <p className="forest99-hud__hint forest99-hud__hint--action">F — malka ugunī</p>}
          {hud.canCraftSpear && <p className="forest99-hud__hint forest99-hud__hint--action">Q — izgatavot šķēpu (5 malka, 2 akmens)</p>}
          {hud.canEat && <p className="forest99-hud__hint forest99-hud__hint--action">R — apēst ogas</p>}
          {hud.canShelter && <p className="forest99-hud__hint forest99-hud__hint--action">H — pajumte (+1, −10 malka)</p>}
          {hud.nearMerchant && (
            <p className="forest99-hud__hint forest99-hud__hint--action">
              Tirgotājs: 1 — ogas (6 monētas) · 2 — malka (10 monētas)
            </p>
          )}
        </div>
      </div>

      <p className="forest99-help">
        {touchUi
          ? 'Spieķis — kustība · velc labajā pusē — skats · Tab/Sm — soma · E — cirpt/lasīt · kokiem kritīs malka · lādes apkārt'
          : 'WASD vai bultiņas · Shift skriet · Tab — soma · E — cirvis kokiem / lasīt zemē un lādēs · Space uzbrukt · F/Q/R/H · Ēnas naktī'}
      </p>

      {end === 'win' && (
        <div className="forest99-modal" role="dialog" aria-labelledby="forest99-win-title">
          <div className="forest99-modal__card">
            <h2 id="forest99-win-title">Tu izdzīvoji visas 99 naktis.</h2>
            <p>Mežs tevi vairs nepieskaras.</p>
            <button type="button" className="forest99-modal__btn" onClick={restart}>
              Spēlēt vēlreiz
            </button>
          </div>
        </div>
      )}

      {end === 'lose' && (
        <div className="forest99-modal" role="dialog" aria-labelledby="forest99-lose-title">
          <div className="forest99-modal__card forest99-modal__card--lose">
            <h2 id="forest99-lose-title">Gājiens beidzies.</h2>
            <p>Uzturies pie ugunskura, ēd ogas, improvizē pajumti un cīnies ar radībām.</p>
            <button type="button" className="forest99-modal__btn" onClick={restart}>
              No jauna
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
