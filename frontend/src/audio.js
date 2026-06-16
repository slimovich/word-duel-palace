/*
 * Word Duel Palace - original audio engine.
 *
 * Every sound effect and the background music are synthesized at runtime with
 * the Web Audio API (oscillators + filtered noise). No external audio files,
 * no sampled or copyrighted material.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.musicOn = false;
    this._musicTimer = null;
    this._musicStep = 0;
  }

  _ensure() {
    if (this.ctx) return;

    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.master);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.18; // low by default
    this.musicGain.connect(this.master);
  }

  // Must be called from a user gesture to unlock audio on most browsers.
  resume() {
    this._ensure();

    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    this._ensure();
    this.master.gain.value = m ? 0 : 0.9;
  }

  // ---- low level helpers -------------------------------------------------
  _tone({ freq = 440, type = "sine", dur = 0.15, gain = 0.3, attack = 0.005,
          decay = null, when = 0, glideTo = null, dest = null }) {
    if (!this.ctx) return;

    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);

    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);

    const peak = gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.2, gain = 0.3, when = 0, type = "lowpass", freq = 1000 }) {
    if (!this.ctx) return;

    const t0 = this.ctx.currentTime + when;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);

    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + dur);
  }

  // ---- named sound effects ----------------------------------------------
  play(name) {
    if (!this.ctx || this.muted) return;

    switch (name) {
      case "join": // soft wooden knock
        this._tone({ freq: 180, type: "sine", dur: 0.12, gain: 0.35, glideTo: 120 });
        this._noise({ dur: 0.08, gain: 0.12, freq: 800 });
        break;
      case "tap": // light wooden tap
        this._tone({ freq: 520, type: "triangle", dur: 0.06, gain: 0.22, glideTo: 380 });
        break;
      case "deselect": // softer tap
        this._tone({ freq: 320, type: "triangle", dur: 0.05, gain: 0.14, glideTo: 240 });
        break;
      case "valid": { // bright magical chime (arpeggio)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) =>
          this._tone({ freq: f, type: "sine", dur: 0.4, gain: 0.22, when: i * 0.06 }));
        this._tone({ freq: 1567, type: "sine", dur: 0.5, gain: 0.1, when: 0.24 });
        break;
      }
      case "invalid": // dull thunk + buzz
        this._tone({ freq: 140, type: "sawtooth", dur: 0.18, gain: 0.22, glideTo: 90 });
        this._noise({ dur: 0.12, gain: 0.1, freq: 400 });
        break;
      case "hit": // short impact
        this._noise({ dur: 0.18, gain: 0.35, freq: 1600, type: "lowpass" });
        this._tone({ freq: 90, type: "square", dur: 0.12, gain: 0.25, glideTo: 60 });
        break;
      case "lowhp": // warning heartbeat (double pulse)
        this._tone({ freq: 70, type: "sine", dur: 0.14, gain: 0.3, glideTo: 50 });
        this._tone({ freq: 70, type: "sine", dur: 0.14, gain: 0.24, when: 0.22, glideTo: 50 });
        break;
      case "victory": { // triumphant fanfare
        const seq = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        seq.forEach((f, i) =>
          this._tone({ freq: f, type: "triangle", dur: 0.3, gain: 0.25, when: i * 0.12 }));
        this._tone({ freq: 1046.5, type: "sine", dur: 0.6, gain: 0.18, when: 0.6 });
        break;
      }
      case "defeat": { // descending tone
        const seq = [440, 392, 329.6, 261.6];
        seq.forEach((f, i) =>
          this._tone({ freq: f, type: "sine", dur: 0.35, gain: 0.22, when: i * 0.16 }));
        break;
      }
      case "tick": // quiet ticking
        this._tone({ freq: 1200, type: "square", dur: 0.03, gain: 0.08 });
        break;
      case "shield":
        this._tone({ freq: 300, type: "sine", dur: 0.3, gain: 0.2, glideTo: 600 });
        break;
      default:
        break;
    }
  }

  // ---- background music: a gentle, quirky looping arpeggio ----------------
  toggleMusic(on) {
    this._ensure();
    this.musicOn = on;

    if (on) {
      this.resume();
      this._scheduleMusic();
    } else if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  }

  _scheduleMusic() {
    if (this._musicTimer) clearInterval(this._musicTimer);

    // A short, light fantasy/puzzle loop in C major-ish, with a wandering bass.
    const melody = [
      523.25, 587.33, 659.25, 783.99, 659.25, 587.33,
      698.46, 659.25, 587.33, 523.25, 587.33, 659.25,
    ];
    const bass = [130.81, 130.81, 174.61, 174.61, 196.0, 196.0, 146.83, 146.83];
    const stepMs = 240;
    this._musicStep = 0;
    const tick = () => {
      if (!this.musicOn || !this.ctx) return;

      const i = this._musicStep;
      const m = melody[i % melody.length];
      this._tone({ freq: m, type: "triangle", dur: 0.22, gain: 0.5,
        dest: this.musicGain });

      if (i % 2 === 0) {
        const b = bass[(i / 2) % bass.length];
        this._tone({ freq: b, type: "sine", dur: 0.45, gain: 0.6,
          dest: this.musicGain });
      }

      // sparkle every 6 steps
      if (i % 6 === 3) {
        this._tone({ freq: 1046.5, type: "sine", dur: 0.3, gain: 0.25,
          dest: this.musicGain });
      }

      this._musicStep = (i + 1) % 48;
    };
    tick();
    this._musicTimer = setInterval(tick, stepMs);
  }
}

const audio = new AudioEngine();
export default audio;
