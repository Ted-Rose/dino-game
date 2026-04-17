import { useCallback, useEffect, useState } from 'react';
import './GnomeGame.css';

const CELL = 40;
const BASKET_VALUE = 15;

/**
 * Simboli: ' '=brīvs, '#'=siena, 'T'=koks, 'R'=rūķis sākums, 'H'=mājiņa
 * baskets[] — groziņu koordinātes (uz brīvām šūnām)
 */
const LEVELS = [
  {
    label: '1. līmenis',
    reward: 60,
    map: [
      '##############',
      '#R           #',
      '#            #',
      '#    ####    #',
      '#            #',
      '#            #',
      '#    ####    #',
      '#            #',
      '#          H #',
      '##############',
    ],
    baskets: [{ x: 6, y: 1 }, { x: 3, y: 5 }, { x: 10, y: 5 }],
  },
  {
    label: '2. līmenis',
    reward: 120,
    map: [
      '################',
      '#R             #',
      '#              #',
      '#   ########   #',
      '#   #      #   #',
      '#   #      #   #',
      '#   ########   #',
      '#              #',
      '#              #',
      '#              #',
      '#            H #',
      '################',
    ],
    baskets: [{ x: 8, y: 1 }, { x: 2, y: 5 }, { x: 12, y: 5 }, { x: 3, y: 9 }, { x: 11, y: 9 }],
  },
  {
    label: '3. līmenis',
    reward: 180,
    map: [
      '##################',
      '#R               #',
      '#                #',
      '#  ######  ###   #',
      '#                #',
      '#                #',
      '#   ###  ######  #',
      '#                #',
      '#                #',
      '#  ######  ###   #',
      '#                #',
      '#             H  #',
      '##################',
    ],
    baskets: [
      { x: 9, y: 1 }, { x: 2, y: 5 }, { x: 15, y: 5 },
      { x: 2, y: 8 }, { x: 14, y: 9 }, { x: 5, y: 11 },
    ],
  },
  {
    label: '4. līmenis',
    reward: 240,
    map: [
      '####################',
      '#R                 #',
      '#                  #',
      '#   ######         #',
      '#         ######   #',
      '#                  #',
      '#   ######         #',
      '#         ######   #',
      '#                  #',
      '#   ######         #',
      '#         ######   #',
      '#                  #',
      '#                H #',
      '####################',
    ],
    baskets: [
      { x: 12, y: 1 }, { x: 2, y: 5 }, { x: 17, y: 5 },
      { x: 2, y: 9 }, { x: 17, y: 9 }, { x: 15, y: 12 },
    ],
  },
  {
    label: '5. līmenis',
    reward: 300,
    map: [
      '####################',
      '#R                 #',
      '#                  #',
      '#  ######    ####  #',
      '#                  #',
      '#                  #',
      '#     ######       #',
      '#                  #',
      '#  ######    ####  #',
      '#                  #',
      '#                  #',
      '#     ######       #',
      '#                  #',
      '#  ######    ####  #',
      '#                  #',
      '#              H   #',
      '####################',
    ],
    baskets: [
      { x: 12, y: 1 }, { x: 2, y: 5 }, { x: 17, y: 5 },
      { x: 10, y: 7 }, { x: 2, y: 10 }, { x: 17, y: 10 },
      { x: 10, y: 13 }, { x: 2, y: 15 },
    ],
  },
];

function parseLevel(map) {
  let gnome = { x: 1, y: 1 };
  let house = { x: 1, y: 1 };
  const cols = Math.max(...map.map((r) => r.length));
  const rows = map.length;
  const grid = map.map((row, y) =>
    Array.from({ length: cols }, (_, x) => {
      const ch = row[x] ?? '#';
      if (ch === 'R') { gnome = { x, y }; return ' '; }
      if (ch === 'H') { house = { x, y }; return ' '; }
      return ch;
    }),
  );
  return { grid, gnome, house, cols, rows };
}

function isWalkable(grid, x, y) {
  const row = grid[y];
  if (!row) return false;
  const ch = row[x];
  return ch === ' ' || ch === 'T';
}

function basketKey(b) { return `${b.x},${b.y}`; }
function initBaskets(levelIdx) {
  return new Set(LEVELS[levelIdx].baskets.map(basketKey));
}

