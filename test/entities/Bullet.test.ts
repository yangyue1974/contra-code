import { describe, it, expect } from 'vitest';
import { Bullet } from '../../src/webview/entities/Bullet';

describe('Bullet', () => {
  it('moves right when aimed right', () => {
    const bullet = new Bullet(100, 100, 0, 'player');
    bullet.update(1 / 60);
    expect(bullet.x).toBeGreaterThan(100);
    expect(bullet.y).toBeCloseTo(100, 0);
  });

  it('moves upper-right at 45 degrees', () => {
    const bullet = new Bullet(100, 100, -Math.PI / 4, 'player');
    bullet.update(1 / 60);
    expect(bullet.x).toBeGreaterThan(100);
    expect(bullet.y).toBeLessThan(100);
  });

  it('moves straight up', () => {
    const bullet = new Bullet(100, 100, -Math.PI / 2, 'player');
    bullet.update(1 / 60);
    expect(bullet.x).toBeCloseTo(100, 0);
    expect(bullet.y).toBeLessThan(100);
  });

  it('dies after max lifetime', () => {
    const bullet = new Bullet(100, 100, 0, 'player');
    for (let i = 0; i < 180; i++) {
      bullet.update(1 / 60);
    }
    expect(bullet.alive).toBe(false);
  });

  it('tracks owner', () => {
    const playerBullet = new Bullet(0, 0, 0, 'player');
    const enemyBullet = new Bullet(0, 0, 0, 'enemy');
    expect(playerBullet.owner).toBe('player');
    expect(enemyBullet.owner).toBe('enemy');
  });
});
