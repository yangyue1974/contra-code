export class Camera {
  x = 0;
  y = 0;
  width: number;
  height: number;
  scrollSpeed = 80;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  update(dt: number) {
    this.x += this.scrollSpeed * dt;
  }

  toScreenX(worldX: number): number {
    return worldX - this.x;
  }

  toScreenY(worldY: number): number {
    return worldY - this.y;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}
