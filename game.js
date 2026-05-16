// ============================================================
// RUSSIAN ROULETTE — game.js
// ============================================================
//
// IMAGE MAP:
//   char_normal      = img4 — idle (waiting, not your turn)
//   char_holding_gun = img1 — active (your turn, gun in hand)
//   char_shot_head   = img2 — shot in head → DEAD → restart round
//   char_dead        = img5 — destroyed  → DEAD → restart round
//   gun_only         = img3/img7 — pistol (spinner)
//
// TURN FLOW:
//   1. Active player switches from img4 → img1
//   2. Buttons: SPIN | SHOOT | SHOOT OTHER
//   3a. SPIN   → reseta cylinder, remove SPIN button, show only SHOOT + SHOOT OTHER
//   3b. SHOOT  → pull trigger on self
//        empty → stay img1, turn ends (switch turn)
//        hit   → img2 → lose life → if lives=0 game over, else restart round
//   3c. SHOOT OTHER → pull trigger on opponent
//        empty → nothing visible, turn ends
//        hit   → opponent goes img5 → lose life → if lives=0 game over, else restart round
//   Restart round = reload cylinder, both back to img4, switch turn
// ============================================================

const DIFF = {
  easy:   { spinChance: 0.65, shootOtherChance: 0.40, desc: 'Bot spins often. Less aggressive.' },
  medium: { spinChance: 0.35, shootOtherChance: 0.58, desc: 'Balanced behavior.' },
  hard:   { spinChance: 0.07, shootOtherChance: 0.78, desc: 'Bot almost never spins. Very aggressive.' },
};

// ── STATE ────────────────────────────────────────────────────
let G = {
  difficulty: 'easy',
  playerLives: 3,
  botLives: 3,
  cylinder: [],   // 6 booleans, one true = bullet
  bulletPos: 0,
  turn: 'player', // 'player' | 'bot'
  spunThisTurn: false,
  busy: false,
};

// ── DOM ──────────────────────────────────────────────────────
const byId = id => document.getElementById(id);

const SCR = {
  menu:     byId('screen-menu'),
  spin:     byId('screen-spin'),
  game:     byId('screen-game'),
  gameover: byId('screen-gameover'),
};

const EL = {
  // menu
  diffBtns:    document.querySelectorAll('.diff-btn'),
  diffDesc:    byId('diff-desc'),
  btnStart:    byId('btn-start'),
  // spin
  spinImgP:    byId('spin-img-player'),
  spinImgB:    byId('spin-img-bot'),
  gunSpinner:  byId('gun-spinner'),
  spinResult:  byId('spin-result'),
  // game
  imgPlayer:   byId('img-player'),
  imgBot:      byId('img-bot'),
  playerLives: byId('player-lives'),
  botLives:    byId('bot-lives'),
  chambers:    byId('chambers'),
  turnLabel:   byId('turn-label'),
  btnSpin:     byId('btn-spin'),
  btnShoot:    byId('btn-shoot'),
  btnShootOther: byId('btn-shoot-other'),
  statusMsg:   byId('status-msg'),
  // gameover
  goTitle:     byId('go-title'),
  goImg:       byId('go-img'),
  goMsg:       byId('go-msg'),
  btnRestart:  byId('btn-restart'),
  btnMenu:     byId('btn-menu'),
};

// ── UTIL ─────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function showScreen(name) {
  Object.values(SCR).forEach(s => s.classList.remove('active'));
  SCR[name].classList.add('active');
}

// ── CYLINDER ─────────────────────────────────────────────────
function loadCylinder() {
  G.cylinder = [false,false,false,false,false,false];
  G.cylinder[Math.floor(Math.random() * 6)] = true;
  G.bulletPos = 0;
}

function spinCylinder() {
  G.bulletPos = Math.floor(Math.random() * 6);
}

function pullTrigger() {
  const fired = G.cylinder[G.bulletPos];
  G.bulletPos = (G.bulletPos + 1) % 6;
  return fired;
}

function renderChambers() {
  EL.chambers.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const d = document.createElement('div');
    d.className = 'chamber' + (i === G.bulletPos ? ' current' : '');
    EL.chambers.appendChild(d);
  }
}

// ── LIVES ────────────────────────────────────────────────────
function renderLives() {
  function draw(el, count) {
    el.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const h = document.createElement('div');
      h.className = 'heart' + (i >= count ? ' lost' : '');
      el.appendChild(h);
    }
  }
  draw(EL.playerLives, G.playerLives);
  draw(EL.botLives, G.botLives);
}

