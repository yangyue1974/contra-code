import { Entity } from '../entities/Entity';
import { Platform } from '../world/Terrain';
import { aabbOverlap } from '../engine/Physics';

export function resolveEntityPlatform(entity: Entity, platform: Platform): boolean {
  if (entity.vy <= 0) return false;

  if (entity.right <= platform.x || entity.left >= platform.x + platform.width) {
    return false;
  }

  const entityBottom = entity.bottom;
  const platTop = platform.y;
  const penetration = entityBottom - platTop;

  if (penetration > 0 && penetration < entity.vy * 0.05 + 10) {
    entity.y = platTop - entity.height;
    entity.vy = 0;
    return true;
  }

  return false;
}

export function checkEntityCollision(a: Entity, b: Entity): boolean {
  return aabbOverlap(a, b);
}
