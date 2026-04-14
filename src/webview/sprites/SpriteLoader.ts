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

    // keyMode: 'black' = remove dark pixels, 'corner' = sample corner and remove matching
    // cropBottom: fraction of height to crop off bottom (e.g. 0.05 = crop bottom 5%)
    const loadList: Array<{ key: string; file: string; frames?: number; keyMode?: 'black' | 'corner'; cropBottom?: number }> = [
      // Weapon pickups (black bg)
      { key: 'weapon_spread', file: 'redgun.jpg', keyMode: 'black' },
      { key: 'weapon_laser', file: 'bluegun.jpg', keyMode: 'black' },
      { key: 'weapon_rapid', file: 'greengun.jpg', keyMode: 'black' },
      { key: 'weapon_flame', file: 'orangegun.jpg', keyMode: 'black' },
      // Backgrounds — keep full image, no keying
      { key: 'bg_far', file: 'farview.jpg' },
      { key: 'bg_mid', file: 'middleview.jpg' },
      { key: 'bg_near', file: 'nearview.jpg' },
      // Characters — corner chroma key + crop bottom to remove ground shadow line
      { key: 'player', file: 'soldier.jpg', frames: 2, keyMode: 'corner', cropBottom: 0.05 },
      { key: 'enemy_soldier', file: 'enemy_soldier.jpg', frames: 4, keyMode: 'corner', cropBottom: 0.05 },
      { key: 'enemy_flyer', file: 'flyer.jpg', keyMode: 'black' },
      { key: 'enemy_turret', file: 'turret.jpg', keyMode: 'corner' },
      { key: 'boss', file: 'boss.jpg', keyMode: 'corner' },
      // Effects — black bg
      { key: 'spark', file: 'spark.jpg', frames: 6, keyMode: 'black' },
      { key: 'explosion', file: 'explosion.jpg', frames: 7, keyMode: 'black' },
    ];

    await Promise.all(loadList.map(item => this.loadSprite(base, item.key, item.file, item.frames, item.keyMode, item.cropBottom)));
    this.loaded = true;
  }

  private loadSprite(base: string, key: string, file: string, frames?: number, keyMode?: 'black' | 'corner', cropBottom?: number): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const processed = this.processImage(img, keyMode, cropBottom);
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
   * Draws image to a canvas and removes background:
   * - 'black': removes near-black pixels
   * - 'corner': samples corner pixels to determine background color, removes similar pixels
   * - undefined: no background removal (keep original, e.g. backgrounds)
   */
  private processImage(img: HTMLImageElement, keyMode?: 'black' | 'corner', cropBottom?: number): LoadedSprite {
    const canvas = document.createElement('canvas');
    const fullH = img.naturalHeight;
    const cropPx = cropBottom ? Math.floor(fullH * cropBottom) : 0;
    canvas.width = img.naturalWidth;
    canvas.height = fullH - cropPx;
    const ctx = canvas.getContext('2d')!;
    // Draw image cropped at the bottom
    ctx.drawImage(
      img,
      0, 0, img.naturalWidth, fullH - cropPx,
      0, 0, img.naturalWidth, fullH - cropPx
    );

    if (!keyMode) {
      return { canvas, width: canvas.width, height: canvas.height };
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    if (keyMode === 'black') {
      // Remove dark pixels
      const threshold = 50;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = data[i] + data[i + 1] + data[i + 2];
        if (brightness < threshold * 3) {
          data[i + 3] = 0;
        } else if (brightness < threshold * 5) {
          data[i + 3] = Math.min(255, (brightness - threshold * 3) * 0.6);
        }
      }
    } else if (keyMode === 'corner') {
      // Sample 4 corners to determine background color (average them)
      const w = canvas.width;
      const h = canvas.height;
      const samples = [
        [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
        [Math.floor(w * 0.02), Math.floor(h * 0.02)],
        [Math.floor(w * 0.98), Math.floor(h * 0.02)],
        [Math.floor(w * 0.02), Math.floor(h * 0.98)],
        [Math.floor(w * 0.98), Math.floor(h * 0.98)],
      ];
      let avgR = 0, avgG = 0, avgB = 0;
      for (const [sx, sy] of samples) {
        const idx = (sy * w + sx) * 4;
        avgR += data[idx];
        avgG += data[idx + 1];
        avgB += data[idx + 2];
      }
      avgR /= samples.length;
      avgG /= samples.length;
      avgB /= samples.length;

      // Remove all pixels within color distance threshold
      const hardThreshold = 40; // fully transparent if within this
      const softThreshold = 80; // partial transparency up to this

      for (let i = 0; i < data.length; i += 4) {
        const dr = data[i] - avgR;
        const dg = data[i + 1] - avgG;
        const db = data[i + 2] - avgB;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist < hardThreshold) {
          data[i + 3] = 0;
        } else if (dist < softThreshold) {
          data[i + 3] = Math.floor(255 * (dist - hardThreshold) / (softThreshold - hardThreshold));
        }
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
