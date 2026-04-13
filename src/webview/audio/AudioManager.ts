declare const window: Window & { __BGM_URL__?: string };

export class AudioManager {
  private audioCtx: AudioContext | null = null;
  private musicVolume = 0.5;
  private sfxVolume = 0.7;
  private bgmElement: HTMLAudioElement | null = null;
  private bgmStarted = false;
  enabled = true;

  private getCtx(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  setMusicVolume(v: number) {
    this.musicVolume = v;
    if (this.bgmElement) {
      this.bgmElement.volume = v;
    }
  }

  setSfxVolume(v: number) { this.sfxVolume = v; }

  startMusic() {
    if (this.bgmStarted || !this.enabled) return;
    const url = window.__BGM_URL__;
    if (!url) return;

    this.bgmElement = new Audio(url);
    this.bgmElement.loop = true;
    this.bgmElement.volume = this.musicVolume;
    this.bgmElement.play().catch(() => {});
    this.bgmStarted = true;
  }

  stopMusic() {
    if (this.bgmElement) {
      this.bgmElement.pause();
      this.bgmElement.currentTime = 0;
      this.bgmStarted = false;
    }
  }

  playSfx(type: 'shoot' | 'jump' | 'kill' | 'die' | 'boss') {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = this.sfxVolume * 0.3;

    const now = ctx.currentTime;

    switch (type) {
      case 'shoot':
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.linearRampToValueAtTime(440, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      case 'jump':
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'kill':
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.15);
        osc.type = 'square';
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'die':
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.5);
        osc.type = 'sawtooth';
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'boss':
        osc.frequency.setValueAtTime(150, now);
        osc.type = 'square';
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
    }
  }
}
