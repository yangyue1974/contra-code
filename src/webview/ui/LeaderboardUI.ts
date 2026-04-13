import { Renderer } from '../engine/Renderer';
import { ScoreEntry } from '../network/LeaderboardAPI';

export class LeaderboardUI {
  private scores: ScoreEntry[] = [];
  visible = false;

  setScores(scores: ScoreEntry[]) {
    this.scores = scores;
  }

  render(renderer: Renderer, canvasW: number, canvasH: number) {
    if (!this.visible) return;

    renderer.drawRect(0, 0, canvasW, canvasH, 'rgba(0,0,0,0.85)');

    const cx = canvasW / 2;
    renderer.drawText('LEADERBOARD', cx, 50, '#00ff00', 28, 'center');
    renderer.drawText('Press Esc to close', cx, 80, '#666', 12, 'center');

    const startY = 120;
    const lineHeight = 24;

    for (let i = 0; i < Math.min(this.scores.length, 20); i++) {
      const s = this.scores[i];
      const y = startY + i * lineHeight;
      const rankColor = i < 3 ? '#ffff00' : '#cccccc';
      renderer.drawText(`${i + 1}.`, cx - 150, y, rankColor, 14, 'left');
      renderer.drawText(s.nickname, cx - 120, y, '#ffffff', 14, 'left');
      renderer.drawText(s.score.toString(), cx + 150, y, '#00ff00', 14, 'right');
    }

    if (this.scores.length === 0) {
      renderer.drawText('No scores yet. Be the first!', cx, startY + 40, '#888', 16, 'center');
    }
  }
}
