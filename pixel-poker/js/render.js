(function () {
  const PT = window.PT;
  const W = 640, H = 360, CX = 320, CY = 165;
  let ctx = null, cv = null, T = null, raf = 0, lastT = 0, pv = null;
  const bgCache = {}, layerCache = {};
  const R = (PT.R = { W, H, CX, CY, loadout: { char: PT.defaultChar, equipped: {} }, back: null, heroLabel: '', showPos: false, themeIdx: 0 });

  // ---------- 3x5 pixel font ----------
  const FS = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001110001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
    9: '111101111001110', $: '011110010011110', '.': '000000000000010', ',': '000000000010100', '-': '000000111000000',
    '+': '000010111010000', ':': '000010000010000', '/': '001001010100100', '%': '101001010100101', '!': '010010010000010',
    '?': '110001010000010', "'": '010010000000000', '>': '100010001010100', '<': '001010100010001', '=': '000111000111000',
  };
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function text(str, x, y, col, s, al) {
    s = s || 1; str = String(str).toUpperCase();
    const w = str.length * 4 * s - s;
    if (al === 'c') x -= Math.floor(w / 2); else if (al === 'r') x -= w;
    ctx.fillStyle = col;
    for (let k = 0; k < str.length; k++) {
      const g = FS[str[k]];
      if (g) for (let i = 0; i < 15; i++) if (g.charCodeAt(i) === 49) ctx.fillRect(x + (i % 3) * s, y + ((i / 3) | 0) * s, s, s);
      x += 4 * s;
    }
  }
  function textS(str, x, y, col, s, al) { text(str, x + (s || 1), y + (s || 1), '#000', s, al); text(str, x, y, col, s, al); }
  const textW = (str, s) => String(str).length * 4 * (s || 1) - (s || 1);
  function ell(cx, cy, rx, ry, c) {
    ctx.fillStyle = c;
    for (let dy = -ry; dy <= ry; dy++) {
      const dx = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  }
  function sprite(rows, x, y, col, s, pal) {
    s = s || 1;
    for (let j = 0; j < rows.length; j++)
      for (let i = 0; i < rows[j].length; i++) {
        const ch = rows[j][i];
        if (ch === '0' || ch === ' ') continue;
        ctx.fillStyle = pal && pal[ch] ? pal[ch] : col;
        ctx.fillRect(x + i * s, y + j * s, s, s);
      }
  }
  const hsh = (a, b) => (((a * 73856093) ^ (b * 19349663)) >>> 0);
  const ease = (e) => 1 - (1 - e) * (1 - e);
  const SU = [
    ['0011100', '0111110', '0011100', '1101011', '1111111', '0001000', '0011100'], // club
    ['0001000', '0011100', '0111110', '1111111', '0111110', '0011100', '0001000'], // diamond
    ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000', '0000000'], // heart
    ['0001000', '0011100', '0111110', '1111111', '1111111', '0001000', '0011100'], // spade
  ];

  // ---------- Cards ----------
  function backOf(eq) { const it = eq && eq.cardback && PT.shopById[eq.cardback]; return it || PT.shopById.c1; }
  function back(x, y, w, h, dim) {
    const b = R.back || PT.shopById.c1;
    rect(x - 1, y - 1, w + 2, h + 2, '#0a0a12');
    rect(x, y, w, h, dim ? PT.shade(b.c1, -30) : b.c1);
    const c2 = dim ? PT.shade(b.c2, -50) : b.c2;
    if (w > 6)
      for (let j = 2; j < h - 2; j++)
        for (let i = 2; i < w - 2; i++) {
          let on;
          if (b.pattern === 'check') on = ((i >> 1) + (j >> 1)) % 2 === 0;
          else if (b.pattern === 'stripe') on = ((i >> 1) % 2) === 0;
          else on = (i + j) % 4 === 0 || (i - j + 400) % 4 === 0;
          if (on) { ctx.fillStyle = c2; ctx.fillRect(x + i, y + j, 1, 1); }
        }
    if (w > 4) {
      rect(x + 1, y + 1, w - 2, 1, '#f4f0e6'); rect(x + 1, y + h - 2, w - 2, 1, '#f4f0e6');
      rect(x + 1, y + 1, 1, h - 2, '#f4f0e6'); rect(x + w - 2, y + 1, 1, h - 2, '#f4f0e6');
    }
  }
  function card(x, y, w, h, c, o) {
    o = o || {};
    if (c == null || o.down) { back(x, y, w, h, o.dim); return; }
    if (o.shadow !== false) rect(x + 2, y + 2, w, h, 'rgba(0,0,0,0.28)');
    rect(x - 1, y - 1, w + 2, h + 2, o.hl ? '#ffd23f' : '#0a0a12');
    rect(x, y, w, h, o.dim ? '#aaa493' : '#f4f0e6');
    const s = o.big ? 2 : 1, r = c >> 2, su = c & 3, red = su === 1 || su === 2;
    const col = o.dim ? (red ? '#9a3a44' : '#3a3a48') : red ? '#d12b3a' : '#1a1a24';
    text(r === 8 ? '10' : PT.RANKS[r], x + 2, y + 2, col, s);
    if (o.big) {
      sprite(SU[su], x + 2, y + 2 + 5 * s + 3, col, 1);
      sprite(SU[su], x + w - 16, y + h - 16, col, 2);
    } else sprite(SU[su], x + w - 16, y + h - 16, col, 2);
  }
  // card drawn with a horizontal flip (age 0..1: back -> face)
  function flipCard(x, y, w, h, c, f, o) {
    if (f >= 1) { card(x, y, w, h, c, o); return; }
    const ww = Math.max(2, Math.round(w * Math.abs(f < 0.5 ? 1 - 2 * f : 2 * f - 1)));
    const xx = x + ((w - ww) >> 1);
    if (f < 0.5) back(xx, y, ww, h); else card(xx, y, ww, h, c, o);
  }

  // ---------- Chips ----------
  const DEN = [[100000, '#ff4aa0'], [25000, '#e8c820'], [10000, '#8a8a96'], [5000, '#ff8a00'], [1000, '#e8c820'], [500, '#7a3ad0'], [100, '#2a2a38'], [25, '#2fa84f'], [5, '#d03030'], [1, '#e8e8e8']];
  function chips(x, y, amount) {
    const out = [];
    let rem = amount;
    for (const d of DEN) {
      const k = Math.floor(rem / d[0]);
      if (k > 0) { out.push({ c: d[1], k: Math.min(k, 6) }); rem -= k * d[0]; }
      if (out.length >= 3) break;
    }
    out.forEach((s, i) => {
      const sx = Math.round(x + (i - (out.length - 1) / 2) * 11);
      rect(sx - 4, y + 3, 10, 2, 'rgba(0,0,0,0.3)');
      for (let j = 0; j < s.k; j++) {
        const cy = y - j * 2;
        rect(sx - 4, cy, 9, 3, PT.shade(s.c, -60)); rect(sx - 4, cy, 9, 2, s.c); rect(sx - 3, cy, 7, 1, PT.shade(s.c, 40));
        rect(sx - 1, cy, 1, 2, PT.shade(s.c, -40));
      }
    });
  }

  // ---------- Venue decor ----------
  const DECOR = ['barrel', 'barrel', 'pin', 'lantern', 'cactus', 'plant', 'neon', 'pillar', 'lantern', 'safe'];
  function decor(kind, x, y) {
    if (kind === 'barrel') { rect(x - 7, y - 8, 14, 18, '#5a3a1e'); rect(x - 7, y - 4, 14, 2, '#2a2a30'); rect(x - 7, y + 4, 14, 2, '#2a2a30'); rect(x - 5, y - 8, 3, 18, '#7a5430'); }
    else if (kind === 'pin') { ell(x, y + 4, 5, 6, '#f4f0e6'); ell(x, y - 6, 3, 4, '#f4f0e6'); rect(x - 4, y - 1, 9, 2, '#d03030'); }
    else if (kind === 'lantern') { rect(x, y - 16, 1, 7, '#aa8030'); ell(x, y - 2, 6, 8, '#c0222e'); rect(x - 4, y - 10, 9, 2, '#d4a017'); rect(x - 4, y + 5, 9, 2, '#d4a017'); rect(x - 2, y - 4, 2, 6, '#ff6a5a'); }
    else if (kind === 'cactus') { rect(x - 3, y - 12, 6, 24, '#2f7d3a'); rect(x - 9, y - 4, 4, 3, '#2f7d3a'); rect(x - 9, y - 9, 3, 7, '#2f7d3a'); rect(x + 5, y - 2, 4, 3, '#2f7d3a'); rect(x + 7, y - 7, 3, 7, '#2f7d3a'); rect(x - 2, y - 12, 1, 24, '#4aa050'); rect(x - 8, y + 12, 16, 4, '#8a5a30'); }
    else if (kind === 'plant') { rect(x - 6, y + 4, 12, 9, '#8a5030'); ell(x - 5, y - 2, 5, 7, '#2f8a3a'); ell(x + 5, y - 3, 5, 7, '#3aa050'); ell(x, y - 8, 4, 8, '#46b058'); }
    else if (kind === 'neon') { rect(x - 11, y - 12, 22, 24, '#1a0a2a'); rect(x - 10, y - 11, 20, 1, '#ff4ad8'); rect(x - 10, y + 10, 20, 1, '#ff4ad8'); rect(x - 10, y - 11, 1, 22, '#ff4ad8'); rect(x + 9, y - 11, 1, 22, '#ff4ad8'); text('$', x - 1, y - 3, '#4de1ff', 2, 'c'); }
    else if (kind === 'pillar') { rect(x - 8, y - 22, 16, 44, '#d6cfc0'); rect(x - 8, y - 22, 4, 44, '#f0eadc'); rect(x + 4, y - 22, 4, 44, '#a8a090'); rect(x - 10, y - 24, 20, 4, '#e8e2d4'); rect(x - 10, y + 20, 20, 4, '#e8e2d4'); }
    else if (kind === 'safe') { rect(x - 11, y - 11, 22, 22, '#3a3a44'); rect(x - 9, y - 9, 18, 18, '#55555f'); ell(x, y, 5, 5, '#2a2a32'); rect(x - 1, y - 4, 2, 5, '#ffd84a'); }
  }

  // ---------- Background ----------
  function buildBG(idx, feltOver) {
    const cs = PT.CASINOS[idx], th = Object.assign({}, cs.th);
    if (feltOver) th.felt = feltOver;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const prev = ctx;
    ctx = g;
    for (let y = 0; y < H; y += 8)
      for (let x = 0; x < W; x += 8) {
        rect(x, y, 8, 8, ((x + y) / 8) % 2 ? th.b : th.a);
        rect(x + 3, y + 3, 2, 2, PT.shade(th.a, 10));
      }
    const dk = DECOR[idx];
    [[30, 34], [612, 34], [22, 292], [618, 292]].forEach((p) => decor(dk, p[0], p[1]));
    for (let i = 0; i < 18; i++) {
      ctx.globalAlpha = 0.035;
      rect(0, 0, W, 3 + i * 2, '#000'); rect(0, H - 3 - i * 2, W, 3 + i * 2, '#000');
      rect(0, 0, 3 + i * 2, H, '#000'); rect(W - 3 - i * 2, 0, 3 + i * 2, H, '#000');
    }
    ctx.globalAlpha = 1;
    ell(CX, CY + 6, 272, 138, 'rgba(0,0,0,0.4)');
    ell(CX, CY, 272, 138, '#000');
    ell(CX, CY, 270, 136, PT.shade(th.rail, -35));
    ell(CX, CY, 266, 132, th.rail);
    ell(CX, CY - 1, 264, 130, PT.shade(th.rail, 14));
    ell(CX, CY, 262, 128, th.hi);
    ell(CX, CY, 260, 126, PT.shade(th.felt, -40));
    ell(CX, CY, 256, 122, th.felt);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2600; i++) {
      const x = Math.floor(CX - 250 + rnd() * 500), y = Math.floor(CY - 116 + rnd() * 232);
      if (((x - CX) / 250) ** 2 + ((y - CY) / 116) ** 2 < 1) rect(x, y, 1, 1, PT.shade(th.felt, rnd() < 0.5 ? -9 : 9));
    }
    for (let k = 0; k < 7; k++) ell(CX, CY - 8, 220 - k * 26, 98 - k * 11, 'rgba(255,255,255,0.016)'); // light pool
    for (let a = 0; a < 360; a += 2) {
      const x = Math.round(CX + 205 * Math.cos((a * Math.PI) / 180)), y = Math.round(CY + 88 * Math.sin((a * Math.PI) / 180));
      if (a % 6 < 4) rect(x, y, 1, 1, PT.shade(th.felt, 28));
    }
    text(cs.name.toUpperCase(), CX, 122, PT.shade(th.felt, 30), 1, 'c');
    ctx = prev;
    return c;
  }
  function feltOf(eq) { const it = eq && eq.felt && PT.shopById[eq.felt]; return it ? it.felt : null; }
  function bgFor(idx, feltOver) {
    const key = idx + '|' + (feltOver || '');
    if (!bgCache[key]) bgCache[key] = buildBG(idx, feltOver);
    return bgCache[key];
  }
  R.bgFor = bgFor;

  // ---------- Geometry ----------
  function geom(i, n) {
    const th = Math.PI / 2 + (i * 2 * Math.PI) / n, c = Math.cos(th), s = Math.sin(th);
    const A = [Math.round(CX + 286 * c), Math.round(CY + 150 * s)];
    let dx = CX - A[0], dy = CY - A[1];
    const L = Math.hypot(dx, dy) || 1;
    dx /= L; dy /= L;
    const off = 12 + Math.abs(dx) * 29 + Math.abs(dy) * 12;
    const P = [Math.round(A[0] + dx * off), Math.round(A[1] + dy * off)];
    const I = [Math.round(CX + 190 * c), Math.round(CY + 92 * s)];
    const B = [Math.round(CX + 130 * c), Math.round(CY + 58 * s)];
    const D = [Math.round(I[0] + (B[0] - I[0]) * 0.5 - dy * 20), Math.round(I[1] + (B[1] - I[1]) * 0.5 + dx * 20)];
    return { A, P, I, B, D, dx, dy };
  }

  // ---------- Opponent avatars ----------
  const HAT = { cap: '#2f5d9e', beanie: '#b8203a', cowboy: '#8a5a30', fedora: '#2a2a32', visor: '#e8e4dc' };
  function avatar(p, g, t, i) {
    const [ax, ay] = g.A;
    const dim = p.folded, sh0 = dim ? -50 : 0;
    const sk = PT.shade(p.skin, sh0), hr = PT.shade(p.hair, sh0), sh = dim ? PT.shade(p.shirt, -60) : p.shirt;
    const bob = Math.round(Math.sin(t / 650 + i * 1.7) * 0.9);
    ell(ax, ay, 17, 13, '#17141f');
    const sx = ax + Math.round(g.dx * 6), sy = ay + Math.round(g.dy * 6) + bob;
    ell(sx, sy, 14, 9, PT.shade(sh, -40));
    ell(sx, sy - 1, 13, 8, sh);
    rect(sx - 2, sy - 6, 4, 1, PT.shade(sh, 22));
    const look = p.look || { hat: 'none', hair: 'short' };
    if (look.hair === 'ponytail') ell(ax - Math.round(g.dx * 8), ay - Math.round(g.dy * 8), 3, 3, PT.shade(hr, -12));
    if (look.hair === 'long') ell(ax - Math.round(g.dx * 5), ay - Math.round(g.dy * 5), 8, 6, PT.shade(hr, -8));
    const hairR = look.hair === 'afro' ? 8 : 6;
    ell(ax, ay, hairR + 1, hairR + 1, PT.shade(hr, -30));
    if (look.hair === 'bald') ell(ax, ay, 6, 6, sk); else ell(ax, ay, hairR, hairR, hr);
    ell(ax + Math.round(g.dx * 3), ay + Math.round(g.dy * 3), 3, 3, sk);
    const hc = HAT[look.hat];
    if (hc && !dim) {
      const bx = ax + Math.round(g.dx * 7), by = ay + Math.round(g.dy * 7);
      if (look.hat === 'cowboy') { ell(ax, ay, 10, 8, PT.shade(hc, -28)); ell(ax, ay, 5, 5, hc); ell(ax, ay, 4, 4, PT.shade(hc, 12)); }
      else if (look.hat === 'fedora') { ell(ax, ay, 9, 7, PT.shade(hc, -18)); ell(ax, ay, 5, 5, '#c8a030'); ell(ax, ay, 4, 4, hc); }
      else if (look.hat === 'beanie') { ell(ax, ay, 6, 6, hc); ell(ax, ay, 4, 4, PT.shade(hc, 22)); rect(ax - 1, ay - 1, 3, 3, '#f4f0e6'); }
      else { ell(ax, ay, 6, 6, hc); ell(bx, by, 4, 3, PT.shade(hc, -30)); rect(ax - 1, ay - 3, 3, 2, PT.shade(hc, 30)); }
    }
    const hx = sx + Math.round(g.dx * 8), hy = sy + Math.round(g.dy * 8);
    rect(hx - 6, hy, 3, 2, sk); rect(hx + 4, hy, 3, 2, sk);
  }
  const ACT_COL = { FOLD: '#8a8a98', CHECK: '#7fd4ff', CALL: '#6ee07a', BET: '#ffb04a', RAISE: '#ff6a5a', 'ALL-IN': '#ff4a6a' };
  function plate(p, P, i, t) {
    const x = P[0] - 29, y = P[1] - 12;
    const active = T && T.turn === i && Math.floor(t / 280) % 2 === 0;
    rect(x - 1, y - 1, 60, 26, active ? '#ffd23f' : p.isHero ? '#4de1ff' : '#000');
    rect(x, y, 58, 24, p.folded ? '#24222e' : '#262239');
    rect(x, y, 58, 1, 'rgba(255,255,255,0.08)');
    const nm = p.name.length > 8 ? p.name.slice(0, 8) : p.name;
    text(nm, x + 3, y + 3, p.folded ? '#777' : '#fff', 1);
    if (R.showPos && T) text(T.posName(i), x + 55, y + 3, '#8f87c8', 1, 'r');
    if (p.allIn && !p.folded) text('ALL-IN', x + 3, y + 10, '#ff5a6e', 1);
    else text('$' + PT.short(p.stack), x + 3, y + 10, p.folded ? '#777' : '#ffd23f', 1);
    if (p.last) text(p.last, x + 3, y + 17, ACT_COL[p.last.split(' ')[0]] || '#ccc', 1);
    else if (T && T.button === i) text('DEALER', x + 3, y + 17, '#aaa', 1);
  }

  // ---------- Fabrics, sleeve patterns ----------
  function outfitOf(ch, eq) {
    const it = eq && eq.outfit && PT.shopById[eq.outfit];
    if (it) return it;
    const c = PT.CUFFS[ch.cuff] || PT.CUFFS[0];
    return { style: 'plain', top: 338, c, c2: c, cuffH: 0 };
  }
  function fabric(o, u, v, w) {
    const c = o.c, c2 = o.c2, st = o.style;
    if (v < o.cuffH) {
      if (st === 'ribbed') return u % 2 ? PT.shade(c2, -18) : c2;
      if (st === 'denim') return PT.shade(c, -25);
      if (st === 'leather') return u % 2 ? PT.shade(c2, 10) : c2;
      if (o.link && v === o.cuffH >> 1 && (u === w - 5 || u === 4)) return o.link;
      return v === 0 ? PT.shade(c2, -30) : c2;
    }
    const vv = v - o.cuffH;
    let col = c;
    if (st === 'pinstripe') col = u % 4 === 1 ? PT.shade(c, 26) : c;
    else if (st === 'leather') col = (u + vv) % 11 === 0 ? PT.shade(c, 45) : u === 2 ? PT.shade(c, -18) : c;
    else if (st === 'denim') col = vv % 3 === 0 && u % 6 === 1 ? PT.shade(c, 34) : c;
    else if (st === 'hawaii') { const h = hsh(u, vv) % 23; col = h === 0 ? '#ff6a8a' : h === 1 ? '#ffd84a' : h === 2 ? '#f4f0e6' : c; }
    else if (st === 'satin') col = Math.floor(u / 3) % 2 ? PT.shade(c, 16) : vv % 7 === 0 ? PT.shade(c, 26) : c;
    else if (st === 'rolled') col = vv < 3 ? PT.shade(c, 26) : vv === 3 ? PT.shade(c, -26) : c;
    else if (u >= 2 && u <= 3) col = PT.shade(c, 14);
    if (vv % 9 === 8 && st !== 'hawaii') col = PT.shade(col, -16);
    if (u === 0 || u === w - 1) col = PT.shade(col, -40);
    return col;
  }
  function sleevePix(it, u, v, w) {
    const ink = it.ink, acc = it.acc || ink, L = 54;
    switch (it.pat) {
      case 'tribal': { const m = v % 14; if (m < 2) return ink; if (m < 9 && (u + (v >> 1)) % 6 < 2) return ink; return null; }
      case 'waves': { const k = v + Math.round(Math.sin(u / 2.5) * 2); if (k % 5 === 0) return ink; if (k % 5 === 1 && u % 3 === 0) return acc; return null; }
      case 'scales': { const r = v % 4, off = (Math.floor(v / 4) % 2) * 2, cc = (u + off) % 4; if (r === 3 || (cc === 0 && r < 3)) return ink; if (cc === 2 && r === 1) return acc; return null; }
      case 'circuit': { if (v % 6 === 3 && hsh(Math.floor(u / 5), Math.floor(v / 6)) % 3) return u % 5 === 2 ? acc : ink; if (u % 5 === 2 && hsh(Math.floor(u / 5), Math.floor(v / 6) + 9) % 2 && v % 6 !== 3) return ink; return null; }
      case 'cards': { const cu = u % 10, cvv = v % 10; if (cu < 7 && cvv < 7) { const idx = hsh(Math.floor(u / 10), Math.floor(v / 10)) % 4; if (SU[idx][cvv][cu] === '1') return idx === 1 || idx === 2 ? acc : ink; } return null; }
      case 'stars': { const h = hsh(u, v) % 47; if (h === 0) return acc; if (h === 1) return ink; if (h === 2 && u % 2) return ink; return null; }
      case 'flames': { const d = L - v, th = 8 + (hsh(Math.floor(u / 3), 5) % 18); if (d < th) return d < th * 0.45 ? acc : ink; return null; }
    }
    return null;
  }

  // ---------- Hero arms & accessories ----------
  function arm(s, ch, eq) {
    const skin = PT.SKINS[ch.skin] || PT.SKINS[1], sd = PT.shade(skin, -36), sl = PT.shade(skin, 16);
    const bd = [[28, 20], [34, 24], [42, 30]][ch.build] || [34, 24];
    const wf = bd[0], ww = bd[1];
    const y0 = 360, y1 = 282, xb = CX + s * 130, xt = CX + s * 66;
    const xcAt = (y) => Math.round(xb + (xt - xb) * ((y0 - y) / (y0 - y1)));
    const wAt = (y) => Math.round(wf + (ww - wf) * ((y0 - y) / (y0 - y1)));
    for (let y = y0; y >= y1; y--) {
      const xc = xcAt(y), w = wAt(y), x0 = xc - (w >> 1);
      rect(x0, y, w, 1, sd); rect(x0 + 1, y, w - 2, 1, skin); rect(x0 + 2, y, 2, 1, sl); rect(x0 + w - 3, y, 1, 1, sd);
    }
    const of = outfitOf(ch, eq), top = Math.max(of.top, y1);
    if (ch.hair > 0) {
      const hc = PT.shade(skin, -78);
      for (let y = 300; y < Math.min(top, 336); y++) {
        const xc = xcAt(y), w = wAt(y);
        for (let x = xc - (w >> 1) + 4; x < xc + (w >> 1) - 4; x++) {
          const h = Math.abs((x * 31 + y * 17 + s * 7) % 11);
          if (ch.hair === 1 ? h === 0 : h < 3) rect(x, y, 1, 1, hc);
        }
      }
    }
    const side = s < 0 ? 'L' : 'R';
    const sl2 = eq['sleeve' + side] && PT.shopById[eq['sleeve' + side]];
    if (sl2) {
      for (let y = 284; y < Math.min(top, 361); y++) {
        const xc = xcAt(y), w = wAt(y), x0 = xc - (w >> 1);
        for (let u = 3; u < w - 3; u++) { const col = sleevePix(sl2, u, y - 284, w); if (col) rect(x0 + u, y, 1, 1, col); }
      }
    }
    const tt = eq['tattoo' + side] && PT.shopById[eq['tattoo' + side]];
    if (tt) {
      ctx.globalAlpha = 0.88;
      for (let j = 0; j < tt.sprite.length; j++) {
        const yy = 312 + j, xc = xcAt(yy), sw = tt.sprite[j].length;
        for (let i = 0; i < sw; i++) if (tt.sprite[j][i] === '1') rect(xc - (sw >> 1) + i, yy, 1, 1, tt.ink);
      }
      ctx.globalAlpha = 1;
    }
    const br = eq['bracelet' + side] && PT.shopById[eq['bracelet' + side]];
    if (br) {
      for (let y = 305; y < 309; y++) {
        const xc = xcAt(y), w = wAt(y), x0 = xc - (w >> 1);
        if (br.style === 'solid') rect(x0, y, w, 1, y === 305 ? br.c2 : br.c1);
        else if (br.style === 'stripe') { for (let i = 0; i < w; i += 2) rect(x0 + i, y, 2, 1, (i / 2) % 2 ? br.c2 : br.c1); }
        else if (br.style === 'beads') { for (let i = 0; i < w; i++) { const k = Math.floor(i / 4); rect(x0 + i, y, 1, 1, i % 4 === 3 ? '#00000055' : k % 2 ? br.c2 : br.c1); } }
        else { for (let i = 0; i < w; i++) rect(x0 + i, y, 1, 1, (i + y) % 2 ? br.c1 : br.c2); }
      }
      if (br.style === 'beads') for (let i = 1; i < wAt(306) - 2; i += 4) rect(xcAt(306) - (wAt(306) >> 1) + i, 305, 1, 1, '#ffffffaa');
    }
    const wt = eq['wrist' + side] && PT.shopById[eq['wrist' + side]];
    if (wt) {
      for (let y = 292; y < 302; y++) {
        const xc = xcAt(y), w = wAt(y), x0 = xc - (w >> 1);
        rect(x0, y, w, 1, wt.band); rect(x0, y, 1, 1, PT.shade(wt.band, -50)); rect(x0 + w - 1, y, 1, 1, PT.shade(wt.band, -50));
      }
      const xc = xcAt(296);
      rect(xc - 6, 290, 13, 13, '#0a0a12'); rect(xc - 5, 291, 11, 11, wt.bezel); rect(xc - 4, 292, 9, 9, wt.face);
      const light = wt.face === '#10204a' || wt.face === '#0a0a12' || wt.face === '#1a2430' || wt.face === '#232838' || wt.face === '#1a1030';
      if (wt.style === 'digital') { const dc = wt.face === '#0a2a4a' ? '#4de1ff' : '#1a3a1a'; rect(xc - 3, 294, 7, 1, dc); rect(xc - 3, 297, 7, 1, dc); rect(xc, 295, 1, 1, dc); rect(xc, 296, 1, 1, dc); }
      else {
        const hc = light ? '#fff' : '#1a1a22';
        rect(xc, 293, 1, 4, hc); rect(xc, 296, 3, 1, hc);
        rect(xc - 3, 296, 1, 1, '#ff4a4a'); rect(xc + 3, 296, 1, 1, '#888'); rect(xc, 292, 1, 1, '#888'); rect(xc, 300, 1, 1, '#888');
        if (wt.style === 'gold') rect(xc - 4, 292, 9, 1, '#fff9d8');
      }
      if (wt.style === 'diamond') for (let i = 0; i < 11; i++) { rect(xc - 5 + i, 291, 1, 1, i % 2 ? '#fff' : '#9fe8ff'); rect(xc - 5 + i, 301, 1, 1, i % 2 ? '#9fe8ff' : '#fff'); }
    }
    // outfit sleeve over everything at the bottom
    for (let y = top; y <= 360; y++) {
      const xc = xcAt(y), w = wAt(y) + 8, x0 = xc - (w >> 1);
      for (let u = 0; u < w; u++) rect(x0 + u, y, 1, 1, fabric(of, u, y - top, w));
    }
  }
  function hand(s, ch, eq) {
    const skin = PT.SKINS[ch.skin] || PT.SKINS[1], sd = PT.shade(skin, -36), sl = PT.shade(skin, 18);
    const bd = [[28, 20], [34, 24], [42, 30]][ch.build] || [34, 24];
    const pw = bd[1] + 4, xc = CX + s * 66, pl = xc - (pw >> 1);
    rect(pl, 268, pw, 15, sd); rect(pl + 1, 268, pw - 2, 14, skin); rect(pl + 2, 270, 3, 8, sl);
    const lens = [7, 9, 10, 9], side = s < 0 ? 'L' : 'R';
    const ring = eq['ring' + side] && PT.shopById[eq['ring' + side]];
    const gl = eq['glove' + side] && PT.shopById[eq['glove' + side]];
    const fxs = [];
    for (let k = 0; k < 4; k++) {
      const fx = s < 0 ? pl + 2 + k * 6 : pl + pw - 7 - k * 6, len = lens[k], top = 268 - len;
      fxs.push([fx, top, len]);
      rect(fx, top, 5, len + 1, sd); rect(fx + 1, top + 1, 3, len, skin); rect(fx + 1, top + 1, 3, 2, sl);
    }
    const tx = s < 0 ? pl + pw - 1 : pl - 4;
    rect(tx, 270, 5, 10, sd); rect(tx + 1, 271, 3, 8, skin); rect(tx + 1, 271, 3, 2, sl);
    if (gl) {
      const gc = gl.color, gd = PT.shade(gc, -38), gh = PT.shade(gc, 24);
      rect(pl, 268, pw, 15, gd); rect(pl + 1, 268, pw - 2, 14, gc); rect(pl + 2, 270, 3, 8, gh); rect(pl + 2, 273, pw - 4, 1, gd);
      fxs.forEach((f) => {
        if (gl.full) { rect(f[0], f[1], 5, f[2] + 1, gd); rect(f[0] + 1, f[1] + 1, 3, f[2], gc); rect(f[0] + 1, f[1] + 1, 3, 2, gh); }
        else { rect(f[0], 264, 5, 4, gd); rect(f[0] + 1, 265, 3, 3, gc); }
      });
      if (gl.full) { rect(tx, 270, 5, 10, gd); rect(tx + 1, 271, 3, 8, gc); rect(tx + 1, 271, 3, 2, gh); }
      else { rect(tx, 276, 5, 4, gd); rect(tx + 1, 277, 3, 3, gc); }
    }
    if (ring && !(gl && gl.full)) {
      const f = fxs[1];
      rect(f[0], 263, 5, 2, ring.color); rect(f[0], 263, 5, 1, PT.shade(ring.color, 30));
      if (ring.gem) { rect(f[0] + 1, 261, 3, 2, ring.gem); rect(f[0] + 2, 261, 1, 1, '#fff'); }
    }
  }
  function heroLayer() {
    const ch = R.loadout.char || PT.defaultChar, eq = R.loadout.equipped || {};
    const key = JSON.stringify([ch, eq]);
    if (layerCache[key]) return layerCache[key];
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const prev = ctx;
    ctx = c.getContext('2d');
    arm(-1, ch, eq); arm(1, ch, eq); hand(-1, ch, eq); hand(1, ch, eq);
    const pr = eq.protector && PT.shopById[eq.protector];
    if (pr) {
      const w = pr.sprite[0].length, h = pr.sprite.length;
      sprite(pr.sprite, CX + 36 + ((12 - w) >> 1), 276 - (h >> 1), '#fff', 1, pr.pal);
    }
    ctx = prev;
    const keys = Object.keys(layerCache);
    if (keys.length > 24) delete layerCache[keys[0]];
    layerCache[key] = c;
    return c;
  }
  function heroArms() { ctx.drawImage(heroLayer(), 0, 0); }
  function heroCard(k, c, o) {
    const x = CX - 30 + k * 32;
    let y = 250;
    const hl = o.best && c != null && o.best.indexOf(c) >= 0;
    if (hl) y -= 5;
    const co = { big: true, down: c == null, dim: o.dim, hl };
    if (o.flip != null && o.flip < 1 && c != null) flipCard(x, y, 28, 38, c, o.flip, co); else card(x, y, 28, 38, c, co);
  }

  // ---------- Full-body figure (menus, shop) ----------
  function figure(ch, eq) {
    const oy = 7, sk = PT.SKINS[ch.skin] || PT.SKINS[1], skd = PT.shade(sk, -26), hair = PT.HAIRS[ch.hairColor] || PT.HAIRS[1];
    const of = outfitOf(ch, eq), W0 = [28, 32, 38][ch.build] || 32, x0 = 28 - (W0 >> 1);
    const r = (x, y, w, h, c) => rect(x, y + oy, w, h, c);
    const e = (x, y, rx, ry, c) => ell(x, y + oy, rx, ry, c);
    e(28, 100, 17, 3, 'rgba(0,0,0,0.35)');
    // legs and shoes
    const pc = PT.PANTS[ch.pants] || PT.PANTS[0];
    r(18, 62, 11, 32, pc); r(29, 62, 11, 32, pc); r(28, 66, 1, 28, PT.shade(pc, -40)); r(24, 64, 1, 28, PT.shade(pc, 14));
    r(17, 93, 13, 5, '#14141a'); r(28, 93, 13, 5, '#14141a'); r(17, 93, 13, 1, '#3a3a46'); r(28, 93, 13, 1, '#3a3a46');
    // torso
    for (let y = 0; y < 32; y++) for (let u = 0; u < W0; u++) r(x0 + u, 30 + y, 1, 1, fabric(Object.assign({}, of, { cuffH: 0 }), u, y, W0));
    r(x0, 60, W0, 3, '#2a1a10'); r(26, 60, 4, 3, '#d4a017');
    r(26, 30, 5, 3, sk);
    // neck & head
    r(25, 27, 6, 4, skd);
    e(28, 17, 9, 10, sk); r(18, 16, 2, 4, skd); r(37, 16, 2, 4, skd);
    // hair
    const hs = ch.hairStyle || 0;
    if (hs === 0 || hs === 3 || hs === 4) { r(19, 7, 18, 6, hair); r(18, 10, 3, 5, hair); r(35, 10, 3, 5, hair); }
    if (hs === 3) { r(17, 10, 4, 22, hair); r(35, 10, 4, 22, hair); }
    if (hs === 4) { r(36, 11, 4, 3, hair); r(38, 13, 3, 10, hair); }
    if (hs === 1) r(20, 8, 16, 3, PT.shade(hair, 10));
    if (hs === 5) e(28, 10, 14, 10, hair);
    if (hs === 6) r(26, 1, 5, 12, hair);
    if (hs === 7) { r(19, 8, 18, 5, hair); r(21, 8, 12, 1, PT.shade(hair, 25)); }
    if (hs === 2) r(25, 8, 3, 1, PT.shade(sk, 40));
    // face
    const eye = PT.EYES[ch.eyes] || PT.EYES[0];
    r(23, 17, 3, 2, '#fff'); r(24, 17, 1, 2, eye); r(31, 17, 3, 2, '#fff'); r(32, 17, 1, 2, eye);
    r(22, 15, 4, 1, hair); r(31, 15, 4, 1, hair); r(28, 20, 1, 2, skd); r(26, 24, 5, 1, PT.shade(sk, -55));
    if (ch.beard === 1) { for (let i = 0; i < 40; i++) { const x = 21 + (hsh(i, 3) % 15), y = 22 + (hsh(i, 7) % 7); r(x, y, 1, 1, PT.shade(hair, 0)); } }
    if (ch.beard === 2) { r(26, 25, 5, 4, hair); r(25, 22, 7, 1, hair); }
    if (ch.beard === 3) { e(28, 24, 8, 6, hair); r(25, 22, 7, 1, PT.shade(sk, 0)); r(26, 24, 5, 1, PT.shade(hair, -50)); r(21, 21, 2, 4, hair); r(34, 21, 2, 4, hair); }
    // glasses
    const gl = eq.glasses && PT.shopById[eq.glasses];
    if (gl) {
      if (gl.glass === 'round') { [[21, 15], [30, 15]].forEach((p) => { r(p[0], p[1], 6, 1, gl.color); r(p[0], p[1] + 4, 6, 1, gl.color); r(p[0], p[1], 1, 5, gl.color); r(p[0] + 5, p[1], 1, 5, gl.color); }); r(27, 17, 3, 1, gl.color); }
      else if (gl.glass === 'shades') { r(21, 15, 6, 4, gl.color); r(30, 15, 6, 4, gl.color); r(27, 16, 3, 1, gl.color); r(22, 15, 2, 1, 'rgba(255,255,255,0.5)'); r(31, 15, 2, 1, 'rgba(255,255,255,0.5)'); }
      else { r(20, 15, 18, 4, gl.color); r(21, 16, 16, 1, '#fff'); }
    }
    // necklace
    const nk = eq.necklace && PT.shopById[eq.necklace];
    if (nk) { const oyv = [0, 1, 2, 2, 3, 2, 2, 1, 0]; for (let i = 0; i < 9; i++) r(24 + i, 31 + oyv[i], 1, 1, nk.color); r(28, 35, 1, 3, nk.drop); r(27, 37, 3, 2, nk.drop); }
    // arms
    const sleeveEnd = of.style === 'tee' ? 42 : 58;
    [[x0 - 6, -1], [x0 + W0, 1]].forEach(([ax, s]) => {
      for (let y = 31; y < sleeveEnd; y++) for (let u = 0; u < 6; u++) r(ax + u, y, 1, 1, fabric(Object.assign({}, of, { cuffH: y > sleeveEnd - 8 ? of.cuffH : 0 }), u, y - 31, 6));
      const side = s < 0 ? 'L' : 'R';
      for (let y = sleeveEnd; y < 64; y++) { r(ax, y, 6, 1, sk); r(ax, y, 1, 1, skd); }
      const sl = eq['sleeve' + side] && PT.shopById[eq['sleeve' + side]];
      if (sl) for (let y = sleeveEnd; y < 64; y++) for (let u = 1; u < 5; u++) { const col = sleevePix(sl, u + 3, y - sleeveEnd + 20, 12); if (col) r(ax + u, y, 1, 1, col); }
      const gloveI = eq['glove' + side] && PT.shopById[eq['glove' + side]];
      r(ax - 1, 64, 8, 6, gloveI ? gloveI.color : sk); r(ax - 1, 64, 1, 6, gloveI ? PT.shade(gloveI.color, -30) : skd);
      const wt = eq['wrist' + side] && PT.shopById[eq['wrist' + side]];
      if (wt) { r(ax, 59, 6, 3, wt.band); r(ax + 1, 59, 4, 3, wt.bezel); r(ax + 2, 60, 2, 1, wt.face); }
      const br = eq['bracelet' + side] && PT.shopById[eq['bracelet' + side]];
      if (br) r(ax, 62, 6, 2, br.c1);
      const rg = eq['ring' + side] && PT.shopById[eq['ring' + side]];
      if (rg && !(gloveI && gloveI.full)) r(ax + 1, 68, 2, 1, rg.gem || rg.color);
    });
    // hat
    const ht = eq.hat && PT.shopById[eq.hat];
    if (ht) {
      const c = ht.color, cd = PT.shade(c, -30);
      if (ht.hat === 'beanie') { e(28, 8, 11, 6, c); r(17, 10, 22, 3, cd); r(27, 0, 3, 3, '#f4f0e6'); }
      else if (ht.hat === 'cap') { e(28, 8, 10, 5, c); r(18, 10, 22, 2, cd); r(14, 11, 16, 2, cd); }
      else if (ht.hat === 'cowboy') { r(8, 9, 42, 3, cd); r(14, 8, 30, 2, cd); r(20, 0, 18, 9, c); r(20, 7, 18, 2, '#c8a030'); r(20, 0, 18, 1, PT.shade(c, 20)); }
      else if (ht.hat === 'fedora') { r(11, 9, 36, 3, cd); r(19, 1, 20, 9, c); r(19, 7, 20, 2, '#c8a030'); r(19, 1, 20, 1, PT.shade(c, 18)); }
      else if (ht.hat === 'top') { r(12, 9, 34, 3, cd); r(19, -6, 20, 15, c); r(19, 5, 20, 2, '#b8203a'); }
      else if (ht.hat === 'crown') { r(19, 5, 20, 5, c); r(19, 1, 3, 5, c); r(25, -1, 3, 7, c); r(30, -1, 3, 7, c); r(36, 1, 3, 5, c); r(20, 6, 18, 1, '#fff4a0'); r(26, 7, 2, 2, '#e0203a'); r(31, 7, 2, 2, '#20a8e0'); }
      else if (ht.hat === 'grad') { r(12, 4, 34, 3, c); r(19, 7, 20, 4, c); r(44, 4, 2, 12, '#ffd84a'); r(43, 14, 4, 3, '#ffd84a'); }
    }
  }
  const figCache = {};
  R.renderFigure = (canvas, char, equipped) => {
    const key = JSON.stringify([char, equipped]);
    let c = figCache[key];
    if (!c) {
      c = document.createElement('canvas'); c.width = 56; c.height = 112;
      const prev = ctx; ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
      figure(Object.assign({}, PT.defaultChar, char), equipped || {});
      ctx = prev;
      const ks = Object.keys(figCache); if (ks.length > 30) delete figCache[ks[0]];
      figCache[key] = c;
    }
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(c, 0, 0, canvas.width, canvas.height);
  };

  // ---------- Banner & effects ----------
  function banner(t) {
    const b = T.banner;
    if (!b) return;
    const el = t - b.t0;
    const full = b.kind === 'show';
    const h = full ? 124 : 68, y0 = full ? 98 : 118, x0 = CX - 190;
    const slide = Math.min(1, el / 220);
    const yy = Math.round(y0 - (1 - slide) * 20);
    ctx.globalAlpha = 0.93 * slide;
    rect(x0 - 2, yy - 2, 384, h + 4, '#000');
    rect(x0, yy, 380, h, '#14101f');
    const glow = b.heroWon ? '#4de88a' : '#ffd23f';
    rect(x0, yy, 380, 2, glow); rect(x0, yy + h - 2, 380, 2, glow);
    ctx.globalAlpha = slide;
    const title = b.special === 'royal' && b.heroWon ? 'ROYAL FLUSH!!!' : b.heroWon ? (b.split ? 'YOU SPLIT THE POT' : 'YOU WIN!') : b.split ? 'SPLIT POT' : b.name + ' WINS';
    textS(title.toUpperCase(), CX, yy + 9, glow, 2, 'c');
    if (full) {
      const hn = b.handName.toUpperCase(), sc = textW(hn, 2) < 360 ? 2 : 1;
      textS(hn, CX, yy + 30, '#ffffff', sc, 'c');
      const cw = 22, gap = 6, tot = 5 * cw + 4 * gap, sx = CX - (tot >> 1);
      b.best5.forEach((c, i) => {
        const age = (el - 150 - i * 90) / 220;
        if (age > 0) flipCard(sx + i * (cw + gap), yy + 46, cw, 30, c, Math.min(1, age), {});
      });
      const per = b.split ? Math.floor(b.amount / b.winners.length) : b.amount;
      textS('+$' + PT.short(per), CX, yy + 84, '#6ee07a', 2, 'c');
      b.lines.slice(0, 2).forEach((l, i) => text(l.length > 90 ? l.slice(0, 90) : l, CX, yy + 104 + i * 8, '#b0a8d8', 1, 'c'));
    } else {
      textS('EVERYONE FOLDED', CX, yy + 30, '#ffffff', 1, 'c');
      textS('+$' + PT.short(b.amount), CX, yy + 42, '#6ee07a', 2, 'c');
    }
    ctx.globalAlpha = 1;
  }
  const FW = ['#ffd23f', '#ff4a6a', '#4de1ff', '#6ee07a', '#ff4ad8', '#fff'];
  function fireworks(el) {
    for (let b = 0; b < 4; b++) {
      const bx = [120, 520, 220, 430][b], by = [70, 80, 40, 50][b];
      const age = ((el - b * 380) % 1600) / 1600;
      if (el - b * 380 < 0 || age < 0) continue;
      const rad = ease(age) * 56;
      ctx.globalAlpha = Math.max(0, 1 - age);
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2;
        rect(Math.round(bx + Math.cos(a) * rad), Math.round(by + Math.sin(a) * rad + age * 14), 2, 2, FW[(k + b) % FW.length]);
      }
    }
    ctx.globalAlpha = 1;
  }
  function sparkles(P, el) {
    for (let k = 0; k < 8; k++) {
      const ph = (el / 500 + k / 8) % 1, x = P[0] + ((k * 37) % 56) - 28, y = P[1] - 14 - ph * 16;
      ctx.globalAlpha = 1 - ph;
      rect(x, y - 1, 1, 3, k % 2 ? '#fff' : '#ffd23f'); rect(x - 1, y, 3, 1, k % 2 ? '#fff' : '#ffd23f');
    }
    ctx.globalAlpha = 1;
  }
  function dust(t) {
    for (let i = 0; i < 16; i++) {
      const sp = 0.004 + (i % 5) * 0.0016;
      const x = ((hsh(i, 1) % W) + t * sp * 8) % W, y = (hsh(i, 2) % H) + Math.sin(t / 1400 + i) * 6;
      ctx.globalAlpha = 0.07 + (i % 3) * 0.03;
      rect(Math.round(x), Math.round(y), i % 4 === 0 ? 2 : 1, 1, '#fff');
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Main draw ----------
  function dealState(i, k, t) {
    if (!T.dealT) return { s: 'rest', age: 999 };
    const n = T.n, idx = (i - (T.dealStart || 0) + n) % n, delay = (k * n + idx) * 85, age = t - T.dealT - delay;
    if (age < 0) return { s: 'none' };
    if (age < 300) return { s: 'fly', p: age / 300 };
    return { s: 'rest', age: age - 300 };
  }
  R.draw = function (t) {
    if (!T) return;
    const n = T.n, eq = R.loadout.equipped || {};
    ctx.drawImage(bgFor(R.themeIdx, feltOf(eq)), 0, 0);
    dust(t);
    const gs = T.players.map((p, i) => geom(i, n));
    const b = T.banner, show = b && b.kind === 'show', best = show ? b.best5 : null;
    T.players.forEach((p, i) => {
      if (i === 0) return;
      avatar(p, gs[i], t, i);
      plate(p, gs[i].P, i, t);
    });
    // board with slide + flip
    const cw = 22, gap = 4, bx = CX - Math.round((5 * cw + 4 * gap) / 2), by = 138;
    for (let i = 0; i < 5; i++) {
      const x = bx + i * (cw + gap), c = T.board[i];
      if (c == null) { rect(x, by, cw, 30, 'rgba(0,0,0,0.18)'); rect(x, by, cw, 1, 'rgba(255,255,255,0.12)'); continue; }
      const ms = t - (T.boardT[i] || 0), inBest = best && best.indexOf(c) >= 0;
      if (ms < 0) continue;
      if (ms < 220) {
        const e = ease(ms / 220);
        back(Math.round(CX - cw / 2 + (x - (CX - cw / 2)) * e), Math.round(CY - 100 + (by - (CY - 100)) * e), cw, 30);
      } else if (ms < 480) flipCard(x, by, cw, 30, c, (ms - 220) / 260, {});
      else card(x, inBest ? by - 4 : by, cw, 30, c, { hl: inBest, dim: show && !inBest });
    }
    if (T.pot > 0) { chips(CX, 202, T.pot); textS('POT ' + PT.short(T.pot), CX, 180, '#fff', 1, 'c'); }
    // chips travelling into the pot
    (T.fx || []).forEach((f) => {
      const e = (t - f.t0) / 450;
      if (e < 0 || e >= 1) return;
      const g = gs[f.seat], q = ease(e);
      chips(Math.round(g.B[0] + (CX - g.B[0]) * q), Math.round(g.B[1] + (202 - g.B[1]) * q), f.amount);
    });
    T.players.forEach((p, i) => {
      const g = gs[i];
      if (p.bet > 0) {
        const e = PT.clamp((t - p.betT) / 280, 0, 1), from = i === 0 ? [CX, 300] : g.P, q = ease(e);
        const cx = Math.round(from[0] + (g.B[0] - from[0]) * q), cy = Math.round(from[1] + (g.B[1] - from[1]) * q);
        chips(cx, cy, p.bet);
        if (e >= 1) textS(PT.short(p.bet), g.B[0], g.B[1] + 5, '#fff', 1, 'c');
      }
      if (i !== 0 && p.cards.length && !p.folded) {
        const isW = show && b.winners.indexOf(i) >= 0;
        if (p.show) {
          const f = PT.clamp((t - p.showT) / 280, 0, 1);
          [0, 1].forEach((k) => {
            const c = p.cards[k], inB = isW && best.indexOf(c) >= 0;
            flipCard(g.I[0] - 21 + k * 22, g.I[1] - 15 - (inB ? 4 : 0), 20, 28, c, f, { hl: inB, dim: show && !isW });
          });
        } else {
          [0, 1].forEach((k) => {
            const st = dealState(i, k, t);
            if (st.s === 'none') return;
            const tx = g.I[0] - 9 + k * 7, ty = g.I[1] - 8;
            if (st.s === 'fly') { const e = ease(st.p); back(Math.round(CX + (tx - CX) * e), Math.round(CY - 40 + (ty - CY + 40) * e), 12, 17); }
            else back(tx, ty, 12, 17);
          });
        }
      }
      if (T.button === i && T.phase !== 'idle') {
        const dpos = i === 0 ? [CX - 58, 238] : g.D;
        ell(dpos[0], dpos[1], 5, 5, '#000'); ell(dpos[0], dpos[1], 4, 4, '#f4f0e6'); text('D', dpos[0] - 1, dpos[1] - 2, '#14101f', 1);
      }
    });
    // hero cards (deal, flip) and label
    const hero = T.players[0];
    const heroBest = show && b.winners.indexOf(0) >= 0 ? best : null;
    if (hero.cards.length) {
      [0, 1].forEach((k) => {
        const st = dealState(0, k, t), tx = CX - 30 + k * 32;
        if (st.s === 'none') return;
        if (st.s === 'fly') { const e = ease(st.p); back(Math.round(CX + (tx - CX) * e), Math.round(CY - 40 + (250 - CY + 40) * e), 12 + Math.round(16 * e), 17 + Math.round(21 * e)); return; }
        heroCard(k, hero.folded ? null : hero.cards[k], { dim: hero.folded, best: heroBest, flip: st.age < 260 ? st.age / 260 : 1 });
      });
    }
    if (R.heroLabel && hero.cards.length && !hero.folded && (!T.dealT || t - T.dealT > 1200)) {
      const w = textW(R.heroLabel.toUpperCase(), 1) + 8;
      rect(CX - (w >> 1) - 1, 236, w + 2, 11, '#000'); rect(CX - (w >> 1), 237, w, 9, '#1e1a30');
      text(R.heroLabel, CX, 239, '#ffd23f', 1, 'c');
    }
    heroArms();
    plate(hero, [100, 336], 0, t);
    if (b) {
      const el = t - b.t0;
      if (b.heroWon && (b.special === 'royal' || b.special === 'sf') && el < 5000) fireworks(el);
      b.winners.forEach((wi) => {
        const g = wi === 0 ? { P: [100, 336] } : gs[wi];
        if (el < 800) {
          for (let k = 0; k < 6; k++) {
            const e = PT.clamp((el - k * 60) / 600, 0, 1);
            if (e <= 0 || e >= 1) continue;
            const q = ease(e);
            const x = Math.round(CX + (g.P[0] - CX) * q), y = Math.round(202 + (g.P[1] - 202) * q) - Math.round(Math.sin(e * Math.PI) * 14);
            rect(x - 3, y, 7, 3, '#8a6508'); rect(x - 3, y, 7, 2, '#ffd84a');
          }
        } else if (el < 2800) {
          const rise = Math.min(14, (el - 800) / 70), share = Math.floor(b.amount / b.winners.length);
          textS('+$' + PT.short(share), g.P[0], g.P[1] - 24 - rise, '#6ee07a', 1, 'c');
          sparkles(g.P, el - 800);
        }
      });
      banner(t);
    }
  };

  R.seatAt = (mx, my) => {
    if (!T) return -1;
    for (let i = 1; i < T.n; i++) {
      const g = geom(i, T.n);
      if (Math.hypot(mx - g.A[0], my - g.A[1]) < 22 || (Math.abs(mx - g.P[0]) < 30 && Math.abs(my - g.P[1]) < 13)) return i;
    }
    return -1;
  };
  R.seatScreen = (i) => (T ? geom(i, T.n).P : [0, 0]);

  R.start = (canvas) => {
    cv = canvas; ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    cancelAnimationFrame(raf);
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      if (t - lastT < 30) return;
      lastT = t;
      R.back = backOf(R.loadout.equipped);
      R.draw(t);
    };
    raf = requestAnimationFrame(loop);
  };
  R.stop = () => { cancelAnimationFrame(raf); raf = 0; };
  R.setTable = (t, themeIdx) => { T = t; R.themeIdx = themeIdx || 0; };
  R.setLoadout = (char, equipped) => { R.loadout = { char: Object.assign({}, PT.defaultChar, char), equipped: equipped || {} }; };

  // Render the hero's wrists to any canvas (menus, character creator, shop).
  R.renderPreview = (canvas, char, equipped, opts) => {
    opts = opts || {};
    const saveCtx = ctx, saveL = R.loadout, saveB = R.back;
    if (!pv) { pv = document.createElement('canvas'); pv.width = W; pv.height = H; }
    ctx = pv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    R.loadout = { char: Object.assign({}, PT.defaultChar, char), equipped: equipped || {} };
    R.back = backOf(equipped);
    ctx.drawImage(bgFor(opts.theme || 0, feltOf(equipped)), 0, 0);
    if (opts.cards !== false) {
      const hc = opts.hole || [PT.card('As'), PT.card('Ks')];
      heroCard(0, hc[0], {}); heroCard(1, hc[1], {});
    }
    heroArms();
    ctx = saveCtx; R.loadout = saveL; R.back = saveB;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    const cr = opts.crop || [0, 0, W, H];
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(pv, cr[0], cr[1], cr[2], cr[3], 0, 0, canvas.width, canvas.height);
  };
})();
