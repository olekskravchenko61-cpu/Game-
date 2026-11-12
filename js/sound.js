/* Tiny synthesized sound effects (Web Audio API) — no audio files to download. */
(function () {
  let ctx = null;
  let muted = false;

  function ac() {
    if (muted) return null;
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) {
      return null;
    }
  }

  function tone(freq, start, dur, opts) {
    const c = ac();
    if (!c) return;
    const o = Object.assign({ type: 'sine', vol: 0.16, slide: 0 }, opts);
    const t0 = c.currentTime + start;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = o.type;
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + o.slide), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(o.vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(start, dur, vol) {
    const c = ac();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    const gain = c.createGain();
    gain.gain.value = vol || 0.08;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(c.currentTime + start);
  }

  const sfx = {
    tap() { tone(660, 0, 0.08, { type: 'triangle', vol: 0.08 }); },
    pop() { tone(520, 0, 0.12, { type: 'sine', vol: 0.12, slide: 380 }); },
    correct() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.08, 0.28, { type: 'triangle', vol: 0.12 }));
    },
    wrong() {
      tone(330, 0, 0.18, { type: 'sine', vol: 0.12, slide: -90 });
      tone(247, 0.16, 0.26, { type: 'sine', vol: 0.12, slide: -70 });
    },
    heart() {
      [880, 1174.66, 1567.98].forEach((f, i) => tone(f, i * 0.06, 0.22, { type: 'sine', vol: 0.09 }));
    },
    whoosh() { noise(0, 0.45, 0.06); },
    laugh() {
      [0, 0.13, 0.26, 0.39].forEach((s, i) => tone(600 - i * 40, s, 0.1, { type: 'square', vol: 0.035, slide: 120 }));
    },
    fanfare() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
      notes.forEach((f, i) => tone(f, i * 0.11, 0.35, { type: 'triangle', vol: 0.1 }));
    },
    magic() {
      [1046.5, 1318.5, 1568, 2093, 1568, 2093, 2637].forEach((f, i) => tone(f, i * 0.07, 0.4, { type: 'sine', vol: 0.06 }));
    },
  };

  window.Sound = {
    play(name) {
      if (muted || !sfx[name]) return;
      try { sfx[name](); } catch (e) { /* ignore */ }
    },
    setMuted(v) {
      muted = !!v;
      if (muted && ctx && ctx.state === 'running') ctx.suspend();
    },
    isMuted() { return muted; },
    unlock() { ac(); },
  };
})();
