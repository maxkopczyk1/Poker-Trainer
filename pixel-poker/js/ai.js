(function () {
  const PT = window.PT;
  const rnd = (x, u) => Math.max(u, Math.round(x / u) * u);
  const R = Math.random;

  function fin(d, s) {
    if (d.a === 'raise') {
      if (d.to >= 0.5 * s.maxTo) d.to = s.maxTo;
      d.to = Math.max(d.to, s.minRaiseTo);
    }
    return d;
  }

  // What the AI has learned about the other players this session.
  function reads(s) {
    const o = (s.opps || []).filter((x) => x.hands >= 12);
    const ftb = o.length ? o.reduce((a, x) => a + x.ftb, 0) / o.length : 0.45;
    const weight = o.length ? Math.min(1, o.reduce((a, x) => a + x.hands, 0) / (o.length * 40)) : 0;
    return { ftb, weight };
  }
  const adaptMult = (pr, s, k) => {
    const r = reads(s);
    return PT.clamp(1 + pr.adapt * r.weight * k * (r.ftb - 0.45), 0.4, 2.3);
  };

  // Estimate how wide the betting opponent's range is, as a minimum hand percentile.
  function rangeMin(s, pr) {
    let w = s.raises > 0 ? 0.25 : 0.4;
    const foe = s.foe;
    if (s.toCall > 0 && foe) {
      const known = foe.hands >= 10;
      let base = known ? Math.max(0.08, foe.vpip) : 0.3;
      if (s.raises > 0) base = Math.min(base, known ? Math.max(0.06, foe.pfr + 0.04) : 0.18);
      const btp = s.toCall / Math.max(1, s.pot - s.toCall);
      let f = btp < 0.4 ? 0.8 : btp < 0.8 ? 0.65 : 0.5;
      f *= Math.pow(0.85, Math.max(0, s.street - 1));
      w = base * f * (known && foe.af > 2.5 ? 1.25 : 1);
    }
    const acc = 1 - Math.min(1, pr.skill * 2); // weaker players do not read ranges
    return PT.clamp(1 - w, 0, 0.88) * acc;
  }

  function pre(p, s, pr, tilt) {
    const h = p.cards;
    const pct = PT.preflopPct(h[0], h[1]);
    const r1 = h[0] >> 2, r2 = h[1] >> 2, suited = (h[0] & 3) === (h[1] & 3);
    const hi = Math.max(r1, r2), lo = Math.min(r1, r2);
    let adj = pct;
    if (pr.loveSuited && suited) adj += 0.18;
    if (pr.loveAce && hi === 12) adj += 0.3;
    if (pr.setMine && r1 === r2 && r1 < 9) adj += 0.25;
    if (pr.spec && suited && hi !== lo && hi - lo <= 3) adj += 0.14;
    if (pr.showy && (suited || r1 === r2 || hi >= 11)) adj += 0.1;
    if (pr.wild) adj = Math.min(1, adj + R() * 0.5);
    adj = Math.min(adj, 1);
    const posMul = { BTN: 0.55, CO: 0.25, HJ: 0.1, MP: 0, UTG: -0.3, 'UTG+1': -0.25, SB: 0.1, BB: 0.1 }[s.pos] || 0;
    const vpipEff = PT.clamp(pr.vpip * (1 + pr.pos * posMul + 0.5 * tilt), 0.03, 0.95);
    const pfrEff = PT.clamp(pr.pfr * (1 + pr.pos * posMul * 1.3 + 0.5 * tilt), 0.02, 0.9);
    const canCheck = s.toCall <= 0;
    const bb = s.bb;
    const openMult = pr.minRaise ? 2 : 2.2 + pr.size * 1.3;
    const foldy = adaptMult(pr, s, 2); // >1 when the table folds a lot: steal more

    if (s.raises === 0) {
      const lateSteal = (s.pos === 'BTN' || s.pos === 'CO' || s.pos === 'SB') && s.limpers === 0 && R() < pr.bluff * 0.25 * foldy * (0.3 + pr.pos);
      if (adj >= 1 - pfrEff || lateSteal) {
        if (pr.shove && adj > 0.85 && R() < 0.3) return { a: 'raise', to: s.maxTo };
        const mult = pr.wild ? 2 + R() * 4 : openMult;
        return fin({ a: 'raise', to: rnd((mult + s.limpers) * bb, s.sb) }, s);
      }
      if (adj >= 1 - vpipEff) return canCheck ? { a: 'check' } : { a: 'call' };
      return canCheck ? { a: 'check' } : { a: 'fold' };
    }

    // facing a raise
    const rb = s.toCall / bb;
    let tighten = Math.min(0.35, 0.025 * rb) * (1 - 0.7 * pr.call) + 0.07 * (s.raises - 1);
    const foe = s.foe;
    if (foe && foe.hands >= 15) {
      if (foe.pfr > 0.25) tighten -= 0.06 * pr.adapt; // wide raiser: defend more
      if (foe.pfr < 0.1) tighten += 0.08 * pr.adapt; // tight raiser: respect
    }
    const inBlind = s.pos === 'BB' || s.pos === 'SB';
    const callThr = 1 - vpipEff + (pr.defend && inBlind ? tighten * 0.4 : tighten);
    const raiseThr = 1 - pfrEff * 0.45 + tighten * 0.5;
    const stackFrac = s.toCall / (p.stack + p.bet);
    if (adj >= raiseThr && R() < 0.35 + 0.65 * pr.agg) {
      if (pr.trap > 0 && adj > 0.97 && R() < pr.trap) return { a: 'call' };
      if (pr.shove && R() < 0.35) return { a: 'raise', to: s.maxTo };
      const mult = pr.minRaise ? 2 : s.raises >= 2 ? 2.3 : 3;
      return fin({ a: 'raise', to: rnd(s.currentBet * mult + (s.limpers ? bb : 0), s.sb) }, s);
    }
    if (adj >= 0.45 && adj < raiseThr && s.raises === 1 && R() < pr.bluff * 0.1 * (1 + pr.pos) * foldy)
      return fin({ a: 'raise', to: rnd(s.currentBet * 3, s.sb) }, s);
    if (adj >= callThr) {
      if (stackFrac > 0.3 && adj < Math.max(callThr, 0.88 - 0.4 * pr.call)) return { a: 'fold' };
      return { a: 'call' };
    }
    return { a: 'fold' };
  }

  function post(p, s, pr, tilt) {
    const nOpp = Math.max(1, s.nOpp);
    const mk = (frac) => {
      if (pr.wild) frac = 0.2 + R() * 1.8;
      return fin({ a: 'raise', to: rnd(s.currentBet + Math.max(s.bb, frac * (s.pot + s.toCall)), s.sb) }, s);
    };
    const size = (x) => PT.clamp(pr.size * (x > 0.85 ? 1.1 : x < 0.5 ? 0.85 : 1), 0.25, 2);
    const bm = adaptMult(pr, s, 2); // bluff multiplier from reads

    if (s.toCall > 0) {
      const needed = s.toCall / (s.pot + s.toCall);
      // equity against the opponent's likely RANGE, not a random hand
      let ea = PT.equity(p.cards, s.board, nOpp, 110, rangeMin(s, pr));
      ea += PT.gauss() * pr.skill * 0.12 + tilt * 0.05 + (0.4 - pr.fold) * 0.04;
      const foe = s.foe;
      let callAdj = 1 - 0.3 * pr.call;
      if (foe && foe.hands >= 15 && foe.af > 3 && pr.adapt > 0.4) callAdj -= 0.2 * pr.adapt; // call down aggressive players
      const raiseT = 0.68 - 0.08 * pr.agg;
      if (pr.shove && ea > 0.55 && R() < 0.3) return { a: 'raise', to: s.maxTo };
      if (ea > raiseT && ea > needed + 0.2 && R() < pr.agg * 0.85 + 0.05) {
        if (s.street < 3 && R() < pr.trap * 0.6) return { a: 'call' };
        return mk(size(ea + 0.15));
      }
      if (R() < pr.bluff * 0.08 * (1 + tilt) * bm && s.street < 3 && ea < 0.4 && nOpp <= 2) return mk(size(0.5));
      if (ea >= needed * callAdj) return { a: 'call' };
      if (R() < pr.call * 0.22 && s.toCall <= 0.6 * s.pot && ea > needed * 0.55) return { a: 'call' };
      return { a: 'fold' };
    }

    let e = PT.equity(p.cards, s.board, nOpp, 110, s.raises > 0 ? 0.3 * (1 - Math.min(1, pr.skill * 2)) : 0);
    e += PT.gauss() * pr.skill * 0.12;
    const r = reads(s);
    const valueT = 0.6 - 0.1 * pr.agg - pr.adapt * r.weight * Math.max(0, 0.45 - r.ftb) * 0.4; // thinner value vs callers
    if (e > valueT) {
      if (s.street < 3 && e > 0.8 && R() < pr.trap) return { a: 'check' };
      if (R() < 0.55 + 0.45 * pr.agg) return mk(size(e));
      return { a: 'check' };
    }
    if (s.wasAggressor && nOpp <= 2 && s.street === 1 && R() < 0.5 * pr.agg * Math.min(1.4, bm)) return mk(Math.min(0.5, size(0.5)));
    if (e > 0.3 && R() < ((pr.bluff * 0.45) / nOpp) * bm) return mk(size(0.5));
    return { a: 'check' };
  }

  PT.AI = {
    decide(p, s) {
      const pr = p.pers, tilt = (p.tilt || 0) * pr.tilt;
      return s.street === 0 ? pre(p, s, pr, tilt) : post(p, s, pr, tilt);
    },
  };
})();
