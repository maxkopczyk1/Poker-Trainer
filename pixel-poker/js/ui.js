(function () {
  const PT = window.PT;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const UI = (PT.UI = {});
  const C = () => PT.Career;
  const WRIST_CROP = [180, 236, 280, 128];

  function screen(html) {
    $('#game').classList.add('hidden');
    $('#screen').classList.remove('hidden');
    $('#screen').innerHTML = html;
    $('#screen').scrollTop = 0;
    window.scrollTo(0, 0);
    PT.Audio.music(true);
  }
  const on = (sel, fn) => { const e = $(sel); if (e) e.onclick = () => { PT.Audio.unlock(); PT.Audio.sfx('click'); fn(); }; };
  const onAll = (sel, fn) => $$(sel).forEach((e) => (e.onclick = () => { PT.Audio.unlock(); PT.Audio.sfx('click'); fn(e); }));
  UI.screen = screen; UI.on = on; UI.onAll = onAll;

  // ---------- Modal ----------
  function modal(html, wide) {
    const m = $('#modal');
    m.innerHTML = '<div class="mbox' + (wide ? ' wide' : '') + '">' + html + '</div>';
    m.classList.remove('hidden');
    return m;
  }
  function closeModal() { $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; }
  UI.modal = modal; UI.closeModal = closeModal;

  function ask(title, body, buttons) {
    return new Promise((res) => {
      modal('<h3>' + title + '</h3><p>' + body + '</p><div class="row">' + buttons.map((b, i) => '<button data-i="' + i + '" class="' + (b.cls || '') + '">' + b.t + '</button>').join('') + '</div>');
      $$('#modal button').forEach((b) => (b.onclick = () => { PT.Audio.sfx('click'); closeModal(); res(Number(b.dataset.i)); }));
    });
  }
  UI.ask = ask;

  function amountPrompt(title, note, min, max, def, step) {
    return new Promise((res) => {
      modal('<h3>' + title + '</h3><p>' + note + '</p><div class="amt"><input id="am-r" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + def + '"><div id="am-v" class="big">' + PT.money(def) + '</div></div><div class="row"><button id="am-ok" class="go">CONFIRM</button><button id="am-no">CANCEL</button></div>');
      const r = $('#am-r');
      r.oninput = () => ($('#am-v').textContent = PT.money(Number(r.value)));
      $('#am-ok').onclick = () => { PT.Audio.sfx('click'); closeModal(); res(Number(r.value)); };
      $('#am-no').onclick = () => { closeModal(); res(0); };
    });
  }
  UI.amountPrompt = amountPrompt;

  UI.bustPrompt = async (S) => {
    const o = S.opts, c = o.cfg;
    PT.Audio.sfx('lose');
    if (o.mode === 'career') {
      const bank = C().data.bankroll;
      if (bank < c.minBuy) { await ask('Busted!', 'You are out of chips and your bankroll cannot cover the minimum buy-in of ' + PT.money(c.minBuy) + '.', [{ t: 'LEAVE TABLE', cls: 'go' }]); return 0; }
      const max = Math.min(c.maxBuy, bank);
      const v = await amountPrompt('Busted! Rebuy?', 'Bankroll: ' + PT.money(bank) + '. Buy back in or walk away.', c.minBuy, max, Math.min(max, Math.max(c.minBuy, c.bb * 100)), c.bb);
      if (v > 0) { C().data.bankroll -= v; C().save(); S.buyIn += v; }
      return v;
    }
    const i = await ask('Busted!', 'Free rebuy for ' + PT.money(c.bb * 100) + '?', [{ t: 'REBUY', cls: 'go' }, { t: 'LEAVE' }]);
    if (i === 0) { S.buyIn += c.bb * 100; return c.bb * 100; }
    return 0;
  };
  UI.chipsPrompt = async (S, room) => {
    const o = S.opts, c = o.cfg;
    if (o.mode === 'career') {
      const bank = C().data.bankroll, max = Math.min(room, bank);
      if (max < c.bb) { PT.Session.toast('Not enough bankroll'); return 0; }
      return amountPrompt('Add chips', 'Bankroll: ' + PT.money(bank), c.bb, max, Math.min(max, c.bb * 20), c.bb);
    }
    return amountPrompt('Add chips', 'Free in sandbox and coach mode.', c.bb, room, Math.min(room, c.bb * 20), c.bb);
  };

  // ---------- Settings ----------
  UI.settings = () => {
    const s = PT.settings;
    const chk = (k, label, hint) => '<label class="set"><input type="checkbox" data-k="' + k + '"' + (s[k] ? ' checked' : '') + '><span><b>' + label + '</b><small>' + hint + '</small></span></label>';
    modal(
      '<h3>Settings</h3><div class="setlist">' +
        chk('training', 'Training aids', 'Shows your current hand, equity, outs, pot odds, and a coach recommendation while you play.') +
        chk('reveal', 'Show opponent types', 'Reveals each player’s personality when you hover over them (always on in sandbox and coach mode).') +
        chk('sfx', 'Sound effects', 'Chiptune chips, cards, and fanfares.') +
        chk('music', 'Music', 'Looping chiptune background music.') +
        chk('log', 'Hand log', 'Shows the running action log beside the table.') +
        '<h4>House rules (private game options)</h4>' +
        chk('straddle', 'Straddles', 'Some players post a blind 2x the big blind from under the gun. It makes the pot bigger.') +
        chk('rit', 'Run it twice', 'When you and one opponent are all-in, you can agree to deal the rest of the board twice and split the pot.') +
        chk('rake', 'Host rake', 'The host takes 5% of each pot that sees a flop (capped at 3 big blinds).') +
        '<label class="set"><span><b>Volume</b></span><input type="range" id="s-vol" min="0" max="1" step="0.05" value="' + s.vol + '"></label>' +
        '<label class="set"><span><b>Game speed</b><small>How fast the other players act.</small></span><select id="s-speed"><option value="0.6">Slow</option><option value="1">Normal</option><option value="2">Fast</option><option value="4">Very fast</option></select></label>' +
        '<label class="set"><span><b>Auto-deal</b><small>Automatically start the next hand after a delay.</small></span><select id="s-auto"><option value="0">Off</option><option value="4">4 seconds</option><option value="8">8 seconds</option></select></label>' +
        '</div><div class="row"><button id="s-ok" class="go">DONE</button></div>'
    );
    $('#s-speed').value = String(s.speed); $('#s-auto').value = String(s.autoDeal);
    $$('#modal input[type=checkbox]').forEach((c) => (c.onchange = () => {
      s[c.dataset.k] = c.checked; PT.saveSettings();
      if (c.dataset.k === 'music') PT.Audio.music(c.checked);
      $('#hlog').classList.toggle('hidden', !s.log);
    }));
    $('#s-vol').oninput = (e) => { s.vol = Number(e.target.value); PT.Audio.setVol(); PT.saveSettings(); };
    $('#s-speed').onchange = (e) => { s.speed = Number(e.target.value); PT.saveSettings(); };
    $('#s-auto').onchange = (e) => { s.autoDeal = Number(e.target.value); PT.saveSettings(); };
    $('#s-ok').onclick = closeModal;
  };

  // ---------- Main menu ----------
  UI.menu = () => {
    screen(
      '<div class="menu"><canvas id="mcv" width="640" height="360"></canvas><div class="mtitle"><h1>PIXEL<br>POKER</h1><p>Private cash game trainer</p></div>' +
        '<div class="mbtns"><button data-a="career" class="go">CAREER</button><button data-a="sandbox">SANDBOX</button><button data-a="training">TRAINING</button><button data-a="settings">SETTINGS</button></div>' +
        '<p class="foot">Texas Hold’em · No-limit cash · 25 player personalities</p></div>'
    );
    const d = C().exists() ? C().load() : null;
    PT.R.renderPreview($('#mcv'), d ? d.char : PT.defaultChar, d ? d.equipped : {}, { theme: 0 });
    onAll('.mbtns button', (b) => {
      const a = b.dataset.a;
      if (a === 'career') UI.careerEntry();
      else if (a === 'sandbox') UI.sandbox();
      else if (a === 'training') PT.UI.trainingHub();
      else UI.settings();
    });
  };

  // ---------- Career ----------
  UI.careerEntry = async () => {
    if (!C().exists()) return UI.charCreate();
    const d = C().load();
    screen('<div class="panel narrow"><h2>Career</h2><p>Welcome back, <b>' + d.name + '</b>.<br>' + PT.money(d.bankroll) + ' · ' + C().title() + ' · ' + Math.floor(d.rep) + ' REP</p><div class="col"><button id="c-cont" class="go">CONTINUE</button><button id="c-new">NEW CAREER</button><button id="c-back">BACK</button></div></div>');
    on('#c-cont', UI.hub);
    on('#c-back', UI.menu);
    on('#c-new', async () => {
      const i = await ask('Start over?', 'This erases your current career, bankroll, items and secrets. Training progress is kept.', [{ t: 'ERASE & START NEW', cls: 'bad' }, { t: 'CANCEL', cls: 'go' }]);
      if (i === 0) { C().wipe(); UI.charCreate(); }
    });
  };

  UI.charCreate = () => {
    const ch = Object.assign({}, PT.defaultChar);
    let name = 'Player';
    const sw = (arr, key) => arr.map((c, i) => '<button class="sw' + (ch[key] === i ? ' sel' : '') + '" data-k="' + key + '" data-i="' + i + '" style="background:' + c + '"></button>').join('');
    const tg = (arr, key) => arr.map((t, i) => '<button class="tg' + (ch[key] === i ? ' sel' : '') + '" data-k="' + key + '" data-i="' + i + '">' + t + '</button>').join('');
    const draw = () => {
      screen(
        '<div class="panel wide"><h2>Create your player</h2><p class="muted">At the table you only see your own arms, so skin tone and wrists matter most. The full-body view shows who walks into the room and can be dressed up in the shop.</p>' +
          '<div class="cc"><div class="ccview"><canvas id="pcv" width="560" height="256"></canvas><canvas id="fcv" width="168" height="336"></canvas></div><div class="ccopts">' +
          '<label>Name<input id="cc-name" maxlength="12" value="' + name + '"></label>' +
          '<div class="opt"><span>Skin tone</span><div class="sws">' + sw(PT.SKINS, 'skin') + '</div></div>' +
          '<div class="opt"><span>Build</span><div class="sws">' + tg(['Slim', 'Average', 'Broad'], 'build') + '</div></div>' +
          '<div class="opt"><span>Arm hair</span><div class="sws">' + tg(['None', 'Light', 'Heavy'], 'hair') + '</div></div>' +
          '<div class="opt"><span>Hair style</span><div class="sws">' + tg(PT.HAIR_STYLES, 'hairStyle') + '</div></div>' +
          '<div class="opt"><span>Hair colour</span><div class="sws">' + sw(PT.HAIRS, 'hairColor') + '</div></div>' +
          '<div class="opt"><span>Facial hair</span><div class="sws">' + tg(PT.BEARDS, 'beard') + '</div></div>' +
          '<div class="opt"><span>Eye colour</span><div class="sws">' + sw(PT.EYES, 'eyes') + '</div></div>' +
          '<div class="opt"><span>Shirt colour</span><div class="sws">' + sw(PT.CUFFS, 'cuff') + '</div></div>' +
          '<div class="opt"><span>Trousers</span><div class="sws">' + sw(PT.PANTS, 'pants') + '</div></div>' +
          '</div></div><div class="row"><button id="cc-back">BACK</button><button id="cc-go" class="go">START CAREER</button></div></div>'
      );
      PT.R.renderPreview($('#pcv'), ch, {}, { crop: WRIST_CROP });
      PT.R.renderFigure($('#fcv'), ch, {});
      $('#cc-name').oninput = (e) => (name = e.target.value);
      onAll('.sw,.tg', (b) => { ch[b.dataset.k] = Number(b.dataset.i); draw(); });
      on('#cc-back', UI.menu);
      on('#cc-go', () => { C().create(name.trim() || 'Player', ch); UI.hub(); });
    };
    draw();
  };

  UI.hub = () => {
    const d = C().load();
    const bonus = C().claimTraining();
    const metas = C().checkMeta();
    const hi = C().highest(), nx = C().nextCasino();
    const rows = PT.CASINOS.map((c) => {
      const open = d.rep >= c.rep, afford = d.bankroll >= c.minBuy;
      return '<div class="casino' + (open ? '' : ' locked') + '" style="--felt:' + c.th.felt + '"><div class="cn"><span class="lv">L' + c.lv + '</span><b>' + c.name + '</b></div><p>' + c.tag + '</p><div class="cs">Blinds ' + PT.money(c.sb) + '/' + PT.money(c.bb) + ' · Buy-in ' + PT.money(c.minBuy) + '–' + PT.money(c.maxBuy) + ' · ' + c.seats + ' seats</div>' +
        (open ? '<button data-lv="' + c.lv + '" class="go"' + (afford ? '' : ' disabled') + '>' + (afford ? 'SIT DOWN' : 'NEED ' + PT.money(c.minBuy)) + '</button>' : '<div class="lock">Locked: ' + c.rep.toLocaleString() + ' REP</div>') + '</div>';
    }).join('');
    const found = PT.ACH.filter((a) => d.ach[a.id]).length;
    screen(
      '<div class="hub"><div class="hubtop"><canvas id="hfig" width="84" height="168"></canvas><div><h2>' + d.name + '</h2><div class="muted">' + C().title() + '</div></div><div class="stat"><span>BANKROLL</span><b>' + PT.money(d.bankroll) + '</b></div><div class="stat"><span>REP</span><b>' + Math.floor(d.rep).toLocaleString() + '</b></div>' +
        (nx ? '<div class="stat"><span>NEXT UNLOCK</span><b>' + Math.max(0, Math.ceil(nx.rep - d.rep)).toLocaleString() + ' REP</b></div>' : '<div class="stat"><span>STATUS</span><b>MAXED</b></div>') + '</div>' +
        (bonus ? '<div class="note good">Training bonus: +' + PT.money(bonus) + ' added to your bankroll.</div>' : '') +
        (d.bankroll < PT.CASINOS[0].minBuy ? '<div class="note bad">You are broke. <button id="loan">Borrow $200 from a friend (-25 REP)</button></div>' : '') +
        '<div class="hubnav"><button id="h-shop">SHOP</button><button id="h-secret">SECRETS (' + found + '/' + PT.ACH.length + ')</button><button id="h-train">TRAINING</button><button id="h-drill">SPOT DRILLS' + (PT.Mistakes.count() ? ' (' + PT.Mistakes.count() + ')' : '') + '</button><button id="h-stats">STATS</button><button id="h-set">SETTINGS</button><button id="h-menu">MAIN MENU</button></div>' +
        '<div class="casinos">' + rows + '</div></div>'
    );
    PT.R.renderFigure($('#hfig'), d.char, d.equipped);
    metas.forEach((a) => PT.Session.secret(a));
    on('#h-shop', () => UI.shop());
    on('#h-train', () => PT.UI.trainingHub('career'));
    on('#h-drill', () => PT.UI.drillMenu(UI.hub));
    on('#h-secret', UI.secrets);
    on('#h-set', UI.settings);
    on('#h-menu', UI.menu);
    on('#h-stats', UI.stats);
    if ($('#loan')) on('#loan', () => { d.bankroll += 200; d.rep = Math.max(0, d.rep - 25); C().save(); UI.hub(); });
    onAll('.casino button[data-lv]', (b) => UI.enterCasino(Number(b.dataset.lv)));
  };

  UI.secrets = () => {
    const d = C().data;
    const rows = PT.ACH.map((a) => {
      const got = d.ach[a.id];
      return '<div class="kv2' + (got ? ' got' : '') + '"><b>' + (got ? a.name : '???') + '</b><span>' + (got ? a.hint : 'A secret reward. Keep playing to discover it.') + '</span>' + (got ? '<small>Unlocked: ' + a.items.map((i) => PT.shopById[i].name).join(', ') + '</small>' : '') + '</div>';
    }).join('');
    modal('<h3>Secrets</h3><p class="muted">Rare moments at the table unlock special items that can never be bought.</p><div class="secretlist">' + rows + '</div><div class="row"><button id="m-ok" class="go">CLOSE</button></div>', true);
    $('#m-ok').onclick = closeModal;
  };

  UI.stats = () => {
    const d = C().data, st = d.stats;
    modal('<h3>Career stats</h3><div class="kv"><div>Hands played</div><b>' + st.hands + '</b><div>Hands won</div><b>' + st.wins + ' (' + (st.hands ? Math.round((st.wins / st.hands) * 100) : 0) + '%)</b><div>Biggest pot won</div><b>' + PT.money(st.biggest) + '</b><div>Sessions</div><b>' + st.sessions + '</b><div>Lifetime profit</div><b>' + PT.money(st.profit) + '</b><div>Best session</div><b>' + PT.money(st.best) + '</b><div>Items owned</div><b>' + d.owned.length + ' / ' + PT.SHOP.length + '</b></div><div class="row"><button id="m-ok" class="go">CLOSE</button></div>');
    $('#m-ok').onclick = closeModal;
  };

  UI.enterCasino = async (lv) => {
    const c = PT.CASINOS[lv - 1], d = C().data;
    const max = Math.min(c.maxBuy, d.bankroll);
    const v = await amountPrompt(c.name, 'Blinds ' + PT.money(c.sb) + '/' + PT.money(c.bb) + '. Choose your buy-in. Bankroll: ' + PT.money(d.bankroll), c.minBuy, max, Math.min(max, Math.max(c.minBuy, c.bb * 100)), c.bb);
    if (!v) return;
    d.bankroll -= v; C().save();
    UI.playTable({ mode: 'career', level: lv, heroStack: v, cfg: { sb: c.sb, bb: c.bb, seats: c.seats, minBuy: c.minBuy, maxBuy: c.maxBuy, level: lv, guests: true }, themeIdx: lv - 1, title: c.name, char: d.char, equipped: d.equipped, name: d.name });
  };

  UI.playTable = (o) => {
    o.onExit = (res) => {
      let after = o.back || UI.menu, extra = '';
      if (o.mode === 'career') {
        const r = C().cashOut(o.level, res.stack, res.buyIn);
        extra = (r.profit >= 0 ? 'You walk away with ' : 'You leave with ') + PT.money(res.stack) + ' (' + (r.profit >= 0 ? '+' : '') + PT.money(r.profit) + ').' + (r.bonus ? ' ' + (r.bonus > 0 ? '+' : '') + r.bonus.toFixed(1) + ' REP session bonus.' : '') + ' REP from hands: ' + res.rep.toFixed(1) + '.';
        after = UI.hub;
      }
      if (res.hands < 1) { after(); return; }
      UI.sessionReport(res, extra, after);
    };
    PT.Session.start(o);
  };

  // ---------- Session report ----------
  function graph(series, start) {
    const W = 640, H = 170;
    const lo = Math.min.apply(null, series.concat(start)), hi = Math.max.apply(null, series.concat(start));
    const span = hi - lo || 1, n = Math.max(1, series.length - 1);
    const X = (i) => Math.round((i / n) * (W - 20)) + 10, Y = (v) => Math.round(H - 14 - ((v - lo) / span) * (H - 28));
    const up = series[series.length - 1] >= start, col = up ? '#4de88a' : '#ff5a6e';
    const pts = series.map((v, i) => X(i) + ',' + Y(v)).join(' ');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="graph" role="img" aria-label="Stack size over the session"><rect width="' + W + '" height="' + H + '" fill="#0e0b18"/>' +
      '<line x1="10" x2="' + (W - 10) + '" y1="' + Y(start) + '" y2="' + Y(start) + '" stroke="#4a3f78" stroke-dasharray="6 5"/>' +
      '<polygon points="' + X(0) + ',' + Y(start) + ' ' + pts + ' ' + X(series.length - 1) + ',' + Y(start) + '" fill="' + col + '" fill-opacity="0.15"/>' +
      '<polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<text x="12" y="14" fill="#9a92c0" font-size="11" font-family="monospace">' + PT.money(hi) + '</text><text x="12" y="' + (H - 4) + '" fill="#9a92c0" font-size="11" font-family="monospace">' + PT.money(lo) + '</text></svg>';
  }
  UI.sessionReport = (res, extra, after) => {
    const st = res.stats, profit = res.stack - res.buyIn, bb = st.bb;
    const ms = res.mistakes.slice().sort((a, b) => b.loss - a.loss);
    const leak = ms.reduce((a, m) => a + m.loss, 0);
    const insights = [];
    if (st.hands >= 12) {
      if (st.vpip > 38) insights.push('You played ' + st.vpip + '% of your hands. That is very loose. Fold more marginal hands, especially from early position.');
      else if (st.vpip < 12) insights.push('You played only ' + st.vpip + '% of hands. That is very tight. Add suited hands and use position to open up on the button.');
      else insights.push('Your VPIP of ' + st.vpip + '% is in a healthy range.');
      if (st.vpip - st.pfr > 12) insights.push('Your PFR is ' + st.pfr + '%, far below your VPIP. You are calling too often. Raise or fold more.');
      else if (st.pfr > 0) insights.push('Your pre-flop raising (' + st.pfr + '%) is balanced with how often you play.');
      if (st.af > 4) insights.push('Aggression factor ' + st.af + ': very aggressive. Make sure you have the hands or fold equity to back it up.');
      else if (st.af < 1) insights.push('Aggression factor ' + st.af + ': passive. Bet your strong hands and draws more often.');
    } else insights.push('Play at least 15 hands to get meaningful stats.');
    const hist = res.hist;
    const best = hist.slice().sort((a, b) => b.profit - a.profit)[0], worst = hist.slice().sort((a, b) => a.profit - b.profit)[0];
    const hl = (h, label) => h && Math.abs(h.profit) > 0 ? '<div class="hl2"><span>' + label + '</span> ' + PT.cardsHTML(h.hole) + (h.board.length ? '<span class="gap"></span>' + PT.cardsHTML(h.board) : '') + '<b class="' + (h.profit >= 0 ? 'pos' : 'neg') + '">' + (h.profit >= 0 ? '+' : '') + PT.money(h.profit) + ' (' + (h.profit / bb).toFixed(0) + 'bb)</b></div>' : '';
    const mrows = ms.slice(0, 5).map((m) => '<div class="mist"><div>' + PT.cardsHTML(m.ctx.hole) + (m.ctx.board.length ? '<span class="gap"></span>' + PT.cardsHTML(m.ctx.board) : '') + '</div><div><b>' + m.hand + '</b> in ' + m.ctx.pos + ', pot ' + PT.money(m.ctx.pot) + (m.ctx.toCall ? ', to call ' + PT.money(m.ctx.toCall) : '') + '<br>You: <b class="neg">' + m.my.toUpperCase() + '</b> · Coach: <b class="pos">' + m.adv.act.toUpperCase() + '</b> · est. cost ~' + m.loss + 'bb<br><small>' + m.adv.text + '</small></div></div>').join('');
    screen(
      '<div class="panel wide report"><h2>Session report</h2>' + (extra ? '<p class="muted">' + extra + '</p>' : '') +
        '<div class="tiles"><div class="stat"><span>PROFIT</span><b class="' + (profit >= 0 ? 'pos' : 'neg') + '">' + (profit >= 0 ? '+' : '') + PT.money(profit) + '</b></div><div class="stat"><span>HANDS</span><b>' + res.hands + '</b></div><div class="stat"><span>VPIP</span><b>' + st.vpip + '%</b></div><div class="stat"><span>PFR</span><b>' + st.pfr + '%</b></div><div class="stat"><span>AGGRESSION</span><b>' + st.af + '</b></div><div class="stat"><span>MISTAKES</span><b>' + ms.length + '</b></div></div>' +
        '<h4>Your stack over the session</h4>' + graph(res.series, res.startStack) +
        '<h4>What the numbers say</h4><ul>' + insights.map((i) => '<li>' + i + '</li>').join('') + '</ul>' +
        '<h4>Biggest hands</h4>' + (hl(best, 'Best') || '') + (hl(worst, 'Worst') || '') +
        '<h4>Your biggest mistakes' + (ms.length ? ' (about ' + leak.toFixed(1) + 'bb leaked in total)' : '') + '</h4>' +
        (ms.length ? mrows : '<p class="muted">' + (res.reviews ? 'The coach found no mistakes. Nice session.' : 'No coached decisions this session.') + '</p>') +
        '<div class="row">' + (PT.Mistakes.count() ? '<button id="rp-drill">DRILL YOUR MISTAKES</button>' : '') + '<button id="rp-go" class="go">CONTINUE</button></div></div>'
    );
    if ($('#rp-drill')) on('#rp-drill', () => PT.UI.drills('mistakes', after));
    on('#rp-go', after);
  };

  // ---------- Shop ----------
  UI.shop = (cat) => {
    cat = cat || 'outfit';
    const d = C().data;
    let tryId = null;
    const previewEq = () => {
      const eq = Object.assign({}, d.equipped);
      if (tryId) { const it = PT.shopById[tryId]; if (!PT.SLOTS[it.cat].some((s) => eq[s] === tryId)) eq[PT.SLOTS[it.cat][0]] = tryId; }
      return eq;
    };
    const paint = () => {
      const eq = previewEq();
      PT.R.renderPreview($('#scv'), d.char, eq, { crop: WRIST_CROP, theme: Math.max(0, C().highest() - 1) });
      PT.R.renderFigure($('#fcv'), d.char, eq);
    };
    const render = () => {
      const items = PT.SHOP.filter((i) => i.cat === cat);
      const eq = d.equipped;
      const cards = items.map((i) => {
        const own = d.owned.includes(i.id), slots = PT.SLOTS[i.cat];
        if (i.secret && !own) return '<div class="item secretitem"><b>???</b><p>' + (PT.ACH.find((a) => a.id === i.ach).hint) + '</p><div class="lock">Secret reward</div></div>';
        const equippedSlot = slots.find((s) => eq[s] === i.id);
        const lock = d.rep < i.rep, poor = d.bankroll < i.price;
        let act;
        if (!own) act = lock ? '<div class="lock">Needs ' + i.rep + ' REP</div>' : '<button data-buy="' + i.id + '" class="go"' + (poor ? ' disabled' : '') + '>BUY ' + PT.money(i.price) + '</button>';
        else if (equippedSlot) act = '<button data-un="' + equippedSlot + '">REMOVE' + (slots.length > 1 ? ' (' + (equippedSlot.endsWith('L') ? 'L' : 'R') + ')' : '') + '</button>';
        else act = slots.map((s) => '<button data-eq="' + s + '|' + i.id + '">EQUIP' + (slots.length > 1 ? ' ' + (s.endsWith('L') ? 'LEFT' : 'RIGHT') : '') + '</button>').join('');
        return '<div class="item' + (own ? ' own' : '') + (i.secret ? ' secretown' : '') + '" data-id="' + i.id + '"><b>' + i.name + '</b><p>' + i.desc + '</p>' + act + '</div>';
      }).join('');
      screen(
        '<div class="shop"><div class="hubtop"><h2>Shop</h2><div class="stat"><span>BANKROLL</span><b>' + PT.money(d.bankroll) + '</b></div><div class="stat"><span>REP</span><b>' + Math.floor(d.rep) + '</b></div><button id="sh-back">BACK</button></div>' +
          '<div class="shoprow"><canvas id="scv" width="560" height="256"></canvas><canvas id="fcv" width="112" height="224"></canvas></div><p class="muted center">Hover an item to preview it on you.</p><div class="tabs">' + PT.SHOP_CATS.map((c) => '<button data-cat="' + c[0] + '" class="' + (c[0] === cat ? 'sel' : '') + '">' + c[1] + '</button>').join('') + '</div><div class="items">' + cards + '</div></div>'
      );
      paint();
      on('#sh-back', UI.hub);
      onAll('.tabs button', (b) => { cat = b.dataset.cat; tryId = null; render(); });
      onAll('[data-buy]', (b) => { if (C().buy(b.dataset.buy)) { PT.Audio.sfx('win'); render(); } });
      onAll('[data-eq]', (b) => { const [s, id] = b.dataset.eq.split('|'); C().equip(s, id); render(); });
      onAll('[data-un]', (b) => { C().equip(b.dataset.un, null); render(); });
      $$('.item[data-id]').forEach((e) => { e.onmouseenter = () => { tryId = e.dataset.id; paint(); }; e.onmouseleave = () => { tryId = null; paint(); }; });
    };
    render();
  };

  // ---------- Sandbox ----------
  UI.sandbox = () => {
    const saved = PT.store.get('pt_sandbox', { seats: 6, bb: 2, theme: 0, stack: 100, opp: [] });
    const d = C().exists() ? C().load() : null;
    const blindOpts = PT.CASINOS.map((c, i) => '<option value="' + i + '">' + PT.money(c.sb) + '/' + PT.money(c.bb) + '</option>').join('');
    const persOpts = '<option value="random">Random</option>' + PT.PERS.map((p) => '<option value="' + p.id + '">' + p.name + ' (' + p.tag + ')</option>').join('') + '<option value="drunk">Drunk Uncle (Wildcard guest)</option>';
    const seatSel = () => { let h = ''; for (let i = 1; i < saved.seats; i++) h += '<label>Seat ' + i + '<select data-seat="' + i + '">' + persOpts + '</select></label>'; return h; };
    const draw = () => {
      screen(
        '<div class="panel wide"><h2>Sandbox</h2><p class="muted">Free play with no bankroll. Pick the table, the stakes, and exactly who you play against. House rules (straddle, run it twice, rake) are in Settings.</p>' +
          '<div class="form"><label>Players at table<select id="sb-seats">' + [2, 3, 4, 5, 6, 7, 8, 9].map((n) => '<option' + (n === saved.seats ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>' +
          '<label>Stakes<select id="sb-bl">' + blindOpts + '</select></label>' +
          '<label>Venue<select id="sb-th">' + PT.CASINOS.map((c, i) => '<option value="' + i + '">' + c.name + '</option>').join('') + '</select></label>' +
          '<label>Starting stack (big blinds)<select id="sb-st">' + [20, 40, 60, 100, 150, 200].map((n) => '<option' + (n === saved.stack ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label></div>' +
          '<h4>Opponents</h4><div class="form seats">' + seatSel() + '</div>' +
          '<div class="row"><button id="sb-back">BACK</button><button id="sb-go" class="go">DEAL ME IN</button></div></div>'
      );
      $('#sb-bl').value = saved.bb; $('#sb-th').value = saved.theme;
      $$('select[data-seat]').forEach((s) => (s.value = saved.opp[Number(s.dataset.seat) - 1] || 'random'));
      $('#sb-seats').onchange = (e) => { collect(); saved.seats = Number(e.target.value); draw(); };
      on('#sb-back', UI.menu);
      on('#sb-go', () => {
        collect();
        PT.store.set('pt_sandbox', saved);
        const c = PT.CASINOS[saved.bb], bb = c.bb;
        UI.playTable({
          mode: 'sandbox', level: Math.min(10, saved.bb + 1), heroStack: bb * saved.stack, back: UI.sandbox,
          cfg: { sb: c.sb, bb, seats: saved.seats, minBuy: bb * 20, maxBuy: bb * 250, level: saved.bb + 1, guests: false },
          oppIds: saved.opp.slice(0, saved.seats - 1), themeIdx: saved.theme, title: 'Sandbox · ' + PT.CASINOS[saved.theme].name,
          char: d ? d.char : PT.defaultChar, equipped: d ? d.equipped : {}, name: d ? d.name : 'You',
        });
      });
    };
    const collect = () => {
      saved.bb = Number($('#sb-bl').value); saved.theme = Number($('#sb-th').value); saved.stack = Number($('#sb-st').value);
      $$('select[data-seat]').forEach((s) => (saved.opp[Number(s.dataset.seat) - 1] = s.value));
    };
    draw();
  };
})();
