(function () {
  const PT = window.PT;
  let uid = 1;

  PT.makePlayer = (pers, opts) => {
    opts = opts || {};
    return Object.assign(
      {
        id: uid++, name: opts.name || 'Player', pers: pers || null, isHero: false, stack: 0, cards: [], bet: 0, total: 0,
        folded: false, allIn: false, acted: false, show: false, last: '', won: 0, tilt: 0,
        skin: opts.skin || PT.pick(PT.SKINS), hair: opts.hair || PT.pick(PT.HAIRS), shirt: (pers && pers.shirt) || '#556',
        stats: { hands: 0, vpip: 0, pfr: 0, bets: 0, calls: 0, fcb: 0, ftb: 0 }, vp: false, pf: false, betT: 0, showT: 0,
        look: { hat: (pers && pers.hat) || PT.pick(['none', 'none', 'none', 'cap', 'beanie']), hair: PT.pick(['short', 'short', 'bald', 'ponytail', 'afro', 'long']) },
      },
      opts.extra || {}
    );
  };

  class Table {
    constructor(cfg) {
      this.cfg = cfg;
      this.sb = cfg.sb; this.bb = cfg.bb; this.n = cfg.seats;
      this.players = new Array(this.n).fill(null);
      this.button = 0; this.board = []; this.boardT = []; this.pot = 0; this.street = 0;
      this.phase = 'idle'; this.handNo = 0; this.hooks = {}; this.banner = null;
      this.turn = -1; this.stopped = false; this.heroOut = false; this.currentBet = 0; this.lastRaise = cfg.bb;
      this.preRaiser = null; this.raisesPre = 0; this.limpers = 0; this.log = [];
      this.fx = []; this.board2 = null; this.rit = false; this.ritAsked = false; this.lastRaiser = null; this.straddleIdx = -1; this.dealT = 0;
    }
    emit(t, d) { if (this.onEvent) this.onEvent(t, d); }
    say(txt, cls) { this.log.push({ txt, cls }); if (this.log.length > 300) this.log.shift(); this.emit('log', { txt, cls }); }
    sfx(n) { this.emit('sfx', n); }
    get hero() { return this.players.find((p) => p && p.isHero); }
    live() { return this.players.filter((p) => !p.folded); }
    potTotal() { return this.pot + this.players.reduce((s, p) => s + p.bet, 0); }
    wait(ms) {
      const f = (this.stopped ? 0.02 : this.heroOut ? 0.3 : 1) / (PT.settings.speed || 1);
      return PT.delay(ms * f);
    }
    posName(i) {
      const n = this.n, d = (i - this.button + n) % n;
      if (n === 2) return d === 0 ? 'BTN' : 'BB';
      if (d === 0) return 'BTN';
      if (d === 1) return 'SB';
      if (d === 2) return 'BB';
      if (d === n - 1) return 'CO';
      if (d === n - 2 && n >= 6) return 'HJ';
      if (d === 3) return 'UTG';
      if (d === 4 && n >= 8) return 'UTG+1';
      return 'MP';
    }
    aiBuyIn() {
      const c = this.cfg, t = (Math.random() + Math.random()) / 2;
      return Math.max(c.minBuy, Math.round((c.minBuy + (c.maxBuy - c.minBuy) * t) / this.bb) * this.bb);
    }
    newOpponent(seatIdx, persId) {
      const pers = persId ? PT.persById[persId] : PT.pickPersonalities(1, this.cfg.level || 1)[0];
      const taken = new Set(this.players.filter(Boolean).map((p) => p.name));
      const names = PT.NAMES.filter((n) => !taken.has(n));
      const p = PT.makePlayer(pers, { name: PT.pick(names) });
      p.stack = this.aiBuyIn();
      this.players[seatIdx] = p;
      return p;
    }
    commit(p, amt) {
      amt = Math.min(amt, p.stack);
      p.stack -= amt; p.bet += amt; p.total += amt;
      if (amt > 0) p.betT = performance.now();
      if (p.stack === 0) p.allIn = true;
    }
    collect() {
      const now = performance.now();
      this.players.forEach((p, i) => {
        if (p.bet > 0) this.fx.push({ k: 'col', seat: i, amount: p.bet, t0: now });
        this.pot += p.bet; p.bet = 0;
      });
      this.fx = this.fx.filter((f) => now - f.t0 < 1500);
    }
    reveal(p) { if (!p.show) { p.show = true; p.showT = performance.now(); } }
    rules() { return PT.settings; }

    async refreshSeats() {
      const cfg0 = this.cfg;
      for (let i = 0; i < this.n; i++) {
        const p = this.players[i];
        if (p.isHero) continue;
        const cfg = this.cfg;
        if (p.stack < this.bb || (p.stack < cfg.minBuy * 0.35 && Math.random() < 0.7)) {
          if (p.stack < this.bb && Math.random() < 0.5) {
            this.say(p.name + ' busts and leaves the table.', 'dim');
            const np = this.newOpponent(i, null);
            this.say(np.name + ' sits down with ' + PT.money(np.stack) + '.', 'dim');
          } else {
            p.stack = this.aiBuyIn();
            this.say(p.name + ' reloads to ' + PT.money(p.stack) + '.', 'dim');
          }
        } else if (p.stack > cfg.maxBuy * 4 && Math.random() < 0.15) {
          this.say(p.name + ' cashes out ' + PT.money(p.stack) + ' and leaves.', 'dim');
          const np = this.newOpponent(i, null);
          this.say(np.name + ' sits down with ' + PT.money(np.stack) + '.', 'dim');
        }
      }
      // special guest: the Drunk Uncle wanders into low-stakes games for a few hands
      if (cfg0.guests !== false && (cfg0.level || 1) <= 5) {
        const g = this.players.findIndex((q) => q && q.guest);
        if (g >= 0) {
          const q = this.players[g];
          if (--q.guestHands <= 0) {
            this.say(q.name + ' staggers out: "Gotta pick up the kids!"', 'dim');
            this.newOpponent(g, null);
            this.say(this.players[g].name + ' sits down with ' + PT.money(this.players[g].stack) + '.', 'dim');
          }
        } else if (Math.random() < 0.035) {
          const seats = this.players.map((q, i) => i).filter((i) => !this.players[i].isHero);
          const i = PT.pick(seats);
          this.say(this.players[i].name + ' leaves. Uncle V stumbles in and sits down. He has had a few.', 'dim');
          const np = PT.makePlayer(PT.GUEST, { name: 'Uncle V' });
          np.stack = this.aiBuyIn(); np.guest = true; np.guestHands = PT.rint(18, 36);
          this.players[i] = np;
        }
      }
      const h = this.hero;
      if (h && h.stack <= 0) {
        const amt = this.hooks.heroBust ? await this.hooks.heroBust() : 0;
        if (!amt) return false;
        h.stack = amt;
      }
      return true;
    }

    async playHand() {
      const T = this, n = T.n;
      if (!(await T.refreshSeats()) || T.stopped) return false;
      T.handNo++;
      T.players.forEach((p) => {
        p.cards = []; p.bet = 0; p.total = 0; p.folded = false; p.allIn = false; p.acted = false;
        p.show = false; p.last = ''; p.won = 0; p.vp = false; p.pf = false; p.score = 0;
      });
      T.board = []; T.boardT = []; T.pot = 0; T.street = 0; T.banner = null; T.preRaiser = null;
      T.raisesPre = 0; T.limpers = 0; T.heroOut = false; T.button = (T.button + 1) % n;
      T.fx = []; T.board2 = null; T.rit = false; T.ritAsked = false; T.lastRaiser = null; T.straddleIdx = -1; T.rakeTaken = 0;
      T.deck = PT.newDeck();
      const hero = T.hero, startStack = hero.stack;
      const sbI = n === 2 ? T.button : (T.button + 1) % n, bbI = n === 2 ? (T.button + 1) % 2 : (T.button + 2) % n;
      T.commit(T.players[sbI], T.sb); T.commit(T.players[bbI], T.bb);
      T.currentBet = T.bb; T.lastRaise = T.bb;
      let firstPre = n === 2 ? sbI : (bbI + 1) % n;
      if (T.rules().straddle && n >= 4) {
        const si = (bbI + 1) % n, sp = T.players[si];
        if (!sp.isHero && sp.stack > T.bb * 6 && Math.random() < (sp.pers && sp.pers.straddle ? sp.pers.straddle : 0.06)) {
          T.commit(sp, T.bb * 2);
          T.currentBet = T.bb * 2; T.straddleIdx = si; firstPre = (si + 1) % n;
          T.say(sp.name + ' straddles ' + PT.money(T.bb * 2) + '.', 'act');
        }
      }
      T.dealStart = sbI; T.dealT = performance.now();
      T.phase = 'deal'; T.emit('newhand');
      for (let k = 0; k < 2; k++)
        for (let j = 0; j < n; j++) T.players[(sbI + j) % n].cards.push(T.deck.pop());
      T.sfx('deal'); T.emit('dealt');
      T.say('— Hand #' + T.handNo + ' —   Dealer: ' + T.players[T.button].name, 'hdr');
      await T.wait(900);
      T.phase = 'bet';
      await T.betRound(firstPre);

      let street = 0;
      while (T.live().length > 1 && street < 3) {
        street++;
        T.collect();
        const can = T.live().filter((p) => !p.allIn);
        T.lastRaiser = null;
        if (can.length <= 1) T.live().forEach((p) => T.reveal(p));
        if (can.length <= 1 && T.live().length === 2 && !T.ritAsked && T.rules().rit && T.live().indexOf(T.hero) >= 0) {
          T.ritAsked = true;
          T.rit = T.hooks.runItTwice ? !!(await T.hooks.runItTwice()) : false;
          if (T.rit) { T.ritBase = T.board.length; T.say('Both players agree to run it twice.', 'act'); }
        }
        T.street = street;
        const cnt = street === 1 ? 3 : 1;
        T.deck.pop();
        for (let k = 0; k < cnt; k++) {
          T.board.push(T.deck.pop()); T.boardT.push(performance.now() + k * 140);
        }
        T.sfx('flip');
        const names = ['', 'FLOP', 'TURN', 'RIVER'];
        T.say(names[street] + ': ' + T.board.map(PT.cs).join(' '), 'hdr');
        T.emit('street');
        T.players.forEach((p) => { p.last = ''; });
        await T.wait(can.length <= 1 ? 1100 : 600);
        if (can.length > 1) await T.betRound((T.button + 1) % n);
      }
      T.collect();
      if (T.live().length === 1) await T.uncontested();
      else await T.showdown();
      T.phase = 'end';
      T.afterHand(startStack);
      return true;
    }

    roundDone() {
      const live = this.live();
      if (live.length <= 1) return true;
      const can = live.filter((p) => !p.allIn);
      if (can.length === 0) return true;
      if (can.length === 1 && can[0].bet >= this.currentBet) return true;
      return can.every((p) => p.acted && p.bet === this.currentBet);
    }

    async betRound(first) {
      const T = this, n = T.n;
      if (T.street > 0) { T.currentBet = 0; T.lastRaise = T.bb; }
      T.players.forEach((p) => { p.acted = false; });
      let i = first, guard = 0;
      while (guard++ < 600) {
        if (T.stopped && !T.hero.folded && false) break;
        if (T.live().length <= 1 || T.roundDone()) break;
        const p = T.players[i];
        if (!p.folded && !p.allIn && !(p.acted && p.bet === T.currentBet)) {
          T.turn = i;
          await T.act(p, i);
          T.turn = -1;
        }
        i = (i + 1) % n;
      }
    }

    aiState(p, i, info) {
      const T = this;
      const summ = (q) => { const st = q.stats, h = st.hands; return { hands: h, vpip: h ? st.vpip / h : 0.3, pfr: h ? st.pfr / h : 0.12, af: st.calls ? st.bets / st.calls : st.bets ? 4 : 1, ftb: st.fcb >= 5 ? st.ftb / st.fcb : 0.45 }; };
      return {
        street: T.street, pot: T.potTotal(), board: T.board, toCall: info.toCall, currentBet: T.currentBet,
        minRaiseTo: info.minRaiseTo, maxTo: info.maxTo, bb: T.bb, sb: T.sb, pos: T.posName(i), raises: T.raisesPre,
        limpers: T.limpers, nOpp: T.live().length - 1, wasAggressor: T.preRaiser === p, straddle: T.straddleIdx >= 0,
        opps: T.live().filter((q) => q !== p).map(summ),
        foe: T.lastRaiser && T.lastRaiser !== p && !T.lastRaiser.folded ? summ(T.lastRaiser) : null,
      };
    }

    async act(p, i) {
      const T = this;
      const toCall = Math.min(T.currentBet - p.bet, p.stack);
      const info = {
        toCall, currentBet: T.currentBet, minRaiseTo: Math.min(T.currentBet + T.lastRaise, p.bet + p.stack),
        maxTo: p.bet + p.stack, pot: T.potTotal(), bb: T.bb, sb: T.sb, canRaise: p.stack > toCall, myBet: p.bet, stack: p.stack,
      };
      let dec;
      if (p.isHero) {
        T.phase = 'hero';
        T.emit('herotime', info);
        dec = await new Promise((res) => {
          T.pendingHero = res;
          if (T.stopped) res({ a: 'fold' });
          else if (T.hooks.heroAct) T.hooks.heroAct(info, res);
        });
        T.pendingHero = null;
        T.phase = 'bet';
      } else {
        await T.wait(PT.rint(450, 1000));
        dec = PT.AI.decide(p, T.aiState(p, i, info));
      }
      if (info.toCall > 0) { p.stats.fcb++; if (dec.a === 'fold') p.stats.ftb++; }
      T.apply(p, dec, info);
    }

    apply(p, dec, info) {
      const T = this;
      let a = dec.a, to = dec.to;
      if (a === 'check' && info.toCall > 0) a = 'fold';
      if (a === 'call' && info.toCall === 0) a = 'check';
      if (a === 'raise') {
        if (p.stack <= info.toCall) a = 'call';
        else {
          to = Math.max(info.minRaiseTo, Math.min(to, info.maxTo));
          if (to <= T.currentBet) a = 'call';
        }
      }
      const pre = T.street === 0;
      if (a === 'fold') {
        p.folded = true; p.last = 'FOLD'; T.sfx('fold');
        T.say(p.name + ' folds.');
        if (p.isHero) T.heroOut = true;
      } else if (a === 'check') {
        p.last = 'CHECK'; T.sfx('check'); T.say(p.name + ' checks.');
      } else if (a === 'call') {
        const amt = info.toCall;
        if (pre && T.raisesPre === 0 && T.players.indexOf(p) !== (T.button + (T.n === 2 ? 1 : 2)) % T.n) T.limpers++;
        T.commit(p, amt);
        p.last = p.allIn ? 'ALL-IN' : 'CALL ' + PT.short(amt);
        if (pre) p.vp = true;
        p.stats.calls++;
        T.sfx('chip'); T.say(p.name + ' calls ' + PT.money(amt) + (p.allIn ? ' (all-in)' : '') + '.');
      } else {
        const prevBet = T.currentBet, amt = to - p.bet;
        T.commit(p, amt);
        const by = to - T.currentBet;
        if (by >= T.lastRaise) T.lastRaise = by;
        T.currentBet = to;
        T.players.forEach((q) => { if (q !== p && !q.folded && !q.allIn) q.acted = false; });
        T.lastRaiser = p;
        if (pre) { T.preRaiser = p; T.raisesPre++; p.vp = true; p.pf = true; }
        p.stats.bets++;
        const verb = prevBet === 0 && !pre ? 'bets' : 'raises to';
        p.last = p.allIn ? 'ALL-IN ' + PT.short(to) : (prevBet === 0 && !pre ? 'BET ' : 'RAISE ') + PT.short(to);
        T.sfx('raise');
        T.say(p.name + ' ' + verb + ' ' + PT.money(to) + (p.allIn ? ' (all-in)' : '') + '.', 'act');
      }
      p.acted = true;
      T.lastAction = { p, a, to };
      T.emit('action', { p, a, to });
    }

    buildPots() {
      const T = this, live = T.live();
      const levels = [...new Set(live.map((p) => p.total))].sort((a, b) => a - b);
      const pots = [];
      let prev = 0;
      levels.forEach((lvl) => {
        let amount = 0;
        T.players.forEach((p) => { amount += Math.min(p.total, lvl) - Math.min(p.total, prev); });
        pots.push({ amount, elig: live.filter((p) => p.total >= lvl) });
        prev = lvl;
      });
      const sum = pots.reduce((s, p) => s + p.amount, 0), all = T.players.reduce((s, p) => s + p.total, 0);
      if (all > sum && pots.length) pots[pots.length - 1].amount += all - sum;
      return pots;
    }

    calcRake() {
      const T = this;
      if (!T.rules().rake || T.street === 0) return 0;
      const r = Math.min(Math.floor(T.pot * 0.05), T.bb * 3);
      return Math.max(0, r);
    }
    async uncontested() {
      const T = this, w = T.live()[0];
      const rake = T.calcRake();
      if (rake) { T.pot -= rake; T.say('House rake: ' + PT.money(rake) + '.', 'dim'); }
      const amt = T.pot;
      w.won = amt; w.stack += amt; T.pot = 0;
      T.say(w.name + ' wins ' + PT.money(amt) + '. (everyone folded)', 'win');
      T.banner = { t0: performance.now(), kind: 'fold', winners: [T.players.indexOf(w)], lines: [], amount: amt, name: w.name, heroWon: w.isHero };
      T.sfx(w.isHero ? 'win' : 'chip');
      T.emit('result');
      await T.wait(400);
    }

    async showdown() {
      const T = this, live = T.live();
      live.forEach((p) => { T.reveal(p); p.score = PT.evaluate(p.cards.concat(T.board)); });
      T.sfx('flip');
      await T.wait(700);
      const rake = T.calcRake();
      const pots = T.buildPots();
      if (rake && pots.length) { pots[0].amount = Math.max(0, pots[0].amount - rake); T.say('House rake: ' + PT.money(rake) + '.', 'dim'); }
      let b2 = null;
      if (T.rit && T.board.length === 5 && T.ritBase < 5) {
        b2 = T.board.slice(0, T.ritBase);
        T.deck.pop();
        while (b2.length < 5) b2.push(T.deck.pop());
        T.board2 = b2;
        live.forEach((p) => { p.score2 = PT.evaluate(p.cards.concat(b2)); });
        T.say('Run 2 board: ' + b2.map(PT.cs).join(' '), 'hdr');
      }
      const results = [], results2 = [];
      pots.forEach((pot) => {
        const split = (key, amount) => {
          let best = -1;
          pot.elig.forEach((p) => { if (p[key] > best) best = p[key]; });
          const winners = pot.elig.filter((p) => p[key] === best);
          const share = Math.floor(amount / winners.length), rem = amount - share * winners.length;
          winners.forEach((w, k) => { w.won += share + (k < rem ? 1 : 0); });
          return { amount, winners, score: best };
        };
        if (b2) {
          const h1 = Math.ceil(pot.amount / 2);
          results.push(split('score', h1));
          results2.push(split('score2', pot.amount - h1));
        } else results.push(split('score', pot.amount));
      });
      T.players.forEach((p) => { p.stack += p.won; });
      T.pot = 0;
      const main = results.reduce((a, b) => (b.amount > a.amount ? b : a), results[0]);
      const w0 = main.winners[0];
      const best5 = PT.bestFive(w0.cards.concat(T.board));
      const names = (r) => r.winners.map((w) => w.name).join(' & ');
      const lines = [];
      results2.forEach((r, k) => { if (r.amount > 0) lines.push('Run 2: ' + names(r) + ' win' + (r.winners.length > 1 ? '' : 's') + ' ' + PT.money(r.amount) + ' (' + PT.describe(r.score) + ')'); });
      results.forEach((r, k) => {
        if (r === main) return;
        lines.push((k === 0 ? 'Main pot: ' : 'Side pot: ') + names(r) + ' win ' + PT.money(r.amount) + ' (' + PT.describe(r.score) + ')');
      });
      results.forEach((r) => T.say((r.winners.length > 1 ? 'Split: ' : '') + names(r) + ' win' + (r.winners.length > 1 ? '' : 's') + ' ' + PT.money(r.amount) + ' with ' + PT.describe(r.score) + (b2 ? ' (run 1)' : '') + '.', 'win'));
      results2.forEach((r) => T.say((r.winners.length > 1 ? 'Split: ' : '') + names(r) + ' win' + (r.winners.length > 1 ? '' : 's') + ' ' + PT.money(r.amount) + ' with ' + PT.describe(r.score) + ' (run 2).', 'win'));
      const heroWonAny = main.winners.some((w) => w.isHero) || results2.some((r) => r.winners.some((w) => w.isHero));
      T.banner = {
        t0: performance.now(), kind: 'show', winners: main.winners.map((w) => T.players.indexOf(w)), amount: main.amount,
        handName: PT.describe(main.score), best5, name: names(main), special: main.score >= 8 * PT.B5 ? (PT.decode(main.score).d[0] === 12 ? 'royal' : 'sf') : (main.score >= 7 * PT.B5 ? 'quads' : ''),
        split: main.winners.length > 1, lines, heroWon: heroWonAny, rit: !!b2,
      };
      T.sfx(T.banner.heroWon ? 'win' : 'chip');
      T.emit('result');
      await T.wait(400);
    }

    afterHand(startStack) {
      const T = this, hero = T.hero;
      T.players.forEach((p) => {
        p.stats.hands++;
        if (p.vp) p.stats.vpip++;
        if (p.pf) p.stats.pfr++;
        if (!p.isHero) {
          const lossBB = (p.total - p.won) / T.bb;
          if (lossBB > 20) p.tilt = Math.min(1, p.tilt + 0.35);
          else if (p.won - p.total > 20 * T.bb) p.tilt = Math.max(0, p.tilt - 0.2);
          p.tilt *= 0.92;
        }
      });
      const sum = {
        handNo: T.handNo, delta: hero.stack - startStack, won: hero.won, invested: hero.total, heroWon: hero.won > hero.total,
        profit: hero.won - hero.total, showdown: T.banner && T.banner.kind === 'show', bb: T.bb,
      };
      T.lastSummary = sum;
      T.emit('handend', sum);
    }

    async run() {
      this.stopped = false;
      while (!this.stopped) {
        const ok = await this.playHand();
        if (!ok || this.stopped) break;
        if (this.hooks.nextHand) await new Promise((res) => { this.pendingNext = res; this.hooks.nextHand(res); });
        this.pendingNext = null;
      }
      this.phase = 'stopped';
      this.emit('stopped');
    }
    leave() {
      this.stopped = true;
      if (this.pendingHero) this.pendingHero({ a: 'fold' });
      if (this.pendingNext) this.pendingNext();
    }
  }
  PT.Table = Table;

  // Build a table with the hero in seat 0 and AI opponents elsewhere.
  PT.createTable = (cfg, hero, oppIds) => {
    const T = new Table(cfg);
    const h = PT.makePlayer(null, { name: hero.name || 'You', skin: (hero.char && PT.SKINS[hero.char.skin]) || PT.SKINS[1] });
    h.isHero = true; h.stack = hero.stack;
    T.players[0] = h;
    const ids = oppIds && oppIds.length ? oppIds.slice() : [];
    const rand = PT.pickPersonalities(cfg.seats - 1, cfg.level || 1);
    for (let i = 1; i < cfg.seats; i++) {
      const id = ids[i - 1] && ids[i - 1] !== 'random' ? ids[i - 1] : rand[i - 1].id;
      T.newOpponent(i, id);
    }
    T.button = cfg.seats - 1;
    return T;
  };
})();
