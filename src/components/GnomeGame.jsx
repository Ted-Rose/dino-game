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
    <svg className="gc-gnome" viewBox="0 0 48 56" aria-label="Rūķītis">
      {/* Hat */}
      <polygon points="24,1 10,26 38,26" fill="#c0392b" />
      <polygon points="24,1 13,24 29,22" fill="#e74c3c" opacity="0.35" />
      <rect x="10" y="23" width="28" height="5" rx="2" fill="#7b241c" />
      <rect x="19" y="22" width="10" height="7" rx="1.5" fill="#d4ac0d" />
      {/* Face */}
      <ellipse cx="24" cy="36" rx="11" ry="10" fill="#f5cba7" />
      <ellipse cx="16" cy="37" rx="4" ry="3" fill="#f1948a" opacity="0.45" />
      <ellipse cx="32" cy="37" rx="4" ry="3" fill="#f1948a" opacity="0.45" />
      {/* Eyes */}
      <circle cx="19" cy="33" r="2.8" fill="#2c3e50" />
      <circle cx="29" cy="33" r="2.8" fill="#2c3e50" />
      <circle cx="20" cy="32" r="1" fill="#fff" />
      <circle cx="30" cy="32" r="1" fill="#fff" />
      {/* Nose */}
      <ellipse cx="24" cy="37" rx="2.8" ry="2" fill="#e8a07c" />
      {/* Moustache */}
      <path d="M18,40 Q22,43 24,40 Q26,43 30,40" fill="none" stroke="#ecf0f1" strokeWidth="2.2" strokeLinecap="round" />
      {/* Beard */}
      <ellipse cx="24" cy="46" rx="14" ry="9" fill="#ecf0f1" />
      <ellipse cx="13" cy="44" rx="7" ry="7" fill="#ecf0f1" />
      <ellipse cx="35" cy="44" rx="7" ry="7" fill="#ecf0f1" />
      {/* Body */}
      <rect x="12" y="50" width="24" height="6" rx="4" fill="#27ae60" />
      <rect x="12" y="50" width="24" height="3" rx="2" fill="#2ecc71" opacity="0.45" />
      <rect x="12" y="53" width="24" height="2" fill="#1e8449" opacity="0.3" />
    </svg>
  );
}

function EzisSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 48 56" aria-label="Ezis">
      {/* Spines */}
      <polygon points="14,32 10,14 18,30" fill="#3e2723" />
      <polygon points="20,28 17,10 24,28" fill="#3e2723" />
      <polygon points="26,27 25,9 31,27" fill="#3e2723" />
      <polygon points="32,29 34,11 38,30" fill="#3e2723" />
      <polygon points="8,38 4,22 12,36" fill="#4e342e" />
      <polygon points="38,38 44,22 40,36" fill="#4e342e" />
      {/* Body */}
      <ellipse cx="24" cy="42" rx="19" ry="13" fill="#6d4c41" />
      {/* Belly */}
      <ellipse cx="24" cy="44" rx="11" ry="9" fill="#d7ccc8" />
      {/* Head */}
      <circle cx="24" cy="32" r="10" fill="#8d6e63" />
      {/* Face shading */}
      <ellipse cx="28" cy="35" rx="7" ry="5" fill="#a1887f" />
      {/* Eyes */}
      <circle cx="19" cy="29" r="3" fill="#1a1a1a" />
      <circle cx="20" cy="28" r="1" fill="#fff" />
      <circle cx="30" cy="30" r="2.2" fill="#1a1a1a" />
      <circle cx="31" cy="29" r="0.8" fill="#fff" />
      {/* Nose */}
      <ellipse cx="32" cy="34" rx="3.5" ry="2.5" fill="#3e2723" />
      <ellipse cx="33" cy="33.5" rx="1.2" ry="0.8" fill="#5d4037" opacity="0.5" />
      {/* Feet */}
      <ellipse cx="16" cy="54" rx="5.5" ry="3" fill="#5d4037" />
      <ellipse cx="32" cy="54" rx="5.5" ry="3" fill="#5d4037" />
    </svg>
  );
}

function VavereSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 48 56" aria-label="Vāvere">
      {/* Big fluffy tail */}
      <path d="M9,56 Q2,40 7,26 Q16,12 26,22 Q30,34 26,50 Q22,58 18,56Z" fill="#c67c3a" />
      <path d="M9,56 Q4,42 9,30 Q16,18 24,26 Q27,36 24,52" fill="#e8943a" opacity="0.5" />
      <path d="M10,56 Q6,44 10,34 Q17,22 24,30" fill="#f0a050" opacity="0.3" />
      {/* Body */}
      <ellipse cx="30" cy="42" rx="12" ry="13" fill="#cd853f" />
      <ellipse cx="30" cy="46" rx="7" ry="8" fill="#f5deb3" opacity="0.65" />
      {/* Head */}
      <ellipse cx="30" cy="23" rx="11" ry="11" fill="#cd853f" />
      {/* Ears */}
      <ellipse cx="21" cy="14" rx="5" ry="7" fill="#cd853f" />
      <ellipse cx="38" cy="14" rx="5" ry="7" fill="#cd853f" />
      <ellipse cx="21" cy="14" rx="2.5" ry="4" fill="#d4a373" opacity="0.8" />
      <ellipse cx="38" cy="14" rx="2.5" ry="4" fill="#d4a373" opacity="0.8" />
      {/* Eyes */}
      <circle cx="25" cy="21" r="4" fill="#1a1a1a" />
      <circle cx="36" cy="21" r="4" fill="#1a1a1a" />
      <circle cx="26.5" cy="19.5" r="1.4" fill="#fff" />
      <circle cx="37.5" cy="19.5" r="1.4" fill="#fff" />
      <circle cx="25" cy="21" r="1.5" fill="#4a2" opacity="0.4" />
      <circle cx="36" cy="21" r="1.5" fill="#4a2" opacity="0.4" />
      {/* Nose */}
      <ellipse cx="30" cy="27" rx="2.5" ry="1.8" fill="#8b4513" />
      {/* Paws */}
      <ellipse cx="21" cy="54" rx="5" ry="3" fill="#b5651d" />
      <ellipse cx="38" cy="54" rx="5" ry="3" fill="#b5651d" />
    </svg>
  );
}

function PuceSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 48 56" aria-label="Pūce">
      {/* Body with wing pattern */}
      <ellipse cx="24" cy="46" rx="15" ry="10" fill="#795548" />
      <path d="M9,48 Q12,38 24,44 Q36,38 39,48" fill="#6d4c41" />
      <path d="M11,50 Q14,44 20,47" fill="#5d4037" opacity="0.5" />
      <path d="M37,50 Q34,44 28,47" fill="#5d4037" opacity="0.5" />
      {/* Head (large round) */}
      <circle cx="24" cy="22" r="18" fill="#795548" />
      {/* Ear tufts */}
      <polygon points="13,8 9,0 17,10" fill="#5d4037" />
      <polygon points="35,8 39,0 31,10" fill="#5d4037" />
      <polygon points="13,10 11,4 16,10" fill="#795548" />
      <polygon points="35,10 37,4 32,10" fill="#795548" />
      {/* Facial disk */}
      <ellipse cx="24" cy="23" rx="14" ry="13" fill="#bcaaa4" />
      {/* Eyes */}
      <circle cx="17" cy="21" r="7" fill="#fffde7" />
      <circle cx="31" cy="21" r="7" fill="#fffde7" />
      <circle cx="17" cy="21" r="5.5" fill="#f57f17" />
      <circle cx="31" cy="21" r="5.5" fill="#f57f17" />
      <circle cx="17" cy="21" r="3.5" fill="#111" />
      <circle cx="31" cy="21" r="3.5" fill="#111" />
      <circle cx="18.5" cy="19.5" r="1.3" fill="#fff" />
      <circle cx="32.5" cy="19.5" r="1.3" fill="#fff" />
      {/* Beak */}
      <polygon points="24,26 20,32 28,32" fill="#f9a825" />
      <line x1="24" y1="26" x2="24" y2="32" stroke="#e65100" strokeWidth="0.8" />
      {/* Feather marks on head */}
      <path d="M10,18 Q13,13 16,16" fill="none" stroke="#5d4037" strokeWidth="1.2" opacity="0.4" />
      <path d="M38,18 Q35,13 32,16" fill="none" stroke="#5d4037" strokeWidth="1.2" opacity="0.4" />
      <path d="M13,28 Q16,24 18,27" fill="none" stroke="#9e9e9e" strokeWidth="0.8" opacity="0.35" />
    </svg>
  );
}

function LusisSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 48 56" aria-label="Lūsis">
      {/* Body */}
      <ellipse cx="24" cy="44" rx="16" ry="11" fill="#c8a96b" />
      {/* Spots */}
      <ellipse cx="15" cy="41" rx="4" ry="3" fill="#a08040" opacity="0.5" />
      <ellipse cx="32" cy="46" rx="3.5" ry="2.5" fill="#a08040" opacity="0.5" />
      <ellipse cx="22" cy="50" rx="3" ry="2" fill="#a08040" opacity="0.4" />
      {/* Ruff (face fur) */}
      <ellipse cx="24" cy="28" rx="18" ry="14" fill="#d4b87a" opacity="0.55" />
      {/* Head */}
      <ellipse cx="24" cy="23" rx="15" ry="14" fill="#c8a96b" />
      {/* Ear base */}
      <polygon points="10,14 7,2 18,14" fill="#c8a96b" />
      <polygon points="38,14 41,2 30,14" fill="#c8a96b" />
      {/* Ear tuft (black) */}
      <polygon points="11,12 9,4 16,12" fill="#3e2723" />
      <polygon points="37,12 39,4 32,12" fill="#3e2723" />
      {/* Ear inner */}
      <polygon points="12,14 11,8 15,13" fill="#f4a7b9" opacity="0.65" />
      <polygon points="36,14 37,8 33,13" fill="#f4a7b9" opacity="0.65" />
      {/* Eyes */}
      <ellipse cx="17" cy="20" rx="5.5" ry="5" fill="#d4aa00" />
      <ellipse cx="31" cy="20" rx="5.5" ry="5" fill="#d4aa00" />
      <ellipse cx="17" cy="20" rx="2" ry="4.5" fill="#111" />
      <ellipse cx="31" cy="20" rx="2" ry="4.5" fill="#111" />
      <circle cx="18.5" cy="18.5" r="1.2" fill="#fff" opacity="0.85" />
      <circle cx="32.5" cy="18.5" r="1.2" fill="#fff" opacity="0.85" />
      {/* Nose */}
      <polygon points="24,27 20,31 28,31" fill="#f4a7b9" />
      <ellipse cx="24" cy="28" rx="3" ry="2" fill="#e91e8c" opacity="0.35" />
      {/* Whiskers */}
      <line x1="22" y1="29" x2="4" y2="26" stroke="#fff" strokeWidth="0.9" opacity="0.75" />
      <line x1="22" y1="31" x2="4" y2="34" stroke="#fff" strokeWidth="0.9" opacity="0.75" />
      <line x1="26" y1="29" x2="44" y2="26" stroke="#fff" strokeWidth="0.9" opacity="0.75" />
      <line x1="26" y1="31" x2="44" y2="34" stroke="#fff" strokeWidth="0.9" opacity="0.75" />
      {/* Paws */}
      <ellipse cx="15" cy="54" rx="6" ry="3.5" fill="#b89050" />
      <ellipse cx="33" cy="54" rx="6" ry="3.5" fill="#b89050" />
    </svg>
  );
}

function LaumaSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 48 56" aria-label="Meža Lauma">
      {/* Green hair flowing down sides */}
      <path d="M10,18 Q3,32 5,56" fill="none" stroke="#1b5e20" strokeWidth="9" strokeLinecap="round" />
      <path d="M38,18 Q45,32 43,56" fill="none" stroke="#1b5e20" strokeWidth="9" strokeLinecap="round" />
      {/* Hair top/back */}
      <ellipse cx="24" cy="14" rx="15" ry="13" fill="#2e7d32" />
      {/* Hair highlights */}
      <path d="M12,20 Q8,34 10,52" fill="none" stroke="#43a047" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <path d="M36,20 Q40,34 38,52" fill="none" stroke="#43a047" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      {/* Dress/body */}
      <path d="M15,40 Q10,52 12,56 L36,56 Q38,52 33,40 Q24,46 15,40Z" fill="#388e3c" />
      <path d="M18,40 Q24,48 30,40 Q28,44 24,46 Q20,44 18,40Z" fill="#66bb6a" opacity="0.5" />
      {/* Neck */}
      <rect x="20" y="34" width="8" height="8" rx="3" fill="#fce4ec" />
      {/* Face */}
      <ellipse cx="24" cy="26" rx="12" ry="13" fill="#fce4ec" />
      {/* Ears */}
      <ellipse cx="12" cy="26" rx="3" ry="4" fill="#fce4ec" />
      <ellipse cx="36" cy="26" rx="3" ry="4" fill="#fce4ec" />
      <ellipse cx="12" cy="26" rx="1.5" ry="2.5" fill="#f8bbd0" opacity="0.6" />
      <ellipse cx="36" cy="26" rx="1.5" ry="2.5" fill="#f8bbd0" opacity="0.6" />
      {/* Leaf crown */}
      <path d="M12,16 Q15,9 20,14 Q22,7 24,13 Q26,7 28,14 Q33,9 36,16" fill="#1b5e20" stroke="#33691e" strokeWidth="0.8" />
      <circle cx="24" cy="13" r="2" fill="#a5d6a7" opacity="0.8" />
      {/* Eyebrows */}
      <path d="M16,21 Q19,18 22,20" fill="none" stroke="#1b5e20" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M26,20 Q29,18 32,21" fill="none" stroke="#1b5e20" strokeWidth="1.5" strokeLinecap="round" />
      {/* Eyes (green, expressive) */}
      <ellipse cx="19" cy="24" rx="4.5" ry="4" fill="#fff" />
      <ellipse cx="29" cy="24" rx="4.5" ry="4" fill="#fff" />
      <circle cx="19" cy="24" r="3.2" fill="#2e7d32" />
      <circle cx="29" cy="24" r="3.2" fill="#2e7d32" />
      <circle cx="19" cy="24" r="1.8" fill="#111" />
      <circle cx="29" cy="24" r="1.8" fill="#111" />
      <circle cx="20" cy="23" r="0.9" fill="#fff" opacity="0.9" />
      <circle cx="30" cy="23" r="0.9" fill="#fff" opacity="0.9" />
      {/* Nose */}
      <ellipse cx="24" cy="29" rx="2" ry="1.3" fill="#f8bbd0" />
      {/* Lips */}
      <path d="M20,32 Q24,35 28,32" fill="none" stroke="#e91e63" strokeWidth="1.8" strokeLinecap="round" />
      {/* Sparkles */}
      <circle cx="5" cy="22" r="2" fill="#76ff03" opacity="0.9" />
      <circle cx="43" cy="18" r="1.5" fill="#76ff03" opacity="0.85" />
      <circle cx="3" cy="38" r="1.5" fill="#aeff00" opacity="0.8" />
      <circle cx="45" cy="40" r="1.8" fill="#76ff03" opacity="0.8" />
      <circle cx="24" cy="3" r="1.5" fill="#b9f6ca" opacity="0.9" />
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