/* ---- Avatāru SVG komponenti ---- */

function GnomeSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 32 40" aria-label="Rūķītis">
      <polygon className="gc-gnome__hat" points="16,1 8,18 24,18" />
      <rect className="gc-gnome__hat-band" x="8" y="16" width="16" height="3" rx="1" />
      <ellipse className="gc-gnome__face" cx="16" cy="23" rx="6" ry="5" />
      <ellipse className="gc-gnome__beard" cx="16" cy="28" rx="7" ry="5" />
      <circle className="gc-gnome__eye" cx="13" cy="22" r="1.2" />
      <circle className="gc-gnome__eye" cx="19" cy="22" r="1.2" />
      <ellipse className="gc-gnome__nose" cx="16" cy="25" rx="2" ry="1.4" />
      <rect className="gc-gnome__body" x="10" y="31" width="12" height="8" rx="3" />
    </svg>
  );
}

function EzisSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 32 40" aria-label="Ezis">
      <polygon points="8,28 6,18 12,27" fill="#4e342e" />
      <polygon points="13,26 12,16 17,26" fill="#4e342e" />
      <polygon points="18,26 18,15 23,26" fill="#4e342e" />
      <polygon points="23,27 24,17 28,28" fill="#4e342e" />
      <ellipse cx="18" cy="32" rx="12" ry="7" fill="#6d4c41" />
      <ellipse cx="21" cy="33" rx="7" ry="5" fill="#d7ccc8" />
      <circle cx="27" cy="30" r="1.5" fill="#111" />
      <ellipse cx="30" cy="32" rx="2" ry="1.2" fill="#3e2723" />
    </svg>
  );
}

function VavereSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 32 40" aria-label="Vāvere">
      <path d="M7,38 Q2,22 9,14 Q20,8 19,22 Q16,32 20,38" fill="#a0522d" stroke="#6d3a0e" strokeWidth="1" />
      <ellipse cx="22" cy="30" rx="8" ry="9" fill="#c17f5a" />
      <ellipse cx="23" cy="18" rx="7" ry="6" fill="#c17f5a" />
      <ellipse cx="18" cy="13" rx="3" ry="4" fill="#c17f5a" />
      <ellipse cx="28" cy="13" rx="3" ry="4" fill="#c17f5a" />
      <ellipse cx="18" cy="13" rx="1.5" ry="2.5" fill="#d4a373" />
      <ellipse cx="28" cy="13" rx="1.5" ry="2.5" fill="#d4a373" />
      <circle cx="20" cy="17" r="2.5" fill="#111" />
      <circle cx="27" cy="17" r="2.5" fill="#111" />
      <circle cx="21" cy="16" r="0.7" fill="#fff" />
      <circle cx="28" cy="16" r="0.7" fill="#fff" />
      <ellipse cx="23" cy="21" rx="1.8" ry="1.2" fill="#7b3f20" />
    </svg>
  );
}

function PuceSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 32 40" aria-label="Pūce">
      <ellipse cx="16" cy="31" rx="11" ry="8" fill="#8d6e63" />
      <path d="M6,31 Q10,25 16,29 Q22,25 26,31" fill="#6d4c41" opacity="0.6" />
      <circle cx="16" cy="17" r="11" fill="#8d6e63" />
      <polygon points="9,9 7,3 13,10" fill="#6d4c41" />
      <polygon points="23,9 25,3 19,10" fill="#6d4c41" />
      <ellipse cx="16" cy="18" rx="9" ry="8" fill="#bcaaa4" />
      <circle cx="12" cy="16" r="4.5" fill="#fff9c4" />
      <circle cx="20" cy="16" r="4.5" fill="#fff9c4" />
      <circle cx="12" cy="16" r="3" fill="#f57f17" />
      <circle cx="20" cy="16" r="3" fill="#f57f17" />
      <circle cx="12" cy="16" r="1.5" fill="#111" />
      <circle cx="20" cy="16" r="1.5" fill="#111" />
      <polygon points="16,19 13,23 19,23" fill="#f9a825" />
    </svg>
  );
}

function LusisSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 32 40" aria-label="Lūsis">
      <ellipse cx="16" cy="33" rx="11" ry="7" fill="#c8a96b" />
      <circle cx="11" cy="31" r="2.5" fill="#a08040" opacity="0.55" />
      <circle cx="20" cy="35" r="2" fill="#a08040" opacity="0.55" />
      <ellipse cx="16" cy="19" rx="10" ry="9" fill="#c8a96b" />
      <polygon points="9,13 7,4 14,12" fill="#c8a96b" />
      <polygon points="23,13 25,4 18,12" fill="#c8a96b" />
      <polygon points="10,11 8,5 13,11" fill="#4e342e" />
      <polygon points="22,11 24,5 19,11" fill="#4e342e" />
      <polygon points="10,13 9,7 13,12" fill="#f48fb1" opacity="0.65" />
      <polygon points="22,13 23,7 19,12" fill="#f48fb1" opacity="0.65" />
      <ellipse cx="12" cy="18" rx="3.5" ry="3" fill="#c8b400" />
      <ellipse cx="20" cy="18" rx="3.5" ry="3" fill="#c8b400" />
      <ellipse cx="12" cy="18" rx="1.2" ry="2.5" fill="#111" />
      <ellipse cx="20" cy="18" rx="1.2" ry="2.5" fill="#111" />
      <ellipse cx="16" cy="23" rx="2.5" ry="1.5" fill="#f4a7b9" />
      <line x1="16" y1="23" x2="4" y2="21" stroke="#ffffffaa" strokeWidth="0.8" />
      <line x1="16" y1="24" x2="4" y2="26" stroke="#ffffffaa" strokeWidth="0.8" />
      <line x1="16" y1="23" x2="28" y2="21" stroke="#ffffffaa" strokeWidth="0.8" />
      <line x1="16" y1="24" x2="28" y2="26" stroke="#ffffffaa" strokeWidth="0.8" />
    </svg>
  );
}

function LaumaSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 32 40" aria-label="Meža Lauma">
      <ellipse cx="16" cy="26" rx="13" ry="13" fill="#1b5e20" opacity="0.25" />
      <path d="M9,40 Q7,28 16,20 Q25,28 23,40Z" fill="#2e7d32" />
      <path d="M8,14 Q4,26 6,40" fill="none" stroke="#76ff03" strokeWidth="2.5" opacity="0.7" />
      <path d="M24,14 Q28,26 26,40" fill="none" stroke="#76ff03" strokeWidth="2.5" opacity="0.7" />
      <ellipse cx="16" cy="11" rx="9" ry="10" fill="#388e3c" />
      <ellipse cx="13" cy="10" rx="2.8" ry="3" fill="#e8f5e9" />
      <ellipse cx="19" cy="10" rx="2.8" ry="3" fill="#e8f5e9" />
      <circle cx="13" cy="10" r="1.8" fill="#76ff03" />
      <circle cx="19" cy="10" r="1.8" fill="#76ff03" />
      <circle cx="5" cy="3" r="1.2" fill="#76ff03" opacity="0.9" />
      <circle cx="27" cy="5" r="1" fill="#76ff03" opacity="0.9" />
      <circle cx="16" cy="1" r="1" fill="#76ff03" opacity="0.9" />
    </svg>
  );
}

export function AvatarSvg({ characterId }) {
  switch (characterId) {
    case 'ezis':   return <EzisSvg />;
    case 'vavere': return <VavereSvg />;
    case 'puce':   return <PuceSvg />;
    case 'lusis':  return <LusisSvg />;
    case 'lauma':  return <LaumaSvg />;
    default:       return <GnomeSvg />;
  }
}

/* ---- Citi vizuālie komponenti ---- */

function CellBg({ ch }) {
  if (ch === '#') return <div className="gc-wall" />;
  if (ch === 'T') return <div className="gc-tree">🌲</div>;
  return <div className="gc-floor" />;
}

