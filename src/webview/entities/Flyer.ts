import { Entity } from './Entity';

const FLYER_SPEED = 50;
const WAVE_AMPLITUDE = 40;
const WAVE_FREQUENCY = 3;

export class Flyer extends Entity {
  health = 1;
  readonly scoreValue = 20;
  private time = 0;
  private baseY: number;

  constructor(x: number, y: number) {
    super(x, y, 20, 16);
    this.baseY = y;
  }

  update(dt: number, playerX: number) {
    this.time += dt;
    const dir = playerX < this.x ? -1 : 1;
    this.x += dir * FLYER_SPEED * dt;
    this.y = this.baseY + Math.sin(this.time * WAVE_FREQUENCY) * WAVE_AMPLITUDE;
  }
}
