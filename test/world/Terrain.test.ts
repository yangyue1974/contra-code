import { describe, it, expect, beforeEach } from 'vitest';
import { Terrain } from '../../src/webview/world/Terrain';

describe('Terrain', () => {
  let terrain: Terrain;

  beforeEach(() => {
    terrain = new Terrain(600);
  });

  it('generates initial platforms including ground', () => {
    terrain.generate(0, 800);
    const platforms = terrain.getPlatforms();
    expect(platforms.length).toBeGreaterThan(0);
  });

  it('ground platform spans the visible area', () => {
    terrain.generate(0, 800);
    const ground = terrain.getPlatforms().find(p => p.isGround);
    expect(ground).toBeDefined();
    expect(ground!.width).toBeGreaterThanOrEqual(200);
  });

  it('generates new platforms as camera advances', () => {
    terrain.generate(0, 800);
    const count1 = terrain.getPlatforms().length;
    terrain.generate(800, 1600);
    const count2 = terrain.getPlatforms().length;
    expect(count2).toBeGreaterThanOrEqual(count1);
  });

  it('removes platforms behind the camera', () => {
    terrain.generate(0, 800);
    terrain.generate(800, 1600);
    terrain.cleanup(800);
    const platforms = terrain.getPlatforms();
    const allAfterCamera = platforms.every(p => p.x + p.width > 700);
    expect(allAfterCamera).toBe(true);
  });

  it('creates gaps in ground at higher difficulty', () => {
    terrain.difficulty = 0.8;
    // Generate a long stretch to ensure gaps appear
    terrain.generate(0, 5000);
    const groundPlatforms = terrain.getPlatforms().filter(p => p.isGround);
    // With high difficulty over a long stretch, we should see gaps (not one continuous ground)
    // The total ground coverage should be less than 5000 pixels
    const totalGroundWidth = groundPlatforms.reduce((sum, p) => sum + p.width, 0);
    expect(totalGroundWidth).toBeLessThan(5000);
  });
});
