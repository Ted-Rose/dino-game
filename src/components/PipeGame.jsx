import { useCallback, useId, useMemo, useState } from 'react';
import './PipeGame.css';

const COLS = 8;
const ROWS = 6;
const TAP = { x: 0, y: 3 };
const AQUARIUM = { x: 7, y: 3 };

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
  return [];
}

function openingsFor(kind, rot) {
  return baseOpenings(kind).map((d) => rotateDirection(d, rot));
}

function emptyGrid() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null),
  );
}

function isTap(x, y) {
  return x === TAP.x && y === TAP.y;
}

function isAquarium(x, y) {
  return x === AQUARIUM.x && y === AQUARIUM.y;
}

function isFixedCell(x, y) {
  return isTap(x, y) || isAquarium(x, y);
}

function cellOpenings(x, y, grid) {
  if (isTap(x, y)) return ['E'];
  if (isAquarium(x, y)) return ['W'];
  const cell = grid[y][x];
  if (!cell) return [];
  return openingsFor(cell.kind, cell.rot);
}

function buildNeighbors(x, y, grid) {
  const next = [];
  for (const d of cellOpenings(x, y, grid)) {
    const [dx, dy] = DIR[d];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
    const back = OPP[d];
    if (!cellOpenings(nx, ny, grid).includes(back)) continue;
    next.push([nx, ny]);
  }
  return next;
}

function findReachable(grid) {
  const start = `${TAP.x},${TAP.y}`;
  const visited = new Set([start]);
  const parent = new Map([[start, null]]);
  const queue = [[TAP.x, TAP.y]];
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    if (x === AQUARIUM.x && y === AQUARIUM.y) {
      const pathCells = new Set();
      let key = `${x},${y}`;
      while (key) {
        pathCells.add(key);
        key = parent.get(key);
      }
      return { ok: true, pathCells };
    }
    for (const [nx, ny] of buildNeighbors(x, y, grid)) {
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

const INITIAL_INV = { straight: 10, corner: 12 };

export default function PipeGame() {
  const [grid, setGrid] = useState(() => emptyGrid());
  const aquariumClipId = useId().replace(/:/g, '');
  const [inventory, setInventory] = useState(() => ({ ...INITIAL_INV }));
  const [selectedKind, setSelectedKind] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [flowing, setFlowing] = useState(false);
  const [pathCells, setPathCells] = useState(() => new Set());

  const reachable = useMemo(() => findReachable(grid), [grid]);

  const resetAll = useCallback(() => {
    setGrid(emptyGrid());
    setInventory({ ...INITIAL_INV });
    setSelectedKind(null);
    setError('');
    setSuccess(false);
    setFlowing(false);
    setPathCells(new Set());
  }, []);

  const handleShelfPick = useCallback((kind) => {
    setError('');
    setSelectedKind((prev) => (prev === kind ? null : kind));
  }, []);

  const handleCellPointerDown = useCallback(
    (x, y, event) => {
      if (isFixedCell(x, y)) return;
      setError('');
      setSuccess(false);
      setFlowing(false);
      setPathCells(new Set());

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
        setGrid((g) => {
          const copy = g.map((row) => row.slice());
          copy[y][x] = { ...cell, rot: (cell.rot + 1) % 4 };
          return copy;
        });
        return;
      }

      if (!selectedKind || inventory[selectedKind] <= 0) return;

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
    [grid, inventory, selectedKind],
  );

  const runWater = useCallback(() => {
    const { ok, pathCells: cells } = findReachable(grid);
    if (!ok) {
      setError('Ceļš no krāna līdz akvārijam nav pabeigts. Savieno caurules!');
      setSuccess(false);
      setFlowing(false);
      setPathCells(new Set());
      return;
    }
    setError('');
    setSuccess(true);
    setPathCells(cells);
    setFlowing(true);
  }, [grid]);

  return (
    <div className="pipe-game">
      <p className="pipe-game__intro">
        Savieno caurules no krāna līdz akvārijam.{' '}
        <strong>Instrumentu plauktā</strong> izvēlies caurules, klikšķini tukšā
        lauciņā, lai tās liktu; <strong>vēlreiz klikšķini</strong> uz caurules,
        lai grieztu. <strong>Labais klikšķis</strong> — noņemt un atdot
        plauktam.
      </p>

      <div className="pipe-game__shelf" role="toolbar" aria-label="Cauruļu plaukts">
        <span className="pipe-game__shelf-label">Instrumentu plaukts</span>
        <div className="pipe-game__shelf-items">
          <button
            type="button"
            className={`shelf-btn${selectedKind === 'straight' ? ' shelf-btn--active' : ''}`}
            onClick={() => handleShelfPick('straight')}
            disabled={inventory.straight <= 0}
          >
            <span className="shelf-btn__preview" aria-hidden="true">
              <PipeSvg kind="straight" rot={0} />
            </span>
            <span className="shelf-btn__text">Taisnā</span>
            <span className="shelf-btn__count">{inventory.straight}</span>
          </button>
          <button
            type="button"
            className={`shelf-btn${selectedKind === 'corner' ? ' shelf-btn--active' : ''}`}
            onClick={() => handleShelfPick('corner')}
            disabled={inventory.corner <= 0}
          >
            <span className="shelf-btn__preview" aria-hidden="true">
              <PipeSvg kind="corner" rot={0} />
            </span>
            <span className="shelf-btn__text">Leņķa</span>
            <span className="shelf-btn__count">{inventory.corner}</span>
          </button>
        </div>
      </div>

      <div className="pipe-game__board-wrap">
        <div
          className="pipe-grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, minmax(32px, 44px))`,
          }}
        >
          {Array.from({ length: ROWS }, (_, y) =>
            Array.from({ length: COLS }, (_, x) => {
              const key = `${x},${y}`;
              const onPath = flowing && pathCells.has(key);
              if (isTap(x, y)) {
                return (
                  <div key={key} className={`pipe-cell pipe-cell--tap${onPath ? ' pipe-cell--path' : ''}`}>
                    <FaucetSvg flowing={flowing && onPath} />
                  </div>
                );
              }
              if (isAquarium(x, y)) {
                return (
                  <div key={key} className={`pipe-cell pipe-cell--aquarium${onPath ? ' pipe-cell--path' : ''}`}>
                    <AquariumSvg filling={success && onPath} clipId={aquariumClipId} />
                  </div>
                );
              }
              const cell = grid[y][x];
              return (
                <button
                  key={key}
                  type="button"
                  className={`pipe-cell pipe-cell--build${onPath ? ' pipe-cell--path' : ''}${cell ? ' pipe-cell--filled' : ''}`}
                  onClick={(e) => handleCellPointerDown(x, y, e)}
                  onContextMenu={(e) => handleCellPointerDown(x, y, e)}
                  aria-label={
                    cell
                      ? `Caurule ${cell.kind}, griezt`
                      : 'Tukšs lauciņš, novietot cauruli'
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
        <button type="button" className="pipe-game__btn" onClick={resetAll}>
          Notīrīt lauciņu
        </button>
      </div>

      {error && (
        <p className="pipe-game__msg pipe-game__msg--error" role="alert">
          {error}
        </p>
      )}
      {success && flowing && (
        <p className="pipe-game__msg pipe-game__msg--ok" role="status">
          Ūdens plūst akvārijā. Lieliski!
        </p>
      )}
      {!success && reachable.ok && (
        <p className="pipe-game__msg pipe-game__msg--hint" role="status">
          Ceļš ir gatavs — spied &quot;Griezt ūdeni&quot;.
        </p>
      )}
    </div>
  );
}
