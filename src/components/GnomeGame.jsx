import { useCallback, useEffect, useState } from 'react';
import './GnomeGame.css';

const CELL = 48;

/** Simboli: ' '=brīvs, '#'=siena, 'T'=koks, 'R'=rūķis sākums, 'H'=mājiņa, 'C'=akmeņi */
const LEVELS = [
  {
    label: '1. līmenis',
    reward: 60,
    map: [
      '########',
      '#R     #',
      '#  ##  #',
      '#  ##  #',
      '#     H#',
      '########',
    ],
  },
  {
    label: '2. līmenis',
    reward: 120,
    map: [
      '##########',
      '#R  #    #',
      '#   #  T #',
      '# ###    #',
      '#   # ## #',
      '# T #    #',
      '#   #### #',
      '#       H#',
      '##########',
    ],
  },
  {
    label: '3. līmenis',
    reward: 180,
    map: [
      '############',
      '#R  T  #   #',
      '# #### # T #',
      '#      #   #',
      '# #### ####',
      '# #        #',
      '# # ###### #',
      '#   #    T #',
      '##### #### #',
      '#    #    H#',
      '############',
    ],
  },
  {
    label: '4. līmenis',
    reward: 240,
    map: [
      '##############',
      '#R  T  #     #',
      '# #### # ### #',
      '#      # # # #',
      '# ######   # #',
      '#      ##### #',
      '# #### #     #',
      '# #    # ### #',
      '# # #### # # #',
      '# #      # T #',
      '# ######## # #',
      '#  T       #H#',
      '##############',
    ],
  },
  {
    label: '5. līmenis',
    reward: 300,
    map: [
      '################',
      '#R  T  #   T   #',
      '# #### # ##### #',
      '#      #       #',
      '# ########## # #',
      '#            # #',
      '# ########## # #',
      '# #   T    # # #',
      '# # ###### # # #',
      '# # #      # # #',
      '# # # #### # # #',
      '# # #    # # # #',
      '# # #### # # # #',
      '# #        # T #',
      '# ########## # #',
      '#    T       #H#',
      '################',
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

/* ---- Vizuālie SVG komponenti ---- */

function CellBg({ ch }) {
  if (ch === '#') return <div className="gc-wall" />;
  if (ch === 'T') return <div className="gc-tree">🌲</div>;
  return <div className="gc-floor" />;
}

function GnomeSvg() {
  return (
    <svg className="gc-gnome" viewBox="0 0 32 40" aria-label="Rūķītis">
      {/* cepure */}
      <polygon className="gc-gnome__hat" points="16,1 8,18 24,18" />
      <rect className="gc-gnome__hat-band" x="8" y="16" width="16" height="3" rx="1" />
      {/* seja */}
      <ellipse className="gc-gnome__face" cx="16" cy="23" rx="6" ry="5" />
      {/* bārda */}
      <ellipse className="gc-gnome__beard" cx="16" cy="28" rx="7" ry="5" />
      {/* acis */}
      <circle className="gc-gnome__eye" cx="13" cy="22" r="1.2" />
      <circle className="gc-gnome__eye" cx="19" cy="22" r="1.2" />
      {/* deguns */}
      <ellipse className="gc-gnome__nose" cx="16" cy="25" rx="2" ry="1.4" />
      {/* ķermenis */}
      <rect className="gc-gnome__body" x="10" y="31" width="12" height="8" rx="3" />
    </svg>
  );
}

function HouseSvg() {
  return (
    <svg className="gc-house" viewBox="0 0 40 40" aria-label="Mājiņa">
      {/* sienas */}
      <rect className="gc-house__wall" x="6" y="20" width="28" height="18" rx="1" />
      {/* jumts */}
      <polygon className="gc-house__roof" points="20,4 4,22 36,22" />
      {/* durvis */}
      <rect className="gc-house__door" x="14" y="29" width="8" height="9" rx="2" />
      {/* logs */}
      <rect className="gc-house__window" x="24" y="24" width="6" height="6" rx="1" />
      <line className="gc-house__cross" x1="24" y1="27" x2="30" y2="27" />
      <line className="gc-house__cross" x1="27" y1="24" x2="27" y2="30" />
      {/* trubiņa */}
      <rect className="gc-house__chimney" x="28" y="8" width="5" height="10" rx="1" />
    </svg>
  );
}

const DIR_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const MOVES = {
  ArrowUp:    { dx: 0, dy: -1 },
  ArrowDown:  { dx: 0, dy: 1 },
  ArrowLeft:  { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
};

export default function GnomeGame({ onCoinsChange }) {
  const [levelIdx, setLevelIdx] = useState(0);
  const [gnome, setGnome] = useState(() => parseLevel(LEVELS[0].map).gnome);
  const [levelData, setLevelData] = useState(() => parseLevel(LEVELS[0].map));
  const [won, setWon] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [steps, setSteps] = useState(0);
  const [earnedThisLevel, setEarnedThisLevel] = useState(false);

  const totalLevels = LEVELS.length;

  const loadLevel = useCallback((idx) => {
    const data = parseLevel(LEVELS[idx].map);
    setLevelData(data);
    setGnome(data.gnome);
    setWon(false);
    setSteps(0);
    setEarnedThisLevel(false);
    setAllDone(false);
  }, []);

  const tryMove = useCallback((key) => {
    if (won) return;
    const move = MOVES[key];
    if (!move) return;

    setGnome((prev) => {
      const nx = prev.x + move.dx;
      const ny = prev.y + move.dy;
      if (!isWalkable(levelData.grid, nx, ny)) return prev;

      const landed = { x: nx, y: ny };
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

      return landed;
    });
    setSteps((s) => s + 1);
  }, [won, levelData, earnedThisLevel, levelIdx, totalLevels, onCoinsChange]);

  useEffect(() => {
    const handler = (e) => {
      if (!DIR_KEYS.has(e.code)) return;
      e.preventDefault();
      tryMove(e.code);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tryMove]);

  const goNext = () => {
    const next = levelIdx + 1;
    setLevelIdx(next);
    loadLevel(next);
  };

  const restart = () => loadLevel(levelIdx);
  const restartAll = () => { setLevelIdx(0); loadLevel(0); };

  const { grid, house, cols, rows } = levelData;

  return (
    <div className="gnome-game">
      <div className="gnome-game__header">
        <span className="gnome-game__level-badge">{LEVELS[levelIdx].label}</span>
        <span className="gnome-game__steps">Soļi: {steps}</span>
        <span className="gnome-game__reward-label">
          Balva: {LEVELS[levelIdx].reward} ◉
        </span>
      </div>

      {/* Spēles laukums */}
      <div
        className="gnome-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${CELL}px)`,
          gridTemplateRows: `repeat(${rows}, ${CELL}px)`,
        }}
      >
        {grid.map((row, y) =>
          row.map((ch, x) => {
            const isGnome = gnome.x === x && gnome.y === y;
            const isHouse = house.x === x && house.y === y;
            return (
              <div key={`${x},${y}`} className="gnome-cell">
                <CellBg ch={ch} />
                {isHouse && <HouseSvg />}
                {isGnome && <GnomeSvg />}
              </div>
            );
          }),
        )}
      </div>

      {/* Ekrāna bultiņas */}
      <div className="gnome-dpad" aria-label="Kustības vadība">
        <div className="gnome-dpad__row gnome-dpad__row--top">
          <button type="button" className="gnome-dpad__btn" onClick={() => tryMove('ArrowUp')} aria-label="Uz augšu">▲</button>
        </div>
        <div className="gnome-dpad__row gnome-dpad__row--mid">
          <button type="button" className="gnome-dpad__btn" onClick={() => tryMove('ArrowLeft')} aria-label="Pa kreisi">◀</button>
          <button type="button" className="gnome-dpad__btn gnome-dpad__btn--center" onClick={restart} aria-label="Restartēt">↺</button>
          <button type="button" className="gnome-dpad__btn" onClick={() => tryMove('ArrowRight')} aria-label="Pa labi">▶</button>
        </div>
        <div className="gnome-dpad__row gnome-dpad__row--bot">
          <button type="button" className="gnome-dpad__btn" onClick={() => tryMove('ArrowDown')} aria-label="Uz leju">▼</button>
        </div>
      </div>

      {/* Uzvaras paziņojums */}
      {won && (
        <div className="gnome-game__win" role="status">
          {allDone ? (
            <>
              <p className="gnome-game__win-title">🏠 Visi līmeņi pabeigti!</p>
              <p className="gnome-game__win-sub">Kopā nopelnīti visi apbalvojumi.</p>
              <button type="button" className="gnome-game__btn gnome-game__btn--primary" onClick={restartAll}>
                Spēlēt no sākuma
              </button>
            </>
          ) : (
            <>
              <p className="gnome-game__win-title">🏠 Rūķītis sasniedzis mājiņu!</p>
              <p className="gnome-game__win-sub">+{LEVELS[levelIdx].reward} ◉  ·  Soļi: {steps}</p>
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
