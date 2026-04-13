import { Entity } from './Entity';
import { Bullet } from './Bullet';

const BOSS_FIRE_INTERVAL = 0.8;
const BOSS_MOVE_SPEED = 30;

export class Boss extends Entity {
  health = 20;
  maxHealth = 20;
  readonly scoreValue = 200;
  private fireTimer = 0;
  private moveTimer = 0;
  private moveDir = 1;

  constructor(x: number, y: number) {
    super(x, y, 48, 48);
  }

  update(dt: number, playerX: number): Bullet[] {
    this.moveTimer += dt;
    if (this.moveTimer > 2) {
      this.moveDir *= -1;
      this.moveTimer = 0;
    }
    this.y += this.moveDir * BOSS_MOVE_SPEED * dt;

    this.fireTimer += dt;
    const bullets: Bullet[] = [];
    if (this.fireTimer >= BOSS_FIRE_INTERVAL) {
      this.fireTimer = 0;
      const angleToPlayer = Math.atan2(0, playerX - this.x);
      bullets.push(new Bullet(this.centerX, this.centerY, angleToPlayer, 'enemy'));
      bullets.push(new Bullet(this.centerX, this.centerY, angleToPlayer - 0.3, 'enemy'));
      bullets.push(new Bullet(this.centerX, this.centerY, angleToPlayer + 0.3, 'enemy'));
    }
    return bullets;
  }
}
