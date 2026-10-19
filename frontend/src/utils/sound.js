// Sound Gamification Engine

// Synthesize sounds using web audio API to avoid needing static audio files
class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = true; // can be toggled via settings later
  }

  init() {
    if (!this.audioCtx) {
       this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
       this.audioCtx.resume();
    }
  }

  playBeep(frequency = 440, type = 'sine', duration = 0.1) {
    if (!this.enabled) return;
    try {
      this.init();
      const oscillator = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      // smooth envelope
      gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, this.audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      
      oscillator.start();
      oscillator.stop(this.audioCtx.currentTime + duration);
    } catch(e) {
      console.error(e);
    }
  }

  playSuccess() {
    // 2-tone melodic upward beep
    setTimeout(() => this.playBeep(440, 'sine', 0.1), 0);
    setTimeout(() => this.playBeep(659, 'sine', 0.2), 100);
  }
  
  playTick() {
    // short tick for selections
    this.playBeep(880, 'triangle', 0.05);
  }

  playXpGain() {
    // magical sound
    setTimeout(() => this.playBeep(523, 'sine', 0.1), 0);
    setTimeout(() => this.playBeep(659, 'sine', 0.1), 50);
    setTimeout(() => this.playBeep(784, 'sine', 0.1), 100);
    setTimeout(() => this.playBeep(1046, 'sine', 0.4), 150);
  }

  playPenalty() {
    // 3-tone descending low alert for XP deduction / missed study
    setTimeout(() => this.playBeep(370, 'sawtooth', 0.12), 0);
    setTimeout(() => this.playBeep(293, 'sawtooth', 0.14), 100);
    setTimeout(() => this.playBeep(220, 'sawtooth', 0.25), 220);
  }

  startNoise(type = 'rain', volume = 0.5) {
    if (!this.enabled) return;
    this.stopNoise();
    try {
      this.init();
      const bufferSize = 2 * this.audioCtx.sampleRate;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'rain') {
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          output[i] = (b0 + b1 + b2) * 0.11;
        } else {
          b0 = (b0 + (0.02 * white)) / 1.02;
          output[i] = b0 * 1.5;
        }
      }
      this.noiseSource = this.audioCtx.createBufferSource();
      this.noiseSource.buffer = noiseBuffer;
      this.noiseSource.loop = true;

      this.noiseGain = this.audioCtx.createGain();
      const initialGain = Math.max(0, Math.min(1, volume)) * 0.12;
      this.noiseGain.gain.setValueAtTime(initialGain, this.audioCtx.currentTime);

      this.noiseFilter = this.audioCtx.createBiquadFilter();
      this.noiseFilter.type = 'lowpass';
      this.noiseFilter.frequency.setValueAtTime(type === 'rain' ? 1200 : 800, this.audioCtx.currentTime);

      this.noiseSource.connect(this.noiseFilter);
      this.noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.audioCtx.destination);
      this.noiseSource.start();
    } catch(e) {
      console.error("Ambient noise error:", e);
    }
  }

  setNoiseVolume(volume = 0.5) {
    if (this.noiseGain && this.audioCtx) {
      const targetGain = Math.max(0, Math.min(1, volume)) * 0.12;
      this.noiseGain.gain.setValueAtTime(targetGain, this.audioCtx.currentTime);
    }
  }

  stopNoise() {
    try {
      if (this.noiseSource) {
        this.noiseSource.stop();
        this.noiseSource.disconnect();
        this.noiseSource = null;
      }
    } catch(e) {}
  }
}

export const playSound = new SoundEngine();
