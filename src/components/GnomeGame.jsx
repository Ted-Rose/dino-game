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

function ZakisSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 48 56" aria-label="Zaķis">
      {/* Long ears */}
      <ellipse cx="16" cy="12" rx="6" ry="17" fill="#e0e0e0" />
      <ellipse cx="32" cy="12" rx="6" ry="17" fill="#e0e0e0" />
      <ellipse cx="16" cy="12" rx="3" ry="14" fill="#f8bbd0" />
      <ellipse cx="32" cy="12" rx="3" ry="14" fill="#f8bbd0" />
      {/* Body */}
      <ellipse cx="24" cy="45" rx="15" ry="12" fill="#eeeeee" />
      <ellipse cx="24" cy="48" rx="9" ry="8" fill="#fff" opacity="0.7" />
      {/* Head */}
      <ellipse cx="24" cy="29" rx="13" ry="12" fill="#e8e8e8" />
      {/* Cheek fluff */}
      <ellipse cx="13" cy="32" rx="6" ry="5" fill="#f5f5f5" />
      <ellipse cx="35" cy="32" rx="6" ry="5" fill="#f5f5f5" />
      {/* Eyes */}
      <circle cx="18" cy="26" r="4.5" fill="#111" />
      <circle cx="30" cy="26" r="4.5" fill="#111" />
      <circle cx="19.5" cy="24.5" r="1.6" fill="#fff" />
      <circle cx="31.5" cy="24.5" r="1.6" fill="#fff" />
      <circle cx="18" cy="26" r="2" fill="#880e4f" opacity="0.25" />
      <circle cx="30" cy="26" r="2" fill="#880e4f" opacity="0.25" />
      {/* Nose */}
      <ellipse cx="24" cy="32" rx="3" ry="2.2" fill="#f48fb1" />
      <ellipse cx="24" cy="31.5" rx="1.2" ry="0.8" fill="#fff" opacity="0.5" />
      {/* Mouth */}
      <path d="M21,34 Q24,37 27,34" fill="none" stroke="#bdbdbd" strokeWidth="1.2" strokeLinecap="round" />
      {/* Fluffy tail */}
      <circle cx="24" cy="55" r="5.5" fill="#fff" />
    </svg>
  );
}

function LapsaSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 48 56" aria-label="Lapsa">
      {/* Tail (fluffy, curved to side) */}
      <path d="M6,56 Q1,42 7,30 Q18,20 26,32 Q30,44 26,56Z" fill="#e65100" />
      <path d="M9,56 Q5,44 10,34 Q19,26 24,34" fill="#ff6d00" opacity="0.45" />
      <ellipse cx="14" cy="54" rx="6" ry="4" fill="#fafafa" />
      {/* Body */}
      <ellipse cx="31" cy="43" rx="13" ry="12" fill="#e65100" />
      <ellipse cx="31" cy="47" rx="8" ry="7" fill="#fff3e0" opacity="0.85" />
      {/* Head */}
      <ellipse cx="31" cy="24" rx="13" ry="13" fill="#e65100" />
      {/* Pointed ears */}
      <polygon points="20,14 16,1 27,15" fill="#e65100" />
      <polygon points="42,14 46,1 35,15" fill="#e65100" />
      <polygon points="21,13 18,5 26,14" fill="#bf360c" opacity="0.55" />
      <polygon points="41,13 44,5 36,14" fill="#bf360c" opacity="0.55" />
      <polygon points="21,14 19,8 25,13" fill="#f48fb1" opacity="0.5" />
      <polygon points="41,14 43,8 37,13" fill="#f48fb1" opacity="0.5" />
      {/* White muzzle */}
      <ellipse cx="33" cy="29" rx="9" ry="7" fill="#fff3e0" />
      {/* Eyes */}
      <ellipse cx="24" cy="21" rx="4.5" ry="4" fill="#f57f17" />
      <ellipse cx="38" cy="21" rx="4.5" ry="4" fill="#f57f17" />
      <ellipse cx="24" cy="21" rx="1.8" ry="3.2" fill="#111" />
      <ellipse cx="38" cy="21" rx="1.8" ry="3.2" fill="#111" />
      <circle cx="25" cy="19.5" r="1.1" fill="#fff" opacity="0.85" />
      <circle cx="39" cy="19.5" r="1.1" fill="#fff" opacity="0.85" />
      {/* Nose */}
      <ellipse cx="33" cy="27" rx="3.5" ry="2.5" fill="#111" />
      <ellipse cx="33" cy="26.5" rx="1.2" ry="0.8" fill="#555" opacity="0.45" />
      {/* Whiskers */}
      <line x1="31" y1="28" x2="14" y2="26" stroke="#fff" strokeWidth="0.9" opacity="0.75" />
      <line x1="31" y1="29" x2="14" y2="32" stroke="#fff" strokeWidth="0.9" opacity="0.75" />
    </svg>
  );
}

function ApsisSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 48 56" aria-label="Āpsis">
      {/* Body (stocky) */}
      <ellipse cx="24" cy="44" rx="18" ry="11" fill="#616161" />
      <ellipse cx="24" cy="47" rx="10" ry="7" fill="#9e9e9e" opacity="0.5" />
      {/* Head (wide, flat) */}
      <ellipse cx="24" cy="25" rx="17" ry="14" fill="#757575" />
      {/* Black face mask sides */}
      <ellipse cx="14" cy="26" rx="9" ry="12" fill="#1a1a1a" />
      <ellipse cx="34" cy="26" rx="9" ry="12" fill="#1a1a1a" />
      {/* White center stripe */}
      <rect x="19" y="12" width="10" height="24" rx="5" fill="#fafafa" />
      {/* Ears (small, rounded, black-tipped) */}
      <circle cx="12" cy="13" r="6" fill="#757575" />
      <circle cx="36" cy="13" r="6" fill="#757575" />
      <circle cx="12" cy="13" r="4.5" fill="#1a1a1a" />
      <circle cx="36" cy="13" r="4.5" fill="#1a1a1a" />
      <circle cx="12" cy="13" r="2.5" fill="#fafafa" opacity="0.9" />
      <circle cx="36" cy="13" r="2.5" fill="#fafafa" opacity="0.9" />
      {/* Eyes (on black mask — white sclera) */}
      <circle cx="16" cy="23" r="4" fill="#fff" />
      <circle cx="32" cy="23" r="4" fill="#fff" />
      <circle cx="16" cy="23" r="2.5" fill="#111" />
      <circle cx="32" cy="23" r="2.5" fill="#111" />
      <circle cx="17" cy="22" r="0.9" fill="#fff" opacity="0.9" />
      <circle cx="33" cy="22" r="0.9" fill="#fff" opacity="0.9" />
      {/* Nose (broad) */}
      <ellipse cx="24" cy="32" rx="4.5" ry="3.2" fill="#111" />
      <ellipse cx="23" cy="31.5" rx="1.4" ry="0.9" fill="#444" opacity="0.5" />
      {/* Paws */}
      <ellipse cx="13" cy="54" rx="7" ry="3.5" fill="#424242" />
      <ellipse cx="35" cy="54" rx="7" ry="3.5" fill="#424242" />
    </svg>
  );
}

function LacisSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 48 56" aria-label="Lācis">
      {/* Body */}
      <ellipse cx="24" cy="45" rx="18" ry="11" fill="#5d4037" />
      <ellipse cx="24" cy="48" rx="11" ry="8" fill="#795548" />
      {/* Head (big round) */}
      <circle cx="24" cy="24" r="18" fill="#5d4037" />
      {/* Round ears */}
      <circle cx="9" cy="10" r="8" fill="#5d4037" />
      <circle cx="39" cy="10" r="8" fill="#5d4037" />
      <circle cx="9" cy="10" r="5.5" fill="#4e342e" />
      <circle cx="39" cy="10" r="5.5" fill="#4e342e" />
      <circle cx="9" cy="10" r="3.5" fill="#6d4c41" />
      <circle cx="39" cy="10" r="3.5" fill="#6d4c41" />
      {/* Muzzle */}
      <ellipse cx="24" cy="30" rx="10" ry="8" fill="#795548" />
      <ellipse cx="24" cy="30" rx="7" ry="5.5" fill="#8d6e63" opacity="0.6" />
      {/* Eyes */}
      <circle cx="16" cy="21" r="4" fill="#1a1a1a" />
      <circle cx="32" cy="21" r="4" fill="#1a1a1a" />
      <circle cx="17.2" cy="19.8" r="1.4" fill="#fff" />
      <circle cx="33.2" cy="19.8" r="1.4" fill="#fff" />
      {/* Nose */}
      <ellipse cx="24" cy="27" rx="5.5" ry="4" fill="#111" />
      <ellipse cx="23" cy="26.5" rx="1.8" ry="1.1" fill="#444" opacity="0.4" />
      {/* Paws */}
      <ellipse cx="12" cy="54" rx="8" ry="4.5" fill="#4e342e" />
      <ellipse cx="36" cy="54" rx="8" ry="4.5" fill="#4e342e" />
    </svg>
  );
}

function AlnisSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 48 56" aria-label="Alnis">
      {/* Antlers (left) */}
      <line x1="18" y1="9" x2="10" y2="1" stroke="#8d6e63" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="10" y1="1" x2="4" y2="6" stroke="#8d6e63" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="10" y1="1" x2="6" y2="12" stroke="#8d6e63" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="6" y1="12" x2="2" y2="8" stroke="#8d6e63" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="12" x2="2" y2="18" stroke="#8d6e63" strokeWidth="2" strokeLinecap="round" />
      {/* Antlers (right) */}
      <line x1="30" y1="9" x2="38" y2="1" stroke="#8d6e63" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="38" y1="1" x2="44" y2="6" stroke="#8d6e63" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="38" y1="1" x2="42" y2="12" stroke="#8d6e63" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="12" x2="46" y2="8" stroke="#8d6e63" strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="12" x2="46" y2="18" stroke="#8d6e63" strokeWidth="2" strokeLinecap="round" />
      {/* Body */}
      <ellipse cx="24" cy="46" rx="16" ry="10" fill="#8d6e63" />
      {/* Neck */}
      <rect x="18" y="33" width="12" height="15" rx="4" fill="#8d6e63" />
      {/* Bell/dewlap */}
      <ellipse cx="24" cy="40" rx="4" ry="6" fill="#6d4c41" opacity="0.65" />
      {/* Head (long, horse-like) */}
      <ellipse cx="24" cy="22" rx="11" ry="15" fill="#8d6e63" />
      {/* Ear flaps */}
      <ellipse cx="13" cy="15" rx="4" ry="6" fill="#8d6e63" />
      <ellipse cx="35" cy="15" rx="4" ry="6" fill="#8d6e63" />
      <ellipse cx="13" cy="15" rx="2" ry="4" fill="#d7ccc8" opacity="0.6" />
      <ellipse cx="35" cy="15" rx="2" ry="4" fill="#d7ccc8" opacity="0.6" />
      {/* Eyes */}
      <circle cx="17" cy="16" r="4" fill="#1a1a1a" />
      <circle cx="31" cy="16" r="4" fill="#1a1a1a" />
      <circle cx="18.3" cy="14.8" r="1.4" fill="#fff" />
      <circle cx="32.3" cy="14.8" r="1.4" fill="#fff" />
      {/* Snout (bulbous) */}
      <ellipse cx="24" cy="31" rx="8" ry="6" fill="#7b5e52" />
      {/* Nostrils */}
      <ellipse cx="20.5" cy="31" rx="2.5" ry="2" fill="#4e342e" />
      <ellipse cx="27.5" cy="31" rx="2.5" ry="2" fill="#4e342e" />
    </svg>
  );
}

function LaumaSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 48 56" aria-label="Meža Lauma">
      {/* Hair flowing wide */}
      <path d="M8,22 Q0,36 2,56" fill="none" stroke="#1b5e20" strokeWidth="11" strokeLinecap="round" />
      <path d="M40,22 Q48,36 46,56" fill="none" stroke="#1b5e20" strokeWidth="11" strokeLinecap="round" />
      {/* Hair volume highlights */}
      <path d="M10,24 Q4,38 6,56" fill="none" stroke="#388e3c" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <path d="M38,24 Q44,38 42,56" fill="none" stroke="#388e3c" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <path d="M12,26 Q8,40 10,56" fill="none" stroke="#66bb6a" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <path d="M36,26 Q40,40 38,56" fill="none" stroke="#66bb6a" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      {/* Hair on top of head */}
      <ellipse cx="24" cy="14" rx="16" ry="14" fill="#2e7d32" />
      <ellipse cx="24" cy="13" rx="12" ry="9" fill="#388e3c" opacity="0.6" />
      {/* Dress / body */}
      <path d="M14,42 Q9,54 11,56 L37,56 Q39,54 34,42 Q24,50 14,42Z" fill="#2e7d32" />
      <path d="M17,42 Q24,52 31,42 Q28,47 24,50 Q20,47 17,42Z" fill="#66bb6a" opacity="0.5" />
      {/* Leaf hem detail */}
      <path d="M11,56 Q14,50 17,54 Q20,49 24,53 Q28,49 31,54 Q34,50 37,56" fill="#1b5e20" />
      {/* Neck */}
      <rect x="20" y="35" width="8" height="9" rx="3.5" fill="#fce4ec" />
      {/* Face */}
      <ellipse cx="24" cy="26" rx="13" ry="14" fill="#fce4ec" />
      {/* Ears (delicate) */}
      <ellipse cx="11" cy="26" rx="3.5" ry="5" fill="#fce4ec" />
      <ellipse cx="37" cy="26" rx="3.5" ry="5" fill="#fce4ec" />
      <ellipse cx="11" cy="26" rx="1.8" ry="3" fill="#f8bbd0" opacity="0.65" />
      <ellipse cx="37" cy="26" rx="1.8" ry="3" fill="#f8bbd0" opacity="0.65" />
      {/* Flower crown */}
      <path d="M11,16 Q14,8 20,14 Q22,6 24,13 Q26,6 28,14 Q34,8 37,16" fill="#1b5e20" />
      <circle cx="24" cy="12" r="3" fill="#ffb300" />
      <circle cx="17" cy="14" r="2.2" fill="#e91e63" opacity="0.8" />
      <circle cx="31" cy="14" r="2.2" fill="#e91e63" opacity="0.8" />
      {/* Eyebrows (arched, elegant) */}
      <path d="M15,21 Q19,17 23,20" fill="none" stroke="#1b5e20" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M25,20 Q29,17 33,21" fill="none" stroke="#1b5e20" strokeWidth="1.6" strokeLinecap="round" />
      {/* Eyes (green, large, expressive) */}
      <ellipse cx="19" cy="24" rx="5" ry="4.5" fill="#fff" />
      <ellipse cx="29" cy="24" rx="5" ry="4.5" fill="#fff" />
      <circle cx="19" cy="24" r="3.5" fill="#2e7d32" />
      <circle cx="29" cy="24" r="3.5" fill="#2e7d32" />
      <circle cx="19" cy="24" r="1.8" fill="#111" />
      <circle cx="29" cy="24" r="1.8" fill="#111" />
      <circle cx="20.2" cy="22.8" r="1" fill="#fff" opacity="0.9" />
      <circle cx="30.2" cy="22.8" r="1" fill="#fff" opacity="0.9" />
      {/* Eyelashes (upper) */}
      <path d="M14.5,21 Q16,19 17.5,21" fill="none" stroke="#1b5e20" strokeWidth="1" />
      <path d="M20.5,21 Q22,19 23.5,21" fill="none" stroke="#1b5e20" strokeWidth="1" />
      <path d="M24.5,21 Q26,19 27.5,21" fill="none" stroke="#1b5e20" strokeWidth="1" />
      <path d="M30.5,21 Q32,19 33.5,21" fill="none" stroke="#1b5e20" strokeWidth="1" />
      {/* Nose (button) */}
      <ellipse cx="24" cy="29" rx="2.2" ry="1.5" fill="#f8bbd0" />
      {/* Lips (full, rose) */}
      <path d="M19.5,32.5 Q24,36 28.5,32.5" fill="#e91e63" opacity="0.85" />
      <path d="M20,32 Q24,35.5 28,32" fill="none" stroke="#c2185b" strokeWidth="1.5" strokeLinecap="round" />
      {/* Sparkles around */}
      <circle cx="4" cy="18" r="2.2" fill="#76ff03" opacity="0.9" />
      <circle cx="44" cy="14" r="1.6" fill="#76ff03" opacity="0.85" />
      <circle cx="2" cy="36" r="1.8" fill="#b9f6ca" opacity="0.8" />
      <circle cx="46" cy="38" r="2" fill="#76ff03" opacity="0.8" />
      <circle cx="24" cy="1" r="2" fill="#ccff90" opacity="0.9" />
      <circle cx="8" cy="48" r="1.4" fill="#69f0ae" opacity="0.75" />
      <circle cx="40" cy="50" r="1.4" fill="#69f0ae" opacity="0.75" />
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
    case 'lauma':  return <LaumaSvg />;
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
