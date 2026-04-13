import { describe, it, expect } from 'vitest';
import { applyGravity, aabbOverlap } from '../../src/webview/engine/Physics';
import { Entity } from '../../src/webview/entities/Entity';

describe('applyGravity', () => {
  it('increases downward velocity', () => {
    const entity = new Entity(0, 0, 10, 10);
    entity.vy = 0;
    applyGravity(entity, 1 / 60);
    expect(entity.vy).toBeGreaterThan(0);
  });

  it('caps at terminal velocity', () => {
    const entity = new Entity(0, 0, 10, 10);
    entity.vy = 9999;
    applyGravity(entity, 1);
    expect(entity.vy).toBeLessThanOrEqual(600);
  });

  it('moves entity downward', () => {
    const entity = new Entity(0, 100, 10, 10);
    entity.vy = 100;
    applyGravity(entity, 1 / 60);
    expect(entity.y).toBeGreaterThan(100);
  });
});

describe('aabbOverlap', () => {
  it('detects overlapping entities', () => {
    const a = new Entity(0, 0, 10, 10);
    const b = new Entity(5, 5, 10, 10);
    expect(aabbOverlap(a, b)).toBe(true);
  });

  it('detects non-overlapping entities', () => {
    const a = new Entity(0, 0, 10, 10);
    const b = new Entity(20, 20, 10, 10);
    expect(aabbOverlap(a, b)).toBe(false);
  });

  it('edge-touching is non-overlapping', () => {
    const a = new Entity(0, 0, 10, 10);
    const b = new Entity(10, 0, 10, 10);
    expect(aabbOverlap(a, b)).toBe(false);
  });
});
