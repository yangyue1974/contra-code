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
  private canvasHeight: number;
  private lastPlatformX = 0;
  difficulty = 0; // 0 to 1

  constructor(groundY: number, canvasHeight: number = 600) {
    this.groundY = groundY;
    this.canvasHeight = canvasHeight;
  }

  updateDimensions(groundY: number, canvasHeight: number) {
    this.groundY = groundY;
    this.canvasHeight = canvasHeight;
  }

  generate(cameraLeft: number, cameraRight: number) {
    const generateTo = cameraRight + 400;
    // Available height above ground (leave margin for HUD)
    const skyHeight = Math.max(40, this.groundY - 20);

    while (this.generatedUpTo < generateTo) {
      const segmentWidth = 300 + Math.random() * 400;

      // Ground is always continuous — no gaps
      this.platforms.push({
        x: this.generatedUpTo,
        y: this.groundY,
        width: segmentWidth + 10, // slight overlap to prevent seams
        height: 40,
        isGround: true,
      });

      // Elevated platforms — structured placement
      const distSinceLastPlatform = this.generatedUpTo - this.lastPlatformX;
      const platformInterval = 400 + Math.random() * 200; // every 400-600px

      if (distSinceLastPlatform >= platformInterval) {
        const platWidth = 80 + Math.random() * 40;
        // Height: always reachable with a jump (25-45% of sky height)
        const platY = this.groundY - skyHeight * 0.25 - Math.random() * skyHeight * 0.2;
        this.platforms.push({
          x: this.generatedUpTo + segmentWidth * 0.3 + Math.random() * segmentWidth * 0.4,
          y: Math.max(30, platY),
          width: platWidth,
          height: 12,
          isGround: false,
        });
        this.lastPlatformX = this.generatedUpTo;
      }

      this.generatedUpTo += segmentWidth;
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
    this.lastPlatformX = 0;
    this.difficulty = 0;
  }
}
