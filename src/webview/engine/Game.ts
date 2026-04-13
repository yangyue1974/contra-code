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
import { Spawner } from '../world/Spawner';
import { ScoreSystem } from '../systems/Score';
import { resolveEntityPlatform, checkEntityCollision } from '../systems/Collision';
import { PLAYER_STAND, ENEMY_SOLDIER, ENEMY_FLYER, ENEMY_TURRET, ENEMY_BOSS, BULLET_PLAYER, BULLET_ENEMY } from '../sprites/SpriteData';
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
  private nickname = 'Anonymous';
  private lastScore = 0;

  state: GameState = 'title';
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
    this.terrain = new Terrain(this.groundY);
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
      this.groundY = canvas.height - 80;
      this.camera.resize(canvas.width, canvas.height);
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
    this.player = new Player(200, this.groundY - 32, this.input);
    this.player.onGround = true;
  }

  private startPlaying() {
    this.state = 'playing';
    this.terrain.reset();
    this.spawner.reset();
    this.score.reset();
    this.bullets = [];
    this.enemies = [];
    this.enemyBullets = [];
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

    // Camera auto-scroll
    this.camera.update(dt);

    // Increase difficulty over time
    const difficultyFactor = Math.min(this.score.current / 2000, 1);
    this.terrain.difficulty = difficultyFactor;
    this.camera.scrollSpeed = 80 + difficultyFactor * 60;

    // Player keeps up with camera
    if (this.player.x < this.camera.x + 50) {
      this.player.x = this.camera.x + 50;
    }

    // Player update
    this.player.update(dt);
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

    // Shooting
    const fireKey = this.input.isDown('KeyZ') || this.input.isDown('KeyJ');
    this.shootTimer += dt;
    if (fireKey && this.shootTimer >= SHOOT_INTERVAL) {
      this.shootTimer = 0;
      this.bullets.push(new Bullet(
        this.player.centerX,
        this.player.centerY,
        this.player.aimAngle,
        'player'
      ));
      this.audio.playSfx('shoot');
    }

    // Update bullets
    this.bullets.forEach(b => b.update(dt));
    this.bullets = this.bullets.filter(b => b.alive);
    this.enemyBullets.forEach(b => b.update(dt));
    this.enemyBullets = this.enemyBullets.filter(b => b.alive);

    // Spawn enemies
    const newEnemies = this.spawner.update(
      dt, this.score.current, this.camera.x + this.camera.width, this.groundY
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

    // Bullet vs Enemy collision
    for (const bullet of this.bullets) {
      for (const enemy of this.enemies) {
        if (bullet.alive && enemy.alive && checkEntityCollision(bullet, enemy)) {
          bullet.alive = false;
          (enemy as any).health--;
          if ((enemy as any).health <= 0) {
            enemy.alive = false;
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
    renderer.clear(canvas.width, canvas.height);

    if (this.state === 'title') {
      renderer.drawText('CONTRA CODE', canvas.width / 2, canvas.height / 2 - 40, '#00ff00', 32, 'center');
      renderer.drawText('Press SPACE to start', canvas.width / 2, canvas.height / 2 + 20, '#888888', 16, 'center');
      return;
    }

    // Draw terrain
    for (const plat of this.terrain.getPlatforms()) {
      const sx = camera.toScreenX(plat.x);
      renderer.drawRect(sx, plat.y, plat.width, plat.height, plat.isGround ? '#3a2a1a' : '#555555');
    }

    // Draw enemies with sprites
    for (const enemy of this.enemies) {
      const sx = camera.toScreenX(enemy.x);
      if (enemy instanceof Boss) {
        this.renderer.drawSprite(ENEMY_BOSS, sx, enemy.y, 2);
      } else if (enemy instanceof Soldier) {
        this.renderer.drawSprite(ENEMY_SOLDIER, sx, enemy.y, 2);
      } else if (enemy instanceof Flyer) {
        this.renderer.drawSprite(ENEMY_FLYER, sx, enemy.y, 2);
      } else if (enemy instanceof Turret) {
        this.renderer.drawSprite(ENEMY_TURRET, sx, enemy.y, 2);
      } else {
        renderer.drawRect(sx, enemy.y, enemy.width, enemy.height, '#ff4444');
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

    // Draw player with sprite
    const playerSX = camera.toScreenX(this.player.x);
    this.renderer.drawSprite(PLAYER_STAND, playerSX, this.player.y, 2, !this.player.facingRight);

    // Draw bullets with sprites
    for (const b of this.bullets) {
      const sx = camera.toScreenX(b.x);
      this.renderer.drawSprite(BULLET_PLAYER, sx, b.y, 2);
    }
    for (const b of this.enemyBullets) {
      const sx = camera.toScreenX(b.x);
      this.renderer.drawSprite(BULLET_ENEMY, sx, b.y, 2);
    }

    // HUD
    renderer.drawText(`Score: ${this.score.current}`, 10, 24, '#00ff00', 16);
    renderer.drawText(`High: ${this.score.highScore}`, 10, 44, '#888888', 14);
    if (this.score.comboMultiplier > 1) {
      renderer.drawText(`x${this.score.comboMultiplier.toFixed(1)} COMBO`, 10, 64, '#ff0', 14);
    }

    // Death screen
    if (this.state === 'dead') {
      this.deathScreen.render(this.renderer, canvas.width, canvas.height, this.lastScore, this.score.highScore);
    }

    // Leaderboard overlay
    this.leaderboardUI.render(this.renderer, canvas.width, canvas.height);
  }
}
