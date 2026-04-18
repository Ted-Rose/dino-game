import { useCallback, useState } from 'react';
import Forest99Game from '../components/Forest99Game';

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export default function Forest99Page() {
  const [session, setSession] = useState(0);
  const [end, setEnd] = useState(null);
  const [hud, setHud] = useState({
    isDay: true,
    survivedNights: 0,
    nightGoal: 99,
    phaseLeft: 32,
    phaseLen: 32,
    wood: 0,
    fireFuel: 72,
    canChop: true,
    canFeedFire: false,
  });

  const handleHud = useCallback((next) => setHud(next), []);
  const handleEnd = useCallback(() => setEnd('win'), []);

  const restart = () => {
    setEnd(null);
    setSession((k) => k + 1);
  };

  const phaseLabel = hud.isDay ? 'Diena' : 'Nakts';
  const phaseHint = hud.isDay ? ' līdz vakaram' : ' līdz ausmai';

  return (
    <div className="app page-forest99">
      <Forest99Game key={session} onHudUpdate={handleHud} onGameEnd={handleEnd} />

      <div className="forest99-hud" aria-live="polite">
        <div className="forest99-hud__block">
          <span className="forest99-hud__label">{phaseLabel}</span>
          <span className="forest99-hud__value">{formatTime(hud.phaseLeft)}</span>
          <span className="forest99-hud__sub">{phaseHint}</span>
        </div>
        <div className="forest99-hud__block">
          <span className="forest99-hud__label">Pārvarētas naktis</span>
          <span className="forest99-hud__value">
            {hud.survivedNights} / {hud.nightGoal}
          </span>
        </div>
        <div className="forest99-hud__block">
          <span className="forest99-hud__label">Malka</span>
          <span className="forest99-hud__value">{hud.wood}</span>
        </div>
        <div className="forest99-hud__block forest99-hud__block--wide">
          <span className="forest99-hud__label">Ugunskurs</span>
          <div className="forest99-hud__bar forest99-hud__bar--fire" role="meter" aria-valuenow={hud.fireFuel} aria-valuemin={0} aria-valuemax={100}>
            <div className="forest99-hud__bar-fill forest99-hud__bar-fill--fire" style={{ width: `${hud.fireFuel}%` }} />
          </div>
        </div>
        {hud.canFeedFire && (
          <p className="forest99-hud__hint forest99-hud__hint--action">
            F — iemest malku ugunī
          </p>
        )}
      </div>

      <p className="forest99-help">
        WASD — kustība · Shift — skriet · E — cirst koku · F — malku ugunskurā · Peles skats · Esc — atbrīvot peli · Meža zvēri medī, bet neapdraud
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
    </div>
  );
}