// ── IMAGES ───────────────────────────────────────────────────
function setImg(who, key) {
  const el = who === 'player' ? EL.imgPlayer : EL.imgBot;
  el.src = IMAGES[key];
}

// ── STATUS / BUTTONS ─────────────────────────────────────────
function setStatus(msg) { EL.statusMsg.textContent = msg; }

function setButtons(spin, shoot, shootOther) {
  EL.btnSpin.disabled       = !spin;
  EL.btnShoot.disabled      = !shoot;
  EL.btnShootOther.disabled = !shootOther;
}

function lockButtons() { setButtons(false, false, false); }

// ── GAME OVER ────────────────────────────────────────────────
function gameOver(playerWon) {
  showScreen('gameover');
  if (playerWon) {
    EL.goTitle.textContent = 'YOU WIN!';
    EL.goTitle.className = 'go-title win';
    EL.goImg.src = IMAGES.char_normal;
    EL.goMsg.textContent = 'The bot has been eliminated.';
  } else {
    EL.goTitle.textContent = 'YOU DIED';
    EL.goTitle.className = 'go-title lose';
    EL.goImg.src = IMAGES.char_dead;
    EL.goMsg.textContent = 'The bullet found its mark.';
  }
}

// ── RESTART ROUND ────────────────────────────────────────────
// Called after any death. Reloads cylinder, resets both to img4, switches turn.
async function restartRound(killedWho) {
  await sleep(1400);
  // Both back to idle
  setImg('player', 'char_normal');
  setImg('bot',    'char_normal');
  loadCylinder();
  G.spunThisTurn = false;
  G.busy = false;
  // Turn goes to whoever was NOT killed (they "go next")
  G.turn = killedWho === 'player' ? 'bot' : 'player';
  startTurn();
}

// ── TURN ─────────────────────────────────────────────────────
function startTurn() {
  G.spunThisTurn = false;
  G.busy = false;
  renderChambers();

  // Idle player → img4
  const idle = G.turn === 'player' ? 'bot' : 'player';
  setImg(idle, 'char_normal');

  // Active player → img1 (holding gun)
  setImg(G.turn, 'char_holding_gun');

  if (G.turn === 'player') {
    EL.turnLabel.textContent = 'YOUR TURN';
    EL.turnLabel.className = 'turn-label';
    setStatus('Choose your action.');
    setButtons(true, true, true);
  } else {
    EL.turnLabel.textContent = "BOT'S TURN";
    EL.turnLabel.className = 'turn-label bot';
    setStatus('Bot is deciding...');
    lockButtons();
    setTimeout(doBotTurn, 900 + Math.random() * 600);
  }
}

function passTurn() {
  // No death — just switch who plays
  G.turn = G.turn === 'player' ? 'bot' : 'player';
  G.spunThisTurn = false;
  startTurn();
}

// ── ACTIONS ──────────────────────────────────────────────────

async function doSpin(who) {
  G.spunThisTurn = true;
  spinCylinder();
  renderChambers();
  setStatus(who === 'player' ? 'You spin the cylinder...' : 'Bot spins the cylinder...');
  await sleep(600);
  if (who === 'player') {
    setStatus('Done. Now choose: SHOOT or SHOOT OTHER.');
    setButtons(false, true, true); // no more spin this turn
    G.busy = false;
  }
  // for bot: caller handles next step
}

async function doShootSelf(who) {
  // Shoot yourself
  const fired = pullTrigger();
  renderChambers();

  if (fired) {
    // HIT — img2 (char_shot_head) = death
    setStatus(who === 'player' ? 'BANG! You shot yourself!' : 'BANG! Bot shot itself!');
    setImg(who, 'char_shot_head');
    await sleep(900);

    if (who === 'player') G.playerLives--;
    else                   G.botLives--;
    renderLives();

    if (G.playerLives <= 0) { gameOver(false); return; }
    if (G.botLives <= 0)    { gameOver(true);  return; }

    await restartRound(who);
  } else {
    // EMPTY — stay img1, turn passes
    setStatus(who === 'player' ? 'Click! Empty chamber. Turn passes.' : 'Click! Empty. Turn passes.');
    await sleep(800);
    passTurn();
  }
}

