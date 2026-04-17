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

const INITIAL_LIVES = 3;
const INVINCIBLE_DURATION = 90;

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

export default function DinoGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('dino-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [lives, setLives] = useState(INITIAL_LIVES);

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
      const types = ['cactus-small', 'cactus-large', 'bird'];
      const weights = state.speed > 8 ? [0.4, 0.3, 0.3] : [0.6, 0.4, 0];
      let roll = Math.random();
      let idx = 0;
      for (let i = 0; i < weights.length; i++) {
        if (roll < weights[i]) {
          idx = i;
          break;
        }
        roll -= weights[i];
      }
      const type = types[idx];

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

      state.ground.offset -= state.speed;
      if (state.ground.offset <= -24) state.ground.offset += 24;

      state.clouds.forEach((c) => {
        c.x -= state.speed * 0.3;
        if (c.x < -60) {
          c.x = GAME_WIDTH + randomRange(0, 200);
          c.y = randomRange(20, 90);
        }
      });

      state.obstacles.forEach((o) => {
        o.x -= state.speed;
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
        state.nextSpawn = randomRange(55, 110) - state.speed * 2;
        spawnObstacle();
      }

      state.score += dt * 0.15;
      setScore(Math.floor(state.score));

      state.nightTimer += dt;
      if (state.nightTimer > 700) {
        state.nightTimer = 0;
        state.night = !state.night;
      }

      if (state.invincibleTimer > 0) {
        state.invincibleTimer = Math.max(0, state.invincibleTimer - dt);
      } else {
        for (const o of state.obstacles) {
          if (checkCollision(dino, o)) {
            state.lives -= 1;
            setLives(state.lives);
            if (state.lives <= 0) {
              state.over = true;
              state.running = false;
              setGameOver(true);
              const finalScore = Math.floor(state.score);
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
      if (
        state.invincibleTimer > 0 &&
        Math.floor(state.invincibleTimer / 6) % 2 === 0
      ) {
        return;
      }
      const denim = state.night ? '#7a9bd1' : '#4a6fa5';
      const denimDark = state.night ? '#4f6fa0' : '#2c4870';
      const belt = state.night ? '#d8d8d8' : '#1f1f1f';
      const button = state.night ? '#f4d76a' : '#c69a2c';
      const stitch = state.night ? '#d6c98a' : '#a07b1c';

      if (d.ducking) {
        const x = d.x;
        const y = GROUND_Y - DINO.duckHeight;
        ctx.fillStyle = denim;
        ctx.fillRect(x + 2, y, 50, 6);
        ctx.fillStyle = belt;
        ctx.fillRect(x + 2, y + 6, 50, 2);
        ctx.fillStyle = button;
        ctx.fillRect(x + 26, y + 2, 3, 2);
        ctx.fillStyle = denim;
        if (d.legFrame === 0) {
          ctx.fillRect(x + 4, y + 8, 22, 20);
          ctx.fillRect(x + 28, y + 8, 22, 18);
        } else {
          ctx.fillRect(x + 4, y + 8, 22, 18);
          ctx.fillRect(x + 28, y + 8, 22, 20);
        }
        ctx.fillStyle = denimDark;
        ctx.fillRect(x + 26, y + 8, 2, 20);
        ctx.fillStyle = stitch;
        ctx.fillRect(x + 4, y + 10, 22, 1);
        ctx.fillRect(x + 28, y + 10, 22, 1);
      } else {
        const x = d.x;
        const y = d.y;
        ctx.fillStyle = denim;
        ctx.fillRect(x + 2, y, 42, 8);
        ctx.fillStyle = belt;
        ctx.fillRect(x + 2, y + 8, 42, 3);
        ctx.fillStyle = button;
        ctx.fillRect(x + 20, y + 9, 4, 2);
        ctx.fillStyle = denim;
        if (d.jumping) {
          ctx.fillRect(x + 4, y + 11, 18, 35);
          ctx.fillRect(x + 24, y + 11, 18, 35);
          ctx.fillStyle = denim;
          ctx.fillRect(x + 2, y + 44, 20, 4);
          ctx.fillRect(x + 24, y + 44, 20, 4);
        } else if (d.legFrame === 0) {
          ctx.fillRect(x + 4, y + 11, 18, 37);
          ctx.fillRect(x + 24, y + 11, 18, 35);
          ctx.fillStyle = denim;
          ctx.fillRect(x + 2, y + 46, 20, 2);
          ctx.fillRect(x + 24, y + 44, 20, 2);
        } else {
          ctx.fillRect(x + 4, y + 11, 18, 35);
          ctx.fillRect(x + 24, y + 11, 18, 37);
          ctx.fillStyle = denim;
          ctx.fillRect(x + 2, y + 44, 20, 2);
          ctx.fillRect(x + 24, y + 46, 20, 2);
        }
        ctx.fillStyle = denimDark;
        ctx.fillRect(x + 22, y + 11, 2, 32);
        ctx.fillStyle = stitch;
        ctx.fillRect(x + 4, y + 13, 18, 1);
        ctx.fillRect(x + 24, y + 13, 18, 1);
        ctx.fillStyle = denimDark;
        ctx.fillRect(x + 6, y + 16, 8, 6);
        ctx.fillRect(x + 30, y + 16, 8, 6);
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

    const drawHeart = (x, y, filled) => {
      ctx.fillStyle = filled
        ? state.night
          ? '#ff6b6b'
          : '#e74c3c'
        : state.night
          ? '#555'
          : '#ccc';
      ctx.fillRect(x + 2, y, 4, 2);
      ctx.fillRect(x + 8, y, 4, 2);
      ctx.fillRect(x, y + 2, 14, 4);
      ctx.fillRect(x + 2, y + 6, 10, 2);
      ctx.fillRect(x + 4, y + 8, 6, 2);
      ctx.fillRect(x + 6, y + 10, 2, 2);
    };

    const drawLives = () => {
      for (let i = 0; i < INITIAL_LIVES; i++) {
        drawHeart(20 + i * 20, 20, i < state.lives);
      }
    };

    const drawScore = () => {
      const fg = state.night ? '#f7f7f7' : '#535353';
      ctx.fillStyle = fg;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'right';
      const s = String(Math.floor(state.score)).padStart(5, '0');
      ctx.fillText(s, GAME_WIDTH - 20, 30);
      if (highScore > 0) {
        const hs = 'HI ' + String(highScore).padStart(5, '0');
        ctx.fillText(hs, GAME_WIDTH - 100, 30);
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
  }, [highScore]);

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
      setScore(0);
      setLives(INITIAL_LIVES);
      setGameOver(false);
      setStarted(true);
    };

    const jump = () => {
      if (!state.dino.jumping && !state.dino.ducking) {
        state.dino.jumping = true;
        state.dino.vy = PHYSICS.jumpVelocity;
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
        <span>Punkti: {score}</span>
        <span>Dzīvības: {'♥'.repeat(lives)}{'♡'.repeat(Math.max(0, INITIAL_LIVES - lives))}</span>
        <span>Rekords: {highScore}</span>
        {gameOver && <span className="game-over-text">Spēle galā!</span>}
        {!started && !gameOver && <span>Spied Space, lai sāktu</span>}
      </div>
    </div>
  );
}
