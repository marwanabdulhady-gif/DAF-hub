/**
 * ActivityEngine Audio Synthesizer (Zero external dependencies)
 * Uses Web Audio API to create authentic arcade & game sound effects.
 */
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(type) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      switch (type) {
        case 'click':
        case 'tap': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }
        case 'flip':
        case 'whoosh': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        }
        case 'correct':
        case 'match': {
          // Cheerful chime (arpeggio E5 -> G#5 -> B5 -> E6)
          const notes = [659.25, 830.61, 987.77, 1318.51];
          notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            gain.gain.setValueAtTime(0, now + idx * 0.07);
            gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.07 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.35);
          });
          break;
        }
        case 'wrong':
        case 'error': {
          // Low buzzy double-thud
          [180, 140].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);
            gain.gain.setValueAtTime(0.25, now + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.1);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 0.1);
          });
          break;
        }
        case 'tick': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(1200, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.02);
          break;
        }
        case 'wheel-tick': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(900 + Math.random() * 200, now);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.03);
          break;
        }
        case 'fanfare':
        case 'win': {
          // Major fanfare chord cascade
          const chords = [
            { f: 523.25, t: 0.0, d: 0.2 }, // C5
            { f: 659.25, t: 0.15, d: 0.2 }, // E5
            { f: 783.99, t: 0.3, d: 0.2 }, // G5
            { f: 1046.50, t: 0.45, d: 0.6 }, // C6
            { f: 1318.51, t: 0.6, d: 0.8 }, // E6
          ];
          chords.forEach(c => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(c.f, now + c.t);
            gain.gain.setValueAtTime(0, now + c.t);
            gain.gain.linearRampToValueAtTime(0.35, now + c.t + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + c.t + c.d);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + c.t);
            osc.stop(now + c.t + c.d);
          });
          break;
        }
        case 'gameover': {
          const notes = [440, 415, 392, 349];
          notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.18);
            gain.gain.setValueAtTime(0.2, now + idx * 0.18);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.18 + 0.2);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + idx * 0.18);
            osc.stop(now + idx * 0.18 + 0.2);
          });
          break;
        }
        case 'star': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(1800, now + 0.2);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.25);
          break;
        }
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

window.SoundSynth = SoundSynth;