async function doShootOther(who) {
  // Shoot the opponent
  const other = who === 'player' ? 'bot' : 'player';
  const fired = pullTrigger();
  renderChambers();

  if (fired) {
    // HIT — opponent gets img5 (char_dead) = death
    setStatus(who === 'player' ? 'BANG! You shot the bot!' : 'BANG! Bot shot you!');
    setImg(other, 'char_dead');
    await sleep(900);

    if (other === 'player') G.playerLives--;
    else                     G.botLives--;
    renderLives();

    if (G.playerLives <= 0) { gameOver(false); return; }
    if (G.botLives <= 0)    { gameOver(true);  return; }

    await restartRound(other);
  } else {
    // EMPTY — nothing happens, turn passes
    setStatus(who === 'player' ? 'Click! Empty. Nothing happens.' : 'Click! Empty. Nothing happens.');
    await sleep(800);
    passTurn();
  }
}

// ── BOT AI ───────────────────────────────────────────────────
// Bot plays ONCE per turn. No loops.
async function doBotTurn() {
  if (G.busy) return; // safety guard
  G.busy = true;

  const cfg = DIFF[G.difficulty];

  // Decision: spin first?
  if (!G.spunThisTurn && Math.random() < cfg.spinChance) {
    await doSpin('bot');
    await sleep(500);
    // Now decide shoot or shoot other (no more spin option)
    if (Math.random() < cfg.shootOtherChance) {
      setStatus('Bot aims at you...');
      await sleep(500);
      await doShootOther('bot');
    } else {
      setStatus('Bot points at itself...');
      await sleep(500);
      await doShootSelf('bot');
    }
  } else {
    // No spin — decide shoot or shoot other
    if (Math.random() < cfg.shootOtherChance) {
      setStatus('Bot aims at you...');
      await sleep(500);
      await doShootOther('bot');
    } else {
      setStatus('Bot points at itself...');
      await sleep(500);
      await doShootSelf('bot');
    }
  }
}

// ── PLAYER BUTTON EVENTS ─────────────────────────────────────
EL.btnSpin.addEventListener('click', async () => {
  if (G.busy || G.turn !== 'player' || G.spunThisTurn) return;
  G.busy = true;
  lockButtons();
  await doSpin('player');
  // doSpin re-enables buttons and sets busy=false for player
});

EL.btnShoot.addEventListener('click', async () => {
  if (G.busy || G.turn !== 'player') return;
  G.busy = true;
  lockButtons();
  await doShootSelf('player');
});

EL.btnShootOther.addEventListener('click', async () => {
  if (G.busy || G.turn !== 'player') return;
  G.busy = true;
  lockButtons();
  await doShootOther('player');
});

// ── DIFFICULTY BUTTONS ───────────────────────────────────────
EL.diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    EL.diffBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    G.difficulty = btn.dataset.diff;
    EL.diffDesc.textContent = DIFF[G.difficulty].desc;
  });
});

// ── INITIAL SPIN (who goes first) ────────────────────────────
async function initialSpin() {
  showScreen('spin');
  EL.spinImgP.src  = IMAGES.char_normal;
  EL.spinImgB.src  = IMAGES.char_normal;
  EL.gunSpinner.src = IMAGES.gun_only;
  EL.spinResult.textContent = '';

  await sleep(500);

  // Random who goes first
  const first = Math.random() < 0.5 ? 'player' : 'bot';

  // Spin animation: multiple full rotations + land pointing left (player) or right (bot)
  const extra = first === 'player' ? 180 : 0;
  const endAngle = 1080 + extra;
  EL.gunSpinner.style.setProperty('--end-angle', endAngle + 'deg');
  EL.gunSpinner.classList.remove('spinning');
  void EL.gunSpinner.offsetWidth; // force reflow
  EL.gunSpinner.classList.add('spinning');

  await sleep(2700);

  EL.spinResult.textContent = first === 'player' ? '🎯 YOU GO FIRST!' : '🤖 BOT GOES FIRST!';
  await sleep(1800);

  G.turn = first;
  showScreen('game');
  startTurn();
}

// ── START / RESTART GAME ─────────────────────────────────────
function startGame() {
  G.playerLives  = 3;
  G.botLives     = 3;
  G.spunThisTurn = false;
  G.busy         = false;
  loadCylinder();
  renderLives();
  renderChambers();
  initialSpin();
}

EL.btnStart.addEventListener('click', startGame);
EL.btnRestart.addEventListener('click', startGame);
EL.btnMenu.addEventListener('click', () => showScreen('menu'));
