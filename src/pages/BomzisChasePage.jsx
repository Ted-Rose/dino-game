import { useCallback, useState } from 'react';
import BomzisChaseGame from '../components/BomzisChaseGame';

export default function BomzisChasePage() {
  const [hud, setHud] = useState({ score: 0, gap: 11 });
  const [gameOver, setGameOver] = useState(null);

  const onHud = useCallback((h) => setHud(h), []);
  const onGameOver = useCallback((payload) => {
    setGameOver(payload);
  }, []);

  return (
    <div className="app page-bomzischase">
      <div className="bomzischase-title-bar">
        <h1>Bomža medības</h1>
        <p className="bomzischase-tag">
          3D bezgalīgs skrējiens — šķēršļi nebeidzas, bomzis ar koku dzenas pakaļ
        </p>
      </div>

      <div className="bomzischase-stage">
        <BomzisChaseGame onHud={onHud} onGameOver={onGameOver} />
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
          <kbd>A</kbd> / <kbd>D</kbd> vai <kbd>←</kbd> <kbd>→</kbd> — josla ·{' '}
          <kbd>Space</kbd> — lēkt pār zemiem klucīšiem · augstās sienas — jāapbrauc
          citā joslā. Pret triecienu bomzis pietuvojas — neļauj viņam klāt!
        </p>
      </section>
    </div>
  );
}
