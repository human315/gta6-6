// Synthesized sound: every effect and the music loop are built from
// WebAudio oscillators and noise — no audio files, no network.
// Everything is guarded: if the browser blocks audio, the game plays on
// silently instead of throwing.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted || !ctx || ctx.state !== 'running') return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      gain.gain.setValueAtTime(vol || 0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch { /* audio is decoration, never fatal */ }
  }

  function noise(dur, vol, filterFreq) {
    if (!ensure() || muted || !ctx || ctx.state !== 'running') return;
    try {
      const t = ctx.currentTime;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq || 1200;
      const gain = ctx.createGain();
      gain.gain.value = vol || 0.2;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(t);
    } catch { /* ignore */ }
  }

  // A lazy two-note siren that follows the wanted level.
  function setSiren(on) {
    if (!ensure()) return;
    try {
      if (on && !sirenOsc && ctx.state === 'running') {
        sirenOsc = ctx.createOscillator();
        sirenGain = ctx.createGain();
        sirenOsc.type = 'sine';
        sirenOsc.frequency.value = 720;
        sirenGain.gain.value = 0.045;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.55;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 190;
        lfo.connect(lfoGain);
        lfoGain.connect(sirenOsc.frequency);
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        lfo.start();
        sirenOsc._lfo = lfo;
      } else if (!on && sirenOsc) {
        const osc = sirenOsc;
        const lfo = osc._lfo;
        sirenOsc = null;
        sirenGain = null;
        try { osc.stop(); } catch { /* already stopped */ }
        try { lfo.stop(); } catch { /* already stopped */ }
      }
    } catch { /* ignore */ }
  }

  // Engine hum: a low sawtooth whose pitch follows speed.
  function setEngine(speed01) {
    if (!ensure() || !ctx || ctx.state !== 'running') return;
    try {
      if (speed01 > 0.02 && !engineOsc) {
        engineOsc = ctx.createOscillator();
        engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 55;
        engineGain.gain.value = 0.035;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      if (engineOsc) {
        engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, ctx.currentTime, 0.08);
        engineGain.gain.setTargetAtTime(0.02 + speed01 * 0.05, ctx.currentTime, 0.08);
      }
      if (speed01 <= 0.02 && engineOsc) {
        const osc = engineOsc;
        engineOsc = null;
        engineGain = null;
        try { osc.stop(); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }

  // Sunny-day bassline loop: a laid-back funk pattern, 96 BPM.
  const BASS = [55, 0, 55, 65.4, 0, 55, 0, 82.4, 55, 0, 49, 0, 55, 0, 73.4, 0];
  const CHORD = [220, 261.6, 329.6, 392];
  function startMusic() {
    if (!ensure() || musicTimer) return;
    musicTimer = setInterval(() => {
      if (!ctx || ctx.state !== 'running' || muted) return;
      try {
        const bass = BASS[musicStep % BASS.length];
        if (bass) tone(bass, 0.32, 'triangle', 0.16);
        if (musicStep % 4 === 0) {
          tone(CHORD[(musicStep / 4) % CHORD.length | 0], 0.5, 'sine', 0.05);
        }
        if (musicStep % 8 === 6) noise(0.06, 0.05, 6000);
        musicStep += 1;
      } catch { /* ignore */ }
    }, 156);
  }

  return {
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
      startMusic();
    },
    click() { tone(660, 0.07, 'square', 0.1); },
    shot() { noise(0.12, 0.3, 2400); tone(180, 0.09, 'square', 0.14, 60); },
    hit() { tone(140, 0.12, 'sawtooth', 0.16, 70); },
    crash() { noise(0.25, 0.3, 500); tone(90, 0.25, 'sawtooth', 0.18, 40); },
    pickup() { tone(523, 0.1, 'sine', 0.14); setTimeout(() => tone(784, 0.14, 'sine', 0.14), 90); },
    missionDone() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.16), i * 110));
    },
    wantedUp() { tone(440, 0.15, 'square', 0.12); setTimeout(() => tone(349, 0.2, 'square', 0.12), 130); },
    busted() { tone(392, 0.3, 'sawtooth', 0.15, 196); },
    carDoor() { noise(0.08, 0.18, 900); },
    setSiren,
    setEngine,
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() { return muted; },
  };
}
