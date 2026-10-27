(function () {
  const PT = window.PT;
  const RANKS = '23456789TJQKA', SUITS = 'cdhs';
  const B5 = 759375; // 15^5
  const RN = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
  const RNP = ['Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings', 'Aces'];
  const CATS = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];
  PT.RANKS = RANKS; PT.SUITS = SUITS; PT.B5 = B5; PT.CATS = CATS; PT.RN = RN; PT.RNP = RNP;

  // card int = rank*4 + suit  (rank 0=2 .. 12=A, suit 0=c 1=d 2=h 3=s)
  PT.card = (s) => RANKS.indexOf(s[0]) * 4 + SUITS.indexOf(s[1]);
  PT.cs = (c) => RANKS[c >> 2] + SUITS[c & 3];
  PT.newDeck = () => {
    const d = [];
    for (let i = 0; i < 52; i++) d.push(i);
    return PT.shuffle(d);
  };

  function enc(a) {
    let v = 0;
    for (let i = 0; i < 5; i++) v = v * 15 + (a[i] || 0);
    return v;
  }
  function straightHigh(mask) {
    const m = (mask << 1) | ((mask >> 12) & 1);
    for (let h = 13; h >= 4; h--) if (((m >> (h - 4)) & 31) === 31) return h - 1;
    return -1;
  }
  PT.straightHigh = straightHigh;

  function evaluate(cards) {
    const rc = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sm = [0, 0, 0, 0], sk = [0, 0, 0, 0];
    let mask = 0;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i], r = c >> 2, s = c & 3;
      rc[r]++; sm[s]++; sk[s] |= 1 << r; mask |= 1 << r;
    }
    let fs = -1;
    for (let s = 0; s < 4; s++) if (sm[s] >= 5) fs = s;
    if (fs >= 0) {
      const sh = straightHigh(sk[fs]);
      if (sh >= 0) return 8 * B5 + enc([sh]);
    }
    let quad = -1;
    const trips = [], pairs = [];
    for (let r = 12; r >= 0; r--) {
      const n = rc[r];
      if (n === 4) quad = r; else if (n === 3) trips.push(r); else if (n === 2) pairs.push(r);
    }
    if (quad >= 0) {
      let k = 0;
      for (let r = 12; r >= 0; r--) if (r !== quad && rc[r] > 0) { k = r; break; }
      return 7 * B5 + enc([quad, k]);
    }
    if (trips.length && (trips.length > 1 || pairs.length)) {
      const p = trips.length > 1 ? (pairs.length ? Math.max(trips[1], pairs[0]) : trips[1]) : pairs[0];
      return 6 * B5 + enc([trips[0], p]);
    }
    if (fs >= 0) {
      const a = [];
      for (let r = 12; r >= 0 && a.length < 5; r--) if (sk[fs] & (1 << r)) a.push(r);
      return 5 * B5 + enc(a);
    }
    const sh = straightHigh(mask);
    if (sh >= 0) return 4 * B5 + enc([sh]);
    const kick = (ex, n) => {
      const a = [];
      for (let r = 12; r >= 0 && a.length < n; r--) if (rc[r] > 0 && ex.indexOf(r) < 0) a.push(r);
      return a;
    };
    if (trips.length) return 3 * B5 + enc([trips[0]].concat(kick([trips[0]], 2)));
    if (pairs.length >= 2) return 2 * B5 + enc([pairs[0], pairs[1]].concat(kick([pairs[0], pairs[1]], 1)));
    if (pairs.length === 1) return B5 + enc([pairs[0]].concat(kick([pairs[0]], 3)));
    return enc(kick([], 5));
  }
  PT.evaluate = evaluate;

  function decode(score) {
    const cat = Math.floor(score / B5);
    let e = score - cat * B5;
    const d = [0, 0, 0, 0, 0];
    for (let i = 4; i >= 0; i--) { d[i] = e % 15; e = Math.floor(e / 15); }
    return { cat, d };
  }
  PT.decode = decode;

  PT.describe = (score) => {
    const { cat, d } = decode(score);
    switch (cat) {
      case 8: return d[0] === 12 ? 'Royal Flush' : 'Straight Flush, ' + RN[d[0]] + ' high';
      case 7: return 'Four of a Kind, ' + RNP[d[0]];
      case 6: return 'Full House, ' + RNP[d[0]] + ' full of ' + RNP[d[1]];
      case 5: return 'Flush, ' + RN[d[0]] + ' high';
      case 4: return 'Straight, ' + RN[d[0]] + ' high';
      case 3: return 'Three of a Kind, ' + RNP[d[0]];
      case 2: return 'Two Pair, ' + RNP[d[0]] + ' and ' + RNP[d[1]];
      case 1: return 'Pair of ' + RNP[d[0]];
      default: return RN[d[0]] + ' High';
    }
  };

  PT.bestFive = (cards) => {
    if (cards.length <= 5) return cards.slice();
    let best = -1, bestSet = null;
    const n = cards.length;
    const rec = (start, pick) => {
      if (pick.length === 5) {
        const s = evaluate(pick);
        if (s > best) { best = s; bestSet = pick.slice(); }
        return;
      }
      for (let i = start; i < n; i++) {
        if (n - i < 5 - pick.length) break;
        pick.push(cards[i]); rec(i + 1, pick); pick.pop();
      }
    };
    rec(0, []);
    return bestSet;
  };

  // Friendly label for a player's current hand (pairs split into top pair / overpair etc.)
  PT.handLabel = (hole, board) => {
    if (!board.length) return PT.preflopName(hole[0], hole[1]);
    const all = hole.concat(board), score = evaluate(all), { cat, d } = decode(score);
    const base = PT.describe(score);
    if (cat === 1) {
      const pr = d[0], hr = hole.map((c) => c >> 2), br = board.map((c) => c >> 2);
      const maxB = Math.max.apply(null, br);
      if (hr[0] === hr[1]) return (pr > maxB ? 'Overpair' : 'Underpair') + ', pocket ' + RNP[pr];
      if (hr.indexOf(pr) < 0) return 'Board pair of ' + RNP[pr] + ' (no pair of your own)';
      const sorted = br.slice().sort((a, b) => b - a);
      const kick = RN[Math.max.apply(null, hr.filter((r) => r !== pr))];
      if (pr > maxB) return 'Overpair-type: pair of ' + RNP[pr] + ' (above the board)';
      if (pr === sorted[0]) return 'Top Pair, ' + RNP[pr] + ' (' + kick + ' kicker)';
      if (pr === sorted[1] || (sorted.length > 1 && pr > sorted[sorted.length - 1])) return 'Middle Pair, ' + RNP[pr];
      return 'Bottom Pair, ' + RNP[pr];
    }
    if (cat === 0) return base + ' (nothing yet)';
    return base;
  };

  // ---------- Pre-flop ranking (Chen formula -> percentile) ----------
  function chen(a, b) {
    let r1 = a >> 2, r2 = b >> 2;
    const suited = (a & 3) === (b & 3);
    if (r1 < r2) { const t = r1; r1 = r2; r2 = t; }
    const pts = (r) => (r === 12 ? 10 : r === 11 ? 8 : r === 10 ? 7 : r === 9 ? 6 : (r + 2) / 2);
    let s = pts(r1);
    if (r1 === r2) return Math.ceil(Math.max(5, s * 2));
    if (suited) s += 2;
    const gap = r1 - r2 - 1;
    s -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
    if (gap <= 1 && r1 < 10) s += 1;
    return Math.ceil(s) + 0;
  }
  PT.chen = chen;
  const scores = [];
  for (let i = 0; i < 52; i++) for (let j = i + 1; j < 52; j++) scores.push(chen(i, j));
  const CH = {};
  [...new Set(scores)].forEach((s) => {
    const less = scores.filter((x) => x < s).length, eq = scores.filter((x) => x === s).length;
    CH[s] = (less + eq / 2) / scores.length;
  });
  PT.preflopPct = (a, b) => CH[chen(a, b)]; // 0..1, higher = stronger
  PT.shortHand = (a, b) => {
    let r1 = a >> 2, r2 = b >> 2;
    if (r1 < r2) { const t = r1; r1 = r2; r2 = t; }
    return RANKS[r1] + RANKS[r2] + (r1 === r2 ? '' : (a & 3) === (b & 3) ? 's' : 'o');
  };
  PT.preflopName = (a, b) => {
    let r1 = a >> 2, r2 = b >> 2;
    if (r1 < r2) { const t = r1; r1 = r2; r2 = t; }
    if (r1 === r2) return 'Pocket ' + RNP[r1];
    return RN[r1] + '-' + RN[r2] + ((a & 3) === (b & 3) ? ' suited' : ' offsuit');
  };

  // ---------- Monte Carlo equity vs random (or top-range) opponents ----------
  PT.equity = (hole, board, nOpp, sims, minPct) => {
    sims = sims || 300; minPct = minPct || 0;
    const used = new Set(hole.concat(board)), base = [];
    for (let c = 0; c < 52; c++) if (!used.has(c)) base.push(c);
    const need = 5 - board.length;
    let score = 0;
    for (let s = 0; s < sims; s++) {
      const d = base.slice();
      let len = d.length;
      const opps = [];
      for (let o = 0; o < nOpp; o++) {
        let ci = 0, cj = 1;
        const tries = minPct > 0 ? 40 : 1;
        for (let t = 0; t < tries; t++) {
          ci = (Math.random() * len) | 0;
          cj = (Math.random() * (len - 1)) | 0;
          if (cj >= ci) cj++;
          if (minPct <= 0 || PT.preflopPct(d[ci], d[cj]) >= minPct) break;
        }
        opps.push(d[ci], d[cj]);
        const hi = Math.max(ci, cj), lo = Math.min(ci, cj);
        d[hi] = d[len - 1]; len--;
        d[lo] = d[len - 1]; len--;
      }
      const b = board.slice();
      for (let k = 0; k < need; k++) {
        const idx = (Math.random() * len) | 0;
        b.push(d[idx]); d[idx] = d[len - 1]; len--;
      }
      const hs = evaluate(hole.concat(b));
      let lose = false, ties = 1;
      for (let o = 0; o < nOpp; o++) {
        const os = evaluate([opps[2 * o], opps[2 * o + 1]].concat(b));
        if (os > hs) { lose = true; break; }
        if (os === hs) ties++;
      }
      if (!lose) score += 1 / ties;
    }
    return score / sims;
  };

  // ---------- Outs & draws ----------
  PT.outsInfo = (hole, board) => {
    const all = hole.concat(board), cur = evaluate(all), curCat = Math.floor(cur / B5);
    const used = new Set(all);
    let improve = 0;
    for (let c = 0; c < 52; c++) {
      if (used.has(c)) continue;
      if (Math.floor(evaluate(all.concat(c)) / B5) > curCat) improve++;
    }
    const draws = [];
    const sc = [0, 0, 0, 0];
    all.forEach((c) => sc[c & 3]++);
    for (let s = 0; s < 4; s++)
      if (sc[s] === 4 && curCat < 5 && hole.some((c) => (c & 3) === s)) draws.push({ type: 'Flush draw', outs: 9 });
    if (curCat < 4) {
      const mk = (cards) => cards.reduce((m, c) => m | (1 << (c >> 2)), 0);
      const comp = (mask) => {
        const a = [];
        for (let r = 0; r < 13; r++) if (!(mask & (1 << r)) && straightHigh(mask | (1 << r)) >= 0) a.push(r);
        return a;
      };
      const ca = comp(mk(all)), cb = board.length ? comp(mk(board)) : [];
      if (ca.length && ca.join() !== cb.join()) {
        if (ca.length >= 3) draws.push({ type: 'Double-gutshot straight draw', outs: ca.length * 4 });
        else if (ca.length === 2) draws.push({ type: 'Open-ended straight draw', outs: 8 });
        else draws.push({ type: 'Gutshot straight draw', outs: 4 });
      }
    }
    return { improve, draws, cat: curCat };
  };
})();
