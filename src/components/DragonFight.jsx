import { useCallback, useEffect, useRef, useState } from 'react';
import { AvatarSvg, IceAvatarSvg, LavaAvatarSvg } from './GnomeGame';
import './DragonFight.css';

const COLS = 18;
const ROWS = 10;
const CELL = 38;

/** Iekšējā spēles zona (bez ārējām sienām) */
const INNER_MIN_X = 1;
const INNER_MAX_X = COLS - 2;
const INNER_MIN_Y = 1;
const INNER_MAX_Y = ROWS - 2;

const P_MAX_HP = 10;
const D_MAX_HP = 5;

const MINE_START = [
  { x: 5, y: 5 }, { x: 9, y: 3 }, { x: 12, y: 6 }, { x: 7, y: 8 },
  { x: 14, y: 4 }, { x: 4, y: 3 },
];

const MOVE_CD    = 180;
const DRAG_MS    = 360; /* pūķis ~2× lēnāk nekā spēlētāja solis */
const ATK_MS     = 900;
const JUMP_HANG_MS = 100; /* gaisā pie virsotnes */

function ck(x, y) { return `${x},${y}`; }

function DragonSvg() {
  return (
    <svg viewBox="0 0 40 40" width={CELL - 6} height={CELL - 6} aria-label="Pūķis">
      {/* Wings */}
      <path d="M20,20 Q8,11 1,17 Q6,8 14,17" fill="#4a148c" />
      <path d="M20,20 Q32,11 39,17 Q34,8 26,17" fill="#4a148c" />
      <polygon points="3,17 1,8 7,17" fill="#7b1fa2" opacity="0.85" />
      <polygon points="37,17 39,8 33,17" fill="#7b1fa2" opacity="0.85" />
      {/* Body */}
      <ellipse cx="20" cy="30" rx="13" ry="9" fill="#311b92" />
      {/* Head */}
      <ellipse cx="20" cy="17" rx="14" ry="12" fill="#311b92" />
      {/* Horns */}
      <polygon points="13,8 9,0 16,10" fill="#6a1b9a" />
      <polygon points="27,8 31,0 24,10" fill="#6a1b9a" />
      {/* Eyes */}
      <ellipse cx="13" cy="13" rx="4.5" ry="4" fill="#ff5722" />
      <ellipse cx="27" cy="13" rx="4.5" ry="4" fill="#ff5722" />
      <ellipse cx="13" cy="13" rx="1.8" ry="3.5" fill="#111" />
      <ellipse cx="27" cy="13" rx="1.8" ry="3.5" fill="#111" />
      <circle cx="14.5" cy="11.5" r="1.2" fill="#ffe082" opacity="0.85" />
      <circle cx="28.5" cy="11.5" r="1.2" fill="#ffe082" opacity="0.85" />
      {/* Flame breath */}
      <path d="M20,23 Q16,27 12,30 Q18,27 14,33 Q20,29 18,35"
        fill="none" stroke="#ff5722" strokeWidth="2" strokeLinecap="round" />
      <path d="M20,23 Q24,27 28,30 Q22,27 26,33 Q20,29 22,35"
        fill="none" stroke="#ff8c00" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      {/* Spines */}
      <polygon points="14,21 12,14 18,22" fill="#6a1b9a" />
      <polygon points="23,20 22,13 27,21" fill="#6a1b9a" />
    </svg>
  );
}

function MineSvg() {
  return (
    <svg viewBox="0 0 36 36" width={CELL - 6} height={CELL - 6} aria-label="Mīna" className="df-mine-svg">
      {/* spikes */}
      <polygon points="18,4 15,11 21,11" fill="#b71c1c" stroke="#7f0000" strokeWidth="0.5" />
      <polygon points="32,18 25,15 25,21" fill="#b71c1c" stroke="#7f0000" strokeWidth="0.5" />
      <polygon points="18,32 15,25 21,25" fill="#b71c1c" stroke="#7f0000" strokeWidth="0.5" />
      <polygon points="4,18 11,15 11,21" fill="#b71c1c" stroke="#7f0000" strokeWidth="0.5" />
      <polygon points="27,9 21,13 24,18" fill="#d32f2f" stroke="#7f0000" strokeWidth="0.5" />
      <polygon points="27,27 24,18 21,23" fill="#d32f2f" stroke="#7f0000" strokeWidth="0.5" />
      <polygon points="9,27 15,23 12,18" fill="#d32f2f" stroke="#7f0000" strokeWidth="0.5" />
      <polygon points="9,9 12,18 15,13" fill="#d32f2f" stroke="#7f0000" strokeWidth="0.5" />
      {/* body */}
      <circle cx="18" cy="18" r="11" fill="#c62828" stroke="#7f0000" strokeWidth="2" />
      <circle cx="18" cy="18" r="7.5" fill="#e53935" />
      <ellipse cx="14" cy="15" rx="2.5" ry="2" fill="#ffcdd2" opacity="0.35" />
      <circle cx="18" cy="18" r="3.5" fill="#b71c1c" opacity="0.45" />
    </svg>
  );
}

