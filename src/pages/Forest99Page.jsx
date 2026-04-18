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
    night: 1,
    nightGoal: 99,
    nightLeft: 22,
    hp: 100,
    nearFire: false,
    cold: false,
  });

  const handleHud = useCallback((next) => setHud(next), []);
  const handleEnd = useCallback((won) => setEnd(won ? 'win' : 'lose'), []);

  const restart = () => {
    setEnd(null);
    setSession((k) => k + 1);
  };

  return (
    <div className="app page-forest99">
      <Forest99Game key={session} onHudUpdate={handleHud} onGameEnd={handleEnd} />

      <div className="forest99-hud" aria-live="polite">
        <div className="forest99-hud__block">
          <span className="forest99-hud__label">Nakts</span>
          <span className="forest99-hud__value">
            {hud.night} / {hud.nightGoal}
          </span>
        </div>
        <div className="forest99-hud__block">
          <span className="forest99-hud__label">Līdz ausmai</span>
          <span className="forest99-hud__value">{formatTime(hud.nightLeft)}</span>
        </div>
        <div className="forest99-hud__block forest99-hud__block--wide">
          <span className="forest99-hud__label">Veselība</span>
          <div className="forest99-hud__bar" role="meter" aria-valuenow={hud.hp} aria-valuemin={0} aria-valuemax={100}>
            <div className="forest99-hud__bar-fill" style={{ width: `${hud.hp}%` }} />
          </div>
        </div>
        {(hud.cold || hud.nearFire) && (
          <p className="forest99-hud__hint">
            {hud.nearFire ? 'Ugunskura siltums…' : 'Tālu no ugunskura — zemā temperatūra!'}
          </p>
        )}
      </div>

      <p className="forest99-help">
        WASD — kustība · Shift — skriet · Peles skats · Ķer peles bloķējumu uz spēles · Esc — atbrīvot peli
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
            <h2 id="forest99-lose-title">Nakts uzvarēja.</h2>
            <p>Mēģini palikt tuvāk ugunskuram un izvairīties no ēnām.</p>
            <button type="button" className="forest99-modal__btn" onClick={restart}>
              Mēģināt atkārtoti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
