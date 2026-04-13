import { Entity } from '../entities/Entity';
import { Soldier } from '../entities/Soldier';
import { Flyer } from '../entities/Flyer';
import { Turret } from '../entities/Turret';
import { Boss } from '../entities/Boss';

export class Spawner {
  private timer = 0;
  private bossScoreThreshold = 500;
  private bossActive = false;

  setBossActive(active: boolean) {
    this.bossActive = active;
  }

  update(dt: number, score: number, cameraRight: number, groundY: number): Entity[] {
    this.timer += dt;

    const spawned: Entity[] = [];

    // Boss spawn check
    if (!this.bossActive && score >= this.bossScoreThreshold) {
      this.bossActive = true;
      this.bossScoreThreshold += 500;
      const bossY = groundY - 150;
      spawned.push(new Boss(cameraRight + 100, bossY));
    }

    const spawnInterval = Math.max(0.5, 2 - score / 1000);
    if (this.timer < spawnInterval) return spawned;

    this.timer = 0;
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
    this.bossActive = false;
    this.bossScoreThreshold = 500;
  }
}
