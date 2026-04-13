export interface ScoreEntry {
  nickname: string;
  score: number;
  created_at: string;
}

export class LeaderboardAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor(supabaseUrl: string, anonKey: string) {
    this.baseUrl = supabaseUrl;
    this.apiKey = anonKey;
  }

  async submitScore(nickname: string, score: number): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/rest/v1/scores`, {
        method: 'POST',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ nickname, score }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getTopScores(limit = 100): Promise<ScoreEntry[]> {
    try {
      const res = await fetch(
        `${this.baseUrl}/rest/v1/scores?select=nickname,score,created_at&order=score.desc&limit=${limit}`,
        {
          headers: {
            'apikey': this.apiKey,
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }
}
