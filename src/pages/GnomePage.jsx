import { useState } from 'react';
import GnomeGame, { AvatarSvg } from '../components/GnomeGame';

const COINS_KEY    = 'gnome-game-coins';
const OWNED_KEY    = 'gnome-owned-chars';
const SELECTED_KEY = 'gnome-selected-char';

export const CHARACTERS = [
  { id: 'rukitis', label: 'Rūķītis',    price: 0,    desc: 'Mazais meža gājējs' },
  { id: 'zakis',   label: 'Zaķis',       price: 50,   desc: 'Garajausais lēcējs' },
  { id: 'ezis',    label: 'Ezis',        price: 100,  desc: 'Dzeloņainais draugs' },
  { id: 'lapsa',   label: 'Lapsa',       price: 300,  desc: 'Viltīgā meža blēdīte' },
  { id: 'vavere',  label: 'Vāvere',      price: 500,  desc: 'Žiglā riekstu ražotāja' },
  { id: 'apsis',   label: 'Āpsis',       price: 750,  desc: 'Melnbaltais mežsargs' },
  { id: 'puce',    label: 'Pūce',        price: 1000, desc: 'Gudrā nakts gana' },
  { id: 'lacis',   label: 'Lācis',       price: 1500, desc: 'Meža lielais saimnieks' },
  { id: 'lusis',   label: 'Lūsis',       price: 2000, desc: 'Karaliskais plankumainais' },
  { id: 'alnis',   label: 'Alnis',       price: 3000, desc: 'Ragainais meža milzis' },
  { id: 'lauma',   label: 'Meža Lauma',  price: 5000, desc: 'Noslēpumainā meža ragana' },
];

function loadCoins() {
  try {
    const n = parseInt(localStorage.getItem(COINS_KEY) ?? '0', 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch { return 0; }
}

function loadOwned() {
  try {
    const raw = localStorage.getItem(OWNED_KEY);
    if (!raw) return ['rukitis'];
    const parsed = JSON.parse(raw);
    if (!parsed.includes('rukitis')) parsed.unshift('rukitis');
    return parsed;
  } catch { return ['rukitis']; }
}

function loadSelected() {
  try { return localStorage.getItem(SELECTED_KEY) ?? 'rukitis'; }
  catch { return 'rukitis'; }
}

export default function GnomePage() {
  const [coins, setCoins]       = useState(loadCoins);
  const [owned, setOwned]       = useState(loadOwned);
  const [selected, setSelected] = useState(loadSelected);
  const [shopOpen, setShopOpen] = useState(false);

  const handleCoinsChange = (amount) => {
    setCoins((c) => {
      const next = c + amount;
      try { localStorage.setItem(COINS_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleBuy = (charId) => {
    const char = CHARACTERS.find((c) => c.id === charId);
    if (!char || owned.includes(charId) || coins < char.price) return;
    handleCoinsChange(-char.price);
    setOwned((prev) => {
      const next = [...prev, charId];
      try { localStorage.setItem(OWNED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setSelected(charId);
    try { localStorage.setItem(SELECTED_KEY, charId); } catch { /* ignore */ }
  };

  const handleSelect = (charId) => {
    if (!owned.includes(charId)) return;
    setSelected(charId);
    try { localStorage.setItem(SELECTED_KEY, charId); } catch { /* ignore */ }
  };

  return (
    <div className="app page-gnome">
      <div className="gnome-page__topbar">
        <h1>Rūķīša ceļojums</h1>
        <div className="gnome-page__topbar-right">
          <span className="gnome-page__wallet" title="Naudiņas">
            <span aria-hidden="true">◉</span> {coins}
          </span>
          <button
            type="button"
            className={`gnome-page__shop-btn${shopOpen ? ' gnome-page__shop-btn--open' : ''}`}
            onClick={() => setShopOpen((v) => !v)}
            aria-expanded={shopOpen}
          >
            🧺 Veikals
          </button>
        </div>
      </div>

      {shopOpen && (
        <div className="gnome-shop">
          <div className="gnome-shop__header">
            <h2 className="gnome-shop__title">Meža radību veikals</h2>
            <p className="gnome-shop__subtitle">Nopērc jaunu tēlu un izmanto to spēlē!</p>
          </div>
          <div className="gnome-shop__grid">
            {CHARACTERS.map((char) => {
              const isOwned    = owned.includes(char.id);
              const isSelected = selected === char.id;
              const canAfford  = coins >= char.price;
              return (
                <div
                  key={char.id}
                  className={[
                    'gnome-shop__card',
                    isSelected ? 'gnome-shop__card--selected' : '',
                    isOwned    ? 'gnome-shop__card--owned'    : '',
                  ].join(' ').trim()}
                >
                  <div className="gnome-shop__avatar">
                    <AvatarSvg characterId={char.id} />
                  </div>
                  <div className="gnome-shop__name">{char.label}</div>
                  <div className="gnome-shop__desc">{char.desc}</div>
                  {isOwned ? (
                    <button
                      type="button"
                      className={`gnome-shop__action${isSelected ? ' gnome-shop__action--active' : ''}`}
                      onClick={() => handleSelect(char.id)}
                      disabled={isSelected}
                    >
                      {isSelected ? '✓ Izvēlēts' : 'Izvēlēties'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`gnome-shop__action gnome-shop__action--buy${!canAfford ? ' gnome-shop__action--locked' : ''}`}
                      onClick={() => handleBuy(char.id)}
                      disabled={!canAfford}
                      title={!canAfford ? `Nepieciešami ${char.price} ◉` : undefined}
                    >
                      ◉ {char.price}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <GnomeGame onCoinsChange={handleCoinsChange} characterId={selected} />
    </div>
  );
}
