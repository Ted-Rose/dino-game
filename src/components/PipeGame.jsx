import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import './PipeGame.css';

const COINS_STORAGE_KEY = 'pipe-game-coins';

function loadStoredCoins() {
  try {
    const raw = localStorage.getItem(COINS_STORAGE_KEY);
    const n = raw === null ? NaN : parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Nauda par instrumentiem plauktā */
const SHOP_PRICES = {
  straight: 38,
  corner: 48,
  cross: 85,
};

/** Par N. līmeņa iziešanu: 50 × N (1. → 50, 2. → 100, 3. → 150, …). */
function coinsForCompletedLevel(levelNumber) {
  return 50 * levelNumber;
}

/**
 * Kustīgie šķēršļi: katram ir path[] — secīgi lauciņi; katru soli pārvietojas uz nākamo šūnu.
 * flowOffset — ūdens vārtu atvēršana (pārmaiņus ar gatePhase).
 */
const LEVEL_CONFIGS = [
  {
    cols: 8,
    rows: 6,
    tap: { x: 0, y: 3 },
    aquarium: { x: 7, y: 3 },
    staticBlocks: new Set(),
    movingGates: [],
    inventory: { straight: 10, corner: 12, cross: 0 },
  },
  {
    cols: 8,
    rows: 6,
    tap: { x: 0, y: 3 },
    aquarium: { x: 7, y: 3 },
    staticBlocks: new Set(['3,3', '4,3']),
    movingGates: [
      {
        path: [
          { x: 1, y: 2 },
          { x: 2, y: 2 },
          { x: 3, y: 2 },
          { x: 4, y: 2 },
          { x: 5, y: 2 },
          { x: 6, y: 2 },
          { x: 5, y: 2 },
          { x: 4, y: 2 },
          { x: 3, y: 2 },
          { x: 2, y: 2 },
        ],
        pathOffset: 0,
        flowOffset: 0,
      },
      {
        path: [
          { x: 6, y: 5 },
          { x: 6, y: 4 },
          { x: 6, y: 3 },
          { x: 6, y: 2 },
          { x: 5, y: 3 },
          { x: 5, y: 4 },
          { x: 5, y: 5 },
          { x: 6, y: 5 },
        ],
        pathOffset: 3,
        flowOffset: 1,
      },
    ],
    inventory: { straight: 14, corner: 16, cross: 2 },
  },
  {
    cols: 8,
    rows: 6,
    tap: { x: 0, y: 3 },
    aquarium: { x: 7, y: 3 },
    staticBlocks: new Set(['3,3', '4,3', '2,3', '5,3']),
    movingGates: [
      {
        path: [
          { x: 1, y: 2 },
          { x: 2, y: 2 },
          { x: 3, y: 2 },
          { x: 4, y: 2 },
          { x: 5, y: 2 },
          { x: 6, y: 2 },
          { x: 5, y: 2 },
          { x: 4, y: 2 },
          { x: 3, y: 2 },
          { x: 2, y: 2 },
        ],
        pathOffset: 1,
        flowOffset: 0,
      },
      {
        path: [
          { x: 6, y: 5 },
          { x: 6, y: 4 },
          { x: 5, y: 4 },
          { x: 5, y: 5 },
          { x: 6, y: 5 },
        ],
        pathOffset: 0,
        flowOffset: 1,
      },
    ],
    inventory: { straight: 16, corner: 18, cross: 3 },
  },
  {
    cols: 8,
    rows: 6,
    tap: { x: 0, y: 3 },
    aquarium: { x: 7, y: 3 },
    staticBlocks: new Set(['3,3', '4,3', '2,3', '5,3', '3,2', '4,2']),
    movingGates: [
      {
        path: [
          { x: 1, y: 5 },
          { x: 2, y: 5 },
          { x: 3, y: 5 },
          { x: 4, y: 5 },
          { x: 5, y: 5 },
          { x: 6, y: 5 },
          { x: 5, y: 5 },
          { x: 4, y: 5 },
          { x: 3, y: 5 },
          { x: 2, y: 5 },
        ],
        pathOffset: 0,
        flowOffset: 0,
      },
      {
        path: [
          { x: 1, y: 1 },
          { x: 1, y: 2 },
          { x: 1, y: 3 },
          { x: 1, y: 4 },
          { x: 1, y: 5 },
        ],
        pathOffset: 2,
        flowOffset: 1,
      },
      {
        path: [
          { x: 6, y: 1 },
          { x: 6, y: 2 },
          { x: 6, y: 3 },
          { x: 6, y: 4 },
          { x: 6, y: 5 },
        ],
        pathOffset: 1,
        flowOffset: 0,
      },
    ],
    inventory: { straight: 18, corner: 20, cross: 4 },
  },
  {
    cols: 8,
    rows: 6,
    tap: { x: 0, y: 3 },
    aquarium: { x: 7, y: 3 },
    staticBlocks: new Set(['3,3', '4,3', '2,3', '5,3', '3,2', '4,2', '2,5', '5,5']),
    movingGates: [
      {
        path: [
          { x: 3, y: 5 },
          { x: 4, y: 5 },
          { x: 3, y: 5 },
        ],
        pathOffset: 0,
        flowOffset: 0,
      },
      {
        path: [
          { x: 1, y: 1 },
          { x: 1, y: 2 },
          { x: 1, y: 3 },
          { x: 1, y: 4 },
        ],
        pathOffset: 0,
        flowOffset: 1,
      },
      {
        path: [
          { x: 6, y: 1 },
          { x: 6, y: 2 },
          { x: 6, y: 3 },
          { x: 6, y: 4 },
        ],
        pathOffset: 2,
        flowOffset: 0,
      },
    ],
    inventory: { straight: 20, corner: 22, cross: 5 },
  },
];

const DIR = {
  N: [0, -1],
  E: [1, 0],
  S: [0, 1],
  W: [-1, 0],
};
const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
const ORDER = ['N', 'E', 'S', 'W'];

function rotateDirection(d, quarterTurns) {
  const i = ORDER.indexOf(d);
  return ORDER[(i + quarterTurns + 4) % 4];
}

function baseOpenings(kind) {
  if (kind === 'straight') return ['E', 'W'];
  if (kind === 'corner') return ['N', 'E'];
  if (kind === 'cross') return ['N', 'E', 'S', 'W'];
  return [];
}

function openingsFor(kind, rot) {
  return baseOpenings(kind).map((d) => rotateDirection(d, rot));
}

function emptyGrid(cfg) {
  return Array.from({ length: cfg.rows }, () =>
    Array.from({ length: cfg.cols }, () => null),
  );
}

function isTap(x, y, cfg) {
  return x === cfg.tap.x && y === cfg.tap.y;
}

function isAquarium(x, y, cfg) {
  return x === cfg.aquarium.x && y === cfg.aquarium.y;
}

function isFixedCell(x, y, cfg) {
  return isTap(x, y, cfg) || isAquarium(x, y, cfg);
}

function isRockTile(x, y, cfg, gateRubble) {
  const k = `${x},${y}`;
  return cfg.staticBlocks.has(k) || gateRubble.has(k);
}

/** Šūna, kurā konkrētais šķērslis ir šajā laikā (tick = gatePhase). */
function gateWorldPosition(mover, tick) {
  const path = mover.path;
  if (!path?.length) return null;
  const len = path.length;
  const off = mover.pathOffset ?? 0;
  const idx = ((tick + off) % len + len) % len;
  return path[idx];
}

function moverAtCell(x, y, cfg, tick) {
  for (const mover of cfg.movingGates) {
    const p = gateWorldPosition(mover, tick);
    if (p && p.x === x && p.y === y) return mover;
  }
  return null;
}

function movingGateOpen(x, y, cfg, gatePhase) {
  const mover = moverAtCell(x, y, cfg, gatePhase);
  if (!mover) return true;
  const fo = mover.flowOffset ?? mover.offset ?? 0;
  return ((gatePhase + fo) % 2) === 0;
}

function cellOpenings(x, y, grid, cfg, gatePhase, gateRubble) {
  if (isTap(x, y, cfg)) return ['E'];
  if (isAquarium(x, y, cfg)) return ['W'];
  if (isRockTile(x, y, cfg, gateRubble)) return [];
  if (!movingGateOpen(x, y, cfg, gatePhase)) return [];
  const cell = grid[y][x];
  if (!cell) return [];
  return openingsFor(cell.kind, cell.rot);
}

function buildNeighbors(x, y, grid, cfg, gatePhase, gateRubble) {
  const next = [];
  for (const d of cellOpenings(x, y, grid, cfg, gatePhase, gateRubble)) {
    const [dx, dy] = DIR[d];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= cfg.cols || ny < 0 || ny >= cfg.rows) continue;
    const back = OPP[d];
    if (!cellOpenings(nx, ny, grid, cfg, gatePhase, gateRubble).includes(back)) continue;
    next.push([nx, ny]);
  }
  return next;
}

function findReachable(grid, cfg, gatePhase, gateRubble) {
  const start = `${cfg.tap.x},${cfg.tap.y}`;
  const visited = new Set([start]);
  const parent = new Map([[start, null]]);
  const queue = [[cfg.tap.x, cfg.tap.y]];
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    if (x === cfg.aquarium.x && y === cfg.aquarium.y) {
      const pathCells = new Set();
      let key = `${x},${y}`;
      while (key) {
        pathCells.add(key);
        key = parent.get(key);
      }
      return { ok: true, pathCells };
    }
    for (const [nx, ny] of buildNeighbors(x, y, grid, cfg, gatePhase, gateRubble)) {
      const nk = `${nx},${ny}`;
      if (visited.has(nk)) continue;
      visited.add(nk);
      parent.set(nk, `${x},${y}`);
      queue.push([nx, ny]);
    }
  }
  return { ok: false, pathCells: new Set() };
}

