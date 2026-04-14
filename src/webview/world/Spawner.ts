import { Entity } from '../entities/Entity';
import { Soldier } from '../entities/Soldier';
import { Flyer } from '../entities/Flyer';
import { Turret } from '../entities/Turret';
import { Boss } from '../entities/Boss';

export class Spawner {
  private timer = 0;
  private bossScoreThreshold = 500;
  private bossActive = false;
  private bossLevel = 0;

  setBossActive(active: boolean) {
    this.bossActive = active;
  }

  update(dt: number, score: number, cameraRight: number, groundY: number, canvasHeight: number): Entity[] {
    this.timer += dt;

    const spawned: Entity[] = [];

    // Available vertical space above ground (leave 20px top margin for HUD)
    const skyHeight = groundY - 20;

    // Boss spawn check — level increases each time
    if (!this.bossActive && score >= this.bossScoreThreshold) {
      this.bossActive = true;
      this.bossScoreThreshold += 500;
      this.bossLevel++;
      const bossY = Math.max(20, groundY - Math.min(150, skyHeight * 0.7));
      spawned.push(new Boss(cameraRight + 100, bossY, this.bossLevel));
    }

    const spawnInterval = Math.max(0.5, 2 - score / 1000);
    if (this.timer < spawnInterval) return spawned;

    this.timer = 0;
    const spawnX = cameraRight + 50 + Math.random() * 100;

    const roll = Math.random();
    const turretChance = score > 50 ? 0.25 : 0;
    const flyerChance = score > 100 ? 0.3 : 0;

    if (roll < turretChance) {
      spawned.push(new Turret(spawnX, groundY - 36));
    } else if (roll < turretChance + flyerChance) {
      // Flyer stays within visible area: between 20% and 70% of sky height above ground
      const flyY = groundY - skyHeight * 0.2 - Math.random() * skyHeight * 0.5;
      spawned.push(new Flyer(spawnX, Math.max(20, flyY)));
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
    this.bossLevel = 0;
  }
}
