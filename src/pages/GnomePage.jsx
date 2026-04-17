import { useEffect, useRef, useState } from 'react';
import GnomeGame, { AvatarSvg, IceAvatarSvg, LavaAvatarSvg } from '../components/GnomeGame';
import DragonFight from '../components/DragonFight';

const COINS_KEY      = 'gnome-game-coins';
const OWNED_KEY      = 'gnome-owned-chars';
const SELECTED_KEY   = 'gnome-selected-char';
const ICE_OWNED_KEY  = 'gnome-ice-owned-chars';
const ICE_SEL_KEY    = 'gnome-ice-selected-char';
const LAVA_OWNED_KEY = 'gnome-lava-owned-chars';
const LAVA_SEL_KEY   = 'gnome-lava-selected-char';

export const CHARACTERS = [
  { id: 'rukitis', label: 'Rūķītis',  price: 0,    desc: 'Mazais meža gājējs' },
  { id: 'zakis',   label: 'Zaķis',    price: 50,   desc: 'Garajausais lēcējs' },
  { id: 'ezis',    label: 'Ezis',     price: 100,  desc: 'Dzeloņainais draugs' },
  { id: 'lapsa',   label: 'Lapsa',    price: 300,  desc: 'Viltīgā meža blēdīte' },
  { id: 'vavere',  label: 'Vāvere',   price: 500,  desc: 'Žiglā riekstu ražotāja' },
  { id: 'apsis',   label: 'Āpsis',    price: 750,  desc: 'Melnbaltais mežsargs' },
  { id: 'puce',    label: 'Pūce',     price: 1000, desc: 'Gudrā nakts gana' },
  { id: 'lacis',   label: 'Lācis',    price: 1500, desc: 'Meža lielais saimnieks' },
  { id: 'lusis',   label: 'Lūsis',    price: 2000, desc: 'Karaliskais plankumainais' },
  { id: 'alnis',   label: 'Alnis',    price: 3000, desc: 'Ragainais meža milzis' },
];

export const ICE_CHARACTERS = [
  { id: 'ziemelis',   label: 'Polārnieks',  price: 0,     desc: 'Draudzīgais ledus ceļotājs' },
  { id: 'pingvins',   label: 'Pingvīns',    price: 3500,  desc: 'Formāli ģērbtais ledus gājējs' },
  { id: 'polarlapsa', label: 'Polārlapsa',  price: 4500,  desc: 'Baltā ledus viltniece' },
  { id: 'ronis',      label: 'Ronis',       price: 6000,  desc: 'Plunkšķīgais ūdens spēlētājs' },
  { id: 'narvals',    label: 'Narvals',     price: 7500,  desc: 'Ragainais ledus jūrnieks' },
  { id: 'polarlacis', label: 'Polārlācis',  price: 10000, desc: 'Ledus pasaules lielais karalis' },
];