function PipeSvg({ kind, rot, flowing, lit }) {
  const opens = openingsFor(kind, rot);
  const edges = {
    N: [50, 8],
    E: [92, 50],
    S: [50, 92],
    W: [8, 50],
  };
  const lines = opens.map((d) => (
    <line
      key={d}
      x1={50}
      y1={50}
      x2={edges[d][0]}
      y2={edges[d][1]}
      className="pipe-svg__stroke"
    />
  ));
  return (
    <svg
      className={`pipe-svg${flowing && lit ? ' pipe-svg--flowing' : ''}${lit ? ' pipe-svg--lit' : ''}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      {lines}
    </svg>
  );
}

function FaucetSvg({ flowing }) {
  return (
    <svg
      className={`faucet-svg${flowing ? ' faucet-svg--flowing' : ''}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path
        className="faucet-svg__body"
        d="M38 18h24v14a10 10 0 0 1-10 10H48a10 10 0 0 1-10-10V18z"
      />
      <path className="faucet-svg__body" d="M46 42v22h8V42z" />
      <path className="faucet-svg__spout" d="M54 58h24c6 0 10 4 10 10v6H54V58z" />
      <circle className="faucet-svg__knob" cx="62" cy="26" r="6" />
      {flowing && (
        <>
          <line className="faucet-svg__drops" x1="74" y1="78" x2="74" y2="92" />
          <line className="faucet-svg__drops" x1="80" y1="76" x2="80" y2="93" />
          <line className="faucet-svg__drops" x1="86" y1="78" x2="86" y2="90" />
        </>
      )}
    </svg>
  );
}

function AquariumSvg({ filling, clipId }) {
  const cid = clipId ?? 'aquarium-clip';
  return (
    <svg className="aquarium-svg" viewBox="0 0 100 100" aria-hidden="true">
      <rect className="aquarium-svg__glass" x="12" y="18" width="76" height="70" rx="6" />
      <clipPath id={cid}>
        <rect x="14" y="20" width="72" height="66" rx="4" />
      </clipPath>
      <g clipPath={`url(#${cid})`}>
        <rect
          className={`aquarium-svg__water${filling ? ' aquarium-svg__water--fill' : ''}`}
          x="14"
          y="58"
          width="72"
          height="34"
        />
      </g>
      <path className="aquarium-svg__rim" d="M12 22h76M12 82h76" />
      <text className="aquarium-svg__label" x="50" y="14" textAnchor="middle">
        Akvārijs
      </text>
    </svg>
  );
}

function RockObstacle() {
  return (
    <div className="rock-obstacle" aria-hidden="true">
      <div className="rock-obstacle__body" />
    </div>
  );
}

function MovingGateOverlay({ closed }) {
  return (
    <div
      className={`moving-gate-overlay${closed ? ' moving-gate-overlay--closed' : ' moving-gate-overlay--open'}`}
      aria-hidden="true"
    >
      <div className="moving-gate-overlay__bars">
        <span />
        <span />
        <span />
      </div>
      <span className="moving-gate-overlay__hint">
        {closed ? 'Aizvērts' : 'Vaļā'}
      </span>
    </div>
  );
}

const SHELF_TYPES = [
  { kind: 'straight', label: 'Taisnā' },
  { kind: 'corner', label: 'Leņķa' },
  { kind: 'cross', label: '+ krusts' },
];

export default function PipeGame() {
  const [level, setLevel] = useState(1);
  const cfg = LEVEL_CONFIGS[level - 1];
  const maxLevel = LEVEL_CONFIGS.length;

  const [grid, setGrid] = useState(() => emptyGrid(LEVEL_CONFIGS[0]));
  const [inventory, setInventory] = useState(() => ({ ...LEVEL_CONFIGS[0].inventory }));
  const [gatePhase, setGatePhase] = useState(0);
  const aquariumClipId = useId().replace(/:/g, '');
  const [selectedKind, setSelectedKind] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [flowing, setFlowing] = useState(false);
  const [pathCells, setPathCells] = useState(() => new Set());
  const [allComplete, setAllComplete] = useState(false);
  const [coins, setCoins] = useState(loadStoredCoins);
  const [rewardFlash, setRewardFlash] = useState(null);
  const coinsEarnedLockedRef = useRef(false);
  const [gateRubble, setGateRubble] = useState(() => new Set());
  const gridRef = useRef(grid);

  const applyLevelConfig = useCallback((nextLevel) => {
    const c = LEVEL_CONFIGS[nextLevel - 1];
    setLevel(nextLevel);
    setGrid(emptyGrid(c));
    setInventory({ ...c.inventory });
    setSelectedKind(null);
    setError('');
    setSuccess(false);
    setFlowing(false);
    setPathCells(new Set());
    setGatePhase(0);
    setGateRubble(new Set());
    setAllComplete(false);
    coinsEarnedLockedRef.current = false;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COINS_STORAGE_KEY, String(coins));
    } catch {
      /* ignore */
    }
  }, [coins]);

  useEffect(() => {
    if (rewardFlash == null) return undefined;
    const t = window.setTimeout(() => setRewardFlash(null), 2800);
    return () => window.clearTimeout(t);
  }, [rewardFlash]);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    if (!cfg.movingGates.length) return undefined;
    const id = window.setInterval(() => {
      setGatePhase((p) => p + 1);
    }, 2200);
    return () => window.clearInterval(id);
  }, [cfg.movingGates.length, level]);

  /** Kad mainās vārtu fāze, jebkura caurule uz kustīgā šķērsla šūnas sabrūk → akmeņu šķērslis. */
  useEffect(() => {
    if (!cfg.movingGates.length) return;

    setGateRubble((prevRubble) => {
      const copy = gridRef.current.map((row) => row.map((c) => c));
      const next = new Set(prevRubble);
      let changed = false;

      for (const mover of cfg.movingGates) {
        const p = gateWorldPosition(mover, gatePhase);
        if (!p) continue;
        const k = `${p.x},${p.y}`;
        if (next.has(k)) continue;
        if (copy[p.y][p.x]) {
          copy[p.y][p.x] = null;
          next.add(k);
          changed = true;
        }
      }

      if (!changed) return prevRubble;

      queueMicrotask(() => {
        setGrid(copy);
        setSuccess(false);
        setFlowing(false);
        setPathCells(new Set());
        setAllComplete(false);
        coinsEarnedLockedRef.current = false;
      });

      return next;
    });
  }, [gatePhase, cfg.movingGates]);

  const reachable = useMemo(
    () => findReachable(grid, cfg, gatePhase, gateRubble),
    [grid, cfg, gatePhase, gateRubble],
  );

  const resetCurrentLevel = useCallback(() => {
    setGrid(emptyGrid(cfg));
    setInventory({ ...cfg.inventory });
    setSelectedKind(null);
    setError('');
    setSuccess(false);
    setFlowing(false);
    setPathCells(new Set());
    setGateRubble(new Set());
    setAllComplete(false);
    coinsEarnedLockedRef.current = false;
  }, [cfg]);

  const goToNextLevel = useCallback(() => {
    if (level < maxLevel) applyLevelConfig(level + 1);
  }, [level, maxLevel, applyLevelConfig]);

  const restartFromLevelOne = useCallback(() => {
    applyLevelConfig(1);
  }, [applyLevelConfig]);

  const buyPart = useCallback((kind) => {
    const price = SHOP_PRICES[kind];
    if (price == null) return;
    setCoins((current) => {
      if (current < price) return current;
      setInventory((inv) => ({ ...inv, [kind]: inv[kind] + 1 }));
      return current - price;
    });
  }, []);

  const handleShelfPick = useCallback((kind) => {
    setError('');
    setSelectedKind((prev) => (prev === kind ? null : kind));
  }, []);

  const handleCellPointerDown = useCallback(
    (x, y, event) => {
      if (isFixedCell(x, y, cfg)) return;
      if (isRockTile(x, y, cfg, gateRubble)) return;

      setError('');
      setSuccess(false);
      setFlowing(false);
      setPathCells(new Set());
      setAllComplete(false);
      coinsEarnedLockedRef.current = false;

      if (event.button === 2 || event.type === 'contextmenu') {
        event.preventDefault();
        const cell = grid[y][x];
        if (!cell) return;
        setGrid((g) => {
          const copy = g.map((row) => row.slice());
          copy[y][x] = null;
          return copy;
        });
        setInventory((inv) => ({
          ...inv,
          [cell.kind]: inv[cell.kind] + 1,
        }));
        return;
      }

      const cell = grid[y][x];
      if (cell) {
        if (cell.kind === 'cross') return;
        setGrid((g) => {
          const copy = g.map((row) => row.slice());
          copy[y][x] = { ...cell, rot: (cell.rot + 1) % 4 };
          return copy;
        });
        return;
      }

      if (!selectedKind || inventory[selectedKind] <= 0) return;

      const key = `${x},${y}`;
      const onLiveGate = moverAtCell(x, y, cfg, gatePhase) != null && !gateRubble.has(key);

      if (onLiveGate) {
        setGateRubble((prev) => new Set(prev).add(key));
        setInventory((inv) => ({
          ...inv,
          [selectedKind]: inv[selectedKind] - 1,
        }));
        return;
      }

      setGrid((g) => {
        const copy = g.map((row) => row.slice());
        copy[y][x] = { kind: selectedKind, rot: 0 };
        return copy;
      });
      setInventory((inv) => ({
        ...inv,
        [selectedKind]: inv[selectedKind] - 1,
      }));
    },
    [cfg, gatePhase, gateRubble, grid, inventory, selectedKind],
  );

  const runWater = useCallback(() => {
    const { ok, pathCells: cells } = findReachable(grid, cfg, gatePhase, gateRubble);
    if (!ok) {
      setError(
        'Ceļš nav gatavs vai kustīgais šķērslis šobrīd bloķē. Pārbaudi vārtu fāzi un caurules.',
      );
      setSuccess(false);
      setFlowing(false);
      setPathCells(new Set());
      return;
    }
    setError('');
    setSuccess(true);
    setPathCells(cells);
    setFlowing(true);
    if (level >= maxLevel) {
      setAllComplete(true);
    }
    if (!coinsEarnedLockedRef.current) {
      const gain = coinsForCompletedLevel(level);
      coinsEarnedLockedRef.current = true;
      setCoins((c) => c + gain);
      setRewardFlash(gain);
    }
  }, [grid, cfg, gatePhase, gateRubble, level, maxLevel]);

  const gateOpenAt = useCallback(
    (x, y) => movingGateOpen(x, y, cfg, gatePhase),
    [cfg, gatePhase],
  );

  const introMoving =
    cfg.movingGates.length > 0 ? (
      <>
        {' '}
        <strong>Šajā līmenī</strong> ceļā ir <strong>nekustīgi akmeņi</strong> un{' '}
        <strong>kustīgie šķēršļi</strong>, kas pārvietojas pa lauciņiem (katru ~2 s soli; katram savs ceļš).
        Ja caurule nonāk uz šūnu, kur šķērslis ir šajā brīdī — tā <strong>sabrūk</strong> un šūna kļūst par
        akmeni (daļa zaudēta). Katru soli tas pats notiek, ja uz šķēršļa lauciņa jau stāv caurule. Ūdens plūst
        tikai tad, kad vārti šūnā ir <strong>atvērti</strong> (zaļš).
      </>
    ) : null;

  return (
    <div className="pipe-game">
      <div className="pipe-game__top-bar">
        <div className="pipe-game__level-badge" aria-live="polite">
          <span className="pipe-game__level-num">{level}. līmenis</span>
          {cfg.movingGates.length > 0 && (
            <span className="pipe-game__phase">
              Šķēršļu solis {gatePhase} · ūdens fāze {gatePhase % 2 === 0 ? 'A' : 'B'}
            </span>
          )}
        </div>
        <div className="pipe-game__wallet" title="Naudiņas">
          <span className="pipe-game__wallet-icon" aria-hidden="true">
            ◉
          </span>
          <span className="pipe-game__wallet-count">{coins}</span>
          <span className="visually-hidden"> naudiņas</span>
        </div>
      </div>

      {rewardFlash != null && (
        <p className="pipe-game__reward-toast" role="status">
          +{rewardFlash} naudiņas par {level}. līmeni!
        </p>
      )}

      <p className="pipe-game__intro">
        Savieno caurules no krāna līdz akvārijam. Par katru pareizi izietu līmeni nauda ir{' '}
        <strong>50 × līmeņa numurs</strong> (1. līmenis → 50 ◉, 2. → 100 ◉, 3. → 150 ◉ utt.); to vari tērēt{' '}
        <strong>veikalā</strong> papildu caurulēm. Instrumentu plauktā izvēlies daļas, klikšķini tukšā lauciņā; vēlreiz klikšķini uz
        caurules, lai grieztu (krusta forma negriežas). Labais klikšķis — noņemt.{introMoving}
      </p>

      <div className="pipe-game__shop" aria-label="Veikals">
        <span className="pipe-game__shop-label">Veikals — papildu instrumenti</span>
        <div className="pipe-game__shop-row">
          {SHELF_TYPES.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              className="shop-buy-btn"
              onClick={() => buyPart(kind)}
              disabled={coins < SHOP_PRICES[kind]}
            >
              <span className="shop-buy-btn__name">{label}</span>
              <span className="shop-buy-btn__price">{SHOP_PRICES[kind]} ◉</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pipe-game__shelf" role="toolbar" aria-label="Cauruļu plaukts">
        <span className="pipe-game__shelf-label">Instrumentu plaukts</span>
        <div className="pipe-game__shelf-items">
          {SHELF_TYPES.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              className={`shelf-btn${selectedKind === kind ? ' shelf-btn--active' : ''}`}
              onClick={() => handleShelfPick(kind)}
              disabled={inventory[kind] <= 0}
            >
              <span className="shelf-btn__preview" aria-hidden="true">
                <PipeSvg kind={kind} rot={0} />
              </span>
              <span className="shelf-btn__text">{label}</span>
              <span className="shelf-btn__count">{inventory[kind]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pipe-game__board-wrap">
        <div
          className="pipe-grid"
          style={{
            gridTemplateColumns: `repeat(${cfg.cols}, minmax(32px, 44px))`,
          }}
        >
          {Array.from({ length: cfg.rows }, (_, y) =>
            Array.from({ length: cfg.cols }, (_, x) => {
              const key = `${x},${y}`;
              const onPath = flowing && pathCells.has(key);
              if (isTap(x, y, cfg)) {
                return (
                  <div
                    key={key}
                    className={`pipe-cell pipe-cell--tap${onPath ? ' pipe-cell--path' : ''}`}
                  >
                    <FaucetSvg flowing={flowing && onPath} />
                  </div>
                );
              }
              if (isAquarium(x, y, cfg)) {
                return (
                  <div
                    key={key}
                    className={`pipe-cell pipe-cell--aquarium${onPath ? ' pipe-cell--path' : ''}`}
                  >
                    <AquariumSvg filling={success && onPath} clipId={aquariumClipId} />
                  </div>
                );
              }
              if (isRockTile(x, y, cfg, gateRubble)) {
                return (
                  <div key={key} className="pipe-cell pipe-cell--rock">
                    <RockObstacle />
                  </div>
                );
              }

              const hasMovingGate = moverAtCell(x, y, cfg, gatePhase) != null;
              const gateClosed = hasMovingGate && !gateOpenAt(x, y);
              const cell = grid[y][x];

              return (
                <button
                  key={key}
                  type="button"
                  className={`pipe-cell pipe-cell--build${hasMovingGate ? ' pipe-cell--has-gate' : ''}${gateClosed ? ' pipe-cell--gate-closed' : ''}${onPath ? ' pipe-cell--path' : ''}${cell ? ' pipe-cell--filled' : ''}`}
                  onClick={(e) => handleCellPointerDown(x, y, e)}
                  onContextMenu={(e) => handleCellPointerDown(x, y, e)}
                  aria-label={
                    cell
                      ? `Caurule ${cell.kind}, griezt`
                      : hasMovingGate
                        ? 'Lauciņš ar kustīgiem vārtiem'
                        : 'Tukšs lauciņš'
                  }
                >
                  {cell && (
                    <PipeSvg
                      kind={cell.kind}
                      rot={cell.rot}
                      flowing={flowing}
                      lit={onPath}
                    />
                  )}
                  {hasMovingGate && <MovingGateOverlay closed={gateClosed} />}
                </button>
              );
            }),
          ).flat()}
        </div>
      </div>

      <div className="pipe-game__actions">
        <button type="button" className="pipe-game__btn pipe-game__btn--primary" onClick={runWater}>
          Griezt ūdeni
        </button>
        <button type="button" className="pipe-game__btn" onClick={resetCurrentLevel}>
          Notīrīt līmeni
        </button>
      </div>

      {error && (
        <p className="pipe-game__msg pipe-game__msg--error" role="alert">
          {error}
        </p>
      )}
      {success && flowing && level < maxLevel && (
        <p className="pipe-game__msg pipe-game__msg--ok" role="status">
          Ūdens plūst akvārijā! Doties uz nākamo līmeni.
        </p>
      )}
      {success && flowing && level >= maxLevel && (
        <p className="pipe-game__msg pipe-game__msg--ok" role="status">
          Pēdējais līmenis pabeigts — ūdens sasniedz akvāriju!
        </p>
      )}
      {!success && reachable.ok && (
        <p className="pipe-game__msg pipe-game__msg--hint" role="status">
          Ceļš šajā fāzē ir savienots — vari mēģināt &quot;Griezt ūdeni&quot;.
        </p>
      )}

      {success && flowing && level < maxLevel && (
        <div className="pipe-game__level-actions">
          <button type="button" className="pipe-game__btn pipe-game__btn--primary" onClick={goToNextLevel}>
            Doties uz {level + 1}. līmeni
          </button>
        </div>
      )}

      {allComplete && (
        <div className="pipe-game__level-actions">
          <button type="button" className="pipe-game__btn" onClick={restartFromLevelOne}>
            Spēlēt no 1. līmeņa
          </button>
        </div>
      )}

      <p className="pipe-game__legend" aria-hidden="true">
        Pelēkie akmeņi neapgāžami. Šķēršļi klīst pa lauciņiem; sarkans = ūdens neplūst; zaļš = vaļā.
        Kontakts salauž cauruli → akmenis.
      </p>
    </div>
  );
}
