import { useState } from 'react';
import GnomeGame, { AvatarSvg, IceAvatarSvg } from '../components/GnomeGame';

const COINS_KEY      = 'gnome-game-coins';
const OWNED_KEY      = 'gnome-owned-chars';
const SELECTED_KEY   = 'gnome-selected-char';
const ICE_OWNED_KEY  = 'gnome-ice-owned-chars';
const ICE_SEL_KEY    = 'gnome-ice-selected-char';

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
];

export const ICE_CHARACTERS = [
  { id: 'ziemelis',   label: 'Polārnieks',    price: 0,     desc: 'Draudzīgais ledus ceļotājs' },
  { id: 'pingvins',   label: 'Pingvīns',      price: 3500,  desc: 'Formāli ģērbtais ledus gājējs' },
  { id: 'polarlapsa', label: 'Polārlapsa',    price: 4500,  desc: 'Baltā ledus viltniece' },
  { id: 'ronis',      label: 'Ronis',         price: 6000,  desc: 'Plunkšķīgais ūdens spēlētājs' },
  { id: 'narvals',    label: 'Narvals',       price: 7500,  desc: 'Ragainais ledus jūrnieks' },
  { id: 'polarlacis', label: 'Polārlācis',    price: 10000, desc: 'Ledus pasaules lielais karalis' },
];

function loadCoins() {
  try {
    const n = parseInt(localStorage.getItem(COINS_KEY) ?? '0', 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch { return 0; }
}
function loadOwned(key, defaultId) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [defaultId];
    const parsed = JSON.parse(raw);
    if (!parsed.includes(defaultId)) parsed.unshift(defaultId);
    return parsed;
  } catch { return [defaultId]; }
}
function loadSelected(key, defaultId) {
  try { return localStorage.getItem(key) ?? defaultId; }
  catch { return defaultId; }
}

export default function GnomePage() {
  const [coins, setCoins]           = useState(loadCoins);
  const [world, setWorld]           = useState('forest');
  const [shopOpen, setShopOpen]     = useState(false);

  const [owned, setOwned]           = useState(() => loadOwned(OWNED_KEY, 'rukitis'));
  const [selected, setSelected]     = useState(() => loadSelected(SELECTED_KEY, 'rukitis'));

  const [iceOwned, setIceOwned]     = useState(() => loadOwned(ICE_OWNED_KEY, 'ziemelis'));
  const [iceSelected, setIceSelected] = useState(() => loadSelected(ICE_SEL_KEY, 'ziemelis'));

  const isIce = world === 'ice';
  const activeChars    = isIce ? ICE_CHARACTERS : CHARACTERS;
  const activeOwned    = isIce ? iceOwned    : owned;
  const activeSelected = isIce ? iceSelected : selected;
  const activeOwnedKey  = isIce ? ICE_OWNED_KEY : OWNED_KEY;
  const activeSelKey    = isIce ? ICE_SEL_KEY    : SELECTED_KEY;
  const ActiveAvatarSvg = isIce ? IceAvatarSvg : AvatarSvg;

  const setActiveOwned    = isIce ? setIceOwned    : setOwned;
  const setActiveSelected = isIce ? setIceSelected : setSelected;

  const handleCoinsChange = (amount) => {
    setCoins((c) => {
      const next = c + amount;
      try { localStorage.setItem(COINS_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleBuy = (charId) => {
    const char = activeChars.find((c) => c.id === charId);
    if (!char || activeOwned.includes(charId) || coins < char.price) return;
    handleCoinsChange(-char.price);
    setActiveOwned((prev) => {
      const next = [...prev, charId];
      try { localStorage.setItem(activeOwnedKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setActiveSelected(charId);
    try { localStorage.setItem(activeSelKey, charId); } catch { /* ignore */ }
  };

  const handleSelect = (charId) => {
    if (!activeOwned.includes(charId)) return;
    setActiveSelected(charId);
    try { localStorage.setItem(activeSelKey, charId); } catch { /* ignore */ }
  };

  const handleTeleport = () => {
    setWorld('ice');
    setShopOpen(false);
  };

  const handleReturnToForest = () => {
    setWorld('forest');
    setShopOpen(false);
  };

  const shopTitle = isIce ? '❄️ Ledus radību veikals' : '🌲 Meža radību veikals';

  return (
    <div className={`app page-gnome${isIce ? ' page-gnome--ice' : ''}`}>
      <div className={`gnome-page__topbar${isIce ? ' gnome-page__topbar--ice' : ''}`}>
        <h1>{isIce ? '❄️ Ledus pasaule' : 'Rūķīša ceļojums'}</h1>
        <div className="gnome-page__topbar-right">
          {isIce && (
            <button
              type="button"
              className="gnome-page__return-btn"
              onClick={handleReturnToForest}
            >
              🌲 Meža pasaule
            </button>
          )}
          <span className="gnome-page__wallet" title="Naudiņas">
            <span aria-hidden="true">◉</span> {coins}
          </span>
          <button
            type="button"
            className={`gnome-page__shop-btn${shopOpen ? ' gnome-page__shop-btn--open' : ''}${isIce ? ' gnome-page__shop-btn--ice' : ''}`}
            onClick={() => setShopOpen((v) => !v)}
            aria-expanded={shopOpen}
          >
            {isIce ? '🐟 Veikals' : '🧺 Veikals'}
          </button>
        </div>
      </div>

      {shopOpen && (
        <div className={`gnome-shop${isIce ? ' gnome-shop--ice' : ''}`}>
          <div className="gnome-shop__header">
            <h2 className="gnome-shop__title">{shopTitle}</h2>
            <p className="gnome-shop__subtitle">Nopērc jaunu tēlu un izmanto to spēlē!</p>
          </div>
          <div className="gnome-shop__grid">
            {activeChars.map((char) => {
              const isOwned    = activeOwned.includes(char.id);
              const isSelectedChar = activeSelected === char.id;
              const canAfford  = coins >= char.price;
              return (
                <div
                  key={char.id}
                  className={[
                    'gnome-shop__card',
                    isSelectedChar ? 'gnome-shop__card--selected' : '',
                    isOwned       ? 'gnome-shop__card--owned'    : '',
                  ].join(' ').trim()}
                >
                  <div className="gnome-shop__avatar">
                    <ActiveAvatarSvg characterId={char.id} />
                  </div>
                  <div className="gnome-shop__name">{char.label}</div>
                  <div className="gnome-shop__desc">{char.desc}</div>
                  {isOwned ? (
                    <button
                      type="button"
                      className={`gnome-shop__action${isSelectedChar ? ' gnome-shop__action--active' : ''}`}
                      onClick={() => handleSelect(char.id)}
                      disabled={isSelectedChar}
                    >
                      {isSelectedChar ? '✓ Izvēlēts' : 'Izvēlēties'}
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

      <GnomeGame
        key={world}
        onCoinsChange={handleCoinsChange}
        characterId={activeSelected}
        world={world}
        onTeleport={handleTeleport}
      />
    </div>
  );
}