function BasketSvg() {
  return (
    <svg className="gc-basket" viewBox="0 0 36 36" aria-label="Groziņš">
      <path className="gc-basket__handle" d="M10,14 Q18,2 26,14" fill="none" strokeLinecap="round" />
      <rect className="gc-basket__body" x="5" y="14" width="26" height="16" rx="4" />
      <line className="gc-basket__weave" x1="13" y1="14" x2="13" y2="30" />
      <line className="gc-basket__weave" x1="18" y1="14" x2="18" y2="30" />
      <line className="gc-basket__weave" x1="23" y1="14" x2="23" y2="30" />
      <line className="gc-basket__weave" x1="5"  y1="20" x2="31" y2="20" />
      <line className="gc-basket__weave" x1="5"  y1="25" x2="31" y2="25" />
      <circle className="gc-basket__berry" cx="12" cy="12" r="3" />
      <circle className="gc-basket__berry" cx="20" cy="10" r="3" />
      <circle className="gc-basket__berry" cx="27" cy="12" r="2.5" />
    </svg>
  );
}

function CollectFlash({ collected }) {
  if (!collected) return null;
  return (
    <div className="gc-collect-flash" aria-hidden="true">
      +{BASKET_VALUE} ◉
    </div>
  );
}

function HouseSvg() {
  return (
    <svg className="gc-house" viewBox="0 0 40 40" aria-label="Mājiņa">
      <rect className="gc-house__wall" x="6" y="20" width="28" height="18" rx="1" />
      <polygon className="gc-house__roof" points="20,4 4,22 36,22" />
      <rect className="gc-house__door" x="14" y="29" width="8" height="9" rx="2" />
      <rect className="gc-house__window" x="24" y="24" width="6" height="6" rx="1" />
      <line className="gc-house__cross" x1="24" y1="27" x2="30" y2="27" />
      <line className="gc-house__cross" x1="27" y1="24" x2="27" y2="30" />
      <rect className="gc-house__chimney" x="28" y="8" width="5" height="10" rx="1" />
    </svg>
  );
}

const DIR_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const MOVES = {
  ArrowUp:    { dx: 0,  dy: -1 },
  ArrowDown:  { dx: 0,  dy:  1 },
  ArrowLeft:  { dx: -1, dy:  0 },
  ArrowRight: { dx:  1, dy:  0 },
};

