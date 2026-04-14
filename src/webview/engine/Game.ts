import { Input } from './Input';
import { Camera } from './Camera';
import { Renderer } from './Renderer';
import { applyGravity } from './Physics';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { Entity } from '../entities/Entity';
import { Boss } from '../entities/Boss';
import { Soldier } from '../entities/Soldier';
import { Flyer } from '../entities/Flyer';
import { Turret } from '../entities/Turret';
import { Terrain } from '../world/Terrain';
import { PowerUp, WeaponType } from '../entities/PowerUp';
import { Spawner } from '../world/Spawner';
import { ScoreSystem } from '../systems/Score';
import { resolveEntityPlatform, checkEntityCollision } from '../systems/Collision';
import { PLAYER_STAND, ENEMY_SOLDIER, ENEMY_FLYER, ENEMY_TURRET, ENEMY_BOSS, BULLET_PLAYER, BULLET_ENEMY } from '../sprites/SpriteData';
import { SpriteLoader } from '../sprites/SpriteLoader';
import { LeaderboardAPI } from '../network/LeaderboardAPI';
import { DeathScreen } from '../ui/DeathScreen';
import { LeaderboardUI } from '../ui/LeaderboardUI';
import { AudioManager } from '../audio/AudioManager';

export type GameState = 'title' | 'playing' | 'dead';

