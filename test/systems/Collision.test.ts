import { describe, it, expect } from 'vitest';
import { resolveEntityPlatform } from '../../src/webview/systems/Collision';
import { Entity } from '../../src/webview/entities/Entity';
import { Platform } from '../../src/webview/world/Terrain';

describe('resolveEntityPlatform', () => {
  it('lands entity on top of platform', () => {
    const entity = new Entity(50, 90, 20, 20);
    entity.vy = 100;
    const platform: Platform = { x: 0, y: 100, width: 200, height: 16, isGround: false };
    const landed = resolveEntityPlatform(entity, platform);
    expect(landed).toBe(true);
    expect(entity.y).toBe(80);
    expect(entity.vy).toBe(0);
  });

  it('does not land if moving upward', () => {
    const entity = new Entity(50, 90, 20, 20);
    entity.vy = -100;
    const platform: Platform = { x: 0, y: 100, width: 200, height: 16, isGround: false };
    const landed = resolveEntityPlatform(entity, platform);
    expect(landed).toBe(false);
  });

  it('does not land if not horizontally overlapping', () => {
    const entity = new Entity(300, 90, 20, 20);
    entity.vy = 100;
    const platform: Platform = { x: 0, y: 100, width: 200, height: 16, isGround: false };
    const landed = resolveEntityPlatform(entity, platform);
    expect(landed).toBe(false);
  });
});
