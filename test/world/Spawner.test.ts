import { describe, it, expect, beforeEach } from 'vitest';
import { Spawner } from '../../src/webview/world/Spawner';

describe('Spawner', () => {
  let spawner: Spawner;

  beforeEach(() => {
    spawner = new Spawner();
  });

  it('spawns enemies over time', () => {
    const enemies = spawner.update(2, 0, 800, 500);
    expect(enemies.length).toBeGreaterThan(0);
  });

  it('spawns more enemies at higher scores', () => {
    const low = spawner.update(5, 0, 0, 800);
    spawner.reset();
    const high = spawner.update(5, 1000, 0, 800);
    expect(high.length).toBeGreaterThanOrEqual(low.length);
  });

  it('spawns enemies ahead of camera', () => {
    const enemies = spawner.update(2, 0, 500, 500);
    enemies.forEach(e => {
      expect(e.x).toBeGreaterThanOrEqual(500);
    });
  });
});
