/**
 * Sintetizador acústico basado en Web Audio API.
 * Genera un tono de alerta estridente (880Hz - 1174Hz) sin necesidad de descargar archivos MP3
 * que puedan fallar en conexiones 3G intermitentes.
 */
class CabAudioAlarm {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private intervalId: NodeJS.Timeout | null = null;

  private init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playBeep(frequency = 880, durationMs = 150) {
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'square'; // Onda cuadrada para máxima audibilidad por encima del ruido del motor
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationMs / 1000);
    } catch (e) {
      console.warn('Error en Web Audio API:', e);
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

export const cabAudioAlarm = new CabAudioAlarm();
