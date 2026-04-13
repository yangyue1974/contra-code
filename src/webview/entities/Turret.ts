import { Entity } from './Entity';
import { Bullet } from './Bullet';

const FIRE_INTERVAL = 1.5;

export class Turret extends Entity {
  health = 3;
  readonly scoreValue = 30;
  private fireTimer = 0;

  constructor(x: number, y: number) {
    super(x, y, 24, 24);
  }

  update(dt: number, playerX: number): Bullet | null {
    this.fireTimer += dt;
    if (this.fireTimer >= FIRE_INTERVAL) {
      this.fireTimer = 0;
      const angle = playerX < this.x ? Math.PI : 0;
      return new Bullet(this.centerX, this.centerY, angle, 'enemy');
    }
    return null;
  }
}
