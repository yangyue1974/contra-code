/**
 * Loads sprite images from the extension's media folder and processes them:
 * - Removes black background (makes it transparent)
 * - Splits sprite sheets into individual frames
 * - Caches processed canvases for fast rendering
 */

declare const window: Window & { __SPRITE_BASE__?: string };

export interface LoadedSprite {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface AnimatedSprite {
  frames: LoadedSprite[];
  frameCount: number;
}

export class SpriteLoader {
  private sprites = new Map<string, LoadedSprite>();
  private animations = new Map<string, AnimatedSprite>();
  loaded = false;

  async loadAll(): Promise<void> {
    const base = window.__SPRITE_BASE__;
    if (!base) return;

    const loadList: Array<{ key: string; file: string; frames?: number }> = [
      // Weapon pickups
      { key: 'weapon_spread', file: 'redgun.jpg' },
      { key: 'weapon_laser', file: 'bluegun.jpg' },
      { key: 'weapon_rapid', file: 'greengun.jpg' },
      { key: 'weapon_flame', file: 'orangegun.jpg' },
      // Backgrounds
      { key: 'bg_far', file: 'farview.jpg' },
      { key: 'bg_mid', file: 'middleview.jpg' },
      { key: 'bg_near', file: 'nearview.jpg' },
      // Characters
      { key: 'player', file: 'soldier.jpg', frames: 2 },
      { key: 'enemy_soldier', file: 'soldier.jpg', frames: 2 },
      { key: 'enemy_flyer', file: 'flyer.jpg' },
      { key: 'enemy_turret', file: 'turret.jpg' },
      { key: 'boss', file: 'boss.jpg' },
      // Effects
      { key: 'spark', file: 'spark.jpg', frames: 6 },
      { key: 'explosion', file: 'explosion.jpg', frames: 7 },
    ];

    await Promise.all(loadList.map(item => this.loadSprite(base, item.key, item.file, item.frames)));
    this.loaded = true;
  }

  private loadSprite(base: string, key: string, file: string, frames?: number): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const processed = this.processImage(img);
        if (frames && frames > 1) {
          this.animations.set(key, this.splitFrames(processed, frames));
        } else {
          this.sprites.set(key, processed);
        }
        resolve();
      };
      img.onerror = () => {
        console.warn(`Failed to load sprite: ${file}`);
        resolve();
      };
      img.src = `${base}/${file}`;
    });
  }

  /**
   * Draws image to a canvas and removes near-black pixels (makes them transparent).
   */
  private processImage(img: HTMLImageElement): LoadedSprite {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    // Remove black background (pixels where R+G+B < threshold)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const threshold = 40; // pixels darker than this become transparent
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = r + g + b;
      if (brightness < threshold * 3) {
        data[i + 3] = 0; // fully transparent
      } else if (brightness < threshold * 6) {
        // Partial transparency for smooth edges
        data[i + 3] = Math.min(255, (brightness - threshold * 3) / 3);
      }
    }
    ctx.putImageData(imageData, 0, 0);

    return { canvas, width: canvas.width, height: canvas.height };
  }

  private splitFrames(sprite: LoadedSprite, frameCount: number): AnimatedSprite {
    const frameWidth = Math.floor(sprite.width / frameCount);
    const frames: LoadedSprite[] = [];
    for (let i = 0; i < frameCount; i++) {
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = frameWidth;
      frameCanvas.height = sprite.height;
      const ctx = frameCanvas.getContext('2d')!;
      ctx.drawImage(
        sprite.canvas,
        i * frameWidth, 0, frameWidth, sprite.height,
        0, 0, frameWidth, sprite.height
      );
      frames.push({ canvas: frameCanvas, width: frameWidth, height: sprite.height });
    }
    return { frames, frameCount };
  }

  getSprite(key: string): LoadedSprite | undefined {
    return this.sprites.get(key);
  }

  getAnimation(key: string): AnimatedSprite | undefined {
    return this.animations.get(key);
  }

  /**
   * Draws a sprite at the given position, scaled to target size.
   */
  drawSprite(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number, y: number,
    targetW: number, targetH: number,
    flipX = false,
  ) {
    const sprite = this.sprites.get(key);
    if (!sprite) return;

    ctx.save();
    if (flipX) {
      ctx.translate(x + targetW, y);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite.canvas, 0, 0, targetW, targetH);
    } else {
      ctx.drawImage(sprite.canvas, x, y, targetW, targetH);
    }
    ctx.restore();
  }

  drawFrame(
    ctx: CanvasRenderingContext2D,
    key: string,
    frameIndex: number,
    x: number, y: number,
    targetW: number, targetH: number,
    flipX = false,
  ) {
    const anim = this.animations.get(key);
    if (!anim) return;
    const frame = anim.frames[frameIndex % anim.frameCount];
    if (!frame) return;

    ctx.save();
    if (flipX) {
      ctx.translate(x + targetW, y);
      ctx.scale(-1, 1);
      ctx.drawImage(frame.canvas, 0, 0, targetW, targetH);
    } else {
      ctx.drawImage(frame.canvas, x, y, targetW, targetH);
    }
    ctx.restore();
  }

  /**
   * Draws a tiled background (repeats horizontally to fill width).
   */
  drawBackground(
    ctx: CanvasRenderingContext2D,
    key: string,
    offsetX: number,
    y: number,
    width: number,
    height: number,
  ) {
    const sprite = this.sprites.get(key);
    if (!sprite) return;

    // Scale source to target height, maintain aspect
    const scale = height / sprite.height;
    const scaledWidth = sprite.width * scale;

    // Calculate starting x with offset (wraps around)
    let startX = -((offsetX % scaledWidth) + scaledWidth) % scaledWidth;
    if (startX > 0) startX -= scaledWidth;

    for (let x = startX; x < width; x += scaledWidth) {
      ctx.drawImage(sprite.canvas, x, y, scaledWidth, height);
    }
  }
}
