import { Entity } from './Entity';

const SOLDIER_SPEED = 60;

export class Soldier extends Entity {
  health = 1;
  readonly scoreValue = 10;

  constructor(x: number, y: number) {
    super(x, y, 20, 28);
  }

  update(dt: number, playerX: number) {
    const dir = playerX < this.x ? -1 : 1;
    this.x += dir * SOLDIER_SPEED * dt;
  }
}
