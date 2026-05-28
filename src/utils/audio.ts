class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  public volumeValue = 0.3; // Default 30% volume

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Pure retro "plop" sound for placing blocks
  public playPlace(volume = this.volumeValue) {
    try {
      this.initCtx();
      if (!this.ctx || volume <= 0) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(360, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio Context init blocked or failed: ", e);
    }
  }

  // Noise explosion "burst/crunch" sound for deleting blocks
  public playDelete(volume = this.volumeValue) {
    try {
      this.initCtx();
      if (!this.ctx || volume <= 0) return;

      const bufferSize = this.ctx.sampleRate * 0.08; // Short burst
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Populate random white noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      // Filter noise to sound like gravel crumbling
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.7, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noiseNode.start();
      noiseNode.stop(this.ctx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio context failed: ", e);
    }
  }

  // Sparkling cute arpeggio for magical creations
  public playMagic(volume = this.volumeValue) {
    try {
      this.initCtx();
      if (!this.ctx || volume <= 0) return;

      const now = this.ctx.currentTime;
      const scale = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio

      scale.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(volume * 0.4, now + idx * 0.06);
        gain.gain.setValueAtTime(volume * 0.4, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.15);
      });
    } catch (e) {
      console.warn("Audio context failed: ", e);
    }
  }
}

export const synths = new AudioSynthesizer();
