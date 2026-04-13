export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  isGround: boolean;
}

export class Terrain {
  private platforms: Platform[] = [];
  private generatedUpTo = 0;
  private groundY: number;
  difficulty = 0; // 0 to 1

  constructor(groundY: number) {
    this.groundY = groundY;
  }

  generate(cameraLeft: number, cameraRight: number) {
    const generateTo = cameraRight + 400;

    while (this.generatedUpTo < generateTo) {
      const hasGap = Math.random() < this.difficulty * 0.3;
      const segmentWidth = 200 + Math.random() * 300;

      if (!hasGap) {
        this.platforms.push({
          x: this.generatedUpTo,
          y: this.groundY,
          width: segmentWidth,
          height: 40,
          isGround: true,
        });
      }

      if (Math.random() < 0.3 + this.difficulty * 0.2) {
        const platY = this.groundY - 80 - Math.random() * 120;
        const platWidth = 60 + Math.random() * 100;
        this.platforms.push({
          x: this.generatedUpTo + Math.random() * segmentWidth,
          y: platY,
          width: platWidth,
          height: 16,
          isGround: false,
        });
      }

      this.generatedUpTo += segmentWidth + (hasGap ? 60 + Math.random() * 40 : 0);
    }
  }

  cleanup(cameraLeft: number) {
    this.platforms = this.platforms.filter(
      (p) => p.x + p.width > cameraLeft - 100
    );
  }

  getPlatforms(): Platform[] {
    return this.platforms;
  }

  reset() {
    this.platforms = [];
    this.generatedUpTo = 0;
    this.difficulty = 0;
  }
}
