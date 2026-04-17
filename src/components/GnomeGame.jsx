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

/* ---- Avatāru SVG komponenti (viewBox 0 0 40 40) ---- */

function GnomeSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 40 40" aria-label="Rūķītis">
      {/* Hat */}
      <polygon points="20,0 6,20 34,20" fill="#e53935" />
      <rect x="6" y="18" width="28" height="5" rx="2.5" fill="#b71c1c" />
      {/* Hat buckle */}
      <rect x="16" y="17" width="8" height="7" rx="1.5" fill="#fdd835" />
      {/* Face */}
      <ellipse cx="20" cy="27" rx="11" ry="10" fill="#ffcc80" />
      <ellipse cx="13" cy="28" rx="4" ry="3" fill="#ff8a65" opacity="0.35" />
      <ellipse cx="27" cy="28" rx="4" ry="3" fill="#ff8a65" opacity="0.35" />
      {/* Eyes */}
      <circle cx="15" cy="25" r="2.5" fill="#333" />
      <circle cx="25" cy="25" r="2.5" fill="#333" />
      <circle cx="16" cy="24" r="0.9" fill="#fff" />
      <circle cx="26" cy="24" r="0.9" fill="#fff" />
      {/* Nose */}
      <ellipse cx="20" cy="28.5" rx="2.2" ry="1.6" fill="#ff8a65" />
      {/* Beard */}
      <ellipse cx="13" cy="34" rx="6" ry="5" fill="#f5f5f5" />
      <ellipse cx="27" cy="34" rx="6" ry="5" fill="#f5f5f5" />
      <ellipse cx="20" cy="36" rx="9" ry="5" fill="#f5f5f5" />
      {/* Body */}
      <rect x="13" y="37" width="14" height="4" rx="2" fill="#43a047" />
    </svg>
  );
}

function EzisSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 40 40" aria-label="Ezis">
      {/* Spines above body */}
      <polygon points="9,25 6,11 13,23" fill="#3e2723" />
      <polygon points="15,21 13,7 19,21" fill="#3e2723" />
      <polygon points="21,20 20,6 25,20" fill="#3e2723" />
      <polygon points="27,21 29,7 33,23" fill="#3e2723" />
      {/* Body (covers spine bases) */}
      <ellipse cx="20" cy="30" rx="17" ry="11" fill="#6d4c41" />
      {/* Cream belly */}
      <ellipse cx="20" cy="32" rx="10" ry="7" fill="#d7ccc8" />
      {/* Head/face */}
      <circle cx="20" cy="22" r="10" fill="#8d6e63" />
      {/* Eyes */}
      <circle cx="15" cy="20" r="3" fill="#111" />
      <circle cx="25" cy="20" r="3" fill="#111" />
      <circle cx="16" cy="19" r="1" fill="#fff" />
      <circle cx="26" cy="19" r="1" fill="#fff" />
      {/* Nose */}
      <ellipse cx="20" cy="25" rx="3" ry="2" fill="#3e2723" />
    </svg>
  );
}

function ZakisSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 40 40" aria-label="Zaķis">
      {/* Long tall ears */}
      <rect x="9" y="0" width="8" height="21" rx="4" fill="#e0e0e0" />
      <rect x="23" y="0" width="8" height="21" rx="4" fill="#e0e0e0" />
      <rect x="11.5" y="1" width="3" height="17" rx="1.5" fill="#f8bbd0" />
      <rect x="25.5" y="1" width="3" height="17" rx="1.5" fill="#f8bbd0" />
      {/* Body + head as one big circle */}
      <circle cx="20" cy="29" r="13" fill="#e8e8e8" />
      {/* Eyes */}
      <circle cx="15" cy="27" r="3" fill="#111" />
      <circle cx="25" cy="27" r="3" fill="#111" />
      <circle cx="16" cy="26" r="1" fill="#fff" />
      <circle cx="26" cy="26" r="1" fill="#fff" />
      {/* Nose */}
      <ellipse cx="20" cy="31" rx="2.5" ry="2" fill="#f48fb1" />
      {/* Fluffy tail */}
      <circle cx="20" cy="41" r="4" fill="#fff" />
    </svg>
  );
}

function LapsaSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 40 40" aria-label="Lapsa">
      {/* Fluffy tail (side) */}
      <ellipse cx="7" cy="33" rx="8" ry="12" fill="#e65100" />
      <ellipse cx="7" cy="36" rx="5" ry="7" fill="#ff6d00" opacity="0.5" />
      <ellipse cx="7" cy="38" rx="4" ry="4" fill="#fff" />
      {/* Body */}
      <ellipse cx="24" cy="33" rx="13" ry="10" fill="#e65100" />
      <ellipse cx="26" cy="36" rx="7" ry="6" fill="#fff3e0" opacity="0.85" />
      {/* Head */}
      <ellipse cx="25" cy="19" rx="13" ry="13" fill="#e65100" />
      {/* Pointy ears */}
      <polygon points="15,11 12,1 21,13" fill="#e65100" />
      <polygon points="35,11 38,1 29,13" fill="#e65100" />
      <polygon points="16,10 14,4 20,12" fill="#bf360c" opacity="0.55" />
      <polygon points="34,10 36,4 30,12" fill="#bf360c" opacity="0.55" />
      {/* White muzzle */}
      <ellipse cx="27" cy="24" rx="8" ry="6" fill="#fff3e0" />
      {/* Eyes */}
      <ellipse cx="19" cy="16" rx="4" ry="3.5" fill="#f57f17" />
      <ellipse cx="31" cy="16" rx="4" ry="3.5" fill="#f57f17" />
      <ellipse cx="19" cy="16" rx="1.5" ry="3" fill="#111" />
      <ellipse cx="31" cy="16" rx="1.5" ry="3" fill="#111" />
      <circle cx="20" cy="14.5" r="1.1" fill="#fff" opacity="0.85" />
      <circle cx="32" cy="14.5" r="1.1" fill="#fff" opacity="0.85" />
      {/* Nose */}
      <ellipse cx="27" cy="22" rx="3" ry="2.2" fill="#111" />
    </svg>
  );
}

function VavereSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 40 40" aria-label="Vāvere">
      {/* Big bushy tail */}
      <ellipse cx="8" cy="28" rx="9" ry="15" fill="#bf8040" />
      <ellipse cx="8" cy="28" rx="6" ry="11" fill="#d4a060" opacity="0.55" />
      <ellipse cx="8" cy="36" rx="5" ry="5" fill="#fafafa" opacity="0.9" />
      {/* Body */}
      <ellipse cx="26" cy="31" rx="12" ry="10" fill="#a0522d" />
      <ellipse cx="26" cy="34" rx="7" ry="6" fill="#c8905c" opacity="0.7" />
      {/* Head */}
      <circle cx="26" cy="17" r="12" fill="#a0522d" />
      {/* Ears */}
      <ellipse cx="18" cy="8" rx="5" ry="7" fill="#a0522d" />
      <ellipse cx="34" cy="8" rx="5" ry="7" fill="#a0522d" />
      <ellipse cx="18" cy="8" rx="2.5" ry="4.5" fill="#d4a373" opacity="0.8" />
      <ellipse cx="34" cy="8" rx="2.5" ry="4.5" fill="#d4a373" opacity="0.8" />
      {/* Eyes */}
      <circle cx="21" cy="15" r="3.5" fill="#111" />
      <circle cx="31" cy="15" r="3.5" fill="#111" />
      <circle cx="22" cy="14" r="1.2" fill="#fff" />
      <circle cx="32" cy="14" r="1.2" fill="#fff" />
      {/* Nose */}
      <ellipse cx="26" cy="20" rx="2.5" ry="1.8" fill="#7b3f20" />
    </svg>
  );
}

function ApsisSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 40 40" aria-label="Āpsis">
      {/* Body */}
      <ellipse cx="20" cy="34" rx="16" ry="9" fill="#616161" />
      {/* Wide head */}
      <ellipse cx="20" cy="21" rx="18" ry="14" fill="#757575" />
      {/* Black mask sides (distinctive badger pattern) */}
      <ellipse cx="10" cy="21" rx="10" ry="13" fill="#1a1a1a" />
      <ellipse cx="30" cy="21" rx="10" ry="13" fill="#1a1a1a" />
      {/* White center stripe */}
      <rect x="16" y="8" width="8" height="22" rx="4" fill="#fafafa" />
      {/* Ears */}
      <circle cx="8" cy="9" r="7" fill="#757575" />
      <circle cx="32" cy="9" r="7" fill="#757575" />
      <circle cx="8" cy="9" r="5" fill="#111" />
      <circle cx="32" cy="9" r="5" fill="#111" />
      <circle cx="8" cy="9" r="3" fill="#fafafa" opacity="0.9" />
      <circle cx="32" cy="9" r="3" fill="#fafafa" opacity="0.9" />
      {/* Eyes on black mask */}
      <circle cx="14" cy="18" r="4" fill="#fff" />
      <circle cx="26" cy="18" r="4" fill="#fff" />
      <circle cx="14" cy="18" r="2.5" fill="#111" />
      <circle cx="26" cy="18" r="2.5" fill="#111" />
      <circle cx="15" cy="17" r="0.9" fill="#fff" opacity="0.9" />
      <circle cx="27" cy="17" r="0.9" fill="#fff" opacity="0.9" />
      {/* Wide nose */}
      <ellipse cx="20" cy="27" rx="4.5" ry="3" fill="#111" />
    </svg>
  );
}

function PuceSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 40 40" aria-label="Pūce">
      {/* Body/wings */}
      <ellipse cx="20" cy="35" rx="13" ry="8" fill="#795548" />
      {/* Head — very large, takes most of frame */}
      <circle cx="20" cy="18" r="17" fill="#795548" />
      {/* Ear tufts */}
      <polygon points="10,6 7,0 14,9" fill="#5d4037" />
      <polygon points="30,6 33,0 26,9" fill="#5d4037" />
      {/* Facial disk */}
      <ellipse cx="20" cy="19" rx="13" ry="12" fill="#bcaaa4" />
      {/* HUGE eyes — the owl's signature */}
      <circle cx="13" cy="17" r="7" fill="#fffde7" />
      <circle cx="27" cy="17" r="7" fill="#fffde7" />
      <circle cx="13" cy="17" r="5.5" fill="#f57f17" />
      <circle cx="27" cy="17" r="5.5" fill="#f57f17" />
      <circle cx="13" cy="17" r="3.5" fill="#111" />
      <circle cx="27" cy="17" r="3.5" fill="#111" />
      <circle cx="14.5" cy="15.5" r="1.3" fill="#fff" />
      <circle cx="28.5" cy="15.5" r="1.3" fill="#fff" />
      {/* Beak */}
      <polygon points="20,22 17,28 23,28" fill="#f9a825" />
    </svg>
  );
}

function LacisSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 40 40" aria-label="Lācis">
      {/* Body */}
      <ellipse cx="20" cy="34" rx="16" ry="9" fill="#5d4037" />
      {/* Head — big round */}
      <circle cx="20" cy="20" r="17" fill="#5d4037" />
      {/* Round ears */}
      <circle cx="6" cy="7" r="8" fill="#5d4037" />
      <circle cx="34" cy="7" r="8" fill="#5d4037" />
      <circle cx="6" cy="7" r="5.5" fill="#4e342e" />
      <circle cx="34" cy="7" r="5.5" fill="#4e342e" />
      <circle cx="6" cy="7" r="3.5" fill="#6d4c41" />
      <circle cx="34" cy="7" r="3.5" fill="#6d4c41" />
      {/* Muzzle */}
      <ellipse cx="20" cy="26" rx="9" ry="7" fill="#795548" />
      {/* Eyes */}
      <circle cx="14" cy="18" r="3.5" fill="#111" />
      <circle cx="26" cy="18" r="3.5" fill="#111" />
      <circle cx="15" cy="17" r="1.3" fill="#fff" />
      <circle cx="27" cy="17" r="1.3" fill="#fff" />
      {/* Big nose */}
      <ellipse cx="20" cy="24" rx="5" ry="3.5" fill="#111" />
    </svg>
  );
}

function LusisSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 40 40" aria-label="Lūsis">
      {/* Body with spots */}
      <ellipse cx="20" cy="33" rx="15" ry="9" fill="#c8a96b" />
      <ellipse cx="13" cy="32" rx="3.5" ry="2.5" fill="#8a6e30" opacity="0.55" />
      <ellipse cx="26" cy="35" rx="3" ry="2" fill="#8a6e30" opacity="0.5" />
      {/* Head */}
      <ellipse cx="20" cy="19" rx="16" ry="14" fill="#c8a96b" />
      {/* Ear base + tuft (most distinctive lynx feature) */}
      <polygon points="9,10 6,0 17,12" fill="#c8a96b" />
      <polygon points="31,10 34,0 23,12" fill="#c8a96b" />
      <polygon points="10,9 8,2 16,11" fill="#2d1a0a" />
      <polygon points="30,9 32,2 24,11" fill="#2d1a0a" />
      {/* Ruff */}
      <ellipse cx="20" cy="22" rx="17" ry="11" fill="#d4b87a" opacity="0.4" />
      {/* Amber eyes with slit pupil */}
      <ellipse cx="13" cy="17" rx="5.5" ry="5" fill="#d4aa00" />
      <ellipse cx="27" cy="17" rx="5.5" ry="5" fill="#d4aa00" />
      <ellipse cx="13" cy="17" rx="2" ry="4.5" fill="#111" />
      <ellipse cx="27" cy="17" rx="2" ry="4.5" fill="#111" />
      <circle cx="14.5" cy="15.5" r="1.1" fill="#fff" opacity="0.8" />
      <circle cx="28.5" cy="15.5" r="1.1" fill="#fff" opacity="0.8" />
      {/* Nose */}
      <polygon points="20,23 17,27 23,27" fill="#f4a7b9" />
      {/* Whiskers */}
      <line x1="18" y1="24" x2="3" y2="22" stroke="#fff" strokeWidth="1.1" opacity="0.7" />
      <line x1="18" y1="25" x2="3" y2="28" stroke="#fff" strokeWidth="1.1" opacity="0.7" />
      <line x1="22" y1="24" x2="37" y2="22" stroke="#fff" strokeWidth="1.1" opacity="0.7" />
      <line x1="22" y1="25" x2="37" y2="28" stroke="#fff" strokeWidth="1.1" opacity="0.7" />
    </svg>
  );
}

function AlnisSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 40 40" aria-label="Alnis">
      {/* Antlers (thick, clear) */}
      <line x1="16" y1="9" x2="9" y2="1" stroke="#8d6e63" strokeWidth="4" strokeLinecap="round" />
      <line x1="9" y1="1" x2="3" y2="6" stroke="#8d6e63" strokeWidth="3" strokeLinecap="round" />
      <line x1="9" y1="1" x2="6" y2="11" stroke="#8d6e63" strokeWidth="3" strokeLinecap="round" />
      <line x1="24" y1="9" x2="31" y2="1" stroke="#8d6e63" strokeWidth="4" strokeLinecap="round" />
      <line x1="31" y1="1" x2="37" y2="6" stroke="#8d6e63" strokeWidth="3" strokeLinecap="round" />
      <line x1="31" y1="1" x2="34" y2="11" stroke="#8d6e63" strokeWidth="3" strokeLinecap="round" />
      {/* Body */}
      <ellipse cx="20" cy="34" rx="15" ry="9" fill="#8d6e63" />
      {/* Neck */}
      <rect x="15" y="26" width="10" height="12" rx="4" fill="#8d6e63" />
      {/* Head (elongated — horse-like) */}
      <ellipse cx="20" cy="20" rx="11" ry="14" fill="#8d6e63" />
      {/* Ear flaps */}
      <ellipse cx="9" cy="14" rx="4" ry="6" fill="#8d6e63" />
      <ellipse cx="31" cy="14" rx="4" ry="6" fill="#8d6e63" />
      <ellipse cx="9" cy="14" rx="2" ry="3.5" fill="#d7ccc8" opacity="0.6" />
      <ellipse cx="31" cy="14" rx="2" ry="3.5" fill="#d7ccc8" opacity="0.6" />
      {/* Eyes */}
      <circle cx="14" cy="14" r="3.5" fill="#111" />
      <circle cx="26" cy="14" r="3.5" fill="#111" />
      <circle cx="15" cy="13" r="1.2" fill="#fff" />
      <circle cx="27" cy="13" r="1.2" fill="#fff" />
      {/* Big bulbous snout */}
      <ellipse cx="20" cy="28" rx="7.5" ry="5.5" fill="#7b5e52" />
      <circle cx="17" cy="28" r="2" fill="#4e342e" />
      <circle cx="23" cy="28" r="2" fill="#4e342e" />
    </svg>
  );
}

export function AvatarSvg({ characterId }) {
  switch (characterId) {
    case 'zakis':  return <ZakisSvg />;
    case 'ezis':   return <EzisSvg />;
    case 'lapsa':  return <LapsaSvg />;
    case 'vavere': return <VavereSvg />;
    case 'apsis':  return <ApsisSvg />;
    case 'puce':   return <PuceSvg />;
    case 'lacis':  return <LacisSvg />;
    case 'lusis':  return <LusisSvg />;
    case 'alnis':  return <AlnisSvg />;
    default:       return <GnomeSvg />;
  }
}

/* ---- Citi vizuālie komponenti ---- */

function ForestWall() {
  return (
    <svg className="gc-wall-tree" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" fill="#0c1f0c" />
      <rect x="15" y="27" width="10" height="14" rx="1.5" fill="#4e342e" />
      <polygon points="20,2 6,26 34,26" fill="#1b5e20" />
      <polygon points="20,0 8,20 32,20" fill="#2e7d32" />
      <polygon points="20,-1 11,14 29,14" fill="#43a047" />
      <polygon points="20,2 17,16 23,14" fill="#a5d6a7" opacity="0.25" />
      <rect x="0" y="37" width="40" height="3" fill="#060f06" opacity="0.65" />
    </svg>
  );
}

function CellBg({ ch }) {
  if (ch === '#') return <ForestWall />;
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
