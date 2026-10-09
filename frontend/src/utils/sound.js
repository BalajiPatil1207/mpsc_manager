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
}

export const playSound = new SoundEngine();
