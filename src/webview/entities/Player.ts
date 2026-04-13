import { Entity } from './Entity';
import { Input } from '../engine/Input';

const MOVE_SPEED = 200;
const JUMP_VELOCITY = -400;
const MAX_JUMPS = 2;

export class Player extends Entity {
  private input: Input;
  onGround = false;
  crouching = false;
  jumpsRemaining = MAX_JUMPS;
  aimAngle = 0;
  facingRight = true;

  constructor(x: number, y: number, input: Input) {
    super(x, y, 24, 32);
    this.input = input;
  }

  update(dt: number) {
    if (this.input.isDown('ArrowLeft') || this.input.isDown('KeyA')) {
      this.vx = -MOVE_SPEED;
      this.facingRight = false;
    } else {
      this.vx = 0;
      if (!this.input.isDown('ArrowRight') && !this.input.isDown('KeyD')) {
        this.facingRight = true;
      }
    }

    if (this.input.justPressed('Space') && this.jumpsRemaining > 0) {
      this.vy = JUMP_VELOCITY;
      this.jumpsRemaining--;
      this.onGround = false;
    }

    this.crouching = this.onGround &&
      (this.input.isDown('ArrowDown') || this.input.isDown('KeyS'));

    this.aimAngle = this.calcAimAngle();
    this.x += this.vx * dt;

    if (this.onGround) {
      this.jumpsRemaining = MAX_JUMPS;
    }
  }

  private calcAimAngle(): number {
    const up = this.input.isDown('ArrowUp') || this.input.isDown('KeyW');
    const down = this.input.isDown('ArrowDown') || this.input.isDown('KeyS');
    const right = this.input.isDown('ArrowRight') || this.input.isDown('KeyD');
    const left = this.input.isDown('ArrowLeft') || this.input.isDown('KeyA');

    if (up && right) return -Math.PI / 4;
    if (up && left) return -3 * Math.PI / 4;
    if (up) return -Math.PI / 2;
    if (down && !this.onGround) return Math.PI / 2;
    return 0;
  }
}
