import { Entity } from '../entities/Entity';
import { Soldier } from '../entities/Soldier';
import { Flyer } from '../entities/Flyer';
import { Turret } from '../entities/Turret';

export class Spawner {
  private timer = 0;

  update(dt: number, score: number, cameraRight: number, groundY: number): Entity[] {
    this.timer += dt;

    const spawnInterval = Math.max(0.5, 2 - score / 1000);
    if (this.timer < spawnInterval) return [];

    this.timer = 0;
    const spawned: Entity[] = [];
    const spawnX = cameraRight + 50 + Math.random() * 100;

    const roll = Math.random();
    const turretChance = score > 200 ? 0.2 : 0;
    const flyerChance = score > 100 ? 0.3 : 0;

    if (roll < turretChance) {
      spawned.push(new Turret(spawnX, groundY - 24));
    } else if (roll < turretChance + flyerChance) {
      const flyY = groundY - 100 - Math.random() * 100;
      spawned.push(new Flyer(spawnX, flyY));
    } else {
      spawned.push(new Soldier(spawnX, groundY - 28));
    }

    if (score > 500 && Math.random() < 0.3) {
      spawned.push(new Soldier(spawnX + 40, groundY - 28));
    }

    return spawned;
  }

  reset() {
    this.timer = 0;
  }
}
