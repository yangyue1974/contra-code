import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardAPI } from '../../src/webview/network/LeaderboardAPI';

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('LeaderboardAPI', () => {
  let api: LeaderboardAPI;

  beforeEach(() => {
    api = new LeaderboardAPI('https://test.supabase.co', 'test-anon-key');
    mockFetch.mockReset();
  });

  it('submits score with POST', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    await api.submitScore('TestPlayer', 42);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.supabase.co/rest/v1/scores',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'apikey': 'test-anon-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ nickname: 'TestPlayer', score: 42 }),
      })
    );
  });

  it('fetches top scores', async () => {
    const mockScores = [
      { nickname: 'Player1', score: 100, created_at: '2026-01-01' },
      { nickname: 'Player2', score: 50, created_at: '2026-01-02' },
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockScores) });
    const scores = await api.getTopScores(10);
    expect(scores).toEqual(mockScores);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('order=score.desc&limit=10'),
      expect.any(Object)
    );
  });

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const scores = await api.getTopScores(10);
    expect(scores).toEqual([]);
  });

  it('returns false on submit failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await api.submitScore('Test', 10);
    expect(result).toBe(false);
  });
});
