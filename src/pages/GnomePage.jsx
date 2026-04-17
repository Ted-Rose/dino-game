import { useState } from 'react';
import GnomeGame from '../components/GnomeGame';

const COINS_KEY = 'gnome-game-coins';

function loadCoins() {
  try {
    const n = parseInt(localStorage.getItem(COINS_KEY) ?? '0', 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch { return 0; }
}

export default function GnomePage() {
  const [coins, setCoins] = useState(loadCoins);

  const handleCoinsChange = (amount) => {
    setCoins((c) => {
      const next = c + amount;
      try { localStorage.setItem(COINS_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <div className="app page-gnome">
      <div className="gnome-page__topbar">
        <h1>Rūķīša ceļojums</h1>
        <span className="gnome-page__wallet" title="Naudiņas">
          <span aria-hidden="true">◉</span> {coins}
        </span>
      </div>
      <GnomeGame coins={coins} onCoinsChange={handleCoinsChange} />
    </div>
  );
}