export const LAVA_CHARACTERS = [
  { id: 'lavas-piedzivotajs', label: 'Lavas Piedzīvotājs', price: 0,     desc: 'Ugunīgais lavas ceļotājs' },
  { id: 'lavas-kirzaka',      label: 'Lavas Ķirzaka',      price: 10500, desc: 'Zvīņainais lavas rāpulis' },
  { id: 'lavas-kakis',        label: 'Lavas Kaķis',        price: 15000, desc: 'Kvēlainais nakts plēsoņa' },
  { id: 'lavas-lapsa',        label: 'Lavas Lapsa',        price: 22000, desc: 'Viltīgā uguns viltniece' },
  { id: 'lavas-erglis',       label: 'Lavas Ērglis',       price: 35000, desc: 'Uguns sparno debesu valdnieks' },
  { id: 'lavas-lauva',        label: 'Lavas Lauva',        price: 50000, desc: 'Lavas pasaules lielais karalis' },
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

/* ----- Moving "Nē" button for the ReadyToFight screen ----- */
function ReadyToFightScreen({ onYes }) {
  const [noPos, setNoPos] = useState({ left: 200, top: 10 });

  useEffect(() => {
    const t = setInterval(() => {
      setNoPos({
        left: Math.floor(Math.random() * 260),
        top:  Math.floor(Math.random() * 60),
      });
    }, 350);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="ready-fight">
      <div className="ready-fight__stone">
        <p className="ready-fight__text">Vai esi gatavs cīņai?</p>
        <div className="ready-fight__btns">
          <button type="button" className="ready-fight__yes" onClick={onYes}>
            Jā
          </button>
          <button
            type="button"
            className="ready-fight__no"
            style={{ position: 'absolute', left: noPos.left, top: noPos.top }}
            tabIndex={-1}
          >
            Nē
          </button>
        </div>
      </div>
    </div>
  );
}

function FightIntroScreen() {
  return (
    <div className="fight-intro">
      <p className="fight-intro__text">Tad tā sākas!</p>
    </div>
  );
}

function VictoryScreen({ onClose }) {
  return (
    <div className="victory-screen">
      <div className="victory-screen__inner">
        <p className="victory-screen__emoji">🏆</p>
        <p className="victory-screen__title">Apsveicam!</p>
        <p className="victory-screen__sub">Tu uzvarēji pūķi un iekaroji visas trīs pasaules!</p>
        <button type="button" className="victory-screen__btn" onClick={onClose}>
          Turpināt spēlēt
        </button>
      </div>
    </div>
  );
}

export default function GnomePage() {
  const [coins, setCoins]       = useState(loadCoins);
  const [world, setWorld]       = useState('forest');
  /* phase: 'game' | 'ready-fight' | 'fight-intro' | 'dragon-fight' | 'victory' */
  const [phase, setPhase]       = useState('game');
  const [shopOpen, setShopOpen] = useState(false);

  /* Forest */
  const [owned,    setOwned]    = useState(() => loadOwned(OWNED_KEY,      'rukitis'));
  const [selected, setSelected] = useState(() => loadSelected(SELECTED_KEY, 'rukitis'));

  /* Ice */
  const [iceOwned,    setIceOwned]    = useState(() => loadOwned(ICE_OWNED_KEY,   'ziemelis'));
  const [iceSelected, setIceSelected] = useState(() => loadSelected(ICE_SEL_KEY,  'ziemelis'));

  /* Lava */
  const [lavaOwned,    setLavaOwned]    = useState(() => loadOwned(LAVA_OWNED_KEY,   'lavas-piedzivotajs'));
  const [lavaSelected, setLavaSelected] = useState(() => loadSelected(LAVA_SEL_KEY,  'lavas-piedzivotajs'));

  /* Derived per-world values */
  const worldConfig = {
    forest: {
      chars: CHARACTERS, owned: owned, selected: selected,
      setOwned: setOwned, setSelected: setSelected,
      ownedKey: OWNED_KEY, selKey: SELECTED_KEY, defaultId: 'rukitis',
      AvatarSvgComp: AvatarSvg,
    },
    ice: {
      chars: ICE_CHARACTERS, owned: iceOwned, selected: iceSelected,
      setOwned: setIceOwned, setSelected: setIceSelected,
      ownedKey: ICE_OWNED_KEY, selKey: ICE_SEL_KEY, defaultId: 'ziemelis',
      AvatarSvgComp: IceAvatarSvg,
    },
    lava: {
      chars: LAVA_CHARACTERS, owned: lavaOwned, selected: lavaSelected,
      setOwned: setLavaOwned, setSelected: setLavaSelected,
      ownedKey: LAVA_OWNED_KEY, selKey: LAVA_SEL_KEY, defaultId: 'lavas-piedzivotajs',
      AvatarSvgComp: LavaAvatarSvg,
    },
  };
  const wc = worldConfig[world];

  const handleCoinsChange = (amount) => {
    setCoins((c) => {
      const next = c + amount;
      try { localStorage.setItem(COINS_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleBuy = (charId) => {
    const char = wc.chars.find((c) => c.id === charId);
    if (!char || wc.owned.includes(charId) || coins < char.price) return;
    handleCoinsChange(-char.price);
    wc.setOwned((prev) => {
      const next = [...prev, charId];
      try { localStorage.setItem(wc.ownedKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    wc.setSelected(charId);
    try { localStorage.setItem(wc.selKey, charId); } catch { /* ignore */ }
  };

  const handleSelect = (charId) => {
    if (!wc.owned.includes(charId)) return;
    wc.setSelected(charId);
    try { localStorage.setItem(wc.selKey, charId); } catch { /* ignore */ }
  };

  const handleTeleport = () => {
    setWorld((w) => w === 'forest' ? 'ice' : 'lava');
    setShopOpen(false);
  };

  /* Called when lava world's last level "Uz kauju ar pūķi!" is clicked */
  const handleWorldComplete = () => {
    setPhase('ready-fight');
    setShopOpen(false);
  };

  const handleReadyYes = () => {
    setPhase('fight-intro');
    setTimeout(() => setPhase('dragon-fight'), 2200);
  };

  const handleDragonWin = () => setPhase('victory');

  /* Victory → return to lava game */
  const handleVictoryClose = () => {
    setPhase('game');
  };

  /* World-specific display */
  const worldLabel = {
    forest: 'Rūķīša ceļojums',
    ice:    '❄️ Ledus pasaule',
    lava:   '🌋 Lavas pasaule',
  }[world];

  const shopIcon  = { forest: '🧺', ice: '🐟', lava: '💎' }[world];
  const shopTitle = { forest: '🌲 Meža radību veikals', ice: '❄️ Ledus radību veikals', lava: '🌋 Lavas radību veikals' }[world];

  /* ---- Special phases ---- */
  if (phase === 'ready-fight') return <ReadyToFightScreen onYes={handleReadyYes} />;
  if (phase === 'fight-intro') return <FightIntroScreen />;
  if (phase === 'dragon-fight') return (
    <DragonFight
      characterId={lavaSelected}
      world="lava"
      onWin={handleDragonWin}
    />
  );
  if (phase === 'victory') return <VictoryScreen onClose={handleVictoryClose} />;

  /* ---- Normal game phase ---- */
  return (
    <div className={`app page-gnome page-gnome--${world}`}>
      <div className={`gnome-page__topbar gnome-page__topbar--${world}`}>
        <h1>{worldLabel}</h1>
        <div className="gnome-page__topbar-right">
          {world !== 'forest' && (
            <button
              type="button"
              className="gnome-page__return-btn"
              onClick={() => { setWorld('forest'); setShopOpen(false); }}
            >
              🌲 Meža pasaule
            </button>
          )}
          <span className="gnome-page__wallet" title="Naudiņas">
            <span aria-hidden="true">◉</span> {coins}
          </span>
          <button
            type="button"
            className={`gnome-page__shop-btn gnome-page__shop-btn--${world}${shopOpen ? ' gnome-page__shop-btn--open' : ''}`}
            onClick={() => setShopOpen((v) => !v)}
            aria-expanded={shopOpen}
          >
            {shopIcon} Veikals
          </button>
        </div>
      </div>

      {shopOpen && (
        <div className={`gnome-shop gnome-shop--${world}`}>
          <div className="gnome-shop__header">
            <h2 className="gnome-shop__title">{shopTitle}</h2>
            <p className="gnome-shop__subtitle">Nopērc jaunu tēlu un izmanto to spēlē!</p>
          </div>
          <div className="gnome-shop__grid">
            {wc.chars.map((char) => {
              const isOwned       = wc.owned.includes(char.id);
              const isSelectedChar = wc.selected === char.id;
              const canAfford     = coins >= char.price;
              return (
                <div
                  key={char.id}
                  className={[
                    'gnome-shop__card',
                    isSelectedChar ? 'gnome-shop__card--selected' : '',
                    isOwned        ? 'gnome-shop__card--owned'    : '',
                  ].join(' ').trim()}
                >
                  <div className="gnome-shop__avatar">
                    <wc.AvatarSvgComp characterId={char.id} />
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
        characterId={wc.selected}
        world={world}
        onTeleport={handleTeleport}
        onWorldComplete={handleWorldComplete}
      />
    </div>
  );
}
