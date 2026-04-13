import { SpriteFrame } from '../sprites/SpriteData';

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  clear(width: number, height: number) {
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, width, height);
  }

  drawRect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
  }

  drawText(text: string, x: number, y: number, color: string, size = 14, align: CanvasTextAlign = 'left') {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px monospace`;
    this.ctx.textAlign = align;
    this.ctx.fillText(text, Math.floor(x), Math.floor(y));
  }

  drawSprite(sprite: SpriteFrame, x: number, y: number, scale = 2, flipX = false) {
    const rows = sprite.length;
    const cols = sprite[0].length;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const color = sprite[row][flipX ? cols - 1 - col : col];
        if (color) {
          this.ctx.fillStyle = color;
          this.ctx.fillRect(
            Math.floor(x + col * scale),
            Math.floor(y + row * scale),
            scale,
            scale
          );
        }
      }
    }
  }
}
