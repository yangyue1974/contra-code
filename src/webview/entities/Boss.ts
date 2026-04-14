import { Entity } from './Entity';
import { Bullet } from './Bullet';

const BOSS_MOVE_SPEED = 20;
const BOSS_BULLET_SPEED = 180; // much slower than normal bullets (500)

export class Boss extends Entity {
  health: number;
  maxHealth: number;
  readonly scoreValue = 200;
  private fireTimer = 0;
  private moveTimer = 0;
  private moveDir = 1;
  private fireInterval: number;
  private level: number; // boss encounter number

  constructor(x: number, y: number, level: number = 1) {
    super(x, y, 48, 48);
    this.level = level;
    // First boss is easy, gradually gets harder
    this.health = 8 + level * 2;       // 10, 12, 14, 16...
    this.maxHealth = this.health;
    this.fireInterval = Math.max(1.2, 2.5 - level * 0.2); // 2.3s, 2.1s, 1.9s...
  }

  update(dt: number, playerX: number): Bullet[] {
    this.moveTimer += dt;
    if (this.moveTimer > 2.5) {
      this.moveDir *= -1;
      this.moveTimer = 0;
    }
    this.y += this.moveDir * BOSS_MOVE_SPEED * dt;

    this.fireTimer += dt;
    const bullets: Bullet[] = [];
    if (this.fireTimer >= this.fireInterval) {
      this.fireTimer = 0;
      const angleToPlayer = Math.atan2(0, playerX - this.x);
      // Slow bullets — easy to dodge
      const b1 = new Bullet(this.centerX, this.centerY, angleToPlayer, 'enemy');
      b1.vx = Math.cos(angleToPlayer) * BOSS_BULLET_SPEED;
      b1.vy = Math.sin(angleToPlayer) * BOSS_BULLET_SPEED;
      bullets.push(b1);

      // Only add spread shots from level 2+
      if (this.level >= 2) {
        const b2 = new Bullet(this.centerX, this.centerY, angleToPlayer - 0.3, 'enemy');
        b2.vx = Math.cos(angleToPlayer - 0.3) * BOSS_BULLET_SPEED;
        b2.vy = Math.sin(angleToPlayer - 0.3) * BOSS_BULLET_SPEED;
        bullets.push(b2);
      }
      if (this.level >= 3) {
        const b3 = new Bullet(this.centerX, this.centerY, angleToPlayer + 0.3, 'enemy');
        b3.vx = Math.cos(angleToPlayer + 0.3) * BOSS_BULLET_SPEED;
        b3.vy = Math.sin(angleToPlayer + 0.3) * BOSS_BULLET_SPEED;
        bullets.push(b3);
      }
    }
    return bullets;
  }
}
