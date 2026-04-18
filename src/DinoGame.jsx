import { useEffect, useRef, useState } from 'react';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 250;
const GROUND_Y = 220;

const DINO = {
  x: 50,
  width: 44,
  height: 48,
  duckHeight: 28,
};

const PHYSICS = {
  gravity: 0.7,
  jumpVelocity: -13,
  initialSpeed: 6,
  maxSpeed: 14,
  speedIncrease: 0.0015,
};

const INITIAL_LIVES_STRING =
  '0000000000000000099999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999';
const INITIAL_LIVES = BigInt(INITIAL_LIVES_STRING);

function formatLivesDisplay(livesBigInt) {
  const s = livesBigInt.toString();
  const L = INITIAL_LIVES_STRING.length;
  return s.length < L ? s.padStart(L, '0') : s;
}

const INVINCIBLE_DURATION = 90;

const HACK_SHOP = [
  {
    id: 'clear',
    name: 'Kaktusu bumba',
    desc: 'Notīra visus šķēršļus',
    price: 40,
  },
  {
    id: 'slow',
    name: 'Lēnā pasaule',
    desc: 'Skrējiena ātrums −50% apm. 5 s',
    price: 120,
    duration: 300,
  },
  {
    id: 'jump',
    name: 'Super lēciens',
    desc: 'Augstāks lēciens apm. 8 s',
    price: 90,
    duration: 480,
  },
  {
    id: 'magnet',
    name: 'Naudas magnēts',
    desc: '2× naudiņas apm. 15 s',
    price: 200,
    duration: 900,
  },
  {
    id: 'shield',
    name: 'Spoku plēve',
    desc: 'Neredzams (bez triecieniem) apm. 4 s',
    price: 160,
    duration: 240,
  },
];

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

