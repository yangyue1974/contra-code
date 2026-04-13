import { Renderer } from '../engine/Renderer';
import { LeaderboardAPI } from '../network/LeaderboardAPI';

export class DeathScreen {
  private submitted = false;
  private submitting = false;

  render(renderer: Renderer, canvasW: number, canvasH: number, score: number, highScore: number) {
    renderer.drawRect(0, 0, canvasW, canvasH, 'rgba(0,0,0,0.7)');
    const cx = canvasW / 2;
    const cy = canvasH / 2;

    renderer.drawText('GAME OVER', cx, cy - 60, '#ff0000', 32, 'center');
    renderer.drawText(`Score: ${score}`, cx, cy - 20, '#ffffff', 20, 'center');
    renderer.drawText(`High Score: ${highScore}`, cx, cy + 10, '#ffff00', 16, 'center');

    if (this.submitted) {
      renderer.drawText('Score submitted!', cx, cy + 50, '#00ff00', 14, 'center');
    } else if (this.submitting) {
      renderer.drawText('Submitting...', cx, cy + 50, '#888888', 14, 'center');
    } else {
      renderer.drawText('Press Enter to submit score', cx, cy + 50, '#888888', 14, 'center');
    }

    renderer.drawText('Press SPACE to restart', cx, cy + 80, '#888888', 14, 'center');
  }

  async submitScore(api: LeaderboardAPI, nickname: string, score: number) {
    if (this.submitted || this.submitting) return;
    this.submitting = true;
    const success = await api.submitScore(nickname, score);
    this.submitting = false;
    this.submitted = success;
  }

  reset() {
    this.submitted = false;
    this.submitting = false;
  }
}
