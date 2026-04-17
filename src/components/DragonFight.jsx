import { useCallback, useEffect, useRef, useState } from 'react';
import { AvatarSvg, IceAvatarSvg, LavaAvatarSvg } from './GnomeGame';
import './DragonFight.css';

const COLS = 18;
const ROWS = 10;
const CELL = 38;
const GROUND = 8;
const JUMP_Y = 3;
const P_MAX_HP = 10;
const D_MAX_HP = 5;

const MINE_START = [
  { x: 4, y: GROUND },
  { x: 8, y: GROUND },
  { x: 12, y: GROUND },
  { x: 15, y: GROUND },
];

const MOVE_CD  = 180;
const DRAG_MS  = 420;
const ATK_MS   = 900;
const JUMP_MS  = 1500;

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
    <svg viewBox="0 0 36 36" width={CELL - 8} height={CELL - 8} aria-label="Mīna">
      <line x1="18" y1="9"  x2="18" y2="3"  stroke="#546e7a" strokeWidth="3" strokeLinecap="round" />
      <line x1="10" y1="13" x2="4"  y2="8"  stroke="#546e7a" strokeWidth="3" strokeLinecap="round" />
      <line x1="26" y1="13" x2="32" y2="8"  stroke="#546e7a" strokeWidth="3" strokeLinecap="round" />
      <line x1="7"  y1="22" x2="1"  y2="22" stroke="#546e7a" strokeWidth="3" strokeLinecap="round" />
      <line x1="29" y1="22" x2="35" y2="22" stroke="#546e7a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="18" cy="23" r="12" fill="#37474f" />
      <circle cx="18" cy="23" r="9.5" fill="#546e7a" />
      <circle cx="14" cy="19" r="2.8" fill="#fff" opacity="0.18" />
      <path d="M18,10 Q22,5 20,2" fill="none" stroke="#ffa726" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="2" r="1.5" fill="#ffa726" />
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

export default function DragonFight({ characterId, world, onWin, onLose }) {
  /* ---- state ---- */
  const [px, setPx]               = useState(1);
  const [py, setPy]               = useState(GROUND);
  const [drX, setDrX]             = useState(COLS - 2);
  const [drY, setDrY]             = useState(GROUND);
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
    px: 1, py: GROUND, drX: COLS - 2, drY: GROUND,
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

  const checkMine = useCallback((x, y, moveDir) => {
    const k = ck(x, y);
    if (!G.current.mines.has(k)) return;
    const next = new Set(G.current.mines);
    next.delete(k);
    G.current.mines = next;
    setMines(new Set(next));
    const push = moveDir !== 0 ? -moveDir * 3 : (x > COLS / 2 ? -3 : 3);
    const nx = Math.max(1, Math.min(COLS - 2, x + push));
    G.current.px = nx;
    setPx(nx);
    hurtPlayer(1);
  }, [hurtPlayer]);

  const doJump = useCallback(() => {
    if (G.current.jumping || G.current.result || G.current.py !== GROUND) return;
    G.current.jumping = true;
    G.current.py = JUMP_Y;
    setJumping(true);
    setPy(JUMP_Y);
    jumpTm.current = setTimeout(() => {
      if (G.current.result) return;
      G.current.jumping = false;
      G.current.py = GROUND;
      setJumping(false);
      setPy(GROUND);
      // Land on dragon?
      if (G.current.px === G.current.drX) {
        hurtDragon(1);
      }
      // Land on mine?
      checkMine(G.current.px, GROUND, 0);
    }, JUMP_MS);
  }, [hurtDragon, checkMine]);

  const movePlayer = useCallback((dir) => {
    if (G.current.result || moveCd.current) return;
    moveCd.current = true;
    setTimeout(() => { moveCd.current = false; }, MOVE_CD);
    const nx = G.current.px + dir;
    if (nx < 1 || nx > COLS - 2) return;
    G.current.px = nx;
    setPx(nx);
    if (G.current.py === GROUND) {
      checkMine(nx, GROUND, dir);
    }
  }, [checkMine]);

  /* ---- Dragon AI: move ---- */
  useEffect(() => {
    dragTimer.current = setInterval(() => {
      if (G.current.result) return;
      const { px, drX } = G.current;
      if (px === drX) return;
      const dir = px > drX ? 1 : -1;
      const nx = drX + dir;
      if (nx < 1 || nx > COLS - 2) return;
      if (nx === G.current.px && G.current.py === GROUND) return;
      G.current.drX = nx;
      setDrX(nx);
    }, DRAG_MS);
    return () => clearInterval(dragTimer.current);
  }, []);

  /* ---- Dragon AI: attack ---- */
  useEffect(() => {
    atkTimer.current = setInterval(() => {
      if (G.current.result) return;
      const { px, py, drX, drY } = G.current;
      const adj = Math.abs(px - drX) <= 1 && py === GROUND && drY === GROUND;
      if (!adj) return;
      hurtPlayer(1);
    }, ATK_MS);
    return () => clearInterval(atkTimer.current);
  }, [hurtPlayer]);

  /* ---- Keyboard ---- */
  useEffect(() => {
    const h = (e) => {
      if (e.code === 'ArrowLeft')  { e.preventDefault(); movePlayer(-1); }
      if (e.code === 'ArrowRight') { e.preventDefault(); movePlayer(1); }
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
      px: 1, py: GROUND, drX: COLS - 2, drY: GROUND,
      playerHp: P_MAX_HP, dragonHp: D_MAX_HP,
      jumping: false, mines: new Set(MINE_START.map(m => ck(m.x, m.y))),
      result: null,
    };
    setPx(1); setPy(GROUND); setDrX(COLS - 2); setDrY(GROUND);
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
              const isGround  = !isWall && row === GROUND;
              const isSky     = !isWall && row < GROUND;
              const isPlayer  = col === px && row === py;
              const isDragon  = col === drX && row === drY;
              const isMine    = mines.has(ck(col, row));
              return (
                <div
                  key={ck(col, row)}
                  className={[
                    'df-cell',
                    isWall   ? 'df-cell--wall'   : '',
                    isGround ? 'df-cell--ground' : '',
                    isSky    ? 'df-cell--sky'    : '',
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

      {/* D-pad + jump */}
      <div className="df-dpad">
        <button type="button" className="df-btn" onClick={() => movePlayer(-1)}>◀</button>
        <button type="button" className="df-btn df-btn--jump" onClick={doJump} disabled={jumping}>
          <span className="df-jump-icon">↑</span>
          <span className="df-jump-label">Lēkt (Space)</span>
        </button>
        <button type="button" className="df-btn" onClick={() => movePlayer(1)}>▶</button>
      </div>
      <p className="df-hint">
        Lēc pāri pūķim — kad nolec uz viņa šūnas, tas zaudē 1 dzīvību! · Uzmanieties no mīnām 💥
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
