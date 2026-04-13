import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreSystem } from '../../src/webview/systems/Score';

describe('ScoreSystem', () => {
  let score: ScoreSystem;

  beforeEach(() => {
    score = new ScoreSystem();
  });

  it('starts at zero', () => {
    expect(score.current).toBe(0);
  });

  it('accumulates survival points', () => {
    score.addSurvivalTime(5);
    expect(score.current).toBe(5);
  });

  it('adds kill points', () => {
    score.addKill(10);
    expect(score.current).toBe(10);
  });

  it('tracks combo multiplier on rapid kills', () => {
    score.addKill(10); // 10
    score.addKill(10); // 10 * 1.5 = 15
    expect(score.current).toBe(25);
    expect(score.comboMultiplier).toBeCloseTo(1.5);
  });

  it('resets combo after timeout', () => {
    score.addKill(10);
    score.update(5);
    expect(score.comboMultiplier).toBe(1);
  });

  it('caps combo at x3', () => {
    for (let i = 0; i < 20; i++) {
      score.addKill(10);
    }
    expect(score.comboMultiplier).toBeLessThanOrEqual(3);
  });

  it('tracks high score', () => {
    score.addKill(100);
    score.reset();
    expect(score.current).toBe(0);
    expect(score.highScore).toBe(100);
  });
});
