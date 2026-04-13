import { describe, it, expect, beforeEach } from 'vitest';
import { Input } from '../../src/webview/engine/Input';

describe('Input', () => {
  let input: Input;

  beforeEach(() => {
    input = new Input();
  });

  it('tracks key down state', () => {
    input.handleKeyDown('ArrowLeft');
    expect(input.isDown('ArrowLeft')).toBe(true);
  });

  it('tracks key up state', () => {
    input.handleKeyDown('ArrowLeft');
    input.handleKeyUp('ArrowLeft');
    expect(input.isDown('ArrowLeft')).toBe(false);
  });

  it('reports no keys pressed initially', () => {
    expect(input.isDown('ArrowLeft')).toBe(false);
    expect(input.isDown('Space')).toBe(false);
  });

  it('tracks multiple simultaneous keys', () => {
    input.handleKeyDown('ArrowUp');
    input.handleKeyDown('ArrowRight');
    input.handleKeyDown('KeyZ');
    expect(input.isDown('ArrowUp')).toBe(true);
    expect(input.isDown('ArrowRight')).toBe(true);
    expect(input.isDown('KeyZ')).toBe(true);
  });

  it('detects just-pressed via justPressed()', () => {
    input.handleKeyDown('Space');
    expect(input.justPressed('Space')).toBe(true);
    input.endFrame();
    expect(input.justPressed('Space')).toBe(false);
    expect(input.isDown('Space')).toBe(true);
  });

  it('resets all state on reset()', () => {
    input.handleKeyDown('ArrowLeft');
    input.reset();
    expect(input.isDown('ArrowLeft')).toBe(false);
  });
});
