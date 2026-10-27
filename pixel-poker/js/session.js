(function () {
  const PT = window.PT;
  const $ = (s) => document.querySelector(s);
  let S = null; // active session
  const Session = (PT.Session = {});

  const aidOn = () => S && (S.opts.mode === 'coach' || PT.settings.training);

  function logLine(txt, cls) {
    const el = $('#hlog');
    const d = document.createElement('div');
    d.className = 'l ' + (cls || '');
    d.textContent = txt;
    el.appendChild(d);
    while (el.children.length > 80) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
  }
  function hud() {
    if (!S) return;
    const T = S.T, h = T.hero;
    $('#hud-info').textContent = 'Hand #' + T.handNo + '  ·  Blinds ' + PT.money(T.sb) + '/' + PT.money(T.bb) + '  ·  Stack ' + PT.money(h.stack);
  }
  function updateAid(info, heavy) {
    const panel = $('#aid'), T = S.T, h = T.hero;
    $('#b-aid').classList.toggle('on', !!aidOn());
    $('#b-aid').style.display = S.opts.mode === 'coach' ? 'none' : '';
    PT.R.showPos = !!aidOn();
    if (!h.cards.length || h.folded) { panel.classList.add('hidden'); PT.R.heroLabel = ''; S.an = null; return; }
    if (!aidOn() && !heavy) { panel.classList.add('hidden'); PT.R.heroLabel = ''; return; }
    const o = PT.Coach.analyze(T, h, info, heavy); // computed silently even with aids off, so mistakes can be tracked
    if (heavy) S.an = o;
    if (!aidOn()) { panel.classList.add('hidden'); PT.R.heroLabel = ''; return; }
    PT.R.heroLabel = o.hand.length > 36 ? o.hand.slice(0, 36) : o.hand;
    panel.innerHTML = '<h4>' + (S.opts.mode === 'coach' ? 'LIVE COACH' : 'TRAINING AIDS') + '</h4>' + PT.Coach.html(o);
    panel.classList.remove('hidden');
  }

  function setControls(mode, info) {
    const act = $('#ctl-act'), nxt = $('#ctl-next');
    act.classList.toggle('hidden', mode !== 'hero');
    nxt.classList.toggle('hidden', mode !== 'next');
    $('#ctl-wait').classList.toggle('hidden', mode !== 'wait');
    if (mode === 'hero') {
      const toCall = info.toCall;
      $('#b-call').textContent = toCall === 0 ? 'CHECK (C)' : toCall >= info.stack ? 'CALL ALL-IN ' + PT.money(toCall) + ' (C)' : 'CALL ' + PT.money(toCall) + ' (C)';
      const canR = info.canRaise;
      $('#rz').classList.toggle('hidden', !canR);
      $('#b-raise').classList.toggle('hidden', !canR);
      if (canR) {
        const rg = $('#r-range'), nm = $('#r-num');
        rg.min = info.minRaiseTo; rg.max = info.maxTo; rg.step = info.sb;
        const def = Math.min(info.maxTo, Math.max(info.minRaiseTo, Math.round(info.currentBet + 0.66 * (info.pot + toCall)) ));
        S.setRaise(def);
        nm.min = info.minRaiseTo; nm.max = info.maxTo;
      }
      $('#ctl-info').textContent = (info.currentBet === 0 ? 'Pot ' + PT.money(info.pot) : 'Pot ' + PT.money(info.pot) + '  ·  Facing ' + PT.money(toCall)) + '  ·  Your stack ' + PT.money(info.stack);
    }
  }

  Session.start = function (opts) {
    if (S) Session.cleanup();
    const cfg = opts.cfg;
    const T = PT.createTable(cfg, { stack: opts.heroStack, name: opts.name || 'You', char: opts.char }, opts.oppIds);
    S = { opts, T, buyIn: opts.heroStack, info: null, an: null, rep: 0, res: null, nextRes: null, done: false, series: [opts.heroStack], hist: [], mistakes: [], reviews: 0, foldedAces: false };
    PT.R.setLoadout(opts.char, opts.equipped);
    PT.R.setTable(T, opts.themeIdx || 0);
    $('#screen').classList.add('hidden');
    $('#game').classList.remove('hidden');
    $('#hlog').innerHTML = '';
    $('#hlog').classList.toggle('hidden', !PT.settings.log);
    $('#hud-casino').textContent = opts.title || 'Table';
    $('#aid').classList.add('hidden');
    $('#tip').classList.add('hidden');
    $('#b-chips').classList.toggle('hidden', opts.mode === 'career' ? false : false);
    setControls('wait');
    PT.R.start($('#cv'));
    PT.Audio.music(true, opts.level || 1);

    S.setRaise = (v) => {
      const rg = $('#r-range'), nm = $('#r-num');
      v = PT.clamp(Math.round(v), Number(rg.min), Number(rg.max));
      rg.value = v; nm.value = v;
      const info = S.info;
      $('#b-raise').textContent = (info && info.currentBet === 0 ? 'BET ' : 'RAISE TO ') + PT.money(v) + (v >= Number(rg.max) ? ' (ALL-IN)' : '') + ' (R)';
    };

    T.onEvent = (type, d) => {
      if (!S || S.T !== T) return;
      if (type === 'log') { if (PT.settings.log) logLine(d.txt, d.cls); }
      else if (type === 'sfx') PT.Audio.sfx(d);
      else if (type === 'newhand') { S.rev = null; $('#aid').classList.add('hidden'); PT.R.heroLabel = ''; hud(); setControls('wait'); }
      else if (type === 'dealt' || type === 'street') { updateAid(null, false); hud(); }
      else if (type === 'result') {
        const b = T.banner;
        if (b && b.kind === 'show') PT.Audio.sfx(b.heroWon ? 'win' : 'chip');
        hud();
      } else if (type === 'handend') {
        hud();
        if (d.heroWon) logLine('You win ' + PT.money(d.profit) + ' this hand.', 'win');
        else if (d.profit < 0) logLine('You lose ' + PT.money(-d.profit) + ' this hand.', 'dim');
        S.series.push(T.hero.stack);
        const hero = T.hero;
        S.hist.push({ no: d.handNo, profit: d.profit, hole: hero.cards.slice(), board: T.board.slice(), folded: hero.folded, showdown: d.showdown, bb: d.bb });
        if (opts.mode === 'career') {
          const g = PT.Career.handResult(opts.level, d);
          if (g > 0) { S.rep += g; Session.toast('+' + g.toFixed(1) + ' REP'); }
          const got = PT.Career.checkHand({ heroWon: d.heroWon, profit: d.profit, bb: d.bb, hole: hero.cards.slice(), board: T.board.slice(), folded: hero.folded, showdown: d.showdown, foldedPreAces: S.foldedAces });
          got.forEach((a) => Session.secret(a));
        }
        S.foldedAces = false;
        if (aidOn() && S.an && !T.hero.folded) { /* aids remain visible for the review */ }
      }
    };

    T.hooks.heroAct = (info, res) => {
      S.info = info;
      T.heroRes = res;
      setControls('hero', info);
      updateAid(info, true);
      S.res = res;
    };
    T.hooks.nextHand = (res) => {
      S.nextRes = res;
      setControls('next');
      const btn = $('#b-next');
      btn.textContent = 'NEXT HAND (SPACE)';
      clearInterval(S.autoT);
      const secs = PT.settings.autoDeal;
      if (secs > 0) {
        let left = secs;
        btn.textContent = 'NEXT HAND (' + left + ')';
        S.autoT = setInterval(() => {
          left--;
          if (left <= 0) { Session.next(); } else btn.textContent = 'NEXT HAND (' + left + ')';
        }, 1000);
      }
    };
    T.hooks.runItTwice = async () => {
      setControls('wait');
      const i = await PT.UI.ask('Run it twice?', 'You and one opponent are all-in. Deal the rest of the board twice and split the pot?', [{ t: 'RUN IT TWICE', cls: 'go' }, { t: 'ONCE' }]);
      return i === 0;
    };
    T.hooks.heroBust = async () => {
      setControls('wait');
      return await PT.UI.bustPrompt(S);
    };

    T.run().then(() => Session.finish());
    hud();
  };

  Session.submit = function (dec) {
    if (!S || !S.res) return;
    const res = S.res; S.res = null;
    if (S.an && S.an.advice) {
      const r = PT.Coach.review(S.an, dec);
      if (r) {
        S.reviews++;
        if (aidOn()) { logLine('COACH: ' + r.text, r.ok ? 'good' : 'bad'); PT.Audio.sfx(r.ok ? 'good' : 'bad'); }
        if (!r.ok) {
          const m = { id: Date.now() + '' + Math.floor(Math.random() * 1e4), ctx: S.an.ctx, my: dec.a, adv: S.an.advice, loss: r.loss, hand: S.an.hand, eq: S.an.eq, eqT: S.an.eqTight, needed: S.an.needed, board: S.an.board };
          S.mistakes.push(m);
          PT.Mistakes.add(m);
        }
      }
    }
    if (dec.a === 'fold' && S.T.street === 0) { const h = S.T.hero.cards; if (h.length === 2 && (h[0] >> 2) === 12 && (h[1] >> 2) === 12) S.foldedAces = true; }
    setControls('wait');
    res(dec);
  };
  Session.next = function () {
    if (!S || !S.nextRes) return;
    clearInterval(S.autoT);
    const r = S.nextRes; S.nextRes = null;
    setControls('wait');
    r();
  };
  Session.toast = function (txt) {
    const el = document.createElement('div');
    el.className = 'toast-i';
    el.textContent = txt;
    $('#toast').appendChild(el);
    setTimeout(() => el.remove(), 2200);
  };
  Session.secret = function (a) {
    const el = document.createElement('div');
    el.className = 'toast-i secret';
    el.innerHTML = 'SECRET UNLOCKED<br><b>' + a.name + '</b><br><small>' + a.items.map((i) => PT.shopById[i].name).join(' + ') + ' added to your shop inventory</small>';
    $('#toast').appendChild(el);
    PT.Audio.sfx('win');
    setTimeout(() => el.remove(), 6500);
  };
  Session.leave = function () {
    if (!S || S.done) return;
    S.leaving = true;
    clearInterval(S.autoT);
    setControls('wait');
    $('#ctl-wait').textContent = 'Leaving the table...';
    S.T.leave();
  };
  Session.finish = function () {
    if (!S || S.done) return;
    S.done = true;
    const T = S.T, h = T.hero, o = S.opts;
    clearInterval(S.autoT);
    PT.R.stop();
    $('#game').classList.add('hidden');
    $('#screen').classList.remove('hidden');
    const st = h.stats, hn = Math.max(1, st.hands);
    const res = {
      stack: Math.max(0, h.stack), buyIn: S.buyIn, hands: T.handNo, rep: S.rep, busted: h.stack <= 0, startStack: o.heroStack, series: S.series, hist: S.hist, mistakes: S.mistakes, reviews: S.reviews,
      stats: { hands: st.hands, vpip: Math.round((st.vpip / hn) * 100), pfr: Math.round((st.pfr / hn) * 100), af: st.calls ? Math.round((st.bets / st.calls) * 10) / 10 : st.bets ? 9.9 : 0, bb: T.bb },
    };
    const cb = o.onExit;
    S = null;
    $('#ctl-wait').textContent = 'Waiting for the next action...';
    if (cb) cb(res);
  };
  Session.cleanup = function () { if (S) { S.T.stopped = true; clearInterval(S.autoT); PT.R.stop(); S = null; } };
  Session.active = () => S;
  Session.addChips = async function () {
    if (!S || S.T.phase !== 'end') return;
    const o = S.opts, h = S.T.hero, c = o.cfg;
    const room = c.maxBuy - h.stack;
    if (room < S.T.bb) { Session.toast('Already at max buy-in'); return; }
    const amt = await PT.UI.chipsPrompt(S, room);
    if (amt > 0) {
      if (o.mode === 'career') PT.Career.data.bankroll -= amt, PT.Career.save();
      h.stack += amt; S.buyIn += amt;
      hud();
      logLine('You add ' + PT.money(amt) + ' to your stack.', 'dim');
    }
  };

  // ---------- Controls & input ----------
  Session.bind = function () {
    $('#b-fold').onclick = () => Session.submit({ a: 'fold' });
    $('#b-call').onclick = () => Session.submit({ a: S && S.info && S.info.toCall === 0 ? 'check' : 'call' });
    $('#b-raise').onclick = () => Session.submit({ a: 'raise', to: Number($('#r-num').value) });
    $('#b-next').onclick = () => Session.next();
    $('#b-leave').onclick = () => Session.leave();
    $('#b-chips').onclick = () => Session.addChips();
    $('#b-set').onclick = () => PT.UI.settings();
    $('#b-aid').onclick = () => {
      PT.settings.training = !PT.settings.training; PT.saveSettings();
      if (S) { const T = S.T; if (T.phase === 'hero' && S.info) updateAid(S.info, true); else updateAid(null, false); }
    };
    $('#r-range').oninput = (e) => S && S.setRaise(Number(e.target.value));
    $('#r-num').onchange = (e) => S && S.setRaise(Number(e.target.value));
    const q = (frac) => () => {
      if (!S || !S.info) return;
      const i = S.info;
      S.setRaise(frac === 'min' ? i.minRaiseTo : frac === 'all' ? i.maxTo : Math.round((i.currentBet + frac * (i.pot + i.toCall)) / i.sb) * i.sb);
    };
    $('#q-min').onclick = q('min'); $('#q-half').onclick = q(0.5); $('#q-3q').onclick = q(0.75); $('#q-pot').onclick = q(1); $('#q-all').onclick = q('all');
    document.addEventListener('keydown', (e) => {
      if (!S || document.querySelector('#modal:not(.hidden)')) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' && e.target.type === 'number') { if (e.key === 'Enter' && S.res) $('#b-raise').click(); return; }
      const k = e.key.toLowerCase();
      if (S.res) {
        if (k === 'f') $('#b-fold').click();
        else if (k === 'c') $('#b-call').click();
        else if (k === 'r' && S.info && S.info.canRaise) $('#b-raise').click();
      } else if (k === ' ' && S.nextRes) { e.preventDefault(); Session.next(); }
    });
    const cv = $('#cv'), tip = $('#tip');
    cv.addEventListener('mousemove', (e) => {
      if (!S) return;
      const r = cv.getBoundingClientRect(), mx = ((e.clientX - r.left) * 640) / r.width, my = ((e.clientY - r.top) * 360) / r.height;
      const i = PT.R.seatAt(mx, my);
      if (i < 0) { tip.classList.add('hidden'); return; }
      const p = S.T.players[i], st = p.stats;
      const pct = (a) => (st.hands ? Math.round((a / st.hands) * 100) + '%' : '-');
      const af = st.calls ? (st.bets / st.calls).toFixed(1) : st.bets ? 'high' : '-';
      let h = '<b>' + p.name + '</b>  ' + PT.money(p.stack) + '<br>Hands seen: ' + st.hands + '<br>VPIP ' + pct(st.vpip) + '  PFR ' + pct(st.pfr) + '  AF ' + af;
      if ((PT.settings.reveal || S.opts.mode !== 'career') && p.pers) h += '<br><span class="hl">' + p.pers.name + ' (' + p.pers.tag + ')</span><br>' + p.pers.desc + '<br><i>Tip: ' + p.pers.tip + '</i>';
      else h += '<br><span class="dim">Watch how they play to learn their style.</span>';
      tip.innerHTML = h;
      tip.classList.remove('hidden');
      const sr = $('#stage').getBoundingClientRect();
      let tx = e.clientX - sr.left + 14, ty = e.clientY - sr.top + 14;
      tip.style.left = Math.min(tx, sr.width - 260) + 'px'; tip.style.top = Math.min(ty, sr.height - 120) + 'px';
    });
    cv.addEventListener('mouseleave', () => tip.classList.add('hidden'));
  };
})();