function PlayerCell({ characterId, world, jumping, flash }) {
  const AvatarComp = world === 'lava' ? LavaAvatarSvg : world === 'ice' ? IceAvatarSvg : AvatarSvg;
  return (
    <div className={`df-player-cell${jumping ? ' df-player-cell--jumping' : ''}${flash ? ' df-player-cell--hit' : ''}`}>
      <AvatarComp characterId={characterId} />
    </div>
  );
}

function clampInner(x, y) {
  return {
    x: Math.max(INNER_MIN_X, Math.min(INNER_MAX_X, x)),
    y: Math.max(INNER_MIN_Y, Math.min(INNER_MAX_Y, y)),
  };
}

export default function DragonFight({ characterId, world, onWin }) {
  /* ---- state ---- */
  const [px, setPx]               = useState(INNER_MIN_X);
  const [py, setPy]               = useState(INNER_MAX_Y);
  const [drX, setDrX]             = useState(INNER_MAX_X);
  const [drY, setDrY]             = useState(INNER_MAX_Y);
  const [playerHp, setPlayerHp]   = useState(P_MAX_HP);
  const [dragonHp, setDragonHp]   = useState(D_MAX_HP);
  const [jumping, setJumping]      = useState(false);
  const [mines, setMines]          = useState(() => new Set(MINE_START.map(m => ck(m.x, m.y))));
  const [result, setResult]        = useState(null); // null | 'win' | 'lose'
  const [flashes, setFlashes]      = useState([]);
  const [pFlash, setPFlash]        = useState(false);
  const [dFlash, setDFlash]        = useState(false);

  /* ---- mutable ref for game-loop closures ---- */
  const G = useRef({
    px: INNER_MIN_X, py: INNER_MAX_Y, drX: INNER_MAX_X, drY: INNER_MAX_Y,
    playerHp: P_MAX_HP, dragonHp: D_MAX_HP,
    jumping: false, mines: new Set(MINE_START.map(m => ck(m.x, m.y))),
    result: null,
  });

  const moveCd   = useRef(false);
  const jumpTm   = useRef(null);
  const dragTimer = useRef(null);
  const atkTimer  = useRef(null);

  /* ---- helpers ---- */
  const addFlash = useCallback((msg, isPlayer) => {
    const id = Date.now() + Math.random();
    setFlashes(prev => [...prev, { id, msg, isPlayer }]);
    setTimeout(() => setFlashes(prev => prev.filter(f => f.id !== id)), 750);
  }, []);

  const hurtPlayer = useCallback((amt) => {
    if (G.current.result) return;
    G.current.playerHp = Math.max(0, G.current.playerHp - amt);
    setPlayerHp(G.current.playerHp);
    setPFlash(true);
    setTimeout(() => setPFlash(false), 280);
    addFlash(`−${amt} ♥`, true);
    if (G.current.playerHp <= 0) {
      G.current.result = 'lose';
      setResult('lose');
    }
  }, [addFlash]);

  const hurtDragon = useCallback((amt) => {
    if (G.current.result) return;
    G.current.dragonHp = Math.max(0, G.current.dragonHp - amt);
    setDragonHp(G.current.dragonHp);
    setDFlash(true);
    setTimeout(() => setDFlash(false), 280);
    addFlash(`−${amt} 🐉`, false);
    if (G.current.dragonHp <= 0) {
      G.current.result = 'win';
      setResult('win');
    }
  }, [addFlash]);

  const checkMine = useCallback((x, y, pushDx, pushDy) => {
    const k = ck(x, y);
    if (!G.current.mines.has(k)) return;
    const next = new Set(G.current.mines);
    next.delete(k);
    G.current.mines = next;
    setMines(new Set(next));
    let nx = x;
    let ny = y;
    if (pushDx !== 0) nx = x - Math.sign(pushDx) * 3;
    else if (pushDy !== 0) ny = y - Math.sign(pushDy) * 3;
    else nx = x + (x > COLS / 2 ? -3 : 3);

    let fin = clampInner(nx, ny);
    if (fin.x === G.current.drX && fin.y === G.current.drY) {
      fin = clampInner(fin.x + (fin.x <= INNER_MIN_X + 1 ? 2 : -2), fin.y);
    }
    G.current.px = fin.x;
    G.current.py = fin.y;
    setPx(fin.x);
    setPy(fin.y);
    hurtPlayer(1);
  }, [hurtPlayer]);

  const doJump = useCallback(() => {
    if (G.current.jumping || G.current.result) return;
    const baseY = G.current.py;
    const apexY = Math.max(INNER_MIN_Y, baseY - 2);
    G.current.jumping = true;
    G.current.py = apexY;
    setJumping(true);
    setPy(apexY);
    jumpTm.current = setTimeout(() => {
      if (G.current.result) return;
      G.current.jumping = false;
      G.current.py = baseY;
      setJumping(false);
      setPy(baseY);
      /* “Uzlekt virsū”: nolaižoties šūnā tieši virs pūķa (viena rinda augstāk) */
      if (
        G.current.px === G.current.drX &&
        baseY === G.current.drY - 1
      ) {
        hurtDragon(1);
      }
      checkMine(G.current.px, baseY, 0, 0);
    }, JUMP_HANG_MS);
  }, [hurtDragon, checkMine]);

  const movePlayer = useCallback((dx, dy) => {
    if (G.current.result || moveCd.current || G.current.jumping) return;
    if (dx === 0 && dy === 0) return;
    moveCd.current = true;
    setTimeout(() => { moveCd.current = false; }, MOVE_CD);
    const nx = G.current.px + dx;
    const ny = G.current.py + dy;
    if (nx < INNER_MIN_X || nx > INNER_MAX_X || ny < INNER_MIN_Y || ny > INNER_MAX_Y) return;
    if (nx === G.current.drX && ny === G.current.drY) return;
    G.current.px = nx;
    G.current.py = ny;
    setPx(nx);
    setPy(ny);
    checkMine(nx, ny, dx, dy);
  }, [checkMine]);

  /* ---- Dragon AI: move (pilna arena) ---- */
  useEffect(() => {
    dragTimer.current = setInterval(() => {
      if (G.current.result) return;
      const { px: pxv, py: pyv, drX: dxv, drY: dyv } = G.current;
      if (pxv === dxv && pyv === dyv) return;
      const adx = pxv - dxv;
      const ady = pyv - dyv;
      const steps = [];
      if (adx !== 0) steps.push({ x: dxv + Math.sign(adx), y: dyv });
      if (ady !== 0) steps.push({ x: dxv, y: dyv + Math.sign(ady) });
      if (Math.abs(adx) < Math.abs(ady)) steps.reverse();

      for (const p of steps) {
        if (p.x < INNER_MIN_X || p.x > INNER_MAX_X || p.y < INNER_MIN_Y || p.y > INNER_MAX_Y) continue;
        if (p.x === G.current.px && p.y === G.current.py) continue;
        G.current.drX = p.x;
        G.current.drY = p.y;
        setDrX(p.x);
        setDrY(p.y);
        return;
      }
    }, DRAG_MS);
    return () => clearInterval(dragTimer.current);
  }, []);

  /* ---- Dragon uzbrūk — blakus šūna (četros virzienos) ---- */
  useEffect(() => {
    atkTimer.current = setInterval(() => {
      if (G.current.result) return;
      const { px: pxv, py: pyv, drX: dxv, drY: dyv } = G.current;
      const manhattan = Math.abs(pxv - dxv) + Math.abs(pyv - dyv);
      if (manhattan !== 1) return;
      hurtPlayer(1);
    }, ATK_MS);
    return () => clearInterval(atkTimer.current);
  }, [hurtPlayer]);

  /* ---- Keyboard ---- */
  useEffect(() => {
    const h = (e) => {
      if (e.code === 'ArrowLeft')  { e.preventDefault(); movePlayer(-1, 0); }
      if (e.code === 'ArrowRight') { e.preventDefault(); movePlayer(1, 0); }
      if (e.code === 'ArrowUp')    { e.preventDefault(); movePlayer(0, -1); }
      if (e.code === 'ArrowDown')  { e.preventDefault(); movePlayer(0, 1); }
      if (e.code === 'Space')      { e.preventDefault(); doJump(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [movePlayer, doJump]);

  /* ---- Cleanup on unmount ---- */
  useEffect(() => () => {
    clearTimeout(jumpTm.current);
    clearInterval(dragTimer.current);
    clearInterval(atkTimer.current);
  }, []);

  /* ---- Restart ---- */
  const restart = () => {
    clearTimeout(jumpTm.current);
    G.current = {
      px: INNER_MIN_X, py: INNER_MAX_Y, drX: INNER_MAX_X, drY: INNER_MAX_Y,
      playerHp: P_MAX_HP, dragonHp: D_MAX_HP,
      jumping: false, mines: new Set(MINE_START.map(m => ck(m.x, m.y))),
      result: null,
    };
    setPx(INNER_MIN_X); setPy(INNER_MAX_Y); setDrX(INNER_MAX_X); setDrY(INNER_MAX_Y);
    setPlayerHp(P_MAX_HP); setDragonHp(D_MAX_HP);
    setJumping(false); setMines(new Set(MINE_START.map(m => ck(m.x, m.y))));
    setResult(null); setFlashes([]);
    setPFlash(false); setDFlash(false);
  };

  /* ---- Render ---- */
  const pHpPct = (playerHp / P_MAX_HP) * 100;
  const dHpPct = (dragonHp / D_MAX_HP) * 100;

  return (
    <div className="dragon-fight">

      {/* HUD */}
      <div className="df-hud">
        <div className="df-combatant">
          <div className="df-hp-label">Tu — ♥ {playerHp}/{P_MAX_HP}</div>
          <div className="df-hp-track">
            <div className="df-hp-bar df-hp-bar--player" style={{ width: `${pHpPct}%` }} />
          </div>
        </div>
        <div className="df-vs">⚔️</div>
        <div className="df-combatant df-combatant--right">
          <div className="df-hp-label df-hp-label--right">Pūķis 🐉 — ♥ {dragonHp}/{D_MAX_HP}</div>
          <div className="df-hp-track">
            <div className="df-hp-bar df-hp-bar--dragon" style={{ width: `${dHpPct}%` }} />
          </div>
        </div>
      </div>

      {/* Arena */}
      <div className="df-arena-wrap">
        <div
          className="df-arena"
          style={{
            gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`,
          }}
        >
          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => {
              const isWall    = row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1;
              const isFloor   = !isWall;
              const isPlayer  = col === px && row === py;
              const isDragon  = col === drX && row === drY;
              const isMine    = mines.has(ck(col, row));
              return (
                <div
                  key={ck(col, row)}
                  className={[
                    'df-cell',
                    isWall   ? 'df-cell--wall'   : '',
                    isFloor  ? 'df-cell--floor'  : '',
                    isPlayer && pFlash ? 'df-cell--p-hit' : '',
                    isDragon && dFlash ? 'df-cell--d-hit' : '',
                  ].join(' ').trim()}
                >
                  {isPlayer && (
                    <PlayerCell
                      characterId={characterId}
                      world={world}
                      jumping={jumping}
                      flash={pFlash}
                    />
                  )}
                  {isDragon && <div className="df-dragon-wrap"><DragonSvg /></div>}
                  {isMine   && <div className="df-mine-wrap"><MineSvg /></div>}
                </div>
              );
            })
          )}
        </div>
        {/* Floating flash messages */}
        {flashes.map(f => (
          <div
            key={f.id}
            className={`df-flash${f.isPlayer ? ' df-flash--player' : ' df-flash--dragon'}`}
          >
            {f.msg}
          </div>
        ))}
      </div>

      {/* Vadība */}
      <div className="df-controls">
        <div className="df-dpad-grid">
          <div className="df-dpad-cell" />
          <button type="button" className="df-btn df-btn--mini" onClick={() => movePlayer(0, -1)} aria-label="Augšup">▲</button>
          <div className="df-dpad-cell" />
          <button type="button" className="df-btn df-btn--mini" onClick={() => movePlayer(-1, 0)} aria-label="Pa kreisi">◀</button>
          <button type="button" className="df-btn df-btn--jump" onClick={doJump} disabled={jumping}>
            <span className="df-jump-icon">↑</span>
            <span className="df-jump-label">Lēkt</span>
          </button>
          <button type="button" className="df-btn df-btn--mini" onClick={() => movePlayer(1, 0)} aria-label="Pa labi">▶</button>
          <div className="df-dpad-cell" />
          <button type="button" className="df-btn df-btn--mini" onClick={() => movePlayer(0, 1)} aria-label="Lejup">▼</button>
          <div className="df-dpad-cell" />
        </div>
        <p className="df-space-hint">Tastatūrā: bultiņas + Space (lēkt)</p>
      </div>
      <p className="df-hint">
        Kusties pa visu laukumu. Lēcienā tu augsti 2 rindas un gaisā karājies 0,1 s — nolaidies tieši virs pūķa (viena šūna augstāk par viņu), lai atņemtu 1 dzīvību. Sarkanās mīnas 💥
      </p>

      {/* Result overlay */}
      {result && (
        <div className="df-result">
          {result === 'win' ? (
            <>
              <p className="df-result__title">🎉 Pūķis uzvarēts!</p>
              <p className="df-result__sub">Tu esi leģendārais varonis!</p>
              <button type="button" className="df-result__btn" onClick={onWin}>
                🏆 Svinēt uzvaru!
              </button>
            </>
          ) : (
            <>
              <p className="df-result__title">💀 Tu zaudēji...</p>
              <p className="df-result__sub">Pūķis šoreiz uzvarēja. Mēģini vēlreiz!</p>
              <button type="button" className="df-result__btn df-result__btn--retry" onClick={restart}>
                🔄 Mēģināt vēlreiz
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
