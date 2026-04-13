// This script runs inside VS Code's Electron renderer process
// It creates a transparent canvas overlay at the bottom of the screen

(function() {
  // Prevent double injection
  if (document.getElementById('contra-code-overlay')) return;

  const GAME_HEIGHT = 150; // pixels from bottom

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'contra-code-overlay';
  canvas.style.cssText = `
    position: fixed;
    bottom: 22px;
    left: 0;
    width: 100%;
    height: ${GAME_HEIGHT}px;
    z-index: 999999;
    pointer-events: none;
    image-rendering: pixelated;
  `;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = GAME_HEIGHT;
  }
  resize();
  window.addEventListener('resize', resize);

  // Game state
  let gameActive = false;
  let score = 0;
  let highScore = 0;
  let playerX = 0;
  let playerY = 0;
  let playerVY = 0;
  let playerOnGround = false;
  let playerFacingRight = true;
  let cameraX = 0;
  let scrollSpeed = 80;
  let gameState: 'idle' | 'playing' | 'dead' = 'idle';

  // Input
  const keys = new Set<string>();
  const justPressed = new Set<string>();

  // Entities
  interface Bullet { x: number; y: number; vx: number; vy: number; alive: boolean; owner: 'player' | 'enemy'; life: number; }
  interface Enemy { x: number; y: number; w: number; h: number; health: number; type: 'soldier' | 'flyer' | 'turret' | 'boss'; alive: boolean; scoreValue: number; time: number; baseY: number; fireTimer: number; moveTimer: number; moveDir: number; maxHealth: number; }
  interface Platform { x: number; y: number; w: number; h: number; isGround: boolean; }

  let bullets: Bullet[] = [];
  let enemyBullets: Bullet[] = [];
  let enemies: Enemy[] = [];
  let platforms: Platform[] = [];

  let shootTimer = 0;
  let survivalTimer = 0;
  let spawnTimer = 0;
  let terrainGenX = 0;
  let comboCount = 0;
  let comboTimer = 0;
  let comboMultiplier = 1;
  let bossActive = false;
  let bossThreshold = 500;
  let lastScore = 0;

  const GRAVITY = 1200;
  const TERMINAL_VEL = 600;
  const JUMP_VEL = -350;
  const MOVE_SPEED = 180;
  const BULLET_SPEED = 400;
  const GROUND_Y = GAME_HEIGHT - 30; // ground line position within the canvas

  // Toggle game with Ctrl+Shift+G
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyG') {
      e.preventDefault();
      e.stopPropagation();
      if (!gameActive) {
        gameActive = true;
        canvas.style.pointerEvents = 'auto';
        canvas.style.background = 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)';
        startGame();
      } else {
        gameActive = false;
        canvas.style.pointerEvents = 'none';
        canvas.style.background = 'none';
        gameState = 'idle';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    if (!gameActive) return;

    e.preventDefault();
    e.stopPropagation();

    if (!keys.has(e.code)) {
      justPressed.add(e.code);
    }
    keys.add(e.code);

    if (gameState === 'dead' && e.code === 'Space') {
      startGame();
    }
  }, true); // capture phase to intercept before VS Code

  document.addEventListener('keyup', (e) => {
    if (!gameActive) return;
    e.preventDefault();
    e.stopPropagation();
    keys.delete(e.code);
  }, true);

  // Also handle Escape to deactivate
  document.addEventListener('keydown', (e) => {
    if (gameActive && e.code === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      gameActive = false;
      canvas.style.pointerEvents = 'none';
      canvas.style.background = 'none';
      gameState = 'idle';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, true);

  function startGame() {
    gameState = 'playing';
    score = 0;
    cameraX = 0;
    scrollSpeed = 80;
    playerX = canvas.width * 0.3;
    playerY = GROUND_Y - 28;
    playerVY = 0;
    playerOnGround = true;
    playerFacingRight = true;
    bullets = [];
    enemyBullets = [];
    enemies = [];
    platforms = [];
    shootTimer = 0;
    survivalTimer = 0;
    spawnTimer = 0;
    terrainGenX = 0;
    comboCount = 0;
    comboTimer = 0;
    comboMultiplier = 1;
    bossActive = false;
    bossThreshold = 500;
    generateTerrain();
  }

  function generateTerrain() {
    const generateTo = cameraX + canvas.width + 400;
    while (terrainGenX < generateTo) {
      const difficulty = Math.min(score / 2000, 1);
      const hasGap = Math.random() < difficulty * 0.25;
      const segW = 200 + Math.random() * 300;

      if (!hasGap) {
        platforms.push({ x: terrainGenX, y: GROUND_Y, w: segW, h: 30, isGround: true });
      }

      if (Math.random() < 0.25 + difficulty * 0.15) {
        platforms.push({
          x: terrainGenX + Math.random() * segW,
          y: GROUND_Y - 40 - Math.random() * 50,
          w: 50 + Math.random() * 60,
          h: 8,
          isGround: false
        });
      }

      terrainGenX += segW + (hasGap ? 50 + Math.random() * 30 : 0);
    }
    // Cleanup old platforms
    platforms = platforms.filter(p => p.x + p.w > cameraX - 100);
  }

  function spawnEnemies(dt: number) {
    spawnTimer += dt;
    const interval = Math.max(0.6, 2 - score / 1000);
    if (spawnTimer < interval) return;
    spawnTimer = 0;

    const spawnX = cameraX + canvas.width + 50 + Math.random() * 80;

    // Boss check
    if (!bossActive && score >= bossThreshold) {
      bossActive = true;
      bossThreshold += 500;
      enemies.push({
        x: spawnX, y: GROUND_Y - 80, w: 40, h: 40,
        health: 15, maxHealth: 15, type: 'boss', alive: true, scoreValue: 200,
        time: 0, baseY: GROUND_Y - 80, fireTimer: 0, moveTimer: 0, moveDir: 1
      });
      return;
    }

    const roll = Math.random();
    const turretChance = score > 200 ? 0.2 : 0;
    const flyerChance = score > 100 ? 0.25 : 0;

    if (roll < turretChance) {
      enemies.push({
        x: spawnX, y: GROUND_Y - 20, w: 20, h: 20,
        health: 3, maxHealth: 3, type: 'turret', alive: true, scoreValue: 30,
        time: 0, baseY: GROUND_Y - 20, fireTimer: 0, moveTimer: 0, moveDir: 0
      });
    } else if (roll < turretChance + flyerChance) {
      const fy = GROUND_Y - 50 - Math.random() * 40;
      enemies.push({
        x: spawnX, y: fy, w: 18, h: 14,
        health: 1, maxHealth: 1, type: 'flyer', alive: true, scoreValue: 20,
        time: 0, baseY: fy, fireTimer: 0, moveTimer: 0, moveDir: 0
      });
    } else {
      enemies.push({
        x: spawnX, y: GROUND_Y - 24, w: 18, h: 24,
        health: 1, maxHealth: 1, type: 'soldier', alive: true, scoreValue: 10,
        time: 0, baseY: 0, fireTimer: 0, moveTimer: 0, moveDir: 0
      });
    }
  }

  function getAimAngle(): number {
    const up = keys.has('ArrowUp') || keys.has('KeyW');
    const right = keys.has('ArrowRight') || keys.has('KeyD');
    const left = keys.has('ArrowLeft') || keys.has('KeyA');
    const down = keys.has('ArrowDown') || keys.has('KeyS');
    if (up && right) return -Math.PI / 4;
    if (up && left) return -3 * Math.PI / 4;
    if (up) return -Math.PI / 2;
    if (down && !playerOnGround) return Math.PI / 2;
    return 0;
  }

  function update(dt: number) {
    if (gameState !== 'playing') return;

    // Camera scroll
    cameraX += scrollSpeed * dt;
    const difficulty = Math.min(score / 2000, 1);
    scrollSpeed = 80 + difficulty * 50;

    // Player auto-scroll with camera
    playerX += scrollSpeed * dt;

    // Player movement
    const left = keys.has('ArrowLeft') || keys.has('KeyA');
    const right = keys.has('ArrowRight') || keys.has('KeyD');
    if (left && !right) {
      playerX -= MOVE_SPEED * dt;
      playerFacingRight = false;
    } else if (right && !left) {
      playerX += MOVE_SPEED * 0.4 * dt;
      playerFacingRight = true;
    } else {
      playerFacingRight = true;
    }

    // Jump
    if (justPressed.has('Space') && playerOnGround) {
      playerVY = JUMP_VEL;
      playerOnGround = false;
    }

    // Gravity
    playerVY = Math.min(playerVY + GRAVITY * dt, TERMINAL_VEL);
    playerY += playerVY * dt;

    // Clamp player in screen
    if (playerX < cameraX + 20) playerX = cameraX + 20;
    if (playerX > cameraX + canvas.width - 50) playerX = cameraX + canvas.width - 50;

    // Platform collision
    playerOnGround = false;
    for (const p of platforms) {
      if (playerVY > 0 && playerX + 20 > p.x && playerX < p.x + p.w) {
        const bottom = playerY + 28;
        const pen = bottom - p.y;
        if (pen > 0 && pen < playerVY * 0.05 + 8) {
          playerY = p.y - 28;
          playerVY = 0;
          playerOnGround = true;
        }
      }
    }

    // Shooting
    const fireKey = keys.has('KeyZ') || keys.has('KeyJ');
    shootTimer += dt;
    if (fireKey && shootTimer >= 0.12) {
      shootTimer = 0;
      const angle = getAimAngle();
      bullets.push({
        x: playerX + 10, y: playerY + 12,
        vx: Math.cos(angle) * BULLET_SPEED,
        vy: Math.sin(angle) * BULLET_SPEED,
        alive: true, owner: 'player', life: 0
      });
    }

    // Update bullets
    for (const b of bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life += dt;
      if (b.life > 1.5) b.alive = false;
    }
    bullets = bullets.filter(b => b.alive);

    for (const b of enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life += dt;
      if (b.life > 2) b.alive = false;
    }
    enemyBullets = enemyBullets.filter(b => b.alive);

    // Terrain
    generateTerrain();

    // Spawn enemies
    spawnEnemies(dt);

    // Update enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      e.time += dt;

      switch (e.type) {
        case 'soldier':
          e.x += (playerX < e.x ? -1 : 1) * 50 * dt;
          break;
        case 'flyer':
          e.x += (playerX < e.x ? -1 : 1) * 40 * dt;
          e.y = e.baseY + Math.sin(e.time * 3) * 25;
          break;
        case 'turret':
          e.fireTimer += dt;
          if (e.fireTimer >= 1.5) {
            e.fireTimer = 0;
            const angle = Math.atan2(playerY - e.y, playerX - e.x);
            enemyBullets.push({
              x: e.x + e.w / 2, y: e.y + e.h / 2,
              vx: Math.cos(angle) * 250, vy: Math.sin(angle) * 250,
              alive: true, owner: 'enemy', life: 0
            });
          }
          break;
        case 'boss':
          e.moveTimer += dt;
          if (e.moveTimer > 2) { e.moveDir *= -1; e.moveTimer = 0; }
          e.y += e.moveDir * 25 * dt;
          e.fireTimer += dt;
          if (e.fireTimer >= 0.8) {
            e.fireTimer = 0;
            const angle = Math.atan2(0, playerX - e.x);
            enemyBullets.push({ x: e.x + e.w/2, y: e.y + e.h/2, vx: Math.cos(angle)*250, vy: Math.sin(angle)*250, alive: true, owner: 'enemy', life: 0 });
            enemyBullets.push({ x: e.x + e.w/2, y: e.y + e.h/2, vx: Math.cos(angle-0.3)*250, vy: Math.sin(angle-0.3)*250, alive: true, owner: 'enemy', life: 0 });
            enemyBullets.push({ x: e.x + e.w/2, y: e.y + e.h/2, vx: Math.cos(angle+0.3)*250, vy: Math.sin(angle+0.3)*250, alive: true, owner: 'enemy', life: 0 });
          }
          break;
      }
    }

    // Bullet vs Enemy
    for (const b of bullets) {
      for (const e of enemies) {
        if (b.alive && e.alive &&
            b.x < e.x + e.w && b.x + 5 > e.x &&
            b.y < e.y + e.h && b.y + 3 > e.y) {
          b.alive = false;
          e.health--;
          if (e.health <= 0) {
            e.alive = false;
            if (e.type === 'boss') bossActive = false;
            // Combo
            comboTimer = 0;
            if (comboCount > 0) comboMultiplier = Math.min(1 + comboCount * 0.5, 3);
            score += Math.floor(e.scoreValue * comboMultiplier);
            comboCount++;
          }
        }
      }
    }
    enemies = enemies.filter(e => e.alive);
    enemies = enemies.filter(e => e.x > cameraX - 200);

    // Enemy bullet vs Player
    for (const b of enemyBullets) {
      if (b.x < playerX + 20 && b.x + 5 > playerX &&
          b.y < playerY + 28 && b.y + 3 > playerY) {
        die();
        return;
      }
    }

    // Enemy vs Player
    for (const e of enemies) {
      if (e.alive && playerX + 20 > e.x && playerX < e.x + e.w &&
          playerY + 28 > e.y && playerY < e.y + e.h) {
        die();
        return;
      }
    }

    // Fall off screen
    if (playerY > GAME_HEIGHT + 50) {
      die();
      return;
    }

    // Survival score
    survivalTimer += dt;
    if (survivalTimer >= 1) {
      score += 1;
      survivalTimer -= 1;
    }

    // Combo decay
    comboTimer += dt;
    if (comboTimer >= 2) {
      comboMultiplier = 1;
      comboCount = 0;
    }

    justPressed.clear();
  }

  function die() {
    gameState = 'dead';
    lastScore = score;
    if (score > highScore) highScore = score;
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'idle') return;

    const cx = cameraX; // camera offset

    // Draw platforms
    for (const p of platforms) {
      const sx = p.x - cx;
      if (sx > canvas.width + 50 || sx + p.w < -50) continue;
      ctx.fillStyle = p.isGround ? 'rgba(58,42,26,0.8)' : 'rgba(85,85,85,0.8)';
      ctx.fillRect(sx, p.y, p.w, p.h);
    }

    // Draw enemies
    for (const e of enemies) {
      const sx = e.x - cx;
      if (sx > canvas.width + 50 || sx + e.w < -50) continue;

      switch (e.type) {
        case 'soldier':
          ctx.fillStyle = 'rgba(200,60,60,0.9)';
          break;
        case 'flyer':
          ctx.fillStyle = 'rgba(180,60,180,0.9)';
          break;
        case 'turret':
          ctx.fillStyle = 'rgba(100,100,100,0.9)';
          break;
        case 'boss':
          ctx.fillStyle = 'rgba(200,0,0,0.9)';
          // Health bar
          const barW = e.w;
          const ratio = e.health / e.maxHealth;
          ctx.fillStyle = 'rgba(50,50,50,0.8)';
          ctx.fillRect(sx, e.y - 6, barW, 3);
          ctx.fillStyle = 'rgba(255,0,0,0.9)';
          ctx.fillRect(sx, e.y - 6, barW * ratio, 3);
          ctx.fillStyle = 'rgba(200,0,0,0.9)';
          break;
      }
      ctx.fillRect(sx, e.y, e.w, e.h);
    }

    // Draw player
    const psx = playerX - cx;
    ctx.fillStyle = 'rgba(79,195,247,0.9)';
    ctx.fillRect(psx, playerY, 20, 28);
    // Head
    ctx.fillStyle = 'rgba(255,204,153,0.9)';
    ctx.fillRect(psx + 4, playerY - 4, 12, 8);
    // Gun
    ctx.fillStyle = 'rgba(120,120,120,0.9)';
    if (playerFacingRight) {
      ctx.fillRect(psx + 18, playerY + 8, 8, 3);
    } else {
      ctx.fillRect(psx - 6, playerY + 8, 8, 3);
    }

    // Draw player bullets
    ctx.fillStyle = 'rgba(255,255,0,0.9)';
    for (const b of bullets) {
      ctx.fillRect(b.x - cx, b.y, 5, 3);
    }

    // Draw enemy bullets
    ctx.fillStyle = 'rgba(255,136,0,0.9)';
    for (const b of enemyBullets) {
      ctx.fillRect(b.x - cx, b.y, 5, 3);
    }

    // HUD
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,255,0,0.8)';
    ctx.fillText(`Score: ${score}`, 8, 14);
    ctx.fillStyle = 'rgba(136,136,136,0.7)';
    ctx.fillText(`High: ${highScore}`, 8, 28);
    if (comboMultiplier > 1) {
      ctx.fillStyle = 'rgba(255,255,0,0.8)';
      ctx.fillText(`x${comboMultiplier.toFixed(1)}`, 8, 42);
    }

    // Controls hint (top right)
    ctx.fillStyle = 'rgba(100,100,100,0.5)';
    ctx.textAlign = 'right';
    ctx.fillText('Esc to exit | Arrows:Move | Space:Jump | Z:Shoot', canvas.width - 8, 14);

    // Death screen
    if (gameState === 'dead') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,0,0,0.9)';
      ctx.font = '20px monospace';
      ctx.fillText('GAME OVER', canvas.width / 2, GAME_HEIGHT / 2 - 15);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '14px monospace';
      ctx.fillText(`Score: ${lastScore}   High: ${highScore}`, canvas.width / 2, GAME_HEIGHT / 2 + 10);
      ctx.fillStyle = 'rgba(136,136,136,0.7)';
      ctx.font = '11px monospace';
      ctx.fillText('SPACE to restart | Esc to exit', canvas.width / 2, GAME_HEIGHT / 2 + 30);
    }
  }

  // Game loop
  let lastTime = performance.now();
  function loop(time: number) {
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    if (gameActive) {
      update(dt);
      render();
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Status indicator
  const indicator = document.createElement('div');
  indicator.id = 'contra-code-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 2px;
    right: 8px;
    color: rgba(0,255,0,0.5);
    font: 10px monospace;
    z-index: 1000000;
    pointer-events: none;
  `;
  indicator.textContent = 'Ctrl+Shift+G: Contra Code';
  document.body.appendChild(indicator);
})();
