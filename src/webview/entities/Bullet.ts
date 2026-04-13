import { Entity } from './Entity';

const BULLET_SPEED = 500;
const MAX_LIFETIME = 2;

export type BulletOwner = 'player' | 'enemy';

export class Bullet extends Entity {
  readonly owner: BulletOwner;
  readonly angle: number;
  private lifetime = 0;

  constructor(x: number, y: number, angle: number, owner: BulletOwner) {
    super(x, y, 6, 4);
    this.angle = angle;
    this.owner = owner;
    this.vx = Math.cos(angle) * BULLET_SPEED;
    this.vy = Math.sin(angle) * BULLET_SPEED;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime += dt;
    if (this.lifetime >= MAX_LIFETIME) {
      this.alive = false;
    }
  }
}