const SHOOT_INTERVAL = 0.12;

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly input = new Input();
  private renderer: Renderer;
  private camera: Camera;
  private player!: Player;
  private bullets: Bullet[] = [];
  private enemies: Entity[] = [];
  private enemyBullets: Bullet[] = [];
  private terrain: Terrain;
  private spawner: Spawner;
  private score: ScoreSystem;
  private leaderboardAPI: LeaderboardAPI;
  private deathScreen = new DeathScreen();
  private leaderboardUI = new LeaderboardUI();
  private audio = new AudioManager();
  private sprites = new SpriteLoader();
  private animFrame = 0; // for player running animation
  private animTimer = 0;
  private effects: Array<{ x: number; y: number; type: 'spark' | 'explosion'; frame: number; timer: number; size: number }> = [];
  private nickname = 'Anonymous';
  private lastScore = 0;

  state: GameState = 'title';
  private powerUps: PowerUp[] = [];
  private currentWeapon: WeaponType = 'normal';
  private weaponTimer = 0;
  private weaponDuration = 0;
  private powerUpSpawnTimer = 0;
  private lastTime = 0;
  private running = false;
  private shootTimer = 0;
  private survivalTimer = 0;
  private groundY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.renderer = new Renderer(ctx);
    this.camera = new Camera(canvas.width, canvas.height);
    this.groundY = canvas.height - 80;
    this.terrain = new Terrain(this.groundY, canvas.height);
    this.spawner = new Spawner();
    this.score = new ScoreSystem();
    this.leaderboardAPI = new LeaderboardAPI(
      'https://placeholder.supabase.co',
      'placeholder-anon-key'
    );

    this.initPlayer();

    window.addEventListener('keydown', (e) => {
      e.preventDefault();
      this.input.handleKeyDown(e.code);

      if (this.state === 'title' && e.code === 'Space') {
        this.startPlaying();
      }
      if (this.state === 'dead' && e.code === 'Space') {
        this.restart();
      }
      if (this.state === 'dead' && e.code === 'Enter') {
        this.deathScreen.submitScore(this.leaderboardAPI, this.nickname, this.lastScore);
      }
      if (e.code === 'Escape') {
        this.leaderboardUI.visible = false;
      }
      if (this.state === 'playing' && e.code === 'Space') {
        this.audio.playSfx('jump');
      }
    });
    window.addEventListener('keyup', (e) => {
      e.preventDefault();
      this.input.handleKeyUp(e.code);
    });
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const oldGroundY = this.groundY;
      this.groundY = canvas.height - 80;
      const groundDelta = this.groundY - oldGroundY;
      this.camera.resize(canvas.width, canvas.height);
      this.terrain.updateDimensions(this.groundY, canvas.height);

      // Reposition all entities when panel resizes
      if (groundDelta !== 0) {
        this.player.y += groundDelta;
        for (const e of this.enemies) {
          e.y += groundDelta;
          if ('baseY' in e) (e as any).baseY += groundDelta;
        }
        for (const b of this.bullets) b.y += groundDelta;
        for (const b of this.enemyBullets) b.y += groundDelta;
        for (const pu of this.powerUps) {
          pu.y += groundDelta;
          pu.baseY += groundDelta;
        }
        // Shift terrain platforms
        for (const p of this.terrain.getPlatforms()) {
          p.y += groundDelta;
        }
      }
    });
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'showLeaderboard') {
        this.leaderboardUI.visible = true;
        this.leaderboardAPI.getTopScores(20).then(scores => {
          this.leaderboardUI.setScores(scores);
        });
      }
      if (msg.type === 'setNickname') {
        this.nickname = msg.nickname;
      }
      if (msg.type === 'setAudioConfig') {
        this.audio.enabled = msg.enabled;
        this.audio.setMusicVolume(msg.musicVolume);
        this.audio.setSfxVolume(msg.sfxVolume);
      }
    });
  }

  private initPlayer() {
    this.player = new Player(this.camera.x + this.canvas.width * 0.3, this.groundY - 32, this.input);
    this.player.onGround = true;
  }

  private startPlaying() {
    this.state = 'playing';
    this.audio.startMusic();
    this.terrain.reset();
    this.spawner.reset();
    this.score.reset();
    this.bullets = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.powerUps = [];
    this.currentWeapon = 'normal';
    this.weaponTimer = 0;
    this.powerUpSpawnTimer = 0;
    this.camera.x = 0;
    this.shootTimer = 0;
    this.survivalTimer = 0;
    this.initPlayer();
  }

  private restart() {
    this.startPlaying();
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.sprites.loadAll().catch(err => console.warn('Sprite load error:', err));
    requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.running = false;
  }

  private loop(time: number) {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.update(dt);
    this.render();
    this.input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number) {
    if (this.state !== 'playing') return;

    // Animation timers
    this.animTimer += dt;
    if (this.animTimer >= 0.15) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }

    // Update effects (sparks, explosions)
    for (const fx of this.effects) {
      fx.timer += dt;
      if (fx.timer >= 0.06) {
        fx.timer = 0;
        fx.frame++;
      }
    }
    this.effects = this.effects.filter(fx =>
      (fx.type === 'spark' && fx.frame < 6) ||
      (fx.type === 'explosion' && fx.frame < 7)
    );

    // Camera auto-scroll
    this.camera.update(dt);

    // Increase difficulty over time
    const difficultyFactor = Math.min(this.score.current / 2000, 1);
    this.terrain.difficulty = difficultyFactor;
    this.camera.scrollSpeed = 80 + difficultyFactor * 60;

    // Player auto-advances with camera scroll
    this.player.x += this.camera.scrollSpeed * dt;

    // Player update (left/right keys adjust relative to auto-scroll)
    this.player.update(dt);

    // Clamp player within screen bounds
    const screenLeft = this.camera.x + 30;
    const screenRight = this.camera.x + this.camera.width - 60;
    if (this.player.x < screenLeft) {
      this.player.x = screenLeft;
    }
    if (this.player.x > screenRight) {
      this.player.x = screenRight;
    }
    applyGravity(this.player, dt);

    // Terrain
    this.terrain.generate(this.camera.x, this.camera.x + this.camera.width);
    this.terrain.cleanup(this.camera.x);

    // Platform collision for player
    this.player.onGround = false;
    for (const plat of this.terrain.getPlatforms()) {
      if (resolveEntityPlatform(this.player, plat)) {
        this.player.onGround = true;
      }
    }

    // Weapon timer
    if (this.currentWeapon !== 'normal') {
      this.weaponTimer += dt;
      if (this.weaponTimer >= this.weaponDuration) {
        this.currentWeapon = 'normal';
        this.weaponTimer = 0;
      }
    }

    // Shooting
    const fireKey = this.input.isDown('KeyZ') || this.input.isDown('KeyJ');
    const shootInterval = this.currentWeapon === 'rapid' ? 0.06 : SHOOT_INTERVAL;
    this.shootTimer += dt;
    if (fireKey && this.shootTimer >= shootInterval) {
      this.shootTimer = 0;
      const cx = this.player.centerX;
      const cy = this.player.centerY;
      const angle = this.player.aimAngle;

      switch (this.currentWeapon) {
        case 'spread':
          // 3 bullets in a fan
          this.bullets.push(new Bullet(cx, cy, angle - 0.25, 'player'));
          this.bullets.push(new Bullet(cx, cy, angle, 'player'));
          this.bullets.push(new Bullet(cx, cy, angle + 0.25, 'player'));
          break;
        case 'laser':
          // Piercing bullet (we'll handle piercing in collision)
          const laserBullet = new Bullet(cx, cy, angle, 'player');
          (laserBullet as any).piercing = true;
          this.bullets.push(laserBullet);
          break;
        case 'flame':
          // Bigger, slower bullet that does 2 damage
          const flameBullet = new Bullet(cx, cy, angle, 'player');
          (flameBullet as any).damage = 2;
          this.bullets.push(flameBullet);
          break;
        default: // normal and rapid
          this.bullets.push(new Bullet(cx, cy, angle, 'player'));
          break;
      }
      this.audio.playSfx('shoot');
    }

    // Update bullets
    this.bullets.forEach(b => b.update(dt));
    this.bullets = this.bullets.filter(b => b.alive);
    this.enemyBullets.forEach(b => b.update(dt));
    this.enemyBullets = this.enemyBullets.filter(b => b.alive);

    // Spawn enemies
    const newEnemies = this.spawner.update(
      dt, this.score.current, this.camera.x + this.camera.width, this.groundY, this.canvas.height
    );
    this.enemies.push(...newEnemies);

    // Update enemies
    for (const enemy of this.enemies) {
      if ('update' in enemy && typeof (enemy as any).update === 'function') {
        const result = (enemy as any).update(dt, this.player.x);
        if (result instanceof Bullet) {
          this.enemyBullets.push(result);
        } else if (Array.isArray(result)) {
          this.enemyBullets.push(...result);
        }
      }
    }

    // Spawn power-ups on elevated platforms
    this.powerUpSpawnTimer += dt;
    if (this.powerUpSpawnTimer >= 8) { // every 8 seconds
      this.powerUpSpawnTimer = 0;
      // Find an elevated platform ahead of the player that doesn't have a power-up
      const eligiblePlatforms = this.terrain.getPlatforms().filter(p =>
        !p.isGround &&
        p.x > this.camera.x + this.camera.width * 0.5 &&
        p.x < this.camera.x + this.camera.width + 200
      );
      if (eligiblePlatforms.length > 0) {
        const plat = eligiblePlatforms[Math.floor(Math.random() * eligiblePlatforms.length)];
        const types: WeaponType[] = ['spread', 'laser', 'rapid', 'flame'];
        const type = types[Math.floor(Math.random() * types.length)];
        // Check no existing power-up nearby
        const tooClose = this.powerUps.some(p => Math.abs(p.x - plat.x) < 100);
        if (!tooClose) {
          this.powerUps.push(new PowerUp(plat.x + plat.width / 2 - 8, plat.y - 18, type));
        }
      }
    }

    // Update power-ups
    this.powerUps.forEach(p => p.update(dt));
    this.powerUps = this.powerUps.filter(p => p.alive && p.x > this.camera.x - 100);

    // Player picks up power-up
    for (const pu of this.powerUps) {
      if (pu.alive && checkEntityCollision(this.player, pu)) {
        pu.alive = false;
        this.currentWeapon = pu.weaponType;
        this.weaponTimer = 0;
        this.weaponDuration = 10 + Math.random() * 5; // 10-15 seconds
      }
    }

    // Bullet vs Enemy collision
    for (const bullet of this.bullets) {
      for (const enemy of this.enemies) {
        if (bullet.alive && enemy.alive && checkEntityCollision(bullet, enemy)) {
          if (!(bullet as any).piercing) {
            bullet.alive = false;
          }
          // Spawn impact spark
          this.effects.push({
            x: bullet.x, y: bullet.y, type: 'spark',
            frame: 0, timer: 0, size: 20,
          });
          const damage = (bullet as any).damage || 1;
          (enemy as any).health -= damage;
          if ((enemy as any).health <= 0) {
            enemy.alive = false;
            // Spawn explosion
            this.effects.push({
              x: enemy.x + enemy.width / 2 - 24,
              y: enemy.y + enemy.height / 2 - 24,
              type: 'explosion',
              frame: 0, timer: 0,
              size: enemy instanceof Boss ? 80 : 48,
            });
            this.score.addKill((enemy as any).scoreValue || 10);
            this.audio.playSfx('kill');
            if (enemy instanceof Boss) {
              this.spawner.setBossActive(false);
            }
          }
        }
      }
    }
    this.enemies = this.enemies.filter(e => e.alive);

    // Enemy bullet vs Player collision
    for (const bullet of this.enemyBullets) {
      if (checkEntityCollision(bullet, this.player)) {
        this.die();
        return;
      }
    }

    // Enemy vs Player collision
    for (const enemy of this.enemies) {
      if (checkEntityCollision(enemy, this.player)) {
        this.die();
        return;
      }
    }

    // Player falls off screen
    if (this.player.y > this.canvas.height + 100) {
      this.die();
      return;
    }

    // Cleanup off-screen enemies
    this.enemies = this.enemies.filter(e => e.x > this.camera.x - 200);

    // Score survival time
    this.survivalTimer += dt;
    if (this.survivalTimer >= 1) {
      this.score.addSurvivalTime(1);
      this.survivalTimer -= 1;
    }
    this.score.update(dt);
  }

  private die() {
    this.state = 'dead';
    this.lastScore = this.score.current;
    this.audio.playSfx('die');
    this.score.reset();
    this.deathScreen.reset();
  }

  private render() {
    const { renderer, canvas, camera } = this;
    const ctx = this.canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    renderer.clear(canvas.width, canvas.height);

    if (this.state === 'title') {
      renderer.drawText('CONTRA CODE', canvas.width / 2, canvas.height / 2 - 40, '#00ff00', 32, 'center');
      renderer.drawText('Press SPACE to start', canvas.width / 2, canvas.height / 2 + 20, '#888888', 16, 'center');
      return;
    }

    // Draw parallax backgrounds (sky → mountains → jungle)
    if (this.sprites.loaded) {
      const skyHeight = this.groundY - 20;
      // Far: scrolls slowest, takes top half of sky
      this.sprites.drawBackground(ctx, 'bg_far', camera.x * 0.1, 0, canvas.width, skyHeight * 0.7);
      // Mid: scrolls medium, takes middle portion
      this.sprites.drawBackground(ctx, 'bg_mid', camera.x * 0.3, skyHeight * 0.4, canvas.width, skyHeight * 0.5);
      // Near: fastest, just above ground
      this.sprites.drawBackground(ctx, 'bg_near', camera.x * 0.6, this.groundY - 40, canvas.width, 50);
    }

    // Draw terrain
    for (const plat of this.terrain.getPlatforms()) {
      const sx = camera.toScreenX(plat.x);
      if (plat.isGround) {
        // Ground: darker brown with top grass line
        renderer.drawRect(sx, plat.y, plat.width, plat.height, '#2a1a0a');
        renderer.drawRect(sx, plat.y, plat.width, 3, '#4a6b1f');
      } else {
        // Elevated platform: metallic with edge highlight
        renderer.drawRect(sx, plat.y, plat.width, plat.height, '#666');
        renderer.drawRect(sx, plat.y, plat.width, 2, '#999');
      }
    }

    // Draw enemies with sprites
    for (const enemy of this.enemies) {
      const sx = camera.toScreenX(enemy.x);
      if (this.sprites.loaded) {
        if (enemy instanceof Boss) {
          this.sprites.drawSprite(ctx, 'boss', sx, enemy.y, enemy.width, enemy.height);
        } else if (enemy instanceof Soldier) {
          this.sprites.drawFrame(ctx, 'enemy_soldier', this.animFrame, sx, enemy.y, enemy.width, enemy.height, enemy.x > this.player.x);
        } else if (enemy instanceof Flyer) {
          this.sprites.drawSprite(ctx, 'enemy_flyer', sx, enemy.y, enemy.width, enemy.height, enemy.x > this.player.x);
        } else if (enemy instanceof Turret) {
          this.sprites.drawSprite(ctx, 'enemy_turret', sx, enemy.y, enemy.width, enemy.height, enemy.x > this.player.x);
        } else {
          renderer.drawRect(sx, enemy.y, enemy.width, enemy.height, '#ff4444');
        }
      } else {
        // Fallback while sprites load
        if (enemy instanceof Boss) {
          this.renderer.drawSprite(ENEMY_BOSS, sx, enemy.y, 2);
        } else if (enemy instanceof Soldier) {
          this.renderer.drawSprite(ENEMY_SOLDIER, sx, enemy.y, 2);
        } else if (enemy instanceof Flyer) {
          this.renderer.drawSprite(ENEMY_FLYER, sx, enemy.y, 2);
        } else if (enemy instanceof Turret) {
          this.renderer.drawSprite(ENEMY_TURRET, sx, enemy.y, 2);
        }
      }
    }

    // Draw Boss health bars
    for (const enemy of this.enemies) {
      if (enemy instanceof Boss) {
        const boss = enemy as Boss;
        const sx = camera.toScreenX(boss.x);
        const barWidth = boss.width;
        const healthRatio = boss.health / boss.maxHealth;
        renderer.drawRect(sx, boss.y - 8, barWidth, 4, '#333');
        renderer.drawRect(sx, boss.y - 8, barWidth * healthRatio, 4, '#ff0000');
      }
    }

    // Draw power-ups — use actual weapon sprites (bigger, with pulse on the sprite itself)
    for (const pu of this.powerUps) {
      const sx = camera.toScreenX(pu.x);
      const pulseScale = 1 + Math.abs(Math.sin(Date.now() / 300)) * 0.1;
      const size = 36 * pulseScale;
      const offsetX = (36 - size) / 2;
      const offsetY = (36 - size) / 2;

      const weaponKey = `weapon_${pu.weaponType}`;
      if (this.sprites.loaded && this.sprites.getSprite(weaponKey)) {
        this.sprites.drawSprite(ctx, weaponKey, sx - 10 + offsetX, pu.y - 10 + offsetY, size, size);
      } else {
        renderer.drawRect(sx, pu.y, 24, 24, pu.getColor());
        renderer.drawText(pu.getLabel(), sx + 8, pu.y + 17, '#ffffff', 14);
      }
    }

    // Draw player with sprite (2-frame running animation)
    const playerSX = camera.toScreenX(this.player.x);
    if (this.sprites.loaded) {
      this.sprites.drawFrame(ctx, 'player', this.animFrame, playerSX - 4, this.player.y - 4, 32, 40, !this.player.facingRight);
    } else {
      this.renderer.drawSprite(PLAYER_STAND, playerSX, this.player.y, 2, !this.player.facingRight);
    }

    // Draw player bullets
    for (const b of this.bullets) {
      const sx = camera.toScreenX(b.x);
      if ((b as any).piercing) {
        // Laser: longer, blue with glow
        ctx.fillStyle = 'rgba(68,136,255,0.4)';
        ctx.fillRect(sx - 4, b.y - 2, 20, 6);
        renderer.drawRect(sx, b.y, 14, 2, '#4488ff');
      } else if ((b as any).damage && (b as any).damage > 1) {
        // Flame: bigger, orange with glow
        ctx.fillStyle = 'rgba(255,136,0,0.5)';
        ctx.fillRect(sx - 2, b.y - 3, 14, 9);
        renderer.drawRect(sx, b.y - 2, 10, 7, '#ff8800');
        renderer.drawRect(sx - 1, b.y - 1, 8, 5, '#ffaa00');
      } else if (b.owner === 'player') {
        // Normal bullet with tiny glow
        ctx.fillStyle = 'rgba(255,255,0,0.4)';
        ctx.fillRect(sx - 1, b.y - 1, 8, 5);
        renderer.drawRect(sx, b.y, 5, 3, '#ffff00');
      }
    }
    for (const b of this.enemyBullets) {
      const sx = camera.toScreenX(b.x);
      ctx.fillStyle = 'rgba(255,136,0,0.4)';
      ctx.fillRect(sx - 1, b.y - 1, 8, 5);
      this.renderer.drawSprite(BULLET_ENEMY, sx, b.y, 2);
    }

    // Draw effects (sparks and explosions) - after entities so they appear on top
    if (this.sprites.loaded) {
      for (const fx of this.effects) {
        const sx = camera.toScreenX(fx.x);
        const key = fx.type === 'spark' ? 'spark' : 'explosion';
        this.sprites.drawFrame(ctx, key, fx.frame, sx - fx.size / 2, fx.y - fx.size / 2, fx.size, fx.size);
      }
    }

    // HUD
    renderer.drawText(`Score: ${this.score.current}`, 10, 24, '#00ff00', 16);
    renderer.drawText(`High: ${this.score.highScore}`, 10, 44, '#888888', 14);
    if (this.score.comboMultiplier > 1) {
      renderer.drawText(`x${this.score.comboMultiplier.toFixed(1)} COMBO`, 10, 64, '#ff0', 14);
    }
    if (this.currentWeapon !== 'normal') {
      const remaining = Math.ceil(this.weaponDuration - this.weaponTimer);
      const weaponNames: Record<string, string> = { spread: 'SPREAD', laser: 'LASER', rapid: 'RAPID', flame: 'FLAME' };
      const weaponColors: Record<string, string> = { spread: '#ff4444', laser: '#4444ff', rapid: '#44ff44', flame: '#ff8800' };
      renderer.drawText(
        `${weaponNames[this.currentWeapon]} [${remaining}s]`,
        10, 84, weaponColors[this.currentWeapon] || '#fff', 14
      );
    }

    // Death screen
    if (this.state === 'dead') {
      this.deathScreen.render(this.renderer, canvas.width, canvas.height, this.lastScore, this.score.highScore);
    }

    // Leaderboard overlay
    this.leaderboardUI.render(this.renderer, canvas.width, canvas.height);
  }
}
