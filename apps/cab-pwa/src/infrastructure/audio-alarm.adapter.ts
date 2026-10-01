/**
 * Sintetizador acústico basado en Web Audio API (Adaptador de Infraestructura).
 * Genera un tono de alerta estridente (880Hz - 1174Hz) sin archivos externos.
 */
export class CabAudioAlarmAdapter {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private intervalId: NodeJS.Timeout | null = null;

  private init() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playBeep(frequency = 880, durationMs = 150) {
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationMs / 1000);
    } catch (e) {
      console.warn('[AudioAlarmAdapter] Error en Web Audio API:', e);
    }
  }

  startAlarm() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    let toggle = false;
    this.intervalId = setInterval(() => {
      this.playBeep(toggle ? 1174 : 880, 180);
      toggle = !toggle;
    }, 250);
  }

  stopAlarm() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const cabAudioAlarm = new CabAudioAlarmAdapter();
