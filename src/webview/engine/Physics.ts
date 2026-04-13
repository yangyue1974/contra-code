import { Entity } from '../entities/Entity';

const GRAVITY = 1200;
const TERMINAL_VELOCITY = 600;

export function applyGravity(entity: Entity, dt: number) {
  entity.vy = Math.min(entity.vy + GRAVITY * dt, TERMINAL_VELOCITY);
  entity.y += entity.vy * dt;
}

export function aabbOverlap(a: Entity, b: Entity): boolean {
  return (
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top
  );
}
