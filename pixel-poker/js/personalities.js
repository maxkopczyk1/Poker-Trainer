(function () {
  const PT = window.PT;
  PT.SKINS = ['#f7d6b8', '#f2c9a0', '#e0a878', '#c68642', '#8d5524', '#5c3a1e'];
  PT.HAIRS = ['#2b1a10', '#5a3a1e', '#c9a15a', '#a02a1c', '#d8d8d8', '#111118', '#e8d08a', '#6a3b8f'];
  PT.NAMES = ['Mac', 'Dottie', 'Vinny', 'Ray', 'Big Lou', 'Sal', 'Gina', 'Moe', 'Tiny', 'Bev', 'Hank', 'Ozzie', 'Rita', 'Duke', 'Cleo', 'Flip', 'Nina', 'Boris', 'Pops', 'Jules', 'Ace', 'Mabel', 'Dex', 'Lenny', 'Roxy', 'Gus', 'Wanda', 'Frankie', 'Sunny', 'Rocco', 'Tess', 'Cyrus', 'Penny', 'Walt', 'Kiki', 'Marv', 'Zed', 'Bobby', 'Lola', 'Chip'];

  // vpip/pfr: share of hands played / raised. agg: postflop aggression. bluff: bluff frequency.
  // call: calling-station factor. fold: folds to pressure. trap: slowplay. size: bet size vs pot.
  // pos: position awareness. tilt: tilt susceptibility. skill: hand-reading noise (lower = sharper).
  function P(id, name, tag, desc, tip, o) {
    return Object.assign(
      { id, name, tag, desc, tip, adapt: 0.1, hat: null, vpip: 0.25, pfr: 0.15, agg: 0.5, bluff: 0.15, call: 0.3, fold: 0.4, trap: 0.1, size: 0.66, pos: 0.5, tilt: 0.1, skill: 0.15, lv: [1, 10], shirt: '#556' },
      o
    );
  }

  PT.PERS = [
    P('rock', 'The Rock', 'Very tight', 'Plays only premium hands and almost never bluffs. Folds a lot, so when they bet they usually have it.', 'Steal their blinds. Fold when they suddenly show aggression.', { vpip: 0.12, pfr: 0.09, agg: 0.35, bluff: 0.03, call: 0.15, fold: 0.55, trap: 0.2, size: 0.6, pos: 0.3, tilt: 0.1, skill: 0.1, shirt: '#6b6b78' }),
    P('maniac', 'The Maniac', 'High risk', 'Raises with nearly everything and fires bet after bet. Pure chaos.', 'Tighten up, let them bluff into you, and call down with medium-strength hands.', { vpip: 0.75, pfr: 0.55, agg: 0.9, bluff: 0.5, call: 0.6, fold: 0.05, trap: 0.02, size: 1.0, pos: 0.1, tilt: 0.4, skill: 0.3, lv: [1, 8], shirt: '#d1342c' }),
    P('station', 'Calling Station', 'Loose passive', 'Calls with anything and almost never raises. Hates folding.', 'Never bluff. Value bet thin and bet big when you have it.', { vpip: 0.6, pfr: 0.06, agg: 0.1, bluff: 0.02, call: 0.9, fold: 0.05, trap: 0, size: 0.4, pos: 0, tilt: 0.1, skill: 0.35, lv: [1, 6], shirt: '#4a8f6a' }),
    P('tag', 'Tight-Aggressive', 'Solid', 'Selective with hands but aggressive when involved. A genuinely good player.', 'Avoid big pots without a strong hand. Use position against them.', { vpip: 0.2, pfr: 0.16, agg: 0.65, bluff: 0.15, call: 0.3, fold: 0.4, trap: 0.15, size: 0.66, pos: 0.7, tilt: 0.1, skill: 0.1, lv: [2, 10], shirt: '#2f5d9e' }),
    P('lag', 'Loose-Aggressive', 'Aggressive', 'Plays lots of hands and applies constant pressure with raises and bluffs.', 'Trap with strong hands and call down wider. They bluff a lot.', { vpip: 0.35, pfr: 0.27, agg: 0.8, bluff: 0.3, call: 0.35, fold: 0.25, trap: 0.1, size: 0.75, pos: 0.8, tilt: 0.25, skill: 0.1, lv: [3, 10], shirt: '#e0742c' }),
    P('nit', 'The Nit', 'Ultra tight', 'Folds almost everything. Will wait all night for aces.', 'Steal relentlessly. Give up when they fight back.', { vpip: 0.08, pfr: 0.07, agg: 0.3, bluff: 0.01, call: 0.05, fold: 0.8, trap: 0.3, size: 0.5, pos: 0.2, tilt: 0.05, skill: 0.15, lv: [1, 5], shirt: '#8a8a94' }),
    P('gambler', 'The Gambler', 'High risk', 'Chases draws, loves all-ins, and treats chips like confetti.', 'Wait for a real hand and let them shove into you.', { vpip: 0.5, pfr: 0.3, agg: 0.8, bluff: 0.35, call: 0.55, fold: 0.1, trap: 0, size: 1.3, pos: 0, tilt: 0.6, skill: 0.3, shove: true, lv: [1, 7], shirt: '#b8398f' }),
    P('fish', 'The Fish', 'Clueless', 'Plays by feel. Makes random calls, odd bets, and expensive mistakes.', 'Value bet, keep it simple, and be patient. They will pay you off.', { vpip: 0.55, pfr: 0.1, agg: 0.25, bluff: 0.05, call: 0.7, fold: 0.2, trap: 0, size: 0.5, pos: 0, tilt: 0.2, skill: 0.5, lv: [1, 4], shirt: '#3aa0b8' }),
    P('bluffer', 'The Bluffer', 'Deceptive', 'Lives for the big bluff. Half their bets are air.', 'Call down lighter and do not fold decent pairs too easily.', { vpip: 0.3, pfr: 0.22, agg: 0.75, bluff: 0.6, call: 0.3, fold: 0.3, trap: 0, size: 0.8, pos: 0.5, tilt: 0.3, skill: 0.2, lv: [2, 9], shirt: '#8b4fc8' }),
    P('trapper', 'The Trapper', 'Sneaky', 'Slowplays monsters. Looks passive until they spring the trap.', 'Be wary when a passive player suddenly bets or check-raises.', { vpip: 0.22, pfr: 0.1, agg: 0.4, bluff: 0.05, call: 0.5, fold: 0.35, trap: 0.7, size: 0.7, pos: 0.5, tilt: 0.1, skill: 0.15, lv: [2, 9], shirt: '#3d6b4f' }),
    P('math', 'The Mathematician', 'Calculated', 'Counts outs and pot odds. Rarely makes a pure mistake.', 'Hard to exploit. Play in position and avoid giant bluffs.', { vpip: 0.22, pfr: 0.17, agg: 0.55, bluff: 0.12, call: 0.3, fold: 0.35, trap: 0.1, size: 0.6, pos: 0.75, tilt: 0, skill: 0.03, lv: [4, 10], shirt: '#2a7f9e' }),
    P('tilter', 'The Tilter', 'Emotional', 'Solid until they take a beat. Then they play wild and loose.', 'Keep value betting. Take their chips after a bad beat.', { vpip: 0.22, pfr: 0.15, agg: 0.5, bluff: 0.1, call: 0.3, fold: 0.4, trap: 0.1, size: 0.65, pos: 0.4, tilt: 1.0, skill: 0.2, lv: [2, 9], shirt: '#c85a5a' }),
    P('scared', 'Scared Money', 'Timid', 'Plays only what they can afford to lose and folds to big bets.', 'Bluff big bets at them. Respect them if they keep calling.', { vpip: 0.18, pfr: 0.08, agg: 0.25, bluff: 0.02, call: 0.2, fold: 0.7, trap: 0.1, size: 0.5, pos: 0.2, tilt: 0.2, skill: 0.2, lv: [1, 6], shirt: '#9aa7b8' }),
    P('showoff', 'The Showoff', 'Flashy', 'Loves big bets and pretty hands. Wants everyone to see who is boss.', 'Value bet big. They hate to be bluffed but also hate folding.', { vpip: 0.45, pfr: 0.3, agg: 0.7, bluff: 0.25, call: 0.45, fold: 0.2, trap: 0, size: 1.1, pos: 0.2, tilt: 0.4, skill: 0.3, showy: true, loveSuited: true, lv: [3, 9], shirt: '#e8b84a' }),
    P('pro', 'The Old Pro', 'Veteran', 'Has seen every move. Excellent position play and balanced tendencies.', 'Respect their raises and keep your ranges honest.', { vpip: 0.21, pfr: 0.17, agg: 0.55, bluff: 0.15, call: 0.3, fold: 0.4, trap: 0.3, size: 0.6, pos: 0.9, tilt: 0.05, skill: 0.05, lv: [4, 10], shirt: '#5a4a3a' }),
    P('newbie', 'The Newbie', 'Beginner', 'Limps a lot, min-bets, and still checks the rules card.', 'Raise for value. Their small bets are usually weak.', { vpip: 0.45, pfr: 0.07, agg: 0.2, bluff: 0.03, call: 0.55, fold: 0.3, trap: 0, size: 0.3, pos: 0, tilt: 0.2, skill: 0.45, minRaise: true, lv: [1, 4], shirt: '#7ac0e0' }),
    P('hero', 'The Hero Caller', 'Sticky', 'Believes nobody can bluff them. Calls down with marginal hands.', 'Value bet relentlessly. Never bluff the river.', { vpip: 0.3, pfr: 0.12, agg: 0.3, bluff: 0.03, call: 0.8, fold: 0.15, trap: 0.1, size: 0.5, pos: 0.3, tilt: 0.2, skill: 0.25, lv: [3, 9], shirt: '#c06030' }),
    P('overbet', 'The Overbetter', 'Large bets', 'Puts in huge bets with strong hands and bluffs alike.', 'Call with bluff-catchers when the story makes sense.', { vpip: 0.3, pfr: 0.2, agg: 0.7, bluff: 0.3, call: 0.3, fold: 0.3, trap: 0, size: 1.6, pos: 0.4, tilt: 0.3, skill: 0.25, lv: [3, 9], shirt: '#a02a5a' }),
    P('minraise', 'The Min-Raiser', 'Cheap raises', 'Always raises the minimum. Gives everyone a great price.', 'Defend wide and re-raise in position.', { vpip: 0.3, pfr: 0.2, agg: 0.5, bluff: 0.1, call: 0.5, fold: 0.3, trap: 0, size: 0.3, pos: 0.3, tilt: 0.2, skill: 0.3, minRaise: true, lv: [1, 6], shirt: '#5aa0a0' }),
    P('suited', 'Suited-Connector Lover', 'Speculative', 'Loves any two suited, connected cards. Chasing the disguised monster.', 'Beware sudden aggression on wet boards. Raise to deny cheap flops.', { vpip: 0.4, pfr: 0.15, agg: 0.5, bluff: 0.2, call: 0.5, fold: 0.3, trap: 0.1, size: 0.6, pos: 0.5, tilt: 0.2, skill: 0.2, spec: true, lv: [2, 9], shirt: '#4d9e5a' }),
    P('ace', 'The Ace Addict', 'Ace-happy', 'Cannot fold an ace. Any ace is a good ace.', 'Dominate them with better kickers.', { vpip: 0.35, pfr: 0.18, agg: 0.45, bluff: 0.1, call: 0.55, fold: 0.25, trap: 0.05, size: 0.6, pos: 0.3, tilt: 0.2, skill: 0.3, loveAce: true, lv: [2, 8], shirt: '#d8d8e0' }),
    P('pairhunter', 'The Pair Hunter', 'Set miner', 'Limps and calls with small pairs hoping to hit a set.', 'Do not pay them off when they hit. Raise big before the flop.', { vpip: 0.3, pfr: 0.1, agg: 0.35, bluff: 0.05, call: 0.55, fold: 0.35, trap: 0.3, size: 0.6, pos: 0.4, tilt: 0.1, skill: 0.2, setMine: true, lv: [2, 9], shirt: '#907040' }),
    P('bully', 'The Button Bully', 'Position raider', 'Steals relentlessly from late position and punishes weakness.', 'Re-raise their button opens and defend your blinds.', { vpip: 0.3, pfr: 0.25, agg: 0.7, bluff: 0.3, call: 0.3, fold: 0.3, trap: 0.05, size: 0.7, pos: 1.0, tilt: 0.2, skill: 0.12, lv: [3, 10], shirt: '#b03030' }),
    P('sticky', 'The Blind Defender', 'Sticky', 'Never lets you steal the blinds. Defends and calls with everything.', 'Do not steal against them. Value bet when they call.', { vpip: 0.38, pfr: 0.1, agg: 0.3, bluff: 0.05, call: 0.7, fold: 0.2, trap: 0.1, size: 0.5, pos: 0.2, tilt: 0.2, skill: 0.3, defend: true, lv: [2, 8], shirt: '#6a6aa0' }),
    P('shark', 'The Shark', 'Elite', 'Adaptive and cold-blooded. Strong in every phase of the game.', 'Pick your spots carefully. There are few mistakes to exploit.', { vpip: 0.24, pfr: 0.19, agg: 0.7, bluff: 0.25, call: 0.3, fold: 0.35, trap: 0.25, size: 0.7, pos: 0.95, tilt: 0, skill: 0, lv: [6, 10], shirt: '#1a1a2a' }),
  ];
  // How much each personality studies and adapts to the people it plays against.
  const ADAPT = { shark: 0.9, pro: 0.75, math: 0.6, tag: 0.5, bully: 0.5, lag: 0.45, bluffer: 0.25, trapper: 0.3, tilter: 0.15 };
  Object.keys(ADAPT).forEach((k) => { PT.PERS.find((p) => p.id === k).adapt = ADAPT[k]; });
  const HATS = { showoff: 'fedora', gambler: 'cap', pro: 'fedora', bully: 'cap', newbie: 'beanie', trapper: 'cowboy', hero: 'cowboy', nit: 'visor', math: 'visor', shark: 'none' };
  Object.keys(HATS).forEach((k) => { PT.PERS.find((p) => p.id === k).hat = HATS[k]; });
  [['maniac', 0.5], ['gambler', 0.5], ['showoff', 0.45], ['lag', 0.25]].forEach((a) => { PT.PERS.find((p) => p.id === a[0]).straddle = a[1]; });
  // A special guest who sometimes stumbles into low-stakes games (not part of the 25 regulars).
  PT.GUEST = P('drunk', 'Drunk Uncle', 'Wildcard', 'Had a few. Plays any two cards, bets random amounts, and tells stories mid-hand.', 'Be patient. Value bet big and avoid fancy plays. He will pay you off.', { vpip: 0.7, pfr: 0.25, agg: 0.5, bluff: 0.4, call: 0.8, fold: 0.05, trap: 0, size: 0.8, pos: 0, tilt: 0.3, skill: 0.6, wild: true, hat: 'cowboy', shirt: '#b8861c', lv: [1, 5] });
  PT.persById = {};
  PT.PERS.forEach((p) => (PT.persById[p.id] = p));
  PT.persById.drunk = PT.GUEST;

  PT.pickPersonalities = (count, level) => {
    let pool = PT.PERS.filter((p) => level >= p.lv[0] && level <= p.lv[1]);
    if (pool.length < count) pool = PT.PERS.slice();
    pool = PT.shuffle(pool.slice());
    const out = [];
    for (let i = 0; i < count; i++) out.push(pool[i % pool.length]);
    return out;
  };
})();
