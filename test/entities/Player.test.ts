import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../src/webview/entities/Player';
import { Input } from '../../src/webview/engine/Input';

describe('Player', () => {
  let player: Player;
  let input: Input;

  beforeEach(() => {
    input = new Input();
    player = new Player(100, 300, input);
  });

  it('initializes at given position', () => {
    expect(player.x).toBe(100);
    expect(player.y).toBe(300);
  });

  it('moves left when left key is pressed', () => {
    input.handleKeyDown('ArrowLeft');
    player.update(1 / 60);
    expect(player.x).toBeLessThan(100);
  });

  it('does not move right from right key alone', () => {
    const startX = player.x;
    input.handleKeyDown('ArrowRight');
    player.update(1 / 60);
    expect(player.x).toBe(startX);
  });

  it('jumps when space is pressed and on ground', () => {
    player.onGround = true;
    input.handleKeyDown('Space');
    player.update(1 / 60);
    expect(player.vy).toBeLessThan(0);
  });

  it('does not jump in air with no jumps remaining', () => {
    player.onGround = false;
    player.jumpsRemaining = 0;
    input.handleKeyDown('Space');
    player.update(1 / 60);
    expect(player.vy).toBe(0);
  });

  it('supports double jump', () => {
    player.onGround = false;
    player.jumpsRemaining = 1;
    input.handleKeyDown('Space');
    player.update(1 / 60);
    expect(player.vy).toBeLessThan(0);
    expect(player.jumpsRemaining).toBe(0);
  });

  it('crouches when down is pressed on ground', () => {
    player.onGround = true;
    input.handleKeyDown('ArrowDown');
    player.update(1 / 60);
    expect(player.crouching).toBe(true);
  });

  it('aims upper-right', () => {
    input.handleKeyDown('ArrowUp');
    input.handleKeyDown('ArrowRight');
    player.update(1 / 60);
    expect(player.aimAngle).toBeCloseTo(-Math.PI / 4);
  });

  it('aims straight up', () => {
    input.handleKeyDown('ArrowUp');
    player.update(1 / 60);
    expect(player.aimAngle).toBeCloseTo(-Math.PI / 2);
  });

  it('aims forward by default', () => {
    player.update(1 / 60);
    expect(player.aimAngle).toBe(0);
  });
});
