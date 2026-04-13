const COMBO_TIMEOUT = 2;
const COMBO_STEP = 0.5;
const MAX_COMBO = 3;

export class ScoreSystem {
  current = 0;
  highScore = 0;
  comboMultiplier = 1;
  comboCount = 0;
  private comboTimer = 0;

  addSurvivalTime(seconds: number) {
    this.current += Math.floor(seconds);
  }

  addKill(basePoints: number) {
    if (this.comboCount > 0) {
      this.comboMultiplier = Math.min(1 + this.comboCount * COMBO_STEP, MAX_COMBO);
    }
    this.current += Math.floor(basePoints * this.comboMultiplier);
    this.comboCount++;
    this.comboTimer = 0;
  }

  update(dt: number) {
    this.comboTimer += dt;
    if (this.comboTimer >= COMBO_TIMEOUT) {
      this.comboMultiplier = 1;
      this.comboCount = 0;
    }
  }

  reset() {
    if (this.current > this.highScore) {
      this.highScore = this.current;
    }
    this.current = 0;
    this.comboMultiplier = 1;
    this.comboCount = 0;
    this.comboTimer = 0;
  }
}