export default function GnomeGame({ onCoinsChange, characterId = 'rukitis' }) {
  const [levelIdx, setLevelIdx] = useState(0);
  const [levelData, setLevelData] = useState(() => parseLevel(LEVELS[0].map));
  const [gnome, setGnome] = useState(() => parseLevel(LEVELS[0].map).gnome);
  const [won, setWon] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [steps, setSteps] = useState(0);
  const [earnedThisLevel, setEarnedThisLevel] = useState(false);

  const [remainingBaskets, setRemainingBaskets] = useState(() => initBaskets(0));
  const [basketsCollected, setBasketsCollected] = useState(0);
  const [lastCollected, setLastCollected] = useState(null);

  const totalLevels = LEVELS.length;
  const totalBaskets = LEVELS[levelIdx].baskets.length;

  const loadLevel = useCallback((idx) => {
    const data = parseLevel(LEVELS[idx].map);
    setLevelData(data);
    setGnome(data.gnome);
    setWon(false);
    setSteps(0);
    setEarnedThisLevel(false);
    setAllDone(false);
    setRemainingBaskets(initBaskets(idx));
    setBasketsCollected(0);
    setLastCollected(null);
  }, []);

  useEffect(() => {
    if (!lastCollected) return undefined;
    const t = window.setTimeout(() => setLastCollected(null), 900);
    return () => window.clearTimeout(t);
  }, [lastCollected]);

  const tryMove = useCallback((key) => {
    if (won) return;
    const move = MOVES[key];
    if (!move) return;

    setGnome((prev) => {
      const nx = prev.x + move.dx;
      const ny = prev.y + move.dy;
      if (!isWalkable(levelData.grid, nx, ny)) return prev;

      const k = `${nx},${ny}`;
      if (remainingBaskets.has(k)) {
        setRemainingBaskets((rb) => { const next = new Set(rb); next.delete(k); return next; });
        setBasketsCollected((c) => c + 1);
        setLastCollected({ x: nx, y: ny });
        onCoinsChange?.(BASKET_VALUE);
      }

      const atHouse = nx === levelData.house.x && ny === levelData.house.y;
      if (atHouse && !earnedThisLevel) {
        setEarnedThisLevel(true);
        setWon(true);
        if (levelIdx >= totalLevels - 1) setAllDone(true);
        onCoinsChange?.(LEVELS[levelIdx].reward);
      } else if (atHouse) {
        setWon(true);
        if (levelIdx >= totalLevels - 1) setAllDone(true);
      }

      return { x: nx, y: ny };
    });
    setSteps((s) => s + 1);
  }, [won, levelData, remainingBaskets, earnedThisLevel, levelIdx, totalLevels, onCoinsChange]);

  useEffect(() => {
    const handler = (e) => {
      if (!DIR_KEYS.has(e.code)) return;
      e.preventDefault();
      tryMove(e.code);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tryMove]);

  const goNext    = () => { const n = levelIdx + 1; setLevelIdx(n); loadLevel(n); };
  const restart   = () => loadLevel(levelIdx);
  const restartAll = () => { setLevelIdx(0); loadLevel(0); };

  const { grid, house, cols, rows } = levelData;
  const basketBonus = basketsCollected * BASKET_VALUE;

  return (
    <div className="gnome-game">
      <div className="gnome-game__header">
        <span className="gnome-game__level-badge">{LEVELS[levelIdx].label}</span>
        <span className="gnome-game__steps">Soļi: {steps}</span>
        <span className="gnome-game__baskets-hud" title="Savāktie groziņi">
          🧺 {basketsCollected}/{totalBaskets}
          {basketsCollected > 0 && (
            <span className="gnome-game__basket-bonus"> +{basketBonus} ◉</span>
          )}
        </span>
        <span className="gnome-game__reward-label">Balva: {LEVELS[levelIdx].reward} ◉</span>
      </div>

      <div
        className="gnome-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${CELL}px)`,
          gridTemplateRows:    `repeat(${rows}, ${CELL}px)`,
        }}
      >
        {grid.map((row, y) =>
          row.map((ch, x) => {
            const isGnome = gnome.x === x && gnome.y === y;
            const isHouse = house.x === x && house.y === y;
            const bk = `${x},${y}`;
            const hasBasket    = remainingBaskets.has(bk);
            const justCollected = lastCollected?.x === x && lastCollected?.y === y;
            return (
              <div key={bk} className="gnome-cell">
                <CellBg ch={ch} />
                {isHouse && <HouseSvg />}
                {hasBasket && <BasketSvg />}
                {isGnome && <AvatarSvg characterId={characterId} />}
                <CollectFlash collected={justCollected} />
              </div>
            );
          }),
        )}
      </div>

      <div className="gnome-dpad" aria-label="Kustības vadība">
        <div className="gnome-dpad__row">
          <button type="button" className="gnome-dpad__btn" onClick={() => tryMove('ArrowUp')} aria-label="Uz augšu">▲</button>
        </div>
        <div className="gnome-dpad__row">
          <button type="button" className="gnome-dpad__btn" onClick={() => tryMove('ArrowLeft')} aria-label="Pa kreisi">◀</button>
          <button type="button" className="gnome-dpad__btn gnome-dpad__btn--center" onClick={restart} aria-label="Restartēt">↺</button>
          <button type="button" className="gnome-dpad__btn" onClick={() => tryMove('ArrowRight')} aria-label="Pa labi">▶</button>
        </div>
        <div className="gnome-dpad__row">
          <button type="button" className="gnome-dpad__btn" onClick={() => tryMove('ArrowDown')} aria-label="Uz leju">▼</button>
        </div>
      </div>

      {won && (
        <div className="gnome-game__win" role="status">
          {allDone ? (
            <>
              <p className="gnome-game__win-title">🏠 Visi līmeņi pabeigti!</p>
              <p className="gnome-game__win-sub">Groziņi: {basketsCollected}/{totalBaskets} · Bonuss: +{basketBonus} ◉</p>
              <button type="button" className="gnome-game__btn gnome-game__btn--primary" onClick={restartAll}>
                Spēlēt no sākuma
              </button>
            </>
          ) : (
            <>
              <p className="gnome-game__win-title">🏠 Mājiņa sasniegta!</p>
              <p className="gnome-game__win-sub">
                Balva: +{LEVELS[levelIdx].reward} ◉
                {basketsCollected > 0 && ` · Groziņi: +${basketBonus} ◉ (${basketsCollected}/${totalBaskets})`}
                {' · '}Soļi: {steps}
              </p>
              <button type="button" className="gnome-game__btn gnome-game__btn--primary" onClick={goNext}>
                Nākamais līmenis →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
