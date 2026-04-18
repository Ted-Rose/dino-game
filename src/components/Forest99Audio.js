/** Neliela Web Audio palīdzība — bez ārējiem failiem */

export function createForestAudio() {
  /** @type {AudioContext | null} */
  let ctx = null;

  function ensure() {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type = 'sine', gain = 0.08) {
    const c = ensure();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(gain, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(c.currentTime);
    o.stop(c.currentTime + dur + 0.05);
  }

  /** @type {OscillatorNode | null} */
  let ambOsc = null;
  /** @type {GainNode | null} */
  let ambGain = null;

  function startAmbientNight() {
    stopAmbient();
    const c = ensure();
    ambOsc = c.createOscillator();
    ambGain = c.createGain();
    ambOsc.type = 'sine';
    ambOsc.frequency.setValueAtTime(55, c.currentTime);
    ambGain.gain.setValueAtTime(0.018, c.currentTime);
    ambOsc.connect(ambGain);
    ambGain.connect(c.destination);
    ambOsc.start();
  }

  function stopAmbient() {
    try {
      ambOsc?.stop();
      ambOsc?.disconnect();
    } catch {
      /* duplicate stop */
    }
    ambOsc = null;
    ambGain = null;
  }

  return {
    resume: ensure,
    hit: () => {
      tone(140, 0.08, 'square', 0.06);
      tone(90, 0.12, 'triangle', 0.05);
    },
    chop: () => tone(220, 0.06, 'triangle', 0.07),
    coin: () => {
      tone(880, 0.05, 'sine', 0.06);
      tone(1320, 0.07, 'sine', 0.04);
    },
    eat: () => tone(330, 0.1, 'sine', 0.06),
    craft: () => {
      tone(440, 0.06);
      tone(554, 0.08);
    },
    hurt: () => tone(95, 0.18, 'sawtooth', 0.07),
    nightAmb: startAmbientNight,
    stopAmb: stopAmbient,
    dayAmb: stopAmbient,
  };
}
