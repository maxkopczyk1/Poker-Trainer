(function () {
  const PT = window.PT;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const pick = PT.pick, rint = PT.rint, B5 = PT.B5, CATS = PT.CATS;
  const KEY = 'pt_training';
  const prog = () => PT.store.get(KEY, { done: {}, best: {}, all: false });
  const saveProg = (p) => PT.store.set(KEY, p);

  // ---------- helpers ----------
  const SUIT_CH = '♣♦♥♠';
  function cardEl(c) {
    const r = c >> 2, s = c & 3, red = s === 1 || s === 2;
    return '<span class="pc ' + (red ? 'red' : 'blk') + '"><b>' + (r === 8 ? '10' : PT.RANKS[r]) + '</b><i>' + SUIT_CH[s] + '</i></span>';
  }
  const cardsHTML = (arr) => '<span class="crow">' + arr.map((c) => cardEl(typeof c === 'number' ? c : PT.card(c))).join('') + '</span>';
  PT.cardsHTML = cardsHTML;
  const pc = (x, d) => (x * 100).toFixed(d == null ? 1 : d).replace(/\.0$/, '') + '%';
  const ch = (q, correct, wrongs, why) => {
    const opts = PT.shuffle([correct].concat(wrongs));
    return { type: 'choice', q, opts, ans: opts.indexOf(correct), why };
  };
  const num = (q, ans, tol, unit, why) => ({ type: 'num', q, ans, tol, unit, why });
  const exactFlop = (o) => 1 - ((47 - o) / 47) * ((46 - o) / 46);
  const exactTurn = (o) => o / 46;
  const evCall = (pot, bet, eq) => eq * (pot + bet) - (1 - eq) * bet; // pot = before villain's bet
  const evBet = (pot, bet, fe, eq) => fe * pot + (1 - fe) * (eq * (pot + bet) - (1 - eq) * bet);

  // ---------- dynamic question makers ----------
  function randCat(cat) {
    if (cat === 8) { const s = rint(0, 3), h = rint(4, 12); return [0, 1, 2, 3, 4].map((k) => (h - k) * 4 + s); }
    if (cat === 7) { const q = rint(0, 12); let k; do { k = rint(0, 12); } while (k === q); return [0, 1, 2, 3].map((s) => q * 4 + s).concat(k * 4 + rint(0, 3)); }
    for (let i = 0; i < 40000; i++) { const d = PT.newDeck().slice(0, 5); if (Math.floor(PT.evaluate(d) / B5) === cat) return d; }
    return PT.newDeck().slice(0, 5);
  }
  function qHandName() {
    const cat = pick([0, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8]), h = randCat(cat);
    const wrong = PT.shuffle(CATS.filter((c, i) => i !== cat)).slice(0, 3);
    return ch('What is the best hand here?<div>' + cardsHTML(PT.shuffle(h.slice())) + '</div>', CATS[cat], wrong, 'It is a <b>' + PT.describe(PT.evaluate(h)) + '</b>.');
  }
  function qWhoWins() {
    for (;;) {
      const d = PT.newDeck(), A = [d[0], d[1]], B = [d[2], d[3]], bd = d.slice(4, 9);
      const sa = PT.evaluate(A.concat(bd)), sb = PT.evaluate(B.concat(bd));
      if (sa === sb && Math.random() < 0.85) continue;
      const ans = sa > sb ? 'Player A' : sb > sa ? 'Player B' : 'Split pot';
      return ch('Who wins at showdown?<div class="lab">Board</div>' + cardsHTML(bd) + '<div class="lab">Player A</div>' + cardsHTML(A) + '<div class="lab">Player B</div>' + cardsHTML(B), ans, ['Player A', 'Player B', 'Split pot'].filter((x) => x !== ans), 'A has <b>' + PT.describe(sa) + '</b>. B has <b>' + PT.describe(sb) + '</b>.');
    }
  }
  function qPotOdds() {
    const pot = pick([40, 80, 120, 200, 240]), bet = pot * pick([0.25, 0.5, 0.75, 1, 1.5, 2]);
    const need = (bet / (pot + 2 * bet)) * 100;
    return num('The pot is $' + pot + '. Your opponent bets $' + bet + '. What equity (%) do you need to break even on a call?', Math.round(need * 10) / 10, 1.2, '%', 'Call / (pot + bet + call) = ' + bet + ' / ' + (pot + 2 * bet) + ' = <b>' + need.toFixed(1) + '%</b>.');
  }
  function qOuts() {
    const types = ['flush', 'oesd', 'gut', 'over'];
    for (let tries = 0; tries < 400; tries++) {
      const t = pick(types);
      let hole, board, label, ans, expl;
      const rs = (n) => PT.shuffle([...Array(13).keys()]).slice(0, n);
      const suit = () => rint(0, 3);
      if (t === 'flush') {
        const s = suit(), r = rs(5), os = [0, 1, 2, 3].filter((x) => x !== s);
        hole = [r[0] * 4 + s, r[1] * 4 + s]; board = [r[2] * 4 + s, r[3] * 4 + s, r[4] * 4 + pick(os)];
        label = 'flush'; ans = 9; expl = 'A suit has 13 cards and you can see 4 of them, so 13 - 4 = <b>9 outs</b>.';
      } else if (t === 'over') {
        const lows = rs(13).filter((x) => x <= 8).slice(0, 3);
        hole = [12 * 4 + suit(), 11 * 4 + suit()]; board = lows.map((r) => r * 4 + suit());
        label = 'pair (by hitting an Ace or King)'; ans = 6; expl = 'Three Aces + three Kings left in the deck = <b>6 outs</b>.';
      } else {
        const r0 = t === 'oesd' ? rint(0, 8) : rint(0, 8);
        const win = t === 'oesd' ? [r0, r0 + 1, r0 + 2, r0 + 3] : [r0, r0 + 1, r0 + 3, r0 + 4];
        const sh = PT.shuffle(win.slice());
        let extra; do { extra = rint(0, 12); } while (extra >= r0 - 2 && extra <= r0 + 7);
        hole = [sh[0] * 4 + suit(), sh[1] * 4 + suit()]; board = [sh[2] * 4 + suit(), sh[3] * 4 + suit(), extra * 4 + suit()];
        label = 'straight'; ans = t === 'oesd' ? 8 : 4;
        expl = t === 'oesd' ? 'Two different ranks complete it, 4 cards of each: 2 x 4 = <b>8 outs</b> (open-ended).' : 'Only one rank completes the inside straight: 4 cards = <b>4 outs</b> (gutshot).';
      }
      if (new Set(hole.concat(board)).size !== 5) continue;
      const info = PT.outsInfo(hole, board);
      const d = info.draws;
      const ok = t === 'flush' ? d.length === 1 && d[0].type === 'Flush draw' : t === 'oesd' ? d.length === 1 && d[0].type.indexOf('Open') === 0 : t === 'gut' ? d.length === 1 && d[0].type.indexOf('Gutshot') === 0 : d.length === 0;
      if (!ok || info.cat !== 0) continue;
      return num('You hold ' + cardsHTML(hole) + ' on a flop of ' + cardsHTML(board) + ' How many cards complete your ' + label + '?', ans, 0, ' outs', expl);
    }
    return num('A flush draw has how many outs (cards that complete it)?', 9, 0, ' outs', '13 suited cards - 4 you can see = <b>9</b>.');
  }
  function qRule() {
    const o = pick([4, 6, 8, 9, 12]), flop = Math.random() < 0.5;
    const est = o * (flop ? 4 : 2), ex = flop ? exactFlop(o) : exactTurn(o);
    return num('You have <b>' + o + ' outs</b> on the ' + (flop ? 'flop (two cards to come)' : 'turn (one card to come)') + '. Use the Rule of ' + (flop ? '4' : '2') + ' to estimate your chance of hitting (%).', est, 1, '%', 'Outs x ' + (flop ? '4' : '2') + ' = <b>' + est + '%</b>. The exact figure is ' + pc(ex) + '.');
  }
  function qEV() {
    const pot = pick([40, 60, 80, 100, 120, 200]), bet = pot * pick([0.5, 0.75, 1]), eq = pick([0.2, 0.25, 0.3, 0.35, 0.4, 0.45]);
    const ev = evCall(pot, bet, eq);
    return num('Pot $' + pot + ' before your opponent bets $' + bet + '. You estimate <b>' + pc(eq, 0) + '</b> equity. What is the EV of calling, in dollars? (negative if losing)', Math.round(ev * 10) / 10, 1, '$', 'EV = ' + pc(eq, 0) + ' x $' + (pot + bet) + ' - ' + pc(1 - eq, 0) + ' x $' + bet + ' = <b>$' + ev.toFixed(1) + '</b>.');
  }
  function qBluff() {
    const pot = pick([40, 80, 120, 200]), bet = pot * pick([0.25, 0.5, 0.75, 1, 1.5]);
    const fe = (bet / (pot + bet)) * 100;
    return num('You bluff $' + bet + ' into a $' + pot + ' pot (a pure bluff, zero equity if called). How often (%) must your opponent fold for the bluff to break even?', Math.round(fe * 10) / 10, 1.2, '%', 'Bet / (pot + bet) = ' + bet + ' / ' + (pot + bet) + ' = <b>' + fe.toFixed(1) + '%</b>.');
  }
  function qMDF() {
    const pot = pick([40, 80, 120, 200]), bet = pot * pick([0.25, 0.5, 0.75, 1, 2]);
    const m = (pot / (pot + bet)) * 100;
    return num('Your opponent bets $' + bet + ' into a $' + pot + ' pot. What is your minimum defence frequency (MDF, %): the share of hands you must continue with so they cannot bluff you profitably?', Math.round(m * 10) / 10, 1.2, '%', 'MDF = pot / (pot + bet) = ' + pot + ' / ' + (pot + bet) + ' = <b>' + m.toFixed(1) + '%</b>.');
  }
  function qSPR() {
    const s = pick([100, 150, 200, 300, 450, 600]), p = pick([20, 30, 40, 50, 60, 100]);
    return num('On the flop the pot is $' + p + ' and the effective stack is $' + s + '. What is the stack-to-pot ratio (SPR)?', Math.round((s / p) * 10) / 10, 0.2, '', 'SPR = stack / pot = ' + s + ' / ' + p + ' = <b>' + (s / p).toFixed(1) + '</b>.');
  }
  function qCombos() {
    const v = pick([
      ['How many combinations of <b>pocket Queens</b> (QQ) exist?', 6, 'There are 4 Queens. Choose 2: 4x3/2 = <b>6</b>.'],
      ['How many combinations of <b>AKs</b> (ace-king suited) exist?', 4, 'One for each suit = <b>4</b>.'],
      ['How many combinations of <b>AKo</b> (ace-king offsuit) exist?', 12, '4 aces x 3 kings of a different suit = <b>12</b>.'],
      ['How many combinations of <b>AK in total</b> (suited and offsuit) exist?', 16, '4 x 4 = <b>16</b> (4 suited + 12 offsuit).'],
      ['You hold the A♠. How many combinations of <b>AA</b> can an opponent still have?', 3, 'Three aces remain: choose 2 = <b>3</b>.'],
      ['You hold A♠ and K♥. How many combinations of <b>AK</b> can an opponent still have?', 9, '3 aces x 3 kings = <b>9</b>.'],
      ['You hold A♠ and K♠. How many combinations of <b>AKs</b> can an opponent have?', 3, 'The spade version is gone, leaving hearts, diamonds, and clubs = <b>3</b>.'],
      ['How many starting-hand combinations exist in total (52 choose 2)?', 1326, '52 x 51 / 2 = <b>1,326</b>.'],
    ]);
    return num(v[0], v[1], 0, '', v[2]);
  }
  function qPreflop() {
    const pos = pick(['UTG', 'HJ', 'CO', 'BTN']), rfi = { UTG: 0.15, HJ: 0.21, CO: 0.28, BTN: 0.42 }[pos];
    for (let i = 0; i < 200; i++) {
      const d = PT.newDeck(), a = d[0], b = d[1], top = 1 - PT.preflopPct(a, b);
      if (Math.abs(top - rfi) < 0.05) continue;
      const raise = top <= rfi;
      return ch('You are in <b>' + pos + '</b> (' + { UTG: 'first to act', HJ: 'two before the button', CO: 'one before the button', BTN: 'on the button' }[pos] + '), folded to you. A standard opening range here is about the top ' + pc(rfi, 0) + '. Your hand: ' + cardsHTML([a, b]), raise ? 'Raise' : 'Fold', [raise ? 'Fold' : 'Raise'], PT.shortHand(a, b) + ' is roughly a top <b>' + pc(top, 0) + '</b> hand. ' + (raise ? 'That is inside' : 'That is outside') + ' a ' + pos + ' range of about ' + pc(rfi, 0) + '.');
    }
    return qPotOdds();
  }
  function qBBDefend() {
    const x = pick([2.5, 3, 4, 5]), need = ((x - 1) / (2 * x + 0.5)) * 100;
    return num('Blinds are 0.5/1 (in big blinds). The button opens to <b>' + x + 'bb</b> and the small blind folds. You are in the big blind. What equity (%) do you need to call?', Math.round(need * 10) / 10, 1.2, '%', 'You already posted 1bb and call ' + (x - 1) + 'bb more. Final pot = 0.5 (SB) + ' + x + ' (opener) + ' + x + ' (you) = ' + (2 * x + 0.5) + 'bb. Need ' + (x - 1) + ' / ' + (2 * x + 0.5) + ' = <b>' + need.toFixed(1) + '%</b>.');
  }
  function qDecide() {
    for (let i = 0; i < 100; i++) {
      const o = pick([4, 8, 9, 12]), pot = pick([40, 80, 120]), bet = pot * pick([0.25, 0.5, 0.75, 1]);
      const eq = exactTurn(o), need = bet / (pot + 2 * bet);
      if (Math.abs(eq - need) < 0.04) continue;
      const call = eq > need;
      return ch('Turn. You are drawing with <b>' + o + ' outs</b> and one card to come (46 unseen cards). The pot is $' + pot + ' and your opponent bets $' + bet + '. Ignoring implied odds, what is the right play?', call ? 'Call' : 'Fold', [call ? 'Fold' : 'Call'], 'Your chance to hit is ' + o + '/46 = <b>' + pc(eq) + '</b>. You need ' + bet + ' / ' + (pot + 2 * bet) + ' = <b>' + pc(need) + '</b>. ' + (call ? 'You have the price to call.' : 'You are not getting the right price.'));
    }
    return qPotOdds();
  }
  function qMinRaise() {
    const b = pick([2, 4, 10, 20]), r = b * pick([3, 4, 5]);
    return num('The big blind is $' + b + '. A player raises to $' + r + '. What is the <b>minimum</b> total you can re-raise to?', 2 * r - b, 0, '$', 'The previous raise was $' + (r - b) + ' (from $' + b + ' to $' + r + '). A re-raise must add at least that: $' + r + ' + $' + (r - b) + ' = <b>$' + (2 * r - b) + '</b>.');
  }
  function qSidePot() {
    const a = pick([50, 60, 80, 100]), bb = a + pick([40, 60, 80, 100]), c = bb + pick([100, 150, 200, 300]);
    return num('Three players go all-in: A with $' + a + ', B with $' + bb + ', and C with $' + c + '. How big is the <b>main pot</b> (the part all three can win)?', a * 3, 0, '$', 'The main pot is capped by the smallest stack: 3 x $' + a + ' = <b>$' + a * 3 + '</b>. The side pot is $' + (bb - a) * 2 + ' (B and C) and C gets $' + (c - bb) + ' back.');
  }

  // ---------- static question banks ----------
  const S = {
    basics: [
      () => ch('How many private cards does each player get in Texas Hold’em?', '2', ['1', '3', '5'], 'Each player gets two hole cards.'),
      () => ch('How many community cards are dealt in total?', '5', ['3', '4', '7'], 'Flop (3) + turn (1) + river (1) = 5.'),
      () => ch('Who posts the big blind?', 'The player two seats left of the dealer button', ['The dealer', 'The player left of the button', 'The winner of the last hand'], 'Small blind is directly left of the button, big blind is next.'),
      () => ch('What is the correct order of the streets?', 'Pre-flop, flop, turn, river', ['Flop, pre-flop, river, turn', 'Pre-flop, turn, flop, river', 'Flop, turn, river, pre-flop'], 'Pre-flop, flop, turn, river.'),
      () => ch('You can check when…', 'Nobody has bet in the current round', ['Someone has raised', 'You are the big blind facing a raise', 'Any time'], 'Checking means passing without betting. It is only possible if there is no bet to match.'),
      () => ch('What is a cash game?', 'Chips are real money and you can join or leave any time', ['A tournament with a fixed prize pool', 'A game where blinds keep rising', 'A game played without blinds'], 'Cash game chips equal real money and blinds stay the same.'),
    ],
    rank: [() => ch('Which hand is stronger?', 'A flush', ['A straight', 'Three of a kind', 'Two pair'], 'Flush beats straight, trips, and two pair.'), () => ch('Which hand is stronger?', 'A full house', ['A flush', 'A straight', 'Three of a kind'], 'A full house beats a flush.'), () => ch('Two players both have a pair of Kings. Who wins?', 'The player with the higher kicker', ['The player with the higher suit', 'The one who bet first', 'It is always a split'], 'The best kicker (side card) decides it.')],
    bet: [
      () => ch('Which position acts <b>last</b> after the flop?', 'The dealer button', ['The big blind', 'The small blind', 'Under the gun'], 'The button acts last after the flop, which is a big information edge.'),
      () => ch('Which seat acts first <b>pre-flop</b> (in a game with 6+ players)?', 'Under the gun (left of the big blind)', ['The button', 'The small blind', 'The big blind'], 'Action starts left of the big blind. The blinds act last pre-flop but first after the flop.'),
      () => ch('A player is all-in for less than the current bet. What happens to the extra chips?', 'They go into a side pot that the short stack cannot win', ['They are returned to everyone', 'The short stack wins them too', 'The hand ends'], 'The all-in player can only win the part of the pot they covered.'),
    ],
    pre: [() => ch('How many distinct starting hands (by rank and suited/offsuit) exist?', '169', ['52', '78', '1,326'], '13 pairs + 78 suited + 78 offsuit = 169.'), () => ch('Which is generally the stronger starting hand?', 'A♠ K♠', ['7♣ 2♦', 'Q♦ 3♥', 'J♠ 4♣'], 'Two high suited cards are among the best non-pair starting hands.'), () => ch('A good default when no one has entered the pot is to…', 'Raise or fold (do not limp)', ['Limp with everything', 'Always call', 'Always check'], 'Raising wins pots preflop and builds value. Limping gives up initiative.')],
    outs: [() => ch('How many outs does an open-ended straight draw have?', '8', ['4', '9', '6'], 'Two ranks x 4 cards = 8.'), () => ch('Using the Rule of 4 on the flop, a flush draw (9 outs) is about…', '36%', ['18%', '9%', '45%'], '9 x 4 = 36%. The exact figure is 35%.')],
    pot: [() => ch('If the pot is $100 and you must call $25, what is the break-even equity?', '20%', ['25%', '33%', '10%'], '25 / (100 + 25) = 20%.'), () => ch('A pot-sized bet gives the caller what break-even equity?', '33%', ['25%', '50%', '20%'], 'Call / (pot + bet + call) = 1/3.')],
    ev: [() => ch('A call with 30% equity is correct if the price asks for less than…', '30%', ['50%', '25%', '70%'], 'If your equity exceeds the price (required equity), the call is +EV.'), () => ch('Implied odds mean…', 'Extra money you expect to win on later streets if you hit', ['The odds of hitting your hand', 'The pot size on the flop', 'The size of your bet'], 'Implied odds count future bets you can win when you hit.'), () => ch('Which hand is usually the best for set mining?', 'Small pocket pair', ['Ace-King', 'Queen-Jack offsuit', 'Seven-Two'], 'You hit a set about 12% of the time and win big when you do.')],
    prep: [() => ch('Compared with a call, a raise preflop mostly…', 'Wins the pot immediately or builds a bigger pot with strong hands', ['Always loses money', 'Has no downside', 'Is only for bluffs'], 'Raising adds fold equity and builds value.')],
    post: [() => ch('Which board is usually <b>drier</b> (fewer draws)?', 'K♠ 7♦ 2♣', ['J♥ T♥ 9♣', '8♠ 7♠ 6♦', 'Q♦ J♦ T♠'], 'Rainbow and disconnected boards offer few draws.'), () => ch('A very low SPR (under 3) means…', 'Top pair or better is usually happy to commit', ['You should fold everything', 'Draws are always profitable', 'You should avoid betting'], 'Little room to manoeuvre: strong made hands go all-in.')],
    read: [
      () => ch('A player has VPIP 55% and PFR 8%. They are best described as…', 'Loose-passive (a calling station)', ['Tight-aggressive', 'Loose-aggressive', 'A nit'], 'High VPIP with low PFR means they call a lot but rarely raise.'),
      () => ch('Best plan against a calling station?', 'Value bet thinly and do not bluff', ['Bluff a lot', 'Fold when they call', 'Never bet'], 'They call too much, so bluffs fail and value bets print money.'),
      () => ch('Best plan against a maniac who bets everything?', 'Tighten up and let them bluff into your strong hands', ['Bluff them constantly', 'Fold everything', 'Match their aggression with trash'], 'Wait for strong hands and call down.'),
      () => ch('A scared-money player suddenly makes a huge raise. They most likely have…', 'A very strong hand', ['A bluff', 'Nothing', 'A draw'], 'Timid players rarely bluff big.'),
      () => ch('Where should you sit relative to a loose-aggressive player?', 'To their left, so they act before you', ['To their right', 'It does not matter', 'Directly across, always'], 'Acting after the aggressor gives you information and position.'),
      () => ch('A player has just lost a huge pot and is shaking their head. This is…', 'A tilt warning. Expect looser, more aggressive play', ['A sign they will tighten up', 'Irrelevant', 'A sure bluff'], 'Tilted players make bigger mistakes.'),
    ],
  };
  const draw = (arr, n) => PT.shuffle(arr.slice()).slice(0, n).map((f) => f());
  const mix = (makers, n) => { const out = []; for (let i = 0; i < n; i++) out.push(makers[i % makers.length]()); return PT.shuffle(out); };

  // ---------- lessons ----------
  const tbl = (head, rows) => '<table class="tbl"><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>';
  const note = (t) => '<div class="note">' + t + '</div>';

  function rangeGrid() {
    const L = 'AKQJT98765432';
    const build = (top) => {
      let h = '<table class="rg">';
      for (let i = 0; i < 13; i++) {
        h += '<tr>';
        for (let j = 0; j < 13; j++) {
          const a = 12 - i, b = 12 - j, hiR = Math.max(a, b), loR = Math.min(a, b), suited = i < j;
          let c1, c2;
          if (a === b) { c1 = a * 4; c2 = a * 4 + 1; } else if (suited) { c1 = hiR * 4; c2 = loR * 4; } else { c1 = hiR * 4; c2 = loR * 4 + 1; }
          const t = 1 - PT.preflopPct(c1, c2);
          const lab = i === j ? L[i] + L[j] : i < j ? L[i] + L[j] + 's' : L[j] + L[i] + 'o';
          h += '<td class="' + (t <= top ? 'in' : '') + '" title="Top ' + (t * 100).toFixed(0) + '%">' + lab + '</td>';
        }
        h += '</tr>';
      }
      return h + '</table>';
    };
    return {
      html: '<p>Drag the slider to see which hands make up the top X% of starting hands (ranked by the Chen formula). Pairs run down the diagonal, suited hands are above it, offsuit hands below.</p><div class="slide"><input type="range" id="rg-s" min="3" max="60" value="15"> <b id="rg-v">Top 15%</b></div><div id="rg-g">' + build(0.15) + '</div>',
      init() {
        $('#rg-s').oninput = (e) => { $('#rg-v').textContent = 'Top ' + e.target.value + '%'; $('#rg-g').innerHTML = build(Number(e.target.value) / 100); };
      },
    };
  }

  const chenEx = ['As Ah', 'As Ks', 'Td 9d', 'Kc Qd', '7c 2d'].map((s) => { const [a, b] = s.split(' ').map(PT.card); return [cardsHTML([a, b]), PT.chen(a, b), pc(1 - PT.preflopPct(a, b), 0)]; });
  const outsRows = [4, 6, 8, 9, 12, 15].map((o) => [o, pc(exactTurn(o)), pc(exactFlop(o)), o * 2 + '%', o * 4 + '%']);
  const oddsRows = [['1/4 pot', 0.25], ['1/3 pot', 1 / 3], ['1/2 pot', 0.5], ['2/3 pot', 2 / 3], ['3/4 pot', 0.75], ['Pot', 1], ['2x pot', 2]].map((r) => [r[0], pc(r[1] / (1 + 2 * r[1]))]);
  const persRows = PT.PERS.map((p) => [p.name, p.tag, p.tip]);

  PT.STAGES = [
    {
      title: 'Welcome to the table', blurb: 'Cards, blinds, the four streets and your basic actions.',
      pages: [
        '<h3>The goal</h3><p>In Texas Hold’em every player receives <b>two private cards</b> (hole cards). Five <b>community cards</b> are dealt face up in the middle. Your hand is the best five cards you can make from those seven.</p><p>The player with the best hand at <b>showdown</b> wins the pot, or you win it earlier if everyone else folds.</p>' + note('Winning is not about the best hand every time. It is about making more money when you are ahead and losing less when you are behind. That is what this trainer teaches.'),
        '<h3>How a hand flows</h3><ol><li><b>Blinds.</b> Two forced bets (small blind and big blind) start the pot.</li><li><b>Pre-flop.</b> Everyone gets two cards, then a betting round.</li><li><b>Flop.</b> Three community cards, betting round.</li><li><b>Turn.</b> A fourth card, betting round.</li><li><b>River.</b> A fifth card, final betting round.</li><li><b>Showdown.</b> Remaining players show cards and the best hand wins.</li></ol><p>The <b>dealer button</b> moves one seat clockwise every hand, so everyone pays blinds equally over time.</p>',
        '<h3>Your actions</h3>' + tbl(['Action', 'Meaning'], [['Fold', 'Give up your hand and your chips in the pot.'], ['Check', 'Pass, if nobody has bet yet this round.'], ['Call', 'Match the current bet.'], ['Bet / Raise', 'Put in more chips. Others must call, raise, or fold.'], ['All-in', 'Bet every chip you have.']]) + '<p>All poker math in this game is counted in <b>big blinds (bb)</b>. A $2 big blind means a $20 bet is 10bb. Always think in bb, not dollars.</p>',
      ],
      quiz: () => draw(S.basics, 5),
    },
    {
      title: 'Hand rankings & odds', blurb: 'From high card to royal flush, and how often each happens.',
      pages: [
        '<h3>The ten hand ranks (best to worst)</h3>' + tbl(['Hand', 'Example'], [['Royal / Straight flush', cardsHTML(['As', 'Ks', 'Qs', 'Js', 'Ts']) + ' / ' + cardsHTML(['9h', '8h', '7h', '6h', '5h'])], ['Four of a kind', cardsHTML(['Kc', 'Kd', 'Kh', 'Ks', '4d'])], ['Full house', cardsHTML(['Qh', 'Qd', 'Qs', '7c', '7d'])], ['Flush', cardsHTML(['Ad', 'Jd', '8d', '5d', '3d'])], ['Straight', cardsHTML(['9c', '8d', '7h', '6s', '5c'])], ['Three of a kind', cardsHTML(['7h', '7d', '7s', 'Kc', '2d'])], ['Two pair', cardsHTML(['Js', 'Jc', '4h', '4d', 'As'])], ['Pair', cardsHTML(['Th', 'Td', 'Ac', '8s', '3d'])], ['High card', cardsHTML(['Ah', 'Jd', '8c', '5s', '2d'])]]) + '<p class="muted">The ace plays high (A-K-Q-J-10) or low (A-2-3-4-5, “the wheel”).</p>',
        '<h3>Kickers, ties, and “the board plays”</h3><p>When two players have the same hand type, the <b>highest cards</b> decide. With a pair of Kings each, the better side card (the <b>kicker</b>) wins: K-K-A-9-4 beats K-K-Q-J-10.</p><p>If the five best cards are all on the board, everyone “plays the board” and the pot is <b>split</b>.</p>' + note('You always use the best five of seven cards. You may use both, one, or none of your hole cards.'),
        '<h3>How often you make each hand (7 cards)</h3>' + tbl(['Final hand', 'Chance', 'About'], [['Royal flush', '0.003%', '1 in 31,000'], ['Straight flush', '0.028%', '1 in 3,600'], ['Four of a kind', '0.17%', '1 in 595'], ['Full house', '2.60%', '1 in 38'], ['Flush', '3.03%', '1 in 33'], ['Straight', '4.62%', '1 in 22'], ['Three of a kind', '4.83%', '1 in 21'], ['Two pair', '23.5%', '1 in 4'], ['Pair', '43.8%', '1 in 2.3'], ['High card', '17.4%', '1 in 6']]) + '<p>Roughly <b>two thirds</b> of finished hands are just a pair or two pair. Do not expect monsters and do not overvalue one pair against heavy betting.</p>',
      ],
      quiz: () => mix([qHandName, qHandName, qWhoWins, qWhoWins], 4).concat(draw(S.rank, 1)),
    },
    {
      title: 'Betting, raises & pots', blurb: 'No-limit rules, min-raises, side pots, and position.',
      pages: [
        '<h3>No-limit betting</h3><p>You may bet <b>any amount</b> from the minimum (one big blind) up to all your chips. A raise must be at least as large as the previous bet or raise in that round.</p>' + note('Example: the blinds are $1/$2 and someone opens to $6. That raise was $4 (from $2 to $6), so the minimum re-raise is to <b>$10</b> ($6 + $4).') + '<p>Bets are described as a fraction of the pot: <b>1/3 pot</b> is a small probe, <b>2/3 pot</b> is a standard value or protection bet, and a <b>pot-size</b> bet puts in the amount already in the middle.</p>',
        '<h3>All-ins and side pots</h3><p>A player who is all-in can only win as much from each opponent as they put in. Extra chips go into a <b>side pot</b>.</p>' + note('A has $50, B has $120, C has $300. All three go all-in.<br><b>Main pot</b> = 3 x $50 = $150 (A, B, C can win).<br><b>Side pot</b> = 2 x ($120 - $50) = $140 (B and C only).<br>C’s extra $180 is simply returned.') + '<p>This game builds the side pots automatically and tells you who won each.</p>',
        '<h3>Position</h3><p>Seats are named relative to the dealer button:</p>' + tbl(['Seat', 'Role'], [['BTN (button)', 'Acts last after the flop. The best seat.'], ['SB / BB', 'The blinds. They post forced bets and act first after the flop.'], ['UTG', 'Under the gun, first to act pre-flop. The worst seat.'], ['HJ / CO', 'Hijack and cutoff, two and one seats before the button.']]) + '<p><b>Position is information.</b> Acting later lets you see what everyone does first, so you can play more hands and lose less. Turn on training aids to see your position at the table.</p>',
      ],
      quiz: () => [qMinRaise(), qSidePot(), qMinRaise(), ...draw(S.bet, 2)].slice(0, 5),
    },
    {
      title: 'Starting hands & position', blurb: 'Which hands to play, and how position changes it. Includes the Chen formula.',
      pages: [
        '<h3>169 starting hands</h3><p>Hands are grouped by ranks and suited/offsuit: 13 pairs, 78 suited hands, and 78 offsuit hands = <b>169</b> types, or <b>1,326</b> combinations.</p>' + tbl(['Event', 'Chance'], [['Dealt a pocket pair', '5.9% (1 in 17)'], ['Dealt suited cards', '23.5% (about 1 in 4)'], ['Dealt AA (or any specific pair)', '0.45% (1 in 221)'], ['Dealt AK (any)', '1.2% (1 in 83)']]) + '<p>Strong hands are rare. That is why you must fold most hands.</p>',
        rangeGrid(),
        '<h3>The Chen formula (a fast hand score)</h3><p>1. Score the highest card: A = 10, K = 8, Q = 7, J = 6, otherwise half its number (10 = 5, 9 = 4.5...).<br>2. <b>Pair?</b> Double it (minimum 5).<br>3. <b>Suited?</b> Add 2.<br>4. Subtract for gaps: 0 gap = 0, 1 gap = -1, 2 gaps = -2, 3 gaps = -4, 4+ = -5.<br>5. Add 1 for connected or one-gap hands if both are below Q.<br>6. Round up.</p>' + tbl(['Hand', 'Chen score', 'Rank'], chenEx.map((r) => [r[0], r[1], 'Top ' + r[2]])),
        '<h3>Opening ranges by position</h3><p>If nobody has entered the pot, you can <b>raise first in</b> with the top slice of hands for your seat:</p>' + tbl(['Position', 'Open with about'], [['UTG', 'Top 15%'], ['Hijack', 'Top 21%'], ['Cutoff', 'Top 28%'], ['Button', 'Top 42%'], ['Small blind', 'Top 38% (raise or fold)']]) + note('Rule of thumb: <b>raise or fold</b>. Limping (just calling the big blind) rarely wins and builds a small pot you will be out of position in.'),
      ],
      quiz: () => [qPreflop(), qPreflop(), qPreflop(), ...draw(S.pre, 2)],
    },
    {
      title: 'Counting outs & the Rule of 2 and 4', blurb: 'How to count the cards that improve your hand and turn them into percentages.',
      pages: [
        '<h3>What is an out?</h3><p>An <b>out</b> is an unseen card that improves you to a hand that is likely best. Count what you cannot see: after the flop, <b>47 cards</b> are unseen (52 minus your 2 and the 3 on the board).</p>' + tbl(['Draw', 'Outs'], [['Flush draw (4 to a flush)', '9'], ['Open-ended straight draw', '8'], ['Gutshot (inside straight draw)', '4'], ['Two overcards', '6'], ['Pocket pair to a set', '2'], ['Flush draw + open-ended (big draw)', '15'], ['One pair to two pair or trips (e.g. top pair)', '5']]),
        '<h3>Turning outs into equity</h3><p><b>One card to come (turn):</b> outs / 46.<br><b>Two cards to come (flop):</b> 1 - (47-o)/47 x (46-o)/46.</p><p><b>Rule of 2 and 4:</b> multiply outs by <b>2</b> if one card is left, by <b>4</b> if two cards are left.</p>' + tbl(['Outs', 'Exact next card', 'Exact by river (from flop)', 'Rule of 2', 'Rule of 4'], outsRows) + '<p class="muted">The Rule of 4 slightly overestimates for large numbers of outs (above ~12).</p>',
        '<h3>Tainted outs</h3><p>Not all outs are clean:</p><ul><li>A flush card that also <b>pairs the board</b> may give someone a full house.</li><li>Your straight out might also complete a <b>higher straight</b> or flush for the opponent.</li><li>Overcard outs may already be <b>dominated</b> if the opponent holds a better kicker.</li></ul><p>When in doubt, discount your outs by one or two. Training aids show your raw outs. Your job is to adjust them.</p>',
      ],
      quiz: () => [qOuts(), qOuts(), qOuts(), qRule(), qRule()],
    },
    {
      title: 'Pot odds & equity', blurb: 'The price of a call versus your chance to win.',
      pages: [
        '<h3>Pot odds</h3><p><b>Pot odds</b> are the price of a call compared with the pot you can win. To find the equity you need:</p><p class="formula">Required equity = Call / (Pot after the bet + Call)</p>' + note('Pot $100. Your opponent bets $50. The pot is $150. You pay $50 to win $200, so you need $50 / $200 = <b>25%</b> equity.') + tbl(['Opponent bets', 'Equity you need'], oddsRows),
        '<h3>Compare equity to price</h3><p>If your equity is <b>greater</b> than the required equity, a call is profitable in the long run. If it is less, folding is better (unless you expect to win more later: implied odds).</p>' + note('Flop: pot $100, villain bets $50. You hold a flush draw (9 outs). Your equity is about 35% with two cards to come, but you need only 25% to call. <b>Call.</b>') + '<p><b>Careful:</b> if the opponent can bet again on the turn, you may not see both cards cheaply. When facing all-in, use two-card equity. Otherwise use one card at a time to be safe.</p>',
        '<h3>Equity against ranges</h3><p>Your opponent does not hold a random hand. Treat their hand as a <b>range</b>. Some classic matchups to remember:</p>' + tbl(['Matchup', 'Approximate equity'], [['AA vs KK', '82% / 18%'], ['Pair vs two lower overcards (QQ vs AKo)', '57% / 43%'], ['Pair vs two overcards (77 vs AKo)', '55% / 45% (a coin flip)'], ['AKs vs QQ', '46% / 54%'], ['Dominated hand (AK vs AQ)', '74% / 26%'], ['Your hand vs a random hand: AA', '85%'], ['Your hand vs a random hand: 72o', '35%']]) + '<p>Training aids show equity <b>vs random</b> and <b>vs a strong range</b>. Trust the strong range number when facing big aggression.</p>',
      ],
      quiz: () => [qPotOdds(), qPotOdds(), qDecide(), qDecide(), ...draw(S.pot, 1)].slice(0, 5),
    },
    {
      title: 'Expected value & implied odds', blurb: 'Make decisions by the math of the long run.',
      pages: [
        '<h3>Expected value (EV)</h3><p>EV is the average result of a decision if you could repeat it forever.</p><p class="formula">EV(call) = Equity x (Pot you win) - (1 - Equity) x (Cost of the call)</p>' + note('Pot $100, villain bets $50, you have 30% equity. EV = 0.30 x $150 - 0.70 x $50 = <b>' + (evCall(100, 50, 0.3) >= 0 ? '+' : '') + '$' + evCall(100, 50, 0.3).toFixed(0) + '</b>. A profitable call, even though you lose 70% of the time.') + '<p>Good decisions can lose and bad decisions can win. Judge yourself on EV, not on the last result.</p>',
        '<h3>Implied and reverse implied odds</h3><p><b>Implied odds:</b> if you hit, you may win <b>more</b> than what is in the pot. A disguised hand against a loose opponent has strong implied odds.</p><p><b>Set mining:</b> a pocket pair hits a set on the flop about <b>11.8%</b> (1 in 8.5). So to break even, you need to win about <b>8.5x</b> your call when you hit. The pot already holds ~3.5x, so you need to win roughly 5x more on later streets: you want effective stacks of <b>15x the call or more</b>.</p><p><b>Reverse implied odds:</b> hands that win a little and lose a lot, such as dominated hands (A-5 against A-K) or the low end of a flush. Discount those hands.</p>',
        '<h3>The EV of a bluff</h3><p>When you bet, you win in two ways: they fold, or you win when called.</p><p class="formula">EV(bet) = Fold% x Pot + (1 - Fold%) x [Equity x (Pot + Bet) - (1 - Equity) x Bet]</p>' + note('Pot $100, you bet $75, they fold 40% of the time, and you have 30% equity when called: EV = ' + evBet(100, 75, 0.4, 0.3).toFixed(0) + ' dollars. With a flush draw (35% equity) this rises to ' + evBet(100, 75, 0.4, 0.35).toFixed(1) + ' dollars. This is why <b>semi-bluffs</b> are powerful.') + '<p><b>Pure bluff break-even:</b> Bet / (Pot + Bet). A half-pot bluff needs 33% folds. A pot-size bluff needs 50%.</p>',
      ],
      quiz: () => [qEV(), qEV(), qBluff(), qBluff(), ...draw(S.ev, 1)].slice(0, 5),
    },
    {
      title: 'Pre-flop strategy', blurb: 'Open sizes, defending, 3-betting, and short stacks.',
      pages: [
        '<h3>Raising first in</h3><p>Open-raise to <b>2.5 to 3bb</b> from most seats, plus <b>1bb per limper</b>. Raising has two benefits: you can win the blinds immediately (fold equity) and you take the initiative for the flop.</p><p>Do not open the same range from every seat. Position decides how wide you can go (see Stage 4).</p>',
        '<h3>Facing a raise: fold, call, or 3-bet</h3><ul><li><b>3-bet (re-raise)</b> with strong value hands (QQ+, AK) and sometimes with suited aces as a bluff.</li><li><b>Call</b> with good, playable hands, especially in position.</li><li><b>Fold</b> everything else. Most hands fold to a raise.</li></ul><p>A 3-bet is usually about <b>3x the raise</b> in position and 4x out of position.</p>',
        '<h3>Defending the big blind</h3><p>You already posted 1bb, so you get a discount. Button opens to 3bb, SB folds. You call 2bb into a pot of 4.5bb, giving a final pot of 6.5bb:</p><p class="formula">Required equity = 2 / 6.5 = 30.8%</p><p>Many suited, connected, or ace-x hands have that much equity against a wide button range. But you will be out of position, so defend a little tighter against early-position raises.</p>',
        '<h3>Stacks, limpers and private-game quirks</h3><ul><li><b>Short stack (under ~15bb):</b> play push-or-fold. Call an all-in only if your equity beats the price from pot odds.</li><li><b>Limpers:</b> raise to 3bb + 1bb per limper with good hands (isolate the weak player).</li><li><b>Straddles</b> (an extra blind) make the pot bigger: widen your ranges slightly when a straddle is posted.</li><li>Most private games are <b>loose preflop</b>, so tighten up from early position and make your value hands count.</li></ul>',
      ],
      quiz: () => [qPreflop(), qPreflop(), qBBDefend(), qBBDefend(), ...draw(S.prep, 1)].slice(0, 5),
    },
    {
      title: 'Post-flop play', blurb: 'Board texture, c-bets, SPR, sizing, and defending.',
      pages: [
        '<h3>Think in hand categories</h3><ul><li><b>Value hands:</b> top pair good kicker or better. Bet for value and build the pot.</li><li><b>Marginal hands:</b> middle pair, weak top pair. Check to control the pot, call small bets.</li><li><b>Draws:</b> flush and straight draws. Profitable to bet (semi-bluff) or call with the right price.</li><li><b>Air:</b> nothing. Give up unless you have a good bluff.</li></ul>',
        '<h3>Board texture</h3>' + tbl(['Texture', 'Example', 'Bet size'], [['Dry (few draws)', cardsHTML(['Ks', '7d', '2c']), 'Small (1/3 pot) and frequent'], ['Wet (many draws)', cardsHTML(['Jh', 'Th', '9c']), 'Bigger (2/3 pot+) to charge draws'], ['Paired', cardsHTML(['8s', '8d', '3h']), 'Small. Few strong hands exist'], ['Monotone', cardsHTML(['Ah', '9h', '4h']), 'Careful: flushes and flush draws']]) + '<p>A <b>continuation bet</b> (c-bet) is a flop bet by the pre-flop raiser. It works best on dry boards and heads-up pots.</p>',
        '<h3>Stack-to-pot ratio (SPR)</h3><p class="formula">SPR = Effective stack / Pot on the flop</p>' + tbl(['SPR', 'What it means'], [['Under 3', 'Top pair or better is usually happy to get all-in.'], ['3 to 6', 'Overpairs, two pair, and strong top pair commit.'], ['6 to 13', 'You need two pair or better. Draws gain implied odds.'], ['Over 13', 'Only the nuts get stacks in. Play small pots with marginal hands.']]) + '<p>A single-raised pot with 100bb stacks has an SPR around 15. A 3-bet pot has an SPR around 4.</p>',
        '<h3>Bluff ratios and minimum defence</h3><p>If you bet fraction <b>f</b> of the pot, the opponent needs equity f/(1+2f) to call. To keep them indifferent, about that fraction of your betting range should be bluffs.</p>' + tbl(['Bet size', 'Bluffs in range', 'MDF (how often they must call)'], [['1/2 pot', '25%', '67%'], ['3/4 pot', '30%', '57%'], ['Pot', '33%', '50%']]) + '<p><b>MDF = Pot / (Pot + Bet).</b> Against players who bluff too little (most private games), you can fold more. Against maniacs, you must call more.</p>',
      ],
      quiz: () => [qSPR(), qSPR(), qBluff(), qMDF(), ...draw(S.post, 1)].slice(0, 5),
    },
    {
      title: 'Combinatorics & hand reading', blurb: 'Count hand combinations and narrow ranges street by street.',
      pages: [
        '<h3>Counting combos</h3>' + tbl(['Type', 'Combos', 'Example'], [['Pocket pair', '6', 'QQ'], ['Suited non-pair', '4', 'AKs'], ['Offsuit non-pair', '12', 'AKo'], ['Any two specific ranks', '16', 'AK']]) + '<p>Total: 13 x 6 + 78 x 4 + 78 x 12 = <b>1,326</b> hands.</p><h3>Blockers</h3><p>The cards you hold remove combos. If you hold an ace, your opponent has <b>fewer aces</b>: AA drops from 6 to 3 combos, AK from 16 to 12.</p>',
        '<h3>Narrowing a range</h3><p>1. Start with what the player’s <b>position and action</b> imply (UTG raise = top ~15%, about 200 combos).<br>2. After each bet, check, or call, remove hands that would not play that way.<br>3. Weigh the player’s <b>type</b>: a nit’s raise is value-heavy, a maniac’s is not.</p>' + note('Example: a tight player 3-bets then bets the flop. A likely range: QQ+, AK = 6+6+6 (QQ, KK, AA) + 16 = <b>34 combos</b>. If you hold J♠J♥, you are an underdog to that range, so JJ is rarely a good hand to stack off.'),
        '<h3>Use stats and notes</h3><p>Hover over opponents at the table to see their stats:</p><ul><li><b>VPIP:</b> hands played voluntarily (tight ~15%, loose 40%+).</li><li><b>PFR:</b> hands raised pre-flop. A big VPIP-PFR gap = passive caller.</li><li><b>AF (aggression factor):</b> bets+raises divided by calls. High means aggressive.</li></ul><p>Stats take ~30 hands to mean anything. Early on, rely on behaviour.</p>',
      ],
      quiz: () => [qCombos(), qCombos(), qCombos(), qCombos(), qPreflop()],
    },
    {
      title: 'Reading players & private games', blurb: 'Archetypes, the 25 profiles, bankroll, variance, and etiquette.',
      pages: [
        '<h3>The four basic archetypes</h3>' + tbl(['', 'Passive', 'Aggressive'], [['<b>Tight</b>', 'Rock / Nit: only plays strong hands', 'TAG: solid, selective, aggressive'], ['<b>Loose</b>', 'Calling station: calls everything', 'Maniac / LAG: raises everything']]) + '<ul><li>VPIP under 12%: nit. 18-25%: solid. 40%+: loose.</li><li>Large VPIP-PFR gap: calling station.</li></ul>',
        '<h3>How to exploit them</h3><ul><li><b>Calling stations:</b> never bluff, value bet thin and big.</li><li><b>Maniacs:</b> tighten up, let them bluff, call down with medium hands.</li><li><b>Nits:</b> steal their blinds, fold when they wake up.</li><li><b>Scared money:</b> bluff them with big bets. Their big bets mean strength.</li><li><b>Tilters:</b> keep value betting. Their mistakes get bigger.</li></ul><p>Sit to the <b>left</b> of aggressive players so they act first.</p>',
        '<h3>The 25 profiles in this game</h3>' + tbl(['Player', 'Style', 'How to beat them'], persRows),
        '<h3>Bankroll, variance and tilt</h3><p>Even great players lose often. A typical no-limit player has a standard deviation of about <b>90bb per 100 hands</b>. Over 1,000 hands, the swing is ±(90 x √10) ≈ ±285bb, and a 95% range is about ±570bb. A winning rate of 5bb/100 earns only +50bb in that sample. Short-term results are noise.</p><ul><li>Keep <b>30+ buy-ins</b> for the stakes you play.</li><li>Set a stop-loss and walk away when tilted.</li><li>Pick tables with weak players.</li></ul><p><b>Private game etiquette:</b> act in turn, never show cards while a hand is live, keep chips visible, avoid talking about live hands, and settle debts promptly.</p>',
      ],
      quiz: () => draw(S.read, 5),
    },
    {
      title: 'Final exam & practice', blurb: 'A cheat sheet, then a 10-question exam covering everything.',
      pages: [
        '<h3>The cheat sheet</h3><ol><li><b>Fold most hands</b> from early position. Raise or fold, never limp.</li><li><b>Position is power.</b> Play more hands on the button.</li><li><b>Count outs</b>, use the Rule of 2 and 4, and discount tainted outs.</li><li><b>Required equity</b> = Call / (Pot + Call).</li><li><b>EV</b> = Equity x Win - (1 - Equity) x Cost.</li><li><b>Bluffs</b> need Bet / (Pot + Bet) folds.</li><li>Check <b>SPR</b> before committing your stack.</li><li>Use <b>combos and blockers</b> to narrow ranges.</li><li><b>Adjust to the player</b> in front of you.</li><li>Protect your <b>bankroll</b> and your temper.</li></ol>',
        '<h3>Ready for the table</h3><p>After you pass the exam, open the <b>Coach Table</b> from the Training menu. It runs a live game with every aid on: your hand, equity, outs, pot odds, a recommended action, and a review of every decision you make.</p>' + note('Tip: play 100+ hands at the Coach Table, then switch training aids off in Settings and see if you can make the same decisions yourself.'),
      ],
      total: 10, pass: 8,
      quiz: () => [qHandName(), qWhoWins(), qPotOdds(), qOuts(), qRule(), qEV(), qBluff(), qSPR(), qPreflop(), qCombos()],
    },
  ];
  PT.STAGES.forEach((s, i) => { s.pass = s.pass || 4; s.total = s.total || 5; s.reward = 40 * (i + 1); });

  // ---------- UI ----------
  const UI = PT.UI;
  UI.trainingHub = (from) => {
    const p = prog();
    const cards = PT.STAGES.map((s, i) => {
      const done = p.done[i], open = i === 0 || p.done[i - 1] || p.all || done;
      return '<div class="stage' + (done ? ' done' : '') + (open ? '' : ' locked') + '"><span class="sn">' + (i + 1) + '</span><div><b>' + s.title + '</b><p>' + s.blurb + '</p></div>' +
        (open ? '<button data-st="' + i + '"' + (done ? '' : ' class="go"') + '>' + (done ? 'REVIEW' : 'START') + '</button>' : '<span class="lock">Pass stage ' + i + '</span>') + '</div>';
    }).join('');
    const nd = PT.STAGES.filter((s, i) => p.done[i]).length;
    UI.screen('<div class="hub"><div class="hubtop"><h2>Training</h2><div class="muted">From total beginner to table-ready in 12 stages. Each stage ends with a short quiz (80% to pass) and pays a bankroll bonus in career mode.</div><div class="stat"><span>PROGRESS</span><b>' + nd + ' / ' + PT.STAGES.length + '</b></div></div>' +
      '<div class="hubnav"><button id="t-coach" class="go">COACH TABLE (live practice)</button><button id="t-drill">SPOT DRILLS' + (PT.Mistakes.count() ? ' (' + PT.Mistakes.count() + ')' : '') + '</button><button id="t-all">UNLOCK ALL STAGES</button><button id="t-back">BACK</button></div><div class="stages">' + cards + '</div></div>');
    UI.on('#t-back', () => (from === 'career' ? UI.hub() : UI.menu()));
    UI.on('#t-all', () => { p.all = true; saveProg(p); UI.trainingHub(from); });
    UI.on('#t-coach', () => UI.coachTable(from));
    UI.on('#t-drill', () => UI.drillMenu(() => UI.trainingHub(from)));
    UI.onAll('[data-st]', (b) => UI.lesson(Number(b.dataset.st), 0, from));
  };

  UI.coachTable = (from) => {
    const d = PT.Career.exists() ? PT.Career.load() : null;
    const c = PT.CASINOS[0];
    UI.playTable({
      mode: 'coach', level: 2, heroStack: 200, back: () => UI.trainingHub(from), title: 'Coach Table',
      cfg: { sb: 1, bb: 2, seats: 6, minBuy: 80, maxBuy: 400, level: 2 }, themeIdx: 0,
      char: d ? d.char : PT.defaultChar, equipped: d ? d.equipped : {}, name: d ? d.name : 'You',
    });
  };

  UI.lesson = (si, pi, from) => {
    const st = PT.STAGES[si], pg = st.pages[pi], last = pi === st.pages.length - 1;
    const html = typeof pg === 'string' ? pg : pg.html;
    UI.screen('<div class="panel lesson"><div class="lhead"><span>Stage ' + (si + 1) + ': ' + st.title + '</span><span>Page ' + (pi + 1) + ' / ' + st.pages.length + '</span></div><div class="lbody">' + html + '</div><div class="row"><button id="l-exit">EXIT</button>' + (pi > 0 ? '<button id="l-prev">BACK</button>' : '') + '<button id="l-next" class="go">' + (last ? 'TAKE THE QUIZ' : 'NEXT') + '</button></div></div>');
    if (typeof pg !== 'string' && pg.init) pg.init();
    UI.on('#l-exit', () => UI.trainingHub(from));
    if ($('#l-prev')) UI.on('#l-prev', () => UI.lesson(si, pi - 1, from));
    UI.on('#l-next', () => (last ? UI.quiz(si, from) : UI.lesson(si, pi + 1, from)));
  };

  UI.quiz = (si, from) => {
    const st = PT.STAGES[si], qs = st.quiz();
    let i = 0, score = 0;
    const show = () => {
      const q = qs[i];
      const body = q.type === 'choice'
        ? '<div class="opts">' + q.opts.map((o, k) => '<button data-k="' + k + '">' + o + '</button>').join('') + '</div>'
        : '<div class="numq"><input id="qn" type="number" step="any" placeholder="Your answer"> <span>' + (q.unit || '') + '</span> <button id="qok" class="go">CHECK</button></div>';
      UI.screen('<div class="panel lesson"><div class="lhead"><span>Quiz: ' + st.title + '</span><span>Question ' + (i + 1) + ' / ' + qs.length + ' · Score ' + score + '</span></div><div class="lbody"><div class="qtext">' + q.q + '</div>' + body + '<div id="fb"></div></div></div>');
      const done = (ok, given) => {
        if (ok) score++;
        PT.Audio.sfx(ok ? 'good' : 'bad');
        const ans = q.type === 'choice' ? q.opts[q.ans] : q.ans + (q.unit || '');
        $('#fb').innerHTML = '<div class="fb ' + (ok ? 'good' : 'bad') + '"><b>' + (ok ? 'Correct!' : 'Not quite.') + '</b> ' + (ok ? '' : 'The answer is <b>' + ans + '</b>. ') + q.why + '</div><div class="row"><button id="qn-next" class="go">' + (i === qs.length - 1 ? 'SEE RESULTS' : 'NEXT QUESTION') + '</button></div>';
        $$('.opts button,#qok,#qn').forEach((e) => (e.disabled = true));
        $('#qn-next').onclick = () => { i++; if (i >= qs.length) results(); else show(); };
      };
      if (q.type === 'choice') $$('.opts button').forEach((b) => (b.onclick = () => { b.classList.add('pick'); done(Number(b.dataset.k) === q.ans); }));
      else {
        const go = () => { const v = parseFloat($('#qn').value); if (isNaN(v)) return; done(Math.abs(v - q.ans) <= q.tol + 1e-9); };
        $('#qok').onclick = go; $('#qn').onkeydown = (e) => { if (e.key === 'Enter') go(); };
        $('#qn').focus();
      }
    };
    const results = () => {
      const pass = score >= st.pass, p = prog();
      p.best[si] = Math.max(p.best[si] || 0, score);
      const first = pass && !p.done[si];
      if (pass) p.done[si] = true;
      saveProg(p);
      PT.Audio.sfx(pass ? 'win' : 'lose');
      UI.screen('<div class="panel narrow"><h2>' + (pass ? 'Stage cleared!' : 'Not yet') + '</h2><div class="big">' + score + ' / ' + qs.length + '</div><p>' + (pass ? 'You need ' + st.pass + ' to pass.' + (first ? ' Training bonus: <b>' + PT.money(st.reward) + '</b> will be added to your career bankroll.' : '') : 'You need ' + st.pass + ' to pass. Review the lesson and try again, new questions are generated every time.') + '</p><div class="col">' +
        (pass && si < PT.STAGES.length - 1 ? '<button id="r-next" class="go">NEXT STAGE</button>' : '') + (pass && si === PT.STAGES.length - 1 ? '<button id="r-coach" class="go">OPEN THE COACH TABLE</button>' : '') +
        '<button id="r-retry"' + (pass ? '' : ' class="go"') + '>' + (pass ? 'RETAKE QUIZ' : 'RETRY') + '</button><button id="r-less">REVIEW LESSON</button><button id="r-hub">TRAINING MENU</button></div></div>');
      if ($('#r-next')) UI.on('#r-next', () => UI.lesson(si + 1, 0, from));
      if ($('#r-coach')) UI.on('#r-coach', () => UI.coachTable(from));
      UI.on('#r-retry', () => UI.quiz(si, from));
      UI.on('#r-less', () => UI.lesson(si, 0, from));
      UI.on('#r-hub', () => UI.trainingHub(from));
    };
    show();
  };

  // ---------- Spot drills & range reading ----------
  const describeCtx = (c) => {
    const bbn = (x) => (x / c.bb).toFixed(x % c.bb ? 1 : 0) + 'bb';
    let line;
    if (!c.board.length) {
      if (c.raisesPre) line = 'A player has raised. It costs <b>' + PT.money(c.toCall) + '</b> (' + bbn(c.toCall) + ') to call.';
      else if (c.limpers) line = 'A player limped in. ' + (c.toCall ? 'It costs <b>' + PT.money(c.toCall) + '</b> to call.' : 'You can check.');
      else line = c.toCall ? 'It is folded to you. It costs <b>' + PT.money(c.toCall) + '</b> to call the blind.' : 'It is folded to you and you can check.';
    } else line = c.toCall ? 'Your opponent bets <b>' + PT.money(c.toCall) + '</b> into a pot of <b>' + PT.money(c.pot - c.toCall) + '</b>.' : 'It checks to you. The pot is <b>' + PT.money(c.pot) + '</b>.';
    return '<div class="spot"><div class="lab">Position <b>' + c.pos + '</b> · Stack <b>' + Math.round(c.stack / c.bb) + 'bb</b> · Opponents left <b>' + c.nOpp + '</b> · Blinds ' + PT.money(c.bb / 2) + '/' + PT.money(c.bb) + '</div><div class="lab">Your hand</div>' + cardsHTML(c.hole) +
      (c.board.length ? '<div class="lab">Board</div>' + cardsHTML(c.board) : '') + '<p>' + line + '</p></div>';
  };
  const spotItem = (ctx, mistake) => {
    const o = PT.Coach.analyzeCtx(ctx, true);
    const opts = ctx.toCall > 0 ? [['FOLD', 'fold'], ['CALL', 'call'], ['RAISE', 'raise']] : [['CHECK', 'check'], ['BET / RAISE', 'raise']];
    return {
      html: (mistake ? '<div class="note">This is a spot you got wrong in a real hand.' + (mistake.my ? ' You chose <b>' + mistake.my.toUpperCase() + '</b>.' : '') + '</div>' : '') + describeCtx(ctx) + '<p><b>What would you do?</b></p>',
      opts: opts.map((x) => x[0]),
      check: (i) => {
        const r = PT.Coach.review(o, { a: opts[i][1] });
        return { ok: r.ok, html: (r.ok ? '<b>Correct.</b> ' : '<b>Not quite.</b> ') + o.advice.text + '<div class="aidbox">' + PT.Coach.html(o) + '</div>', master: r.ok && mistake ? mistake.id : null };
      },
    };
  };
  const rangeItem = () => {
    const q = PT.Spots.rangeQ();
    if (!q) return null;
    return { html: q.q, opts: q.opts, check: (i) => ({ ok: i === q.ans, html: (i === q.ans ? '<b>Correct.</b> ' : '<b>Not quite.</b> The answer is <b>' + q.opts[q.ans] + '</b>. ') + q.why }) };
  };

  UI.drillMenu = (back) => {
    const mc = PT.Mistakes.count();
    UI.screen('<div class="panel narrow"><h2>Spot drills</h2><p>Quick "what would you do?" questions. Practise your own mistakes, random coach-checked spots, or reading opponents’ ranges.</p><div class="col"><button id="d-mist" class="go"' + (mc ? '' : ' disabled') + '>MY MISTAKES (' + mc + ')</button><button id="d-rand">RANDOM SPOTS</button><button id="d-range">RANGE READING</button><button id="d-back">BACK</button></div>' + (mc ? '' : '<p class="muted">No saved mistakes yet. Play some hands and the coach will collect them here.</p>') + '</div>');
    UI.on('#d-mist', () => UI.drills('mistakes', () => UI.drillMenu(back)));
    UI.on('#d-rand', () => UI.drills('spots', () => UI.drillMenu(back)));
    UI.on('#d-range', () => UI.drills('range', () => UI.drillMenu(back)));
    UI.on('#d-back', back);
  };

  UI.drills = (mode, back, list) => {
    UI.screen('<div class="panel narrow"><h2>Preparing drills...</h2></div>');
    setTimeout(() => {
      const items = [];
      if (mode === 'mistakes') {
        const src = (list && list.length ? list : PT.Mistakes.list()), seen = new Set();
        src.filter((m) => !seen.has(m.id) && seen.add(m.id)).slice(0, 10).forEach((m) => items.push(spotItem(m.ctx, m)));
      } else if (mode === 'spots') for (let i = 0; i < 10; i++) items.push(spotItem(PT.Spots.random().ctx));
      else for (let i = 0; i < 8; i++) { const r = rangeItem(); if (r) items.push(r); }
      if (!items.length) { UI.drillMenu(back); return; }
      let i = 0, score = 0, mastered = 0;
      const title = { mistakes: 'Your mistakes', spots: 'Random spots', range: 'Range reading' }[mode];
      const show = () => {
        const it = items[i];
        UI.screen('<div class="panel lesson"><div class="lhead"><span>' + title + '</span><span>Question ' + (i + 1) + ' / ' + items.length + ' · Score ' + score + '</span></div><div class="lbody"><div class="qtext">' + it.html + '</div><div class="opts">' + it.opts.map((o, k) => '<button data-k="' + k + '">' + o + '</button>').join('') + '</div><div id="fb"></div></div></div>');
        UI.onAll('.opts button', (b) => {
          const r = it.check(Number(b.dataset.k));
          if (r.ok) score++;
          if (r.master) { PT.Mistakes.remove(r.master); mastered++; }
          PT.Audio.sfx(r.ok ? 'good' : 'bad');
          $$('.opts button').forEach((e) => (e.disabled = true));
          b.classList.add('pick');
          $('#fb').innerHTML = '<div class="fb ' + (r.ok ? 'good' : 'bad') + '">' + r.html + '</div><div class="row"><button id="dn" class="go">' + (i === items.length - 1 ? 'SEE RESULTS' : 'NEXT') + '</button></div>';
          $('#dn').onclick = () => { i++; if (i >= items.length) done(); else show(); };
        });
      };
      const done = () => {
        UI.screen('<div class="panel narrow"><h2>Drill complete</h2><div class="big">' + score + ' / ' + items.length + '</div><p>' + (mode === 'mistakes' ? mastered + ' mistake' + (mastered === 1 ? '' : 's') + ' mastered and removed from your list.' : score >= items.length * 0.8 ? 'Excellent reading.' : 'Keep drilling to sharpen your instincts.') + '</p><div class="col"><button id="d-again" class="go">GO AGAIN</button><button id="d-done">DONE</button></div></div>');
        UI.on('#d-again', () => UI.drills(mode, back, mode === 'mistakes' ? undefined : list));
        UI.on('#d-done', back);
      };
      show();
    }, 30);
  };
})();
