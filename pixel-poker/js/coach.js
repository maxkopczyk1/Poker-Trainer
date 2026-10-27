(function () {
  const PT = window.PT;
  const RFI = { BTN: 0.42, CO: 0.28, HJ: 0.21, MP: 0.18, UTG: 0.15, 'UTG+1': 0.17, SB: 0.38, BB: 1 };
  PT.RFI = RFI;
  const pc = (x) => (x * 100).toFixed(1).replace(/\.0$/, '') + '%';
  const Coach = (PT.Coach = {});

  // A "spot" is a plain, saveable description of a decision.
  Coach.ctxFrom = (T, hero, info) => ({
    hole: hero.cards.slice(), board: T.board.slice(), pos: T.posName(T.players.indexOf(hero)), pot: info ? info.pot : T.potTotal(),
    toCall: info ? info.toCall : 0, stack: hero.stack, bb: T.bb, nOpp: Math.max(1, T.live().length - 1), raisesPre: T.raisesPre, limpers: T.limpers,
  });

  Coach.analyzeCtx = (c, heavy) => {
    const hole = c.hole, board = c.board;
    const o = { ctx: c, pos: c.pos, board: board.length, pot: c.pot, toCall: c.toCall, nOpp: c.nOpp };
    o.needed = c.toCall > 0 ? c.toCall / (c.pot + c.toCall) : 0;
    o.spr = c.stack / Math.max(c.pot, 1);
    if (!board.length) {
      o.hand = PT.preflopName(hole[0], hole[1]);
      o.short = PT.shortHand(hole[0], hole[1]);
      o.chen = PT.chen(hole[0], hole[1]);
      o.pct = PT.preflopPct(hole[0], hole[1]);
      o.top = (1 - o.pct) * 100;
      if (heavy) o.eq = PT.equity(hole, [], c.nOpp, 1500);
    } else {
      o.hand = PT.handLabel(hole, board);
      if (heavy) {
        o.eq = PT.equity(hole, board, c.nOpp, 1500);
        o.eqTight = PT.equity(hole, board, c.nOpp, 900, 0.55);
      }
      if (board.length < 5) o.outs = PT.outsInfo(hole, board);
    }
    if (heavy) o.advice = Coach.advise(o);
    return o;
  };
  Coach.analyze = (T, hero, info, heavy) => Coach.analyzeCtx(Coach.ctxFrom(T, hero, info), heavy);

  Coach.advise = (o) => {
    const c = o.ctx, bb = c.bb, price = o.toCall > 0 ? pc(o.needed) : null;
    if (!c.board.length) {
      const rfi = RFI[o.pos] || 0.2, top = o.top / 100;
      if (c.raisesPre === 0) {
        if (o.pos === 'BB' && o.toCall === 0) {
          return top <= 0.3 ? { act: 'raise', text: 'RAISE for value: top ' + o.top.toFixed(0) + '% hand and everyone limped.' } : { act: 'check', text: 'CHECK your free option.' };
        }
        if (top <= rfi) return { act: 'raise', text: 'RAISE to ' + (3 + c.limpers) + 'bb. Top ' + o.top.toFixed(0) + '% fits a ' + o.pos + ' opening range (~' + (rfi * 100).toFixed(0) + '%).' };
        return { act: 'fold', text: 'FOLD. Top ' + o.top.toFixed(0) + '% is outside the ' + o.pos + ' opening range (~' + (rfi * 100).toFixed(0) + '%).' };
      }
      const rb = o.toCall / bb;
      if (top <= 0.05) return { act: 'raise', text: 'RE-RAISE for value. Top ' + o.top.toFixed(0) + '% beats most raising ranges.' };
      if (top <= 0.13 || (o.pos === 'BB' && top <= 0.3 && rb <= 3.5)) return { act: 'call', text: 'CALL. Price: ' + price + ' equity needed; this hand realises it' + (o.pos === 'BB' ? ' with the blind discount.' : ' in a raised pot.') };
      return { act: 'fold', text: 'FOLD. Top ' + o.top.toFixed(0) + '% is too weak to continue vs a raise (' + price + ' needed).' };
    }
    const eq = o.eq, eqT = o.eqTight;
    if (o.toCall > 0) {
      const ev = eq * o.pot - (1 - eq) * o.toCall;
      let rule = '';
      if (o.outs && o.outs.draws.length) {
        const od = o.outs.draws.reduce((a, d) => a + d.outs, 0), rr = c.board.length === 3 ? od * 4 : od * 2;
        rule = ' Draw rule of ' + (c.board.length === 3 ? '4' : '2') + ': ' + od + ' outs = ~' + rr + '%.';
      }
      if (eqT > o.needed + 0.18 && eq > 0.6) return { act: 'raise', text: 'RAISE for value. ' + pc(eqT) + ' vs strong ranges, only ' + price + ' needed.' };
      if (eqT >= o.needed + 0.03) return { act: 'call', text: 'CALL. Need ' + price + ', you have ~' + pc(eqT) + ' vs a tighter range (' + pc(eq) + ' vs random). EV of call vs random ' + (ev >= 0 ? '+' : '') + PT.money(ev) + '.' + rule };
      if (eq >= o.needed + 0.05 && o.outs && o.outs.draws.length) return { act: 'call', text: 'MARGINAL CALL. Draw gets the right price (' + price + ' needed, ~' + pc(eq) + ' vs random) but check implied odds.' + rule };
      return { act: 'fold', text: 'FOLD. Need ' + price + ' but only ~' + pc(eqT) + ' vs a realistic betting range.' + rule };
    }
    if (eq > 0.65) return { act: 'raise', text: 'BET for value (about 2/3 pot). ~' + pc(eq) + ' equity; make worse hands pay.' };
    if (eq > 0.45) return { act: 'check', text: 'CHECK or small bet for pot control. ~' + pc(eq) + ' equity: ahead of some hands, behind others.' };
    const fe = '. Pure bluff with a half-pot bet needs ' + pc(0.5 / 1.5) + ' folds';
    return { act: 'check', text: 'CHECK. Only ~' + pc(eq) + ' equity' + (o.outs && o.outs.draws.length ? ' (a semi-bluff with your draw is fine)' : fe) + '.' };
  };

  // Compare the player's decision with the coach's. Returns {ok, text, loss (est. big blinds)}.
  Coach.review = (o, dec) => {
    if (!o || !o.advice) return null;
    const a = o.advice.act, d = dec.a, bb = o.ctx.bb;
    let ok = a === d;
    if (!ok) {
      if (a === 'fold' && d === 'call' && o.board > 0 && o.eq && o.eq >= o.needed - 0.02) ok = true;
      if (a === 'call' && d === 'raise') ok = true;
      if (a === 'raise' && d === 'call') ok = true;
      if (a === 'check' && d === 'raise' && o.eq && o.eq > 0.55) ok = true;
      if (!o.board && Math.abs((o.top || 0) / 100 - (RFI[o.pos] || 0.2)) < 0.04 && o.ctx.raisesPre === 0) ok = true;
    }
    let loss = 0;
    if (!ok) {
      if (o.board > 0 && o.toCall > 0 && o.eq != null) {
        const e = o.eqTight != null ? o.eqTight : o.eq, ev = e * o.pot - (1 - e) * o.toCall;
        loss = d === 'fold' ? Math.max(0.3, ev / bb) : Math.max(0.3, -ev / bb);
      } else if (!o.board) loss = Math.min(3, 0.3 + Math.abs((o.top || 0) / 100 - (RFI[o.pos] || 0.2)) * 4);
      else loss = 0.7;
    }
    const text = ok ? 'Good: ' + d.toUpperCase() + '. ' + o.advice.text : 'Check this: you chose ' + d.toUpperCase() + '. Coach says ' + o.advice.text;
    return { ok, text, loss: Math.round(loss * 10) / 10 };
  };

  Coach.html = (o) => {
    const row = (k, v) => '<div class="ak">' + k + '</div><div class="av">' + v + '</div>';
    let h = row('HAND', o.hand) + row('POSITION', o.pos);
    if (!o.board) {
      h += row('RANK', 'Top ' + o.top.toFixed(0) + '% of starting hands (Chen score ' + o.chen + ')');
      if (o.eq != null) h += row('EQUITY', pc(o.eq) + ' vs ' + o.nOpp + ' random hand' + (o.nOpp > 1 ? 's' : ''));
    } else {
      if (o.eq != null) h += row('EQUITY', pc(o.eq) + ' vs random, ~' + pc(o.eqTight) + ' vs a strong range');
      if (o.outs) {
        const ds = o.outs.draws.map((d) => d.type + ' (' + d.outs + ' outs)').join(', ');
        h += row('DRAWS', ds || 'None. Improving cards: ' + o.outs.improve);
        if (o.outs.draws.length) {
          const od = o.outs.draws.reduce((a, d) => a + d.outs, 0), left = 52 - 2 - o.board;
          const one = (od / left) * 100, two = o.board === 3 ? (1 - ((left - od) / left) * ((left - 1 - od) / (left - 1))) * 100 : one;
          h += row('OUTS MATH', od + ' outs / ' + left + ' unseen = ' + one.toFixed(1) + '% next card' + (o.board === 3 ? ', ' + two.toFixed(1) + '% by river' : ''));
        }
      }
    }
    h += row('POT', PT.money(o.pot) + (o.toCall > 0 ? ' · to call ' + PT.money(o.toCall) : ''));
    if (o.toCall > 0) h += row('POT ODDS', 'Need ' + pc(o.needed) + ' equity (' + PT.money(o.toCall) + ' / ' + PT.money(o.pot + o.toCall) + ')');
    h += row('SPR', o.spr.toFixed(1) + ' (stack / pot)');
    if (o.advice) h += '<div class="adv ' + o.advice.act + '">' + o.advice.text + '</div>';
    return h;
  };

  // ---------- saved mistakes ----------
  const MK = 'pt_mistakes';
  PT.Mistakes = {
    list: () => PT.store.get(MK, []),
    add(m) { const l = this.list(); l.unshift(m); PT.store.set(MK, l.slice(0, 80)); },
    remove(id) { PT.store.set(MK, this.list().filter((m) => m.id !== id)); },
    count() { return this.list().length; },
  };

  // ---------- spot generator ----------
  const Spots = (PT.Spots = {});
  Spots.random = () => {
    const d = PT.newDeck(), pick = PT.pick;
    const street = pick([0, 0, 1, 1, 2, 3]);
    const hole = [d[0], d[1]], board = street === 0 ? [] : d.slice(2, 2 + (street === 1 ? 3 : street === 2 ? 4 : 5));
    const bb = 2, pos = pick(['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']), stack = bb * pick([40, 80, 100, 150]);
    let pot, toCall, raisesPre = 0, limpers = 0, nOpp;
    if (street === 0) {
      const t = pick(['open', 'open', 'raise', 'limp']);
      nOpp = pick([2, 3, 4, 5]);
      if (t === 'raise') { raisesPre = 1; const r = pick([2.5, 3, 4]) * bb; toCall = pos === 'BB' ? r - bb : pos === 'SB' ? r - bb / 2 : r; pot = bb * 1.5 + r; }
      else if (t === 'limp') { limpers = 1; toCall = pos === 'BB' ? 0 : bb; pot = bb * 2.5; }
      else { toCall = pos === 'BB' ? 0 : pos === 'SB' ? bb / 2 : bb; pot = bb * 1.5; }
    } else {
      pot = bb * pick([6, 8, 12, 20, 30]); nOpp = pick([1, 1, 2, 3]); raisesPre = 1;
      toCall = Math.random() < 0.6 ? Math.round(pot * pick([0.33, 0.5, 0.75, 1])) : 0;
    }
    const ctx = { hole, board, pos, pot, toCall: Math.min(toCall, stack), stack, bb, nOpp, raisesPre, limpers };
    return { ctx, o: Coach.analyzeCtx(ctx, true) };
  };

  // Range-reading question: which hand type is most (or least) likely in a player's betting range?
  Spots.rangeQ = () => {
    const pick = PT.pick, cardsHTML = PT.cardsHTML;
    const [pos, rfi] = pick([['UTG', 0.15], ['HJ', 0.21], ['CO', 0.28], ['BTN', 0.42]]);
    const least = Math.random() < 0.3;
    for (let tries = 0; tries < 300; tries++) {
      const d = PT.newDeck(), hole = [d[0], d[1]], board = d.slice(2, 5), dead = new Set(hole.concat(board));
      const inRange = {}, bets = {};
      const topRank = Math.max.apply(null, board.map((c) => c >> 2));
      for (let i = 0; i < 52; i++) {
        if (dead.has(i)) continue;
        for (let j = i + 1; j < 52; j++) {
          if (dead.has(j) || 1 - PT.preflopPct(i, j) > rfi) continue;
          const cls = PT.shortHand(i, j);
          inRange[cls] = (inRange[cls] || 0) + 1;
          const sc = PT.evaluate([i, j].concat(board)), cat = Math.floor(sc / PT.B5);
          let b = false;
          if (cat >= 2) b = true;
          else if (cat === 1) { const pr = PT.decode(sc).d[0]; b = (i >> 2) === pr || (j >> 2) === pr; }
          else b = PT.outsInfo([i, j], board).draws.length > 0;
          if (b) bets[cls] = (bets[cls] || 0) + 1;
        }
      }
      const withBet = Object.keys(bets).sort((a, b) => bets[b] - bets[a]);
      const noBet = Object.keys(inRange).filter((k) => !bets[k]);
      let correct, wrong;
      if (!least) {
        if (withBet.length < 4 || bets[withBet[0]] < (bets[withBet[1]] || 0) + 2) continue;
        correct = withBet[0];
        const rest = withBet.slice(1).filter((k) => bets[k] <= bets[correct] - 2);
        const others = PT.shuffle(rest.slice(Math.floor(rest.length / 3))).slice(0, 2).concat(noBet.length ? [pick(noBet)] : []);
        wrong = others.slice(0, 3);
      } else {
        if (!noBet.length || withBet.length < 3) continue;
        correct = pick(noBet);
        wrong = PT.shuffle(withBet.slice(0, Math.min(8, withBet.length))).slice(0, 3);
      }
      if (wrong.length < 3 || new Set(wrong.concat(correct)).size < 4) continue;
      const total = Object.keys(bets).reduce((a, k) => a + bets[k], 0);
      const opts = PT.shuffle([correct].concat(wrong));
      const info = (k) => k + ': ' + (inRange[k] || 0) + ' combos in range, ' + (bets[k] || 0) + ' would bet this flop';
      const q = 'The <b>' + pos + '</b> player raised first in (about the top ' + Math.round(rfi * 100) + '% of hands) and you called. You hold ' + cardsHTML(hole) + ' (these cards block some of their hands).<div class="lab">Flop</div>' + cardsHTML(board) + '<div class="lab">They continuation-bet. They bet with any pair+, plus flush and straight draws, and check the rest.</div><p>Which hand type is <b>' + (least ? 'LEAST likely' : 'MOST likely') + '</b> to be in their betting range?</p>';
      return {
        type: 'choice', q, opts, ans: opts.indexOf(correct),
        why: 'Counting combos (' + total + ' betting combos in total): ' + opts.map(info).join('. ') + '.',
      };
    }
    return null;
  };
})();
