# Pixel Poker Trainer

> **Work in progress.** This game is still in active development. Features are incomplete, things may break or change between updates, and game balance (REP, bankroll pacing, AI strength) is still being tuned. Saves are stored in your browser and could be reset by future updates. Feedback and bug reports are welcome.

Top-down pixel-art Texas Hold'em (no-limit cash) built as a trainer for private games.

## Run it
Double-click `index.html`. No server, no build step, no dependencies (plain scripts, so it works from `file://`).
Use a modern desktop browser (Chrome, Edge, Firefox, Safari). Progress saves in your browser's localStorage.

## Modes
- **Career** – create a player (skin, wrist build, arm hair, cuffs), start with $500 and climb 10 venues
  (Garage Game to The Vault). REP unlocks venues and shop items. Bankroll = your money; you buy in at each table.
- **Sandbox** – pick seats (2-9), stakes, venue, stack depth and exactly which of the 25 personalities sit at the table.
- **Training** – 12 stages (basics, hand ranks, betting/side pots, starting hands + Chen formula, outs & Rule of 2/4,
  pot odds & equity, EV & implied odds, preflop strategy, postflop/SPR/MDF, combinatorics, reading players, final exam).
  Every quiz generates fresh numbers. Passing a stage (80%) pays a one-time career bankroll bonus.
  The **Coach Table** is a live game with all aids on and a review of every decision you make.

## Training aids (Settings → Training aids, or the AIDS button at the table)
Shows your current hand, preflop rank, equity vs random and vs a strong range, outs and draws,
pot odds, SPR, and a recommended action. The winning hand always pops up at showdown.
Hover any opponent for VPIP / PFR / aggression (and their personality in sandbox/coach or if enabled).

## Keys
F fold · C check/call · R bet/raise (uses the slider) · Space next hand

## Files
- `js/poker.js` evaluator, equity (Monte Carlo), outs, Chen ranking
- `js/personalities.js` the 25 player types (tune vpip/pfr/agg/bluff/etc. here)
- `js/ai.js` decision logic · `js/game.js` table engine (blinds, betting, side pots, showdown)
- `js/render.js` all canvas pixel art (cards, chips, avatars, wrists, accessories)
- `js/career.js` venues, rep/bankroll rules, and the shop item list
- `js/training.js` lessons and quiz generators · `js/coach.js` live coach
- `js/ui.js`, `js/session.js` menus and the in-game HUD · `js/audio.js` chiptune

## Version 2 additions
- **Graphics:** animated dealing, chips sliding to bets and into the pot, card flips at showdown, winner sparkles, fireworks for a royal/straight flush, hats and hairstyles on opponents, venue decor, ambient dust.
- **Shop:** outfits, full-arm tattoo sleeves, small tattoos, gloves, watches, bracelets, rings, hats, glasses, necklaces, card protectors, card backs and table felts. A full-body figure previews everything.
- **Secrets:** rare hands and feats unlock items that can never be bought (check the SECRETS button in the career hub).
- **Opponents:** they now read ranges instead of random hands, and the sharper personalities adapt to how *you* play (VPIP, aggression, how often you fold to bets). A Drunk Uncle guest sometimes sits in low-stakes games. House rules in Settings: straddles, run it twice, host rake.
- **Session report:** after every session, a profit graph, VPIP/PFR/aggression, notes on your style, your biggest mistakes with estimated cost, and your best and worst hands.
- **Spot drills:** replay your own mistakes, random coach-checked spots, and range-reading questions. Mistakes are tracked silently even with training aids switched off.
