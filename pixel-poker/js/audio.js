(function () {
  const PT = window.PT;
  let ctx = null, master = null, timer = null, step = 0, nextT = 0, level = 1, playing = false;
  const mf = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.connect(ctx.destination);
        setVol();
      } catch (e) { return false; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }
  function setVol() { if (master) master.gain.value = PT.settings.vol * 0.5; }
  function tone(f, t, d, type, v, slide) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v || 0.2, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + d + 0.02);
  }
  function noise(t, d, v) {
    const len = Math.floor(ctx.sampleRate * d), buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf; g.gain.value = v || 0.15;
    s.connect(g); g.connect(master); s.start(t);
  }
  const SFX = {
    click: (t) => tone(660, t, 0.05, 'square', 0.12),
    deal: (t) => { noise(t, 0.05, 0.12); noise(t + 0.09, 0.05, 0.1); },
    flip: (t) => { noise(t, 0.06, 0.12); tone(300, t, 0.06, 'triangle', 0.1); },
    chip: (t) => { tone(1800, t, 0.03, 'square', 0.08); tone(2400, t + 0.04, 0.03, 'square', 0.08); },
    check: (t) => tone(220, t, 0.05, 'triangle', 0.2),
    fold: (t) => tone(260, t, 0.12, 'triangle', 0.14, 120),
    raise: (t) => { tone(1500, t, 0.03, 'square', 0.08); [392, 523, 659].forEach((n, i) => tone(n, t + 0.04 + i * 0.06, 0.08, 'square', 0.1)); },
    win: (t) => [523, 659, 784, 1047, 784, 1047].forEach((n, i) => tone(n, t + i * 0.09, 0.14, 'square', 0.12)),
    lose: (t) => [392, 330, 262].forEach((n, i) => tone(n, t + i * 0.12, 0.18, 'triangle', 0.15)),
    good: (t) => { tone(784, t, 0.08, 'square', 0.1); tone(1047, t + 0.08, 0.14, 'square', 0.1); },
    bad: (t) => { tone(200, t, 0.18, 'sawtooth', 0.08, 120); },
  };
  const PROG = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]];
  const TRANS = [0, 2, -2, 3, 5, 0, -3, 7, 2, -5];
  function schedule() {
    const bpm = 84 + level * 3, tr = TRANS[(level - 1) % 10];
    while (nextT < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 8) % 4, k = step % 8, ch = PROG[bar];
      const ai = [0, 1, 2, 1, 2, 1, 0, 1][k];
      tone(mf(ch[ai] + 12 + tr), nextT, 0.12, 'square', 0.035);
      if (k % 4 === 0) tone(mf(ch[0] - 24 + tr + (k === 4 ? 7 : 0)), nextT, 0.32, 'triangle', 0.1);
      if (k === 2 || k === 6) noise(nextT, 0.03, 0.025);
      step++;
      nextT += 60 / bpm / 2;
    }
  }

  PT.Audio = {
    unlock: ensure,
    setVol,
    sfx(name) {
      if (!PT.settings.sfx || !ensure()) return;
      if (SFX[name]) SFX[name](ctx.currentTime);
    },
    music(on, lvl) {
      if (lvl) level = lvl;
      if (!on || !PT.settings.music) {
        clearInterval(timer); timer = null; playing = false;
        return;
      }
      if (!ensure() || playing) return;
      playing = true; step = 0; nextT = ctx.currentTime + 0.1;
      timer = setInterval(schedule, 60);
    },
    refresh() { this.music(PT.settings.music); },
  };
})();
