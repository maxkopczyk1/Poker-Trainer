(function () {
  const PT = window.PT;

  // ---------------- Casinos (10 levels) ----------------
  const C = (lv, name, tag, sb, bb, minBuy, maxBuy, rep, seats, th) => ({ lv, name, tag, sb, bb, minBuy, maxBuy, rep, seats, th });
  PT.CASINOS = [
    C(1, "The Garage Game", "A folding table, a cooler of beer, and a few friends of friends.", 1, 2, 80, 200, 0, 6, { a: '#4b4a52', b: '#44434b', rail: '#6b4a2b', hi: '#8a6238', felt: '#2f7d4a' }),
    C(2, "Corner Pub Backroom", "Cigarette smoke, sticky floors, and a landlord who deals.", 2, 4, 160, 400, 150, 6, { a: '#5a2230', b: '#4e1c2a', rail: '#4a2f1b', hi: '#6a4528', felt: '#24663f' }),
    C(3, "Bowling Alley Lounge", "Strikes in the distance. Real money on the felt.", 5, 10, 400, 1000, 400, 6, { a: '#2a2d5a', b: '#262952', rail: '#2b2b3a', hi: '#454560', felt: '#2a5d8f' }),
    C(4, "Riverboat Casino", "Slow water, fast cards. Gamblers of every stripe.", 10, 20, 800, 2000, 900, 7, { a: '#6a1d1d', b: '#5c1818', rail: '#7b5a2a', hi: '#a37d3c', felt: '#1f6b55' }),
    C(5, "Desert Card Room", "Sun-baked hustlers and long quiet nights.", 25, 50, 2000, 5000, 1800, 7, { a: '#8a6c45', b: '#7d6240', rail: '#5a3b1e', hi: '#7c5430', felt: '#a03b2a' }),
    C(6, "Harbor Club", "Yacht money. Everyone smiles, nobody gives anything away.", 50, 100, 4000, 10000, 3500, 8, { a: '#1e3350', b: '#1a2e48', rail: '#8a6a35', hi: '#b8914a', felt: '#1c4f8a' }),
    C(7, "Vegas Strip Room", "Neon, comps, and sharks in cheap suits.", 100, 200, 8000, 20000, 6500, 8, { a: '#1c1030', b: '#18102a', rail: '#3a2a5a', hi: '#c8a2ff', felt: '#7a1fa0' }),
    C(8, "Monaco Salon", "Marble floors. Quiet money. Very sharp players.", 250, 500, 20000, 50000, 11000, 9, { a: '#3d3a35', b: '#36332e', rail: '#b08d3c', hi: '#e0c068', felt: '#0f5c3a' }),
    C(9, "Macau High Roller Suite", "Red and gold. Fortunes change hands before the coffee cools.", 500, 1000, 40000, 100000, 18000, 9, { a: '#701010', b: '#640e0e', rail: '#d4a017', hi: '#ffe27a', felt: '#b01c2e' }),
    C(10, "The Vault", "Invitation only. The best players alive. Black felt, no mercy.", 1000, 2000, 80000, 200000, 30000, 9, { a: '#0d0d12', b: '#0a0a0e', rail: '#d9d9e8', hi: '#ffffff', felt: '#14141a' }),
  ];
  PT.TITLES = ['Fresh Fish', 'Home Gamer', 'Regular', 'Grinder', 'Card Shark', 'High Roller', 'Table Captain', 'Pit Boss Rival', 'Legend', 'Poker Royalty'];

  // ---------------- Shop ----------------
  const SLOTS = {
    watch: ['wristL', 'wristR'], bracelet: ['braceletL', 'braceletR'], tattoo: ['tattooL', 'tattooR'], sleeve: ['sleeveL', 'sleeveR'],
    ring: ['ringL', 'ringR'], gloves: ['gloveL', 'gloveR'], outfit: ['outfit'], hat: ['hat'], glasses: ['glasses'], necklace: ['necklace'],
    protector: ['protector'], cardback: ['cardback'], felt: ['felt'],
  };
  PT.SLOTS = SLOTS;
  PT.SHOP_CATS = [['outfit', 'Outfits'], ['sleeve', 'Arm Sleeves'], ['tattoo', 'Tattoos'], ['watch', 'Watches'], ['bracelet', 'Bracelets'], ['ring', 'Rings'], ['gloves', 'Gloves'], ['hat', 'Hats'], ['glasses', 'Glasses'], ['necklace', 'Necklaces'], ['protector', 'Card Protectors'], ['cardback', 'Card Backs'], ['felt', 'Table Felt']];

  const ANCHOR = ['0001000', '0011100', '0001000', '1111111', '0001000', '0001000', '1001001', '1101011', '0111110'];
  const SKULL = ['0111110', '1111111', '1011101', '1011101', '1111111', '0110110', '0111110', '0101010'];
  const DICE = ['1111111', '1000001', '1010101', '1000001', '1010101', '1000001', '1111111'];
  const HEART = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
  const SPADE = ['0001000', '0011100', '0111110', '1111111', '1111111', '0001000', '0011100'];
  const SNAKE = ['011100', '110000', '110000', '011100', '000110', '000011', '000011', '001110', '011000', '110000', '110000', '011100', '000110', '000010'];
  const BARCODE = Array(7).fill('1011010111');
  const TRIBAL = ['1000100010', '0101010101', '0010001000', '1000100010', '0101010101', '0010001000'];
  const COIN = ['0111110', '1122211', '1211121', '1211121', '1211121', '1122211', '0111110'];
  const ROSE = ['0110110', '1111111', '1101011', '0111110', '0011100', '0001000', '0101010', '0010100'];
  const CLOVER = ['0110110', '1111111', '0111110', '1111111', '0110110', '0010000', '0010000'];
  const COMPASS = ['0001000', '0001000', '0011100', '1111111', '0011100', '0001000', '0001000'];
  const FLAG = ['1111000', '1111100', '1111000', '1000000', '1000000', '1000000', '1000000'];
  const CRACKED = ['0110110', '1111111', '1110111', '0111110', '0011100', '0001000'];
  const RABBIT = ['0011000', '0111100', '0111100', '0011100', '0011100', '0111110', '0101010'];
  const BLACKCARD = ['2222222', '2111112', '2122212', '2111112', '2222222'];

  const S = (id, cat, name, price, rep, desc, o) => Object.assign({ id, cat, name, price, rep, desc }, o);
  const O = (id, name, price, rep, desc, o) => S(id, 'outfit', name, price, rep, desc, o);
  PT.SHOP = [
    // outfits (sleeves / cuffs you see at the table and on your full-body figure)
    O('o1', 'Casual Tee', 100, 0, 'Bare forearms, no fuss. Shows off your ink.', { style: 'tee', top: 999, c: '#3a7ab8', c2: '#3a7ab8', cuffH: 0 }),
    O('o2', 'Rolled Sleeves', 300, 0, 'Sleeves up. Ready to work.', { style: 'rolled', top: 336, c: '#c8d0dc', c2: '#aab2c0', cuffH: 0 }),
    O('o3', 'Hoodie', 700, 0, 'Comfy, hooded, and suspiciously calm.', { style: 'ribbed', top: 332, c: '#4a4a62', c2: '#33334a', cuffH: 7 }),
    O('o8', 'Hawaiian Shirt', 800, 0, 'Loud print. Opponents underestimate you.', { style: 'hawaii', top: 334, c: '#1c8a8a', c2: '#e8d8a0', cuffH: 0 }),
    O('o4', 'Denim Jacket', 1500, 150, 'Broken in and well loved.', { style: 'denim', top: 330, c: '#2f5d9e', c2: '#1f4378', cuffH: 5 }),
    O('o5', 'Leather Jacket', 4000, 400, 'Cold, shiny and a little dangerous.', { style: 'leather', top: 328, c: '#1c1c24', c2: '#0e0e14', cuffH: 6 }),
    O('o6', 'Pinstripe Suit', 9000, 900, 'Crisp white cuffs and gold links.', { style: 'pinstripe', top: 326, c: '#232a40', c2: '#f4f0e6', cuffH: 9, link: '#ffd84a' }),
    O('o7', 'Tuxedo', 20000, 1800, 'Satin lapels, silver links. Formal pressure.', { style: 'satin', top: 326, c: '#111116', c2: '#f4f0e6', cuffH: 9, link: '#d8dce8' }),
    O('o9', 'Gold Lame Jacket', 60000, 6500, 'You will not be missed at this table.', { style: 'satin', top: 326, c: '#c8961c', c2: '#fff4c8', cuffH: 9, link: '#fff' }),
    // full-arm sleeve tattoos
    S('s1', 'sleeve', 'Tribal Sleeve', 1500, 150, 'Bold black bands down the whole forearm.', { pat: 'tribal', ink: '#1c2230', acc: '#1c2230' }),
    S('s2', 'sleeve', 'Ocean Waves', 4000, 400, 'Rolling waves in deep blue.', { pat: 'waves', ink: '#1b3a6a', acc: '#4a7ad4' }),
    S('s3', 'sleeve', 'Dragon Scales', 6000, 900, 'Green scales with a gleam.', { pat: 'scales', ink: '#14502f', acc: '#5adc9a' }),
    S('s4', 'sleeve', 'Circuit Board', 9000, 1800, 'Neon traces under the skin.', { pat: 'circuit', ink: '#0f5a6a', acc: '#4de1ff' }),
    S('s5', 'sleeve', 'Card Suits', 12000, 1800, 'Clubs, hearts, spades and diamonds.', { pat: 'cards', ink: '#15151c', acc: '#b8203a' }),
    S('s6', 'sleeve', 'Starfield', 30000, 3500, 'A night sky from wrist to elbow.', { pat: 'stars', ink: '#241a5c', acc: '#ffd84a' }),
    S('s7', 'sleeve', 'Hellfire', 45000, 6500, 'Flames licking up your arm.', { pat: 'flames', ink: '#7a1c24', acc: '#ffb04a' }),
    // small tattoos
    S('t1', 'tattoo', 'Tribal Band', 120, 0, 'Looks painful. Was not that bad.', { sprite: TRIBAL, ink: '#1c2230' }),
    S('t2', 'tattoo', 'Anchor', 200, 0, 'Stay put in the face of a bad beat.', { sprite: ANCHOR, ink: '#1b3a6a' }),
    S('t11', 'tattoo', 'Four-Leaf Clover', 600, 0, 'Luck, on purpose.', { sprite: CLOVER, ink: '#1d6a3a' }),
    S('t3', 'tattoo', 'Ace of Spades', 400, 150, 'Subtle. Not at all.', { sprite: SPADE, ink: '#15151c' }),
    S('t4', 'tattoo', 'Lucky Dice', 700, 150, 'Wrong game, right energy.', { sprite: DICE, ink: '#7a1c24' }),
    S('t9', 'tattoo', 'Rose', 900, 150, 'Beautiful and a little thorny.', { sprite: ROSE, ink: '#a01c34' }),
    S('t5', 'tattoo', 'Skull', 1500, 400, 'For the player who never folds.', { sprite: SKULL, ink: '#1a1a22' }),
    S('t10', 'tattoo', 'Compass Star', 1800, 400, 'Always finds the pot.', { sprite: COMPASS, ink: '#1b3a6a' }),
    S('t6', 'tattoo', 'Barcode', 2200, 400, 'Every hand has a price.', { sprite: BARCODE, ink: '#15151c' }),
    S('t7', 'tattoo', 'Serpent', 4000, 900, 'Cold-blooded. Patient.', { sprite: SNAKE, ink: '#1d5a3a' }),
    S('t8', 'tattoo', 'Heartbreaker', 6500, 900, 'Hearts always win. Right?', { sprite: HEART, ink: '#b8203a' }),
    // watches
    S('w1', 'watch', 'Plastic Digital', 60, 0, 'Tells time. Mostly.', { band: '#2a2a30', face: '#9bd18a', bezel: '#555', style: 'digital' }),
    S('w2', 'watch', 'Steel Field Watch', 250, 0, 'Reliable and unfussy.', { band: '#6a6a72', face: '#e8e8e0', bezel: '#9a9aa4', style: 'analog' }),
    S('w8', 'watch', 'Smartwatch', 700, 0, 'Counts your steps and your losses.', { band: '#222', face: '#0a2a4a', bezel: '#555', style: 'digital' }),
    S('w3', 'watch', 'Leather Classic', 600, 150, 'A little class for the home game.', { band: '#7a4a28', face: '#f4efe0', bezel: '#c0c0c8', style: 'analog' }),
    S('w4', 'watch', 'Diver 300', 1500, 400, 'Water resistant. You will not be needing that.', { band: '#1c3a6a', face: '#10204a', bezel: '#c8c8d0', style: 'analog' }),
    S('w5', 'watch', 'Gold Dress Watch', 6000, 900, 'Understated until it is not.', { band: '#d4a017', face: '#fff4c8', bezel: '#ffd84a', style: 'gold' }),
    S('w9', 'watch', 'Skeleton Watch', 18000, 3500, 'See the gears turn.', { band: '#3a3a44', face: '#1a2430', bezel: '#d8b24a', style: 'gold' }),
    S('w6', 'watch', 'Platinum Chronograph', 25000, 3500, 'Players notice. Some fold early.', { band: '#c8d0dc', face: '#232838', bezel: '#eef2fa', style: 'analog' }),
    S('w7', 'watch', 'Diamond Bezel Nighthawk', 90000, 11000, 'The kind of watch that has its own insurance.', { band: '#15151c', face: '#0a0a12', bezel: '#9fe8ff', style: 'diamond' }),
    // bracelets
    S('b8', 'bracelet', 'Rope Band', 60, 0, 'Twisted rope. Sailor energy.', { style: 'stripe', c1: '#c8a060', c2: '#8a6a3a' }),
    S('b1', 'bracelet', 'Friendship Band', 20, 0, 'Made by someone who believed in you.', { style: 'stripe', c1: '#e04a6a', c2: '#ffd84a' }),
    S('b2', 'bracelet', 'Leather Cuff', 80, 0, 'Plain, brown, honest.', { style: 'solid', c1: '#6a4025', c2: '#8a5a38' }),
    S('b3', 'bracelet', 'Lucky Beads', 120, 0, 'Blessed by a cousin. Possibly.', { style: 'beads', c1: '#3aa0d8', c2: '#f4f0e6' }),
    S('b7', 'bracelet', 'Spiked Cuff', 400, 0, 'Do not shake hands.', { style: 'chain', c1: '#8a8a96', c2: '#2a2a32' }),
    S('b4', 'bracelet', 'Silver Chain', 500, 150, 'Light, bright, a bit loud.', { style: 'chain', c1: '#d8dce8', c2: '#8a8fa0' }),
    S('b5', 'bracelet', 'Gold Chain', 3000, 900, 'Heavy gold. Heavy attitude.', { style: 'chain', c1: '#ffd84a', c2: '#b8860b' }),
    S('b6', 'bracelet', 'Onyx Beads', 8000, 1800, 'Black stones, cold stare.', { style: 'beads', c1: '#1a1a22', c2: '#6a6a7a' }),
    S('b9', 'bracelet', 'Solid Gold Cuff', 14000, 3500, 'A heavy statement.', { style: 'solid', c1: '#ffd84a', c2: '#fff4c8' }),
    // rings
    S('r1', 'ring', 'Tin Ring', 40, 0, 'From a vending machine.', { color: '#a8a8b0', gem: null }),
    S('r6', 'ring', 'Signet Ring', 1200, 0, 'Family crest, probably fake.', { color: '#ffd84a', gem: null }),
    S('r2', 'ring', 'Silver Band', 350, 150, 'A classic.', { color: '#d8dce8', gem: null }),
    S('r3', 'ring', 'Ruby Ring', 2500, 900, 'Red like fresh chips.', { color: '#ffd84a', gem: '#e0203a' }),
    S('r7', 'ring', 'Skull Ring', 3500, 400, 'Gothic and a little rude.', { color: '#8a8a96', gem: '#e8e8e0' }),
    S('r4', 'ring', 'Emerald Ring', 9000, 1800, 'Felt-green fortune.', { color: '#ffd84a', gem: '#20d070' }),
    S('r8', 'ring', 'Sapphire Ring', 18000, 3500, 'Deep blue, deeper pockets.', { color: '#e8eef8', gem: '#3a6aff' }),
    S('r5', 'ring', 'Diamond Ring', 45000, 6500, 'The glint that gets noticed.', { color: '#e8eef8', gem: '#9fe8ff' }),
    // gloves
    S('g1', 'gloves', 'Dealer Gloves', 1200, 0, 'White cotton. Very professional.', { color: '#f4f0e6', full: true }),
    S('g2', 'gloves', 'Fingerless Leather', 600, 150, 'Grip and attitude.', { color: '#3a2a20', full: false }),
    S('g3', 'gloves', 'Black Leather Gloves', 2500, 400, 'Cool, hidden hands.', { color: '#15151c', full: true }),
    S('g4', 'gloves', 'Gold Knuckle Gloves', 15000, 3500, 'Fingerless, in gold.', { color: '#d4a017', full: false }),
    // hats (visible on your full-body figure)
    S('h1', 'hat', 'Beanie', 150, 0, 'Warm and low-key.', { hat: 'beanie', color: '#b8203a' }),
    S('h2', 'hat', 'Baseball Cap', 200, 0, 'Brim down, eyes hidden.', { hat: 'cap', color: '#2f5d9e' }),
    S('h3', 'hat', 'Cowboy Hat', 1500, 150, 'Boots not included.', { hat: 'cowboy', color: '#8a5a30' }),
    S('h4', 'hat', 'Fedora', 2500, 400, 'Classic card room.', { hat: 'fedora', color: '#2a2a32' }),
    S('h5', 'hat', 'Top Hat', 9000, 900, 'Gentleman gambler.', { hat: 'top', color: '#15151c' }),
    // glasses
    S('gl3', 'glasses', 'Round Specs', 300, 0, 'Looks smart. Might be.', { glass: 'round', color: '#2a2a32' }),
    S('gl1', 'glasses', 'Aviators', 400, 0, 'Classic mirrored shades.', { glass: 'shades', color: '#c8a030' }),
    S('gl2', 'glasses', 'Poker Shades', 1200, 0, 'Hide your tells.', { glass: 'shades', color: '#111118' }),
    S('gl4', 'glasses', 'Neon Visor', 7000, 900, 'Cyberpunk sharp.', { glass: 'visor', color: '#4de1ff' }),
    // necklaces
    S('n1', 'necklace', 'Dog Tag', 200, 0, 'Dull silver, loud story.', { color: '#a8a8b0', drop: '#a8a8b0' }),
    S('n4', 'necklace', 'Lucky Clover Charm', 500, 0, 'Pure hope.', { color: '#c8a030', drop: '#20d070' }),
    S('n2', 'necklace', 'Gold Chain Necklace', 3000, 400, 'Heavy and shiny.', { color: '#ffd84a', drop: '#ffd84a' }),
    S('n3', 'necklace', 'Diamond Pendant', 25000, 3500, 'Subtle. Not at all.', { color: '#e8eef8', drop: '#9fe8ff' }),
    // card protectors
    S('p1', 'protector', 'Gold Coin', 150, 0, 'Weighs your cards down. Lucky.', { sprite: COIN, pal: { 1: '#8a6508', 2: '#ffd84a' } }),
    S('p2', 'protector', 'Little Skull', 800, 150, 'Keeps your cards, and a bit of intimidation.', { sprite: SKULL, pal: { 1: '#e8e8e0' } }),
    S('p3', 'protector', 'Red Die', 1800, 400, 'You are rolling now.', { sprite: DICE, pal: { 1: '#d8203a' } }),
    S('p4', 'protector', 'Lucky Spade', 5000, 900, 'A gilded spade.', { sprite: SPADE, pal: { 1: '#ffd84a' } }),
    S('p5', 'protector', 'Heart Token', 12000, 1800, 'Poker has a heart after all.', { sprite: HEART, pal: { 1: '#ff6a9a' } }),
    // card backs
    S('c1', 'cardback', 'Classic Red', 0, 0, 'The standard issue.', { c1: '#9b1c31', c2: '#d4455b', pattern: 'check' }),
    S('c2', 'cardback', 'Midnight Blue', 300, 0, 'Quiet and sharp.', { c1: '#1c2f6a', c2: '#4a6ad4', pattern: 'diamond' }),
    S('c7', 'cardback', 'Teal Check', 900, 150, 'Cool and crisp.', { c1: '#0f4a5c', c2: '#4de1ff', pattern: 'check' }),
    S('c3', 'cardback', 'Black & Gold', 2500, 400, 'The high rollers pattern.', { c1: '#15151c', c2: '#d4a017', pattern: 'diamond' }),
    S('c6', 'cardback', 'Crimson Diamond', 4500, 900, 'Sharp and expensive.', { c1: '#5c0f1c', c2: '#ff6a8a', pattern: 'diamond' }),
    S('c4', 'cardback', 'Emerald Stripe', 6000, 900, 'Cool and calm.', { c1: '#0f5c3a', c2: '#5adc9a', pattern: 'stripe' }),
    S('c8', 'cardback', 'Gold Foil', 15000, 3500, 'Dealt straight from the vault.', { c1: '#8a6508', c2: '#ffe27a', pattern: 'stripe' }),
    S('c5', 'cardback', 'Neon Violet', 20000, 3500, 'Arcade after dark.', { c1: '#2a0f5c', c2: '#ff4ad8', pattern: 'check' }),
    // table felts
    S('f1', 'felt', 'Royal Blue Felt', 800, 0, 'Cool blue baize.', { felt: '#2a5d8f' }),
    S('f2', 'felt', 'Crimson Felt', 800, 0, 'A bold, warm table.', { felt: '#9a2a38' }),
    S('f3', 'felt', 'Violet Felt', 1500, 150, 'Regal and strange.', { felt: '#6a2a98' }),
    S('f4', 'felt', 'Black-Out Felt', 3000, 400, 'Moody and expensive.', { felt: '#16161c' }),
    S('f5', 'felt', 'Classic Casino Green', 500, 0, 'The traditional look.', { felt: '#1f7a45' }),
    S('f6', 'felt', 'Gold Rush Felt', 12000, 1800, 'The table that shines.', { felt: '#b8861c' }),
    // ---- secret items (earned from achievements; never for sale) ----
    S('w10', 'watch', 'Royal Gold Watch', 0, 0, 'Awarded for a Royal Flush.', { band: '#ffd84a', face: '#1a1030', bezel: '#fff4a0', style: 'diamond', secret: true, ach: 'royal' }),
    S('h6', 'hat', 'Royal Crown', 0, 0, 'Awarded for a Royal Flush.', { hat: 'crown', color: '#ffd84a', secret: true, ach: 'royal' }),
    S('r9', 'ring', 'Straight Flush Ring', 0, 0, 'Awarded for a Straight Flush.', { color: '#ffd84a', gem: '#ff4ad8', secret: true, ach: 'sf' }),
    S('b10', 'bracelet', 'Four Aces Bracelet', 0, 0, 'Awarded for Four of a Kind.', { style: 'beads', c1: '#d8203a', c2: '#f4f0e6', secret: true, ach: 'quads' }),
    S('p6', 'protector', 'Lucky Rabbit Foot', 0, 0, 'Awarded for winning with 7-2 offsuit.', { sprite: RABBIT, pal: { 1: '#e8e0d0' }, secret: true, ach: 'sevendeuce' }),
    S('t12', 'tattoo', 'Cracked Heart', 0, 0, 'Awarded for a monstrous bad beat.', { sprite: CRACKED, ink: '#444450', secret: true, ach: 'badbeat' }),
    S('s8', 'sleeve', 'Hot Streak Flames', 0, 0, 'Awarded for five wins in a row.', { pat: 'flames', ink: '#c8341c', acc: '#ffe27a', secret: true, ach: 'streak5' }),
    S('t13', 'tattoo', 'White Flag', 0, 0, 'Awarded for folding pocket aces.', { sprite: FLAG, ink: '#d8d8e0', secret: true, ach: 'foldaces' }),
    S('h7', 'hat', 'Whale Hunter Fedora', 0, 0, 'Awarded for winning a 100bb pot.', { hat: 'fedora', color: '#b8861c', secret: true, ach: 'whale' }),
    S('h8', 'hat', 'Graduate Cap', 0, 0, 'Awarded for finishing all training.', { hat: 'grad', color: '#15151c', secret: true, ach: 'graduate' }),
    S('gl5', 'glasses', 'Professor Spectacles', 0, 0, 'Awarded for finishing all training.', { glass: 'round', color: '#c8a030', secret: true, ach: 'graduate' }),
    S('p7', 'protector', 'Black Card', 0, 0, 'Awarded for earning a seat at The Vault.', { sprite: BLACKCARD, pal: { 1: '#101018', 2: '#ffd84a' }, secret: true, ach: 'vault' }),
    O('o10', 'Tuxedo Noir', 0, 0, 'Awarded for earning a seat at The Vault.', { style: 'satin', top: 326, c: '#08080c', c2: '#e8e0f0', cuffH: 9, link: '#ffd84a', secret: true, ach: 'vault' }),
    S('n5', 'necklace', 'Platinum Chain', 0, 0, 'Awarded for holding $1,000,000.', { color: '#e8eef8', drop: '#9fe8ff', secret: true, ach: 'million' }),
  ];
  PT.shopById = {};
  PT.SHOP.forEach((i) => (PT.shopById[i.id] = i));

  PT.ACH = [
    { id: 'royal', name: 'Royal Flush', hint: 'Hit the unhittable.', items: ['w10', 'h6'] },
    { id: 'sf', name: 'Straight Flush', hint: 'Five in a row, all one suit.', items: ['r9'] },
    { id: 'quads', name: 'Four of a Kind', hint: 'Four of a kind.', items: ['b10'] },
    { id: 'sevendeuce', name: 'Seven-Deuce Magic', hint: 'Win a showdown with the worst starting hand.', items: ['p6'] },
    { id: 'badbeat', name: 'Monstrous Bad Beat', hint: 'Lose a showdown holding four of a kind or better.', items: ['t12'] },
    { id: 'streak5', name: 'Hot Streak', hint: 'Win five hands in a row.', items: ['s8'] },
    { id: 'foldaces', name: 'The Hero Fold', hint: 'Fold pocket aces before the flop.', items: ['t13'] },
    { id: 'whale', name: 'Whale Hunter', hint: 'Win a pot worth 100 big blinds or more.', items: ['h7'] },
    { id: 'graduate', name: 'Poker Graduate', hint: 'Complete all 12 training stages.', items: ['h8', 'gl5'] },
    { id: 'vault', name: 'The Inner Circle', hint: 'Earn your seat at The Vault.', items: ['p7', 'o10'] },
    { id: 'million', name: 'Millionaire', hint: 'Hold $1,000,000 in bankroll.', items: ['n5'] },
  ];

  // ---------------- Career state ----------------
  const KEY = 'pt_career_v1';
  const DEFAULT_CHAR = { skin: 1, hair: 1, build: 1, cuff: 0, hairStyle: 0, hairColor: 1, beard: 0, eyes: 0, pants: 0 };
  PT.CUFFS = ['#e8e4dc', '#1c1c24', '#2f5d9e', '#8a2230', '#2f7d4a', '#d4a017'];
  PT.PANTS = ['#2a3040', '#1c1c24', '#4a3a2a', '#2f5d9e', '#6b6b78', '#8a2230'];
  PT.EYES = ['#2a1a10', '#2f5d9e', '#2f7d4a', '#7a5a2a', '#6a6a78'];
  PT.HAIR_STYLES = ['Short', 'Buzz', 'Bald', 'Long', 'Ponytail', 'Afro', 'Mohawk', 'Slick'];
  PT.BEARDS = ['None', 'Stubble', 'Goatee', 'Full'];
  PT.defaultChar = DEFAULT_CHAR;

  const Career = (PT.Career = {
    data: null,
    exists() { return !!PT.store.get(KEY, null); },
    load() {
      const d = PT.store.get(KEY, null);
      if (d) {
        d.char = Object.assign({}, DEFAULT_CHAR, d.char || {});
        d.ach = d.ach || {}; d.streak = d.streak || 0;
        d.equipped = d.equipped || {}; d.owned = d.owned || ['c1'];
      }
      this.data = d;
      return d;
    },
    save() { if (this.data) PT.store.set(KEY, this.data); },
    create(name, char) {
      this.data = {
        name: name || 'Player', char: Object.assign({}, DEFAULT_CHAR, char), bankroll: 500, rep: 0, owned: ['c1'], equipped: { cardback: 'c1' },
        stats: { hands: 0, wins: 0, biggest: 0, sessions: 0, profit: 0, best: 0 }, claimed: [], ach: {}, streak: 0,
      };
      this.save();
      return this.data;
    },
    wipe() { PT.store.del(KEY); this.data = null; },
    mult(level) { return Math.pow(1.45, level - 1); },
    unlocked(level) { return this.data.rep >= PT.CASINOS[level - 1].rep; },
    highest() { let h = 1; PT.CASINOS.forEach((c) => { if (this.data.rep >= c.rep) h = c.lv; }); return h; },
    title() { return PT.TITLES[this.highest() - 1]; },
    nextCasino() { return PT.CASINOS.find((c) => this.data.rep < c.rep) || null; },
    handResult(level, sum) {
      const d = this.data, st = d.stats;
      st.hands++;
      let gain = 0;
      if (sum.heroWon) {
        st.wins++;
        st.biggest = Math.max(st.biggest, sum.profit);
        gain = this.mult(level) * (1.5 + Math.min(sum.profit / sum.bb, 60) / 6);
        d.rep += gain;
      }
      this.save();
      return gain;
    },
    cashOut(level, stack, buyIn) {
      const d = this.data, c = PT.CASINOS[level - 1], profit = stack - buyIn;
      d.bankroll += stack;
      d.stats.sessions++;
      d.stats.profit += profit;
      d.stats.best = Math.max(d.stats.best, profit);
      let bonus = 0;
      if (profit > 0) bonus = this.mult(level) * (profit / c.bb) * 0.4;
      else if (stack <= 0) bonus = -this.mult(level) * 10;
      d.rep = Math.max(0, d.rep + bonus);
      this.save();
      return { profit, bonus };
    },
    buy(id) {
      const it = PT.shopById[id], d = this.data;
      if (it.secret || d.owned.includes(id) || d.bankroll < it.price || d.rep < it.rep) return false;
      d.bankroll -= it.price; d.owned.push(id); this.save();
      return true;
    },
    equip(slot, id) { if (id) this.data.equipped[slot] = id; else delete this.data.equipped[slot]; this.save(); },
    grant(achId) {
      const d = this.data;
      if (d.ach[achId]) return null;
      d.ach[achId] = true;
      const a = PT.ACH.find((x) => x.id === achId);
      a.items.forEach((i) => { if (!d.owned.includes(i)) d.owned.push(i); });
      this.save();
      return a;
    },
    // Called after each hand in career mode. Returns newly unlocked achievements.
    checkHand(h) {
      const d = this.data, out = [];
      const g = (id) => { const a = this.grant(id); if (a) out.push(a); };
      d.streak = h.heroWon ? (d.streak || 0) + 1 : 0;
      if (d.streak >= 5) g('streak5');
      if (h.foldedPreAces) g('foldaces');
      if (h.profit >= h.bb * 100) g('whale');
      if (!h.folded && h.board.length === 5) {
        const sc = PT.evaluate(h.hole.concat(h.board)), dc = PT.decode(sc);
        if (dc.cat === 8) g(dc.d[0] === 12 ? 'royal' : 'sf');
        if (dc.cat === 7) g('quads');
        if (dc.cat >= 7 && h.showdown && !h.heroWon) g('badbeat');
        const r = h.hole.map((c) => c >> 2).sort((a, b) => a - b);
        if (h.showdown && h.heroWon && r[0] === 0 && r[1] === 5 && (h.hole[0] & 3) !== (h.hole[1] & 3)) g('sevendeuce');
      }
      this.save();
      return out;
    },
    // Called when the hub opens.
    checkMeta() {
      const d = this.data, out = [];
      const t = PT.store.get('pt_training', { done: {} });
      if (this.highest() >= 10) { const a = this.grant('vault'); if (a) out.push(a); }
      if (Object.keys(t.done).filter((k) => t.done[k]).length >= 12) { const a = this.grant('graduate'); if (a) out.push(a); }
      if (d.bankroll >= 1000000) { const a = this.grant('million'); if (a) out.push(a); }
      return out;
    },
    claimTraining() {
      const t = PT.store.get('pt_training', { done: {} }), d = this.data;
      let total = 0;
      Object.keys(t.done).forEach((k) => {
        if (t.done[k] && !d.claimed.includes(k)) { d.claimed.push(k); total += 40 * (Number(k) + 1); }
      });
      if (total) { d.bankroll += total; this.save(); }
      return total;
    },
  });
})();