export default function DinoGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const settingsRef = useRef({ birdLevel: 3, cactusLevel: 7 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('dino-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [birdLevel, setBirdLevel] = useState(3);
  const [cactusLevel, setCactusLevel] = useState(7);
  const [wallet, setWallet] = useState(() => {
    const raw = localStorage.getItem('dino-wallet');
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  });

  useEffect(() => {
    settingsRef.current = { birdLevel, cactusLevel };
  }, [birdLevel, cactusLevel]);

  const buyHack = (id) => {
    const item = HACK_SHOP.find((h) => h.id === id);
    if (!item) return;
    const st = stateRef.current;
    const runMoney = Math.floor(st.score);
    const totalAvailable = wallet + runMoney;
    if (totalAvailable < item.price) return;

    let owed = item.price;
    let newWallet = wallet;
    if (newWallet >= owed) {
      newWallet -= owed;
      owed = 0;
    } else {
      owed -= newWallet;
      newWallet = 0;
    }
    if (owed > 0) {
      st.score = Math.max(0, st.score - owed);
      setScore(Math.floor(st.score));
    }
    setWallet(newWallet);
    localStorage.setItem('dino-wallet', String(newWallet));

    switch (item.id) {
      case 'clear':
        st.obstacles = [];
        break;
      case 'slow':
        st.hackSlowTimer = Math.max(st.hackSlowTimer, item.duration ?? 0);
        break;
      case 'jump':
        st.hackJumpTimer = Math.max(st.hackJumpTimer, item.duration ?? 0);
        break;
      case 'magnet':
        st.hackMoneyTimer = Math.max(st.hackMoneyTimer, item.duration ?? 0);
        break;
      case 'shield':
        st.hackShieldTimer = Math.max(st.hackShieldTimer, item.duration ?? 0);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const initialState = {
      dino: {
        x: DINO.x,
        y: GROUND_Y - DINO.height,
        vy: 0,
        jumping: false,
        ducking: false,
        legFrame: 0,
        legTimer: 0,
      },
      obstacles: [],
      clouds: [
        { x: 200, y: 40 },
        { x: 500, y: 70 },
        { x: 700, y: 50 },
      ],
      ground: { offset: 0 },
      speed: PHYSICS.initialSpeed,
      score: 0,
      spawnTimer: 0,
      nextSpawn: 60,
      night: false,
      nightTimer: 0,
      running: false,
      over: false,
      lives: INITIAL_LIVES,
      invincibleTimer: 0,
      lastLifeBonusScore: 0,
      lifeNotice: { timer: 0, y: 0 },
      hackSlowTimer: 0,
      hackJumpTimer: 0,
      hackMoneyTimer: 0,
      hackShieldTimer: 0,
    };
    stateRef.current = initialState;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrame;
    let lastTime = performance.now();

    const state = stateRef.current;

    const spawnObstacle = () => {
      const { birdLevel, cactusLevel } = settingsRef.current;
      const total = birdLevel + cactusLevel;
      if (total === 0) return;

      const birdChance = birdLevel / total;
      let type;
      if (Math.random() < birdChance) {
        type = 'bird';
      } else {
        type = Math.random() < 0.6 ? 'cactus-small' : 'cactus-large';
      }

      if (type === 'cactus-small') {
        const count = Math.floor(randomRange(1, 4));
        state.obstacles.push({
          type,
          x: GAME_WIDTH,
          y: GROUND_Y - 35,
          width: 17 * count,
          height: 35,
          count,
        });
      } else if (type === 'cactus-large') {
        const count = Math.floor(randomRange(1, 3));
        state.obstacles.push({
          type,
          x: GAME_WIDTH,
          y: GROUND_Y - 50,
          width: 25 * count,
          height: 50,
          count,
        });
      } else {
        const heights = [GROUND_Y - 80, GROUND_Y - 50, GROUND_Y - 30];
        state.obstacles.push({
          type,
          x: GAME_WIDTH,
          y: heights[Math.floor(Math.random() * heights.length)],
          width: 42,
          height: 30,
          wing: 0,
          wingTimer: 0,
        });
      }
    };

    const checkCollision = (dino, obs) => {
      const dinoHeight = dino.ducking ? DINO.duckHeight : DINO.height;
      const dinoY = dino.ducking ? GROUND_Y - DINO.duckHeight : dino.y;
      const dinoWidth = dino.ducking ? DINO.width + 10 : DINO.width;

      const pad = 4;
      return (
        dino.x + pad < obs.x + obs.width - pad &&
        dino.x + dinoWidth - pad > obs.x + pad &&
        dinoY + pad < obs.y + obs.height - pad &&
        dinoY + dinoHeight - pad > obs.y + pad
      );
    };

    const update = (dt) => {
      if (!state.running || state.over) return;

      state.speed = Math.min(
        PHYSICS.maxSpeed,
        state.speed + PHYSICS.speedIncrease * dt,
      );

      if (state.hackSlowTimer > 0) {
        state.hackSlowTimer = Math.max(0, state.hackSlowTimer - dt);
      }
      if (state.hackJumpTimer > 0) {
        state.hackJumpTimer = Math.max(0, state.hackJumpTimer - dt);
      }
      if (state.hackMoneyTimer > 0) {
        state.hackMoneyTimer = Math.max(0, state.hackMoneyTimer - dt);
      }

      const moveMult = state.hackSlowTimer > 0 ? 0.52 : 1;
      const effSpeed = state.speed * moveMult;

      const dino = state.dino;
      if (dino.jumping) {
        dino.vy += PHYSICS.gravity;
        dino.y += dino.vy;
        if (dino.y >= GROUND_Y - DINO.height) {
          dino.y = GROUND_Y - DINO.height;
          dino.vy = 0;
          dino.jumping = false;
        }
      } else if (!dino.ducking) {
        dino.legTimer += dt;
        if (dino.legTimer > 6) {
          dino.legTimer = 0;
          dino.legFrame = 1 - dino.legFrame;
        }
      }

      state.ground.offset -= effSpeed;
      if (state.ground.offset <= -24) state.ground.offset += 24;

      state.clouds.forEach((c) => {
        c.x -= effSpeed * 0.3;
        if (c.x < -60) {
          c.x = GAME_WIDTH + randomRange(0, 200);
          c.y = randomRange(20, 90);
        }
      });

      state.obstacles.forEach((o) => {
        o.x -= effSpeed;
        if (o.type === 'bird') {
          o.wingTimer += dt;
          if (o.wingTimer > 10) {
            o.wingTimer = 0;
            o.wing = 1 - o.wing;
          }
        }
      });
      state.obstacles = state.obstacles.filter((o) => o.x + o.width > 0);

      state.spawnTimer += dt;
      if (state.spawnTimer > state.nextSpawn) {
        state.spawnTimer = 0;
        state.nextSpawn = randomRange(55, 110) - effSpeed * 2;
        spawnObstacle();
      }

      const moneyMult = state.hackMoneyTimer > 0 ? 2 : 1;
      state.score += dt * 0.15 * moneyMult;
      setScore(Math.floor(state.score));

      const currentMilestone = Math.floor(state.score / 100);
      const lastMilestone = Math.floor(state.lastLifeBonusScore / 100);
      if (currentMilestone > lastMilestone) {
        state.lastLifeBonusScore = currentMilestone * 100;
        if (state.lives < INITIAL_LIVES) {
          state.lives += 1n;
          setLives(state.lives);
          state.lifeNotice = { timer: 60, y: 0 };
        }
      }

      if (state.lifeNotice.timer > 0) {
        state.lifeNotice.timer = Math.max(0, state.lifeNotice.timer - dt);
        state.lifeNotice.y += dt * 0.5;
      }

      state.nightTimer += dt;
      if (state.nightTimer > 700) {
        state.nightTimer = 0;
        state.night = !state.night;
      }

      if (state.invincibleTimer > 0) {
        state.invincibleTimer = Math.max(0, state.invincibleTimer - dt);
      } else if (state.hackShieldTimer > 0) {
        state.hackShieldTimer = Math.max(0, state.hackShieldTimer - dt);
      } else {
        for (const o of state.obstacles) {
          if (checkCollision(dino, o)) {
            state.lives -= 1n;
            setLives(state.lives);
            if (state.lives <= 0n) {
              state.over = true;
              state.running = false;
              setGameOver(true);
              const finalScore = Math.floor(state.score);
              const earned = finalScore;
              setWallet((w) => {
                const next = w + earned;
                localStorage.setItem('dino-wallet', String(next));
                return next;
              });
              setHighScore((prev) => {
                if (finalScore > prev) {
                  localStorage.setItem('dino-high-score', String(finalScore));
                  return finalScore;
                }
                return prev;
              });
            } else {
              state.invincibleTimer = INVINCIBLE_DURATION;
              state.obstacles = state.obstacles.filter(
                (ob) => ob.x + ob.width < dino.x || ob.x > dino.x + DINO.width + 120,
              );
              if (dino.jumping) {
                dino.vy = PHYSICS.jumpVelocity * 0.7;
              }
            }
            break;
          }
        }
      }
    };

    const drawDino = () => {
      const d = state.dino;
      const blinkT = Math.max(state.invincibleTimer, state.hackShieldTimer);
      if (blinkT > 0 && Math.floor(blinkT / 6) % 2 === 0) {
        return;
      }

      const blk = state.night ? '#2a2a34' : '#12121a';
      const blkSide = state.night ? '#3d3d4c' : '#25252f';
      const belly = state.night ? '#aeb8c4' : '#e4eaef';
      const beak = state.night ? '#c95a18' : '#e06012';
      const beakDark = state.night ? '#7a3810' : '#9a4508';
      const eye = state.night ? '#ff3a4a' : '#c81018';
      const brow = state.night ? '#4a1018' : '#2c080c';
      const foot = beak;

      const drawFoot = (fx, fy, w, h) => {
        ctx.fillStyle = foot;
        ctx.fillRect(fx, fy, w, h);
        ctx.fillStyle = beakDark;
        ctx.fillRect(fx + 1, fy + h - 2, Math.max(0, w - 2), 2);
      };

      if (d.ducking) {
        const x = d.x;
        const y = GROUND_Y - DINO.duckHeight;
        ctx.fillStyle = blk;
        ctx.fillRect(x + 4, y + 10, 40, 12);
        ctx.fillStyle = belly;
        ctx.fillRect(x + 12, y + 12, 22, 8);
        ctx.fillStyle = blk;
        ctx.fillRect(x + 36, y + 6, 14, 14);
        ctx.fillStyle = belly;
        ctx.fillRect(x + 38, y + 10, 8, 8);
        ctx.fillStyle = brow;
        ctx.fillRect(x + 38, y + 7, 10, 3);
        ctx.fillStyle = eye;
        ctx.fillRect(x + 39, y + 11, 3, 3);
        ctx.fillRect(x + 45, y + 11, 3, 3);
        ctx.fillStyle = beak;
        ctx.fillRect(x + 48, y + 11, 6, 5);
        ctx.fillStyle = beakDark;
        ctx.fillRect(x + 50, y + 12, 4, 3);
        ctx.fillStyle = blkSide;
        if (d.legFrame === 0) {
          ctx.fillRect(x + 2, y + 13, 8, 6);
          ctx.fillRect(x + 34, y + 22, 6, 4);
        } else {
          ctx.fillRect(x + 6, y + 14, 8, 6);
          ctx.fillRect(x + 30, y + 22, 6, 4);
        }
        drawFoot(x + 16, y + 22, 10, 4);
        drawFoot(x + 30, y + 22, 10, 4);
      } else {
        const x = d.x;
        const y = d.y;

        ctx.fillStyle = blk;
        ctx.fillRect(x + 6, y, 26, 16);
        ctx.fillStyle = belly;
        ctx.fillRect(x + 10, y + 8, 16, 8);
        ctx.fillStyle = brow;
        ctx.fillRect(x + 8, y + 3, 8, 3);
        ctx.fillRect(x + 22, y + 3, 8, 3);
        ctx.fillStyle = eye;
        ctx.fillRect(x + 10, y + 8, 4, 5);
        ctx.fillRect(x + 24, y + 8, 4, 5);
        ctx.fillStyle = '#f2f6f8';
        ctx.fillRect(x + 11, y + 9, 2, 2);
        ctx.fillRect(x + 25, y + 9, 2, 2);
        ctx.fillStyle = beak;
        ctx.fillRect(x + 32, y + 10, 12, 8);
        ctx.fillStyle = beakDark;
        ctx.fillRect(x + 38, y + 12, 6, 4);
        ctx.fillRect(x + 34, y + 16, 8, 2);

        ctx.fillStyle = blk;
        ctx.fillRect(x + 4, y + 14, 36, 26);
        ctx.fillStyle = belly;
        ctx.fillRect(x + 12, y + 20, 18, 16);
        ctx.fillStyle = blkSide;
        ctx.fillRect(x + 21, y + 18, 2, 22);

        ctx.fillStyle = blkSide;
        if (d.jumping) {
          ctx.fillRect(x - 2, y + 16, 8, 14);
          ctx.fillRect(x + 38, y + 10, 8, 14);
        } else if (d.legFrame === 0) {
          ctx.fillRect(x, y + 18, 8, 18);
          ctx.fillRect(x + 36, y + 22, 8, 14);
        } else {
          ctx.fillRect(x + 2, y + 22, 8, 14);
          ctx.fillRect(x + 36, y + 18, 8, 18);
        }

        if (d.jumping) {
          drawFoot(x + 10, y + 40, 12, 6);
          drawFoot(x + 24, y + 40, 12, 6);
        } else if (d.legFrame === 0) {
          drawFoot(x + 8, y + 42, 11, 5);
          drawFoot(x + 26, y + 44, 11, 5);
        } else {
          drawFoot(x + 8, y + 44, 11, 5);
          drawFoot(x + 26, y + 42, 11, 5);
        }
      }
    };

    const drawObstacle = (o) => {
      const fg = state.night ? '#f7f7f7' : '#535353';
      ctx.fillStyle = fg;
      if (o.type === 'cactus-small') {
        for (let i = 0; i < o.count; i++) {
          const bx = o.x + i * 17;
          ctx.fillRect(bx + 5, o.y, 6, 35);
          ctx.fillRect(bx, o.y + 8, 5, 12);
          ctx.fillRect(bx + 11, o.y + 12, 5, 10);
        }
      } else if (o.type === 'cactus-large') {
        for (let i = 0; i < o.count; i++) {
          const bx = o.x + i * 25;
          ctx.fillRect(bx + 8, o.y, 9, 50);
          ctx.fillRect(bx, o.y + 12, 8, 18);
          ctx.fillRect(bx + 17, o.y + 18, 8, 16);
        }
      } else if (o.type === 'bird') {
        ctx.fillRect(o.x + 10, o.y + 10, 22, 10);
        ctx.fillRect(o.x + 28, o.y + 6, 10, 6);
        ctx.fillRect(o.x + 36, o.y + 10, 4, 4);
        ctx.clearRect(o.x + 34, o.y + 10, 2, 2);
        if (o.wing === 0) {
          ctx.fillRect(o.x, o.y + 4, 14, 6);
          ctx.fillRect(o.x + 14, o.y + 8, 6, 4);
        } else {
          ctx.fillRect(o.x + 4, o.y + 18, 14, 6);
          ctx.fillRect(o.x + 14, o.y + 14, 6, 4);
        }
      }
    };

    const drawGround = () => {
      const fg = state.night ? '#f7f7f7' : '#535353';
      ctx.fillStyle = fg;
      ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 2);
      for (let x = state.ground.offset; x < GAME_WIDTH; x += 24) {
        const bump = (Math.floor(x / 24) % 3) * 2;
        ctx.fillRect(x + 4, GROUND_Y + 4, 2, 1);
        ctx.fillRect(x + 12, GROUND_Y + 5 + bump, 3, 1);
      }
    };

    const drawClouds = () => {
      const color = state.night ? '#a0a0a0' : '#c5c5c5';
      ctx.fillStyle = color;
      state.clouds.forEach((c) => {
        ctx.fillRect(c.x + 4, c.y, 28, 4);
        ctx.fillRect(c.x, c.y + 4, 36, 4);
        ctx.fillRect(c.x + 8, c.y + 8, 24, 4);
      });
    };

    const drawLives = () => {
      const fg = state.night ? '#f7f7f7' : '#535353';
      const label = `Dzīvības: ${formatLivesDisplay(state.lives)}`;
      ctx.textAlign = 'left';
      let fs = 14;
      do {
        ctx.font = `bold ${fs}px monospace`;
        fs -= 1;
      } while (ctx.measureText(label).width > GAME_WIDTH - 24 && fs >= 7);
      ctx.fillStyle = fg;
      ctx.fillText(label, 20, 74);
    };

    const drawLifeNotice = () => {
      if (state.lifeNotice.timer <= 0) return;
      const alpha = Math.min(1, state.lifeNotice.timer / 30);
      const color = state.night ? '#ff9b9b' : '#e74c3c';
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        '+1 DZIVIBA',
        state.dino.x + DINO.width / 2,
        state.dino.y - 10 - state.lifeNotice.y,
      );
      ctx.restore();
      ctx.textAlign = 'left';
    };

    const drawScore = () => {
      const fg = state.night ? '#f7f7f7' : '#535353';
      ctx.fillStyle = fg;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'right';
      const run = String(Math.floor(state.score));
      ctx.fillText(`Naudiņas: ${run}`, GAME_WIDTH - 20, 22);
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`Maciņš: ${wallet}`, GAME_WIDTH - 20, 38);
      ctx.font = 'bold 13px monospace';
      if (highScore > 0) {
        const hs = 'REK ' + String(highScore).padStart(5, '0');
        ctx.fillText(hs, GAME_WIDTH - 20, 54);
      }
      ctx.textAlign = 'left';
    };

    const drawGameOver = () => {
      const fg = state.night ? '#f7f7f7' : '#535353';
      ctx.fillStyle = fg;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('G A M E   O V E R', GAME_WIDTH / 2, 80);
      ctx.font = '14px monospace';
      ctx.fillText('Spied Space, lai mēģinātu vēlreiz', GAME_WIDTH / 2, 110);
      ctx.textAlign = 'left';
    };

    const drawStartScreen = () => {
      ctx.fillStyle = '#535353';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Spied Space, lai sāktu', GAME_WIDTH / 2, 100);
      ctx.textAlign = 'left';
    };

    const draw = () => {
      ctx.fillStyle = state.night ? '#1a1a1a' : '#f7f7f7';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      drawClouds();
      drawGround();
      state.obstacles.forEach(drawObstacle);
      drawDino();
      drawScore();
      drawLives();
      drawLifeNotice();

      if (state.over) drawGameOver();
      else if (!state.running) drawStartScreen();
    };

    const loop = (t) => {
      const delta = t - lastTime;
      lastTime = t;
      const dt = Math.min(delta / 16.67, 2.5);
      update(dt);
      draw();
      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  }, [highScore, wallet]);

  useEffect(() => {
    const state = stateRef.current;

    const reset = () => {
      state.dino.y = GROUND_Y - DINO.height;
      state.dino.vy = 0;
      state.dino.jumping = false;
      state.dino.ducking = false;
      state.obstacles = [];
      state.speed = PHYSICS.initialSpeed;
      state.score = 0;
      state.spawnTimer = 0;
      state.nextSpawn = 60;
      state.night = false;
      state.nightTimer = 0;
      state.over = false;
      state.running = true;
      state.lives = INITIAL_LIVES;
      state.invincibleTimer = 0;
      state.lastLifeBonusScore = 0;
      state.lifeNotice = { timer: 0, y: 0 };
      state.hackSlowTimer = 0;
      state.hackJumpTimer = 0;
      state.hackMoneyTimer = 0;
      state.hackShieldTimer = 0;
      setScore(0);
      setLives(INITIAL_LIVES);
      setGameOver(false);
      setStarted(true);
    };

    const jump = () => {
      if (!state.dino.jumping && !state.dino.ducking) {
        state.dino.jumping = true;
        const jmp =
          PHYSICS.jumpVelocity *
          (state.hackJumpTimer > 0 ? 1.42 : 1);
        state.dino.vy = jmp;
      }
    };

    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (state.over) reset();
        else if (!state.running) reset();
        else jump();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        if (state.running && !state.dino.jumping) {
          state.dino.ducking = true;
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'ArrowDown') {
        state.dino.ducking = false;
      }
    };

    const handleTouch = (e) => {
      e.preventDefault();
      if (state.over || !state.running) reset();
      else jump();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const canvas = canvasRef.current;
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('mousedown', handleTouch);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('mousedown', handleTouch);
    };
  }, []);

  return (
    <div className="game-wrapper">
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="game-canvas"
      />
      <div className="status-bar">
        <span>
          Naudiņas (skrējiens): <strong>{score}</strong>
        </span>
        <span className="status-bar-wallet">
          Maciņš (kopā): <strong>{wallet}</strong>
        </span>
        <span className="status-bar-lives">
          Dzīvības: {formatLivesDisplay(lives)}
        </span>
        <span>Rekords: {highScore}</span>
        {gameOver && <span className="game-over-text">Spēle galā!</span>}
        {!started && !gameOver && <span>Spied Space, lai sāktu</span>}
      </div>
      <div className="controls">
        <label className="control">
          <span className="control-label">
            Putni <strong>{birdLevel}</strong>
          </span>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={birdLevel}
            onChange={(e) => setBirdLevel(Number(e.target.value))}
          />
        </label>
        <label className="control">
          <span className="control-label">
            Kaktusi <strong>{cactusLevel}</strong>
          </span>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={cactusLevel}
            onChange={(e) => setCactusLevel(Number(e.target.value))}
          />
        </label>
      </div>
      <section className="hack-shop" aria-label="Veikals">
        <h3 className="hack-shop-title">Haču veikals — pērc par maciņa naudiņām</h3>
        <ul className="hack-shop-grid">
          {HACK_SHOP.map((item) => (
            <li key={item.id} className="hack-shop-card">
              <div className="hack-shop-card-head">
                <strong>{item.name}</strong>
                <span className="hack-shop-price">{item.price} 💰</span>
              </div>
              <p className="hack-shop-desc">{item.desc}</p>
              <button
                type="button"
                className="hack-shop-btn"
                disabled={wallet + score < item.price}
                onClick={() => buyHack(item.id)}
              >
                Pirkt
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
