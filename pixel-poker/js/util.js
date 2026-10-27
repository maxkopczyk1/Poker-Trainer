(function () {
  const PT = (window.PT = window.PT || {});

  PT.pick = (a) => a[Math.floor(Math.random() * a.length)];
  PT.rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  PT.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  PT.lerp = (a, b, t) => a + (b - a) * t;
  PT.shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  PT.gauss = () => {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  PT.delay = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

  // Full money string: $1,250
  PT.money = (n) => {
    n = Math.round(n);
    const neg = n < 0;
    n = Math.abs(n);
    return (neg ? '-' : '') + '$' + n.toLocaleString('en-US');
  };
  // Short money for the canvas: 12.5K, 1.2M
  PT.short = (n) => {
    n = Math.round(n);
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  };

  PT.store = {
    get(k, d) {
      try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : d;
      } catch (e) {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (e) {}
    },
    del(k) {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    },
  };

  PT.settings = Object.assign(
    { training: false, reveal: false, sfx: true, music: true, vol: 0.6, speed: 1, autoDeal: 0, log: true },
    PT.store.get('pt_settings', {})
  );
  PT.saveSettings = () => PT.store.set('pt_settings', PT.settings);

  PT.shade = (hex, amt) => {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = PT.clamp(r, 0, 255); g = PT.clamp(g, 0, 255); b = PT.clamp(b, 0, 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  };
})();
