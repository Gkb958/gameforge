import { useEffect, useRef, useState } from 'react';

const WORLD_W = 920;
const WORLD_H = 560;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function createInitialState() {
  return {
    players: [
      {
        id: 'you',
        name: 'Captain You',
        x: 220,
        y: 280,
        score: 0,
        color: '#34d399',
        input: { left: false, right: false, up: false, down: false },
      },
      {
        id: 'bot',
        name: 'Pirate Mate',
        x: 640,
        y: 250,
        score: 0,
        color: '#60a5fa',
        input: {},
      },
    ],
    chests: [
      { id: 1, x: 180, y: 150, value: 50, collected: false, icon: '💰' },
      { id: 2, x: 690, y: 360, value: 75, collected: false, icon: '💎' },
      { id: 3, x: 470, y: 120, value: 100, collected: false, icon: '👑' },
      { id: 4, x: 760, y: 200, value: 60, collected: false, icon: '⚡' },
    ],
    raft: {
      x: 220,
      y: 280,
      angle: 0,
    },
    log: '🏴‍☠️ Collect all bonus chests before your rival!',
    gameOver: false,
    winner: null,
  };
}

export default function App() {
  const [game, setGame] = useState(createInitialState);
  const keys = useRef({});

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(key)) {
        event.preventDefault();
      }
      keys.current[key] = true;
    };

    const handleKeyUp = (event) => {
      keys.current[event.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let frameId = 0;
    let last = performance.now();

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;

      setGame((current) => {
        if (current.gameOver) return current;

        const next = {
          ...current,
          players: current.players.map((p) => ({
            ...p,
            input: { ...(p.input || {}) },
          })),
          chests: current.chests.map((chest) => ({ ...chest })),
        };

        const player = next.players[0];
        const bot = next.players[1];

        // Player movement
        const moveX =
          (keys.current.arrowleft || keys.current.a ? -1 : 0) +
          (keys.current.arrowright || keys.current.d ? 1 : 0);

        const moveY =
          (keys.current.arrowup || keys.current.w ? -1 : 0) +
          (keys.current.arrowdown || keys.current.s ? 1 : 0);

        const speed = 200;
        player.x = clamp(player.x + moveX * speed * dt, 30, WORLD_W - 30);
        player.y = clamp(player.y + moveY * speed * dt, 55, WORLD_H - 38);

        if (moveX !== 0 || moveY !== 0) {
          next.raft.angle = Math.atan2(moveY, moveX);
        }

        next.raft.x = player.x;
        next.raft.y = player.y;

        // Bot AI - smarter now!
        const uncollected = next.chests.filter((chest) => !chest.collected);
        if (uncollected.length > 0) {
          const target = uncollected.reduce((closest, chest) => {
            return distance(bot, chest) < distance(bot, closest) ? chest : closest;
          });

          const dx = target.x - bot.x;
          const dy = target.y - bot.y;
          const len = Math.hypot(dx, dy) || 1;

          bot.x = clamp(bot.x + (dx / len) * 140 * dt, 30, WORLD_W - 30);
          bot.y = clamp(bot.y + (dy / len) * 140 * dt, 55, WORLD_H - 38);
        }

        // Chest pickup logic
        for (const chest of next.chests) {
          if (chest.collected) continue;

          for (const p of next.players) {
            if (distance(p, chest) < 28) {
              chest.collected = true;
              p.score += chest.value;
              next.log = `${p.name} grabbed ${chest.icon} +${chest.value} points!`;
            }
          }
        }

        // Check win condition
        if (next.chests.every((c) => c.collected) && !next.gameOver) {
          next.gameOver = true;
          if (player.score > bot.score) {
            next.winner = 'YOU WIN! 🎉';
          } else if (bot.score > player.score) {
            next.winner = 'Pirate Mate Won! 💔';
          } else {
            next.winner = 'It\'s a TIE! 🤝';
          }
          next.log = next.winner;
        }

        return next;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, []);

  const handleReset = () => setGame(createInitialState());

  const player = game.players[0];
  const bot = game.players[1];

  return (
    <div className="app-shell">
      <div className="title">🏴‍☠️ RAFT QUEST 🏴‍☠️</div>

      <div className="hud">
        <div className="score-card your-card">
          <span>YOU</span>
          <strong>{player.score}</strong>
        </div>
        <div className="score-card bot-card">
          <span>RIVAL</span>
          <strong>{bot.score}</strong>
        </div>
        <div className="score-card chest-card">
          <span>CHESTS LEFT</span>
          <strong>{game.chests.filter((c) => !c.collected).length}/4</strong>
        </div>
      </div>

      <div className="game-panel">
        <div className="game-world">
          <div className="water"></div>

          {/* Chests */}
          {game.chests.map((chest) =>
            chest.collected ? null : (
              <div
                key={chest.id}
                className="chest"
                style={{ left: `${chest.x}px`, top: `${chest.y}px` }}
              >
                {chest.icon}
              </div>
            )
          )}

          {/* Players */}
          {game.players.map((p) => (
            <div
              key={p.id}
              className="player"
              style={{
                left: `${p.x}px`,
                top: `${p.y}px`,
                background: p.color,
                boxShadow: `0 0 18px ${p.color}`,
              }}
            >
              <span>{p.id === 'you' ? '🧑' : '🏴‍☠️'}</span>
            </div>
          ))}

          {/* Raft */}
          <div
            className="raft"
            style={{
              left: `${game.raft.x}px`,
              top: `${game.raft.y}px`,
              transform: `rotate(${game.raft.angle}rad)`,
            }}
          />
        </div>
      </div>

      <div className="footer-bar">
        <p className="log-text">{game.log}</p>
        {game.gameOver && (
          <button className="reset-btn" onClick={handleReset}>
            Play Again
          </button>
        )}
        <div className="controls">
          <span>⌨️ Move: WASD or Arrow Keys</span>
          <span>🎯 Goal: Collect all treasures first!</span>
        </div>
      </div>
    </div>
  );
}