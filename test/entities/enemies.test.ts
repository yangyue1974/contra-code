import { describe, it, expect } from 'vitest';
import { Soldier } from '../../src/webview/entities/Soldier';
import { Flyer } from '../../src/webview/entities/Flyer';
import { Turret } from '../../src/webview/entities/Turret';

describe('Soldier', () => {
  it('moves toward player position', () => {
    const soldier = new Soldier(200, 300);
    soldier.update(1 / 60, 100);
    expect(soldier.x).toBeLessThan(200);
  });

  it('dies in one hit', () => {
    const soldier = new Soldier(200, 300);
    expect(soldier.health).toBe(1);
  });
});

describe('Flyer', () => {
  it('moves in a sine wave pattern', () => {
    const flyer = new Flyer(200, 200);
    const startY = flyer.y;
    for (let i = 0; i < 30; i++) {
      flyer.update(1 / 60, 100);
    }
    expect(flyer.y).not.toBe(startY);
  });

  it('moves toward player horizontally', () => {
    const flyer = new Flyer(200, 200);
    flyer.update(1 / 60, 100);
    expect(flyer.x).toBeLessThan(200);
  });
});

describe('Turret', () => {
  it('does not move', () => {
    const turret = new Turret(200, 300);
    turret.update(1 / 60, 100);
    expect(turret.x).toBe(200);
  });

  it('fires bullets at intervals', () => {
    const turret = new Turret(200, 300);
    let bullets: any[] = [];
    for (let i = 0; i < 120; i++) {
      const b = turret.update(1 / 60, 100);
      if (b) bullets.push(b);
    }
    expect(bullets.length).toBeGreaterThan(0);
  });

  it('has more health than a soldier', () => {
    const turret = new Turret(200, 300);
    expect(turret.health).toBeGreaterThan(1);
  });
});
