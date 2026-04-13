import { describe, it, expect, beforeEach } from 'vitest';
import { Camera } from '../../src/webview/engine/Camera';

describe('Camera', () => {
  let camera: Camera;

  beforeEach(() => {
    camera = new Camera(800, 600);
  });

  it('starts at x=0', () => {
    expect(camera.x).toBe(0);
  });

  it('scrolls right over time', () => {
    camera.update(1);
    expect(camera.x).toBeGreaterThan(0);
  });

  it('scrolls faster as speed increases', () => {
    camera.scrollSpeed = 100;
    camera.update(1);
    const x1 = camera.x;
    camera.x = 0;
    camera.scrollSpeed = 200;
    camera.update(1);
    expect(camera.x).toBeGreaterThan(x1);
  });

  it('converts world coords to screen coords', () => {
    camera.x = 500;
    expect(camera.toScreenX(600)).toBe(100);
  });
});
