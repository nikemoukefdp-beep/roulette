// ============================================================
// RUSSIAN ROULETTE GAME - game.js
// ============================================================

const DIFF_CONFIG = {
  easy:   { botSpinChance: 0.7, botShootSelfChance: 0.2, botShootOtherChance: 0.4, label: 'Bot hesita mais. Spin frequente.' },
  medium: { botSpinChance: 0.4, botShootSelfChance: 0.35, botShootOtherChance: 0.55, label: 'Comportamento balanceado.' },
  hard:   { botSpinChance: 0.1, botShootSelfChance: 0.5,  botShootOtherChance: 0.8,  label: 'Bot agressivo. Quase nunca dá spin.' },
};

// ---- STATE ----
let state = {
  difficulty: 'easy',
  playerLives: 3,
  botLives: 3,
  maxLives: 3,
  cylinder: [],      // 6 slots, true = bullet
  bulletPos: 0,      // which chamber is "up"
  currentTurn: 'player', // 'player' | 'bot'
  playerSpun: false,
  botSpun: false,
  busy: false,
};

// ---- ELEMENTS ----
const screens = {
  menu: document.getElementById('screen-menu'),
  spin: document.getElementById('screen-spin'),
  game: document.getElementById('screen-game'),
  gameover: document.getElementById('screen-gameover'),
};

const els = {
  diffBtns: document.querySelectorAll('.diff-btn'),
  diffDesc: document.getElementById('diff-desc'),
  btnStart: document.getElementById('btn-start'),
  gunSpinner: document.getElementById('gun-spinner'),
  spinResult: document.getElementById('spin-result'),
  imgPlayer: document.getElementById('img-player'),
  imgBot: document.getElementById('img-bot'),
  centerGun: document.getElementById('center-gun'),
  centerGunArea: document.getElementById('center-gun-area'),
  playerLives: document.getElementById('player-lives'),
  botLives: document.getElementById('bot-lives'),
  chambers: document.getElementById('chambers'),
  turnIndicator: document.getElementById('turn-indicator'),
  actionButtons: document.getElementById('action-buttons'),
  btnSpin: document.getElementById('btn-spin'),
  btnShoot: document.getElementById('btn-shoot'),
  btnShootOther: document.getElementById('btn-shoot-other'),
  statusMsg: document.getElementById('status-msg'),
  gameoverTitle: document.getElementById('gameover-title'),
  gameoverImg: document.getElementById('gameover-img'),
  gameoverMsg: document.getElementById('gameover-msg'),
  btnRestart: document.getElementById('btn-restart'),
  btnMenu: document.getElementById('btn-menu'),
  slotPlayer: document.getElementById('slot-player'),
  slotBot: document.getElementById('slot-bot'),
};

// ---- SCREENS ----
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ---- DIFFICULTY ----
els.diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    els.diffBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.difficulty = btn.dataset.diff;
    els.diffDesc.textContent = DIFF_CONFIG[state.difficulty].label;
  });
});

// ---- CYLINDER ----
function loadCylinder() {
  state.cylinder = [false, false, false, false, false, false];
  const bulletSlot = Math.floor(Math.random() * 6);
  state.cylinder[bulletSlot] = true;
  state.bulletPos = 0;
}

function advanceCylinder() {
  state.bulletPos = (state.bulletPos + 1) % 6;
}

function currentChamberLoaded() {
  return state.cylinder[state.bulletPos];
}

function spinCylinder() {
  state.bulletPos = Math.floor(Math.random() * 6);
}

function updateChamberUI() {
  els.chambers.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const div = document.createElement('div');
    div.className = 'chamber';
    if (i === state.bulletPos) div.classList.add('active');
    // don't reveal bullet position to player — just show active chamber
    els.chambers.appendChild(div);
  }
}

// ---- LIVES ----
function updateLivesUI() {
  els.playerLives.innerHTML = '';
  els.botLives.innerHTML = '';
  for (let i = 0; i < state.maxLives; i++) {
    const h = document.createElement('div');
    h.className = 'life-heart' + (i >= state.playerLives ? ' lost' : '');
    els.playerLives.appendChild(h);
  }
  for (let i = 0; i < state.maxLives; i++) {
    const h = document.createElement('div');
    h.className = 'life-heart' + (i >= state.botLives ? ' lost' : '');
    els.botLives.appendChild(h);
  }
}

// ---- IMAGE HELPERS ----
function setPlayerImg(key) {
  els.imgPlayer.src = IMAGES[key];
}
function setBotImg(key) {
  els.imgBot.src = IMAGES[key];
}

// ---- STATUS ----
function setStatus(msg) {
  els.statusMsg.textContent = msg;
}

// ---- TURN INDICATOR ----
function updateTurnUI() {
  if (state.currentTurn === 'player') {
    els.turnIndicator.textContent = 'SEU TURNO';
    els.turnIndicator.classList.remove('bot-turn');
    els.slotPlayer.classList.add('active');
    els.slotBot.classList.remove('active');
  } else {
    els.turnIndicator.textContent = 'TURNO DO BOT';
    els.turnIndicator.classList.add('bot-turn');
    els.slotBot.classList.add('active');
    els.slotPlayer.classList.remove('active');
  }
}

// ---- BUTTON STATES ----
function setPlayerButtons(enabled, spinUsed) {
  els.btnShoot.disabled = !enabled;
  els.btnShootOther.disabled = !enabled;
  els.btnSpin.disabled = !enabled || spinUsed;
}

// ---- FLASH EFFECTS ----
function flashEl(el, cls) {
  el.classList.remove(cls, 'shake');
  void el.offsetWidth;
  el.classList.add(cls);
  return new Promise(r => setTimeout(r, 400));
}

// ---- SLEEP ----
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- SHOOT LOGIC ----
async function doShoot(shooter, target) {
  // shooter shoots at target
  const fired = currentChamberLoaded();
  advanceCylinder();
  updateChamberUI();

  const shooterImg = shooter === 'player' ? els.imgPlayer : els.imgBot;
  const targetImg  = target  === 'player' ? els.imgPlayer : els.imgBot;

  // Show holding-gun image for shooter
  if (shooter === 'player') setPlayerImg('char_holding_gun');
  else setBotImg('char_holding_gun');

  await sleep(600);

  if (fired) {
    // TARGET gets hit
    await flashEl(targetImg, 'flash-red');
    if (target === 'player') {
      setPlayerImg('char_shot_head');
      state.playerLives--;
    } else {
      setBotImg('char_shot_head');
      state.botLives--;
    }
    updateLivesUI();
    await sleep(800);

    // Check game over
    if (state.playerLives <= 0 || state.botLives <= 0) {
      await sleep(400);
      endGame(state.playerLives <= 0 ? 'lose' : 'win');
      return;
    }

    // Show dead pose briefly then reset
    if (target === 'player') setPlayerImg('char_dead');
    else setBotImg('char_dead');
    await sleep(1000);

    // Reset for next round
    resetRound();
  } else {
    // EMPTY CHAMBER — click sound via visual
    await flashEl(shooterImg, 'flash-gold');
    await sleep(400);

    // shooter survives — go back to normal
    if (shooter === 'player') setPlayerImg('char_normal');
    else setBotImg('char_normal');

    // Switch turn
    switchTurn();
  }
}

async function doShootSelf(who) {
  // Same as doShoot but target = self
  const fired = currentChamberLoaded();
  advanceCylinder();
  updateChamberUI();

  const selfImg = who === 'player' ? els.imgPlayer : els.imgBot;

  if (who === 'player') setPlayerImg('char_holding_gun');
  else setBotImg('char_holding_gun');
  await sleep(600);

  if (fired) {
    await flashEl(selfImg, 'flash-red');
    if (who === 'player') {
      setPlayerImg('char_shot_head');
      state.playerLives--;
    } else {
      setBotImg('char_shot_head');
      state.botLives--;
    }
    updateLivesUI();
    await sleep(800);

    if (state.playerLives <= 0 || state.botLives <= 0) {
      await sleep(400);
      endGame(state.playerLives <= 0 ? 'lose' : 'win');
      return;
    }

    if (who === 'player') setPlayerImg('char_dead');
    else setBotImg('char_dead');
    await sleep(1000);
    resetRound();
  } else {
    await flashEl(selfImg, 'flash-gold');
    await sleep(400);
    if (who === 'player') setPlayerImg('char_normal');
    else setBotImg('char_normal');
    // Self-shoot miss = keep same turn (you go again)
    setStatus('Câmara vazia... você mantém o turno.');
    await sleep(800);
    startTurn();
  }
}

function resetRound() {
  loadCylinder();
  state.playerSpun = false;
  state.botSpun = false;
  setPlayerImg('char_normal');
  setBotImg('char_normal');
  switchTurn();
}

function switchTurn() {
  state.currentTurn = state.currentTurn === 'player' ? 'bot' : 'player';
  if (state.currentTurn === 'player') state.playerSpun = false;
  else state.botSpun = false;
  startTurn();
}

// ---- TURN MANAGEMENT ----
function startTurn() {
  updateTurnUI();
  updateChamberUI();
  state.busy = false;

  if (state.currentTurn === 'player') {
    setPlayerButtons(true, state.playerSpun);
    setStatus('Escolha sua ação...');
  } else {
    setPlayerButtons(false, true);
    setStatus('Bot está pensando...');
    setTimeout(() => botTurn(), 1200 + Math.random() * 800);
  }
}

// ---- BOT AI ----
async function botTurn() {
  const cfg = DIFF_CONFIG[state.difficulty];
  const bulletChance = 1 / 6;

  // Decision logic based on difficulty
  let action;

  if (!state.botSpun && Math.random() < cfg.botSpinChance) {
    action = 'spin';
  } else {
    // After spin (or decides not to), choose shoot target
    const rand = Math.random();
    if (rand < cfg.botShootOtherChance) {
      action = 'shoot_other'; // shoot player
    } else {
      action = 'shoot_self';
    }
  }

  if (action === 'spin') {
    setStatus('Bot deu SPIN no tambor...');
    state.botSpun = true;
    spinCylinder();
    updateChamberUI();
    await sleep(1000);
    // After spin, decide again
    await sleep(800);
    botDecideAfterSpin(cfg);
  } else if (action === 'shoot_other') {
    setStatus('Bot está mirando em você...');
    await sleep(600);
    await doShoot('bot', 'player');
  } else {
    setStatus('Bot atira em si mesmo...');
    await sleep(600);
    await doShootSelf('bot');
  }
}

async function botDecideAfterSpin(cfg) {
  setStatus('Bot decide o que fazer...');
  await sleep(800);
  const rand = Math.random();
  if (rand < cfg.botShootOtherChance) {
    setStatus('Bot está mirando em você...');
    await sleep(600);
    await doShoot('bot', 'player');
  } else {
    setStatus('Bot atira em si mesmo...');
    await sleep(600);
    await doShootSelf('bot');
  }
}

// ---- PLAYER ACTIONS ----
els.btnSpin.addEventListener('click', async () => {
  if (state.busy || state.currentTurn !== 'player' || state.playerSpun) return;
  state.busy = true;
  state.playerSpun = true;
  spinCylinder();
  setStatus('Você girou o tambor!');
  setPlayerButtons(false, true);
  await sleep(600);
  updateChamberUI();
  await sleep(400);
  // Show only shoot options now
  setPlayerButtons(true, true); // spin disabled, others enabled
  setStatus('Agora escolha: atirar em si ou no outro.');
  state.busy = false;
});

els.btnShoot.addEventListener('click', async () => {
  if (state.busy || state.currentTurn !== 'player') return;
  state.busy = true;
  setPlayerButtons(false, true);
  setStatus('Você atira em si mesmo...');
  await doShootSelf('player');
});

els.btnShootOther.addEventListener('click', async () => {
  if (state.busy || state.currentTurn !== 'player') return;
  state.busy = true;
  setPlayerButtons(false, true);
  setStatus('Você mira no bot...');
  await doShoot('player', 'bot');
});

// ---- GAME OVER ----
function endGame(result) {
  showScreen('gameover');
  if (result === 'win') {
    els.gameoverTitle.textContent = 'VOCÊ VENCEU!';
    els.gameoverTitle.className = 'gameover-title win';
    els.gameoverImg.src = IMAGES.char_normal;
    els.gameoverImg.style.filter = 'drop-shadow(0 0 20px gold)';
    els.gameoverMsg.textContent = 'O bot foi eliminado. Você sobreviveu à roleta.';
  } else {
    els.gameoverTitle.textContent = 'VOCÊ MORREU';
    els.gameoverTitle.className = 'gameover-title lose';
    els.gameoverImg.src = IMAGES.char_dead;
    els.gameoverImg.style.filter = 'drop-shadow(0 0 20px red)';
    els.gameoverMsg.textContent = 'A bala encontrou seu alvo. Fim de jogo.';
  }
}

els.btnRestart.addEventListener('click', () => startGame());
els.btnMenu.addEventListener('click', () => showScreen('menu'));

// ---- INITIAL SPIN (who goes first) ----
async function doInitialSpin() {
  showScreen('spin');
  els.gunSpinner.src = IMAGES.gun_only;
  els.spinResult.textContent = '';

  await sleep(600);

  // Pick random final angle — if result points "right" = bot goes first, "left" = player first
  const goesFirst = Math.random() < 0.5 ? 'player' : 'bot';
  // Angle: spin 3 full rotations + landing
  const landingAngle = goesFirst === 'player' ? 180 : 0; // pointing left = player, right = bot
  const totalRotation = 1080 + landingAngle;
  els.gunSpinner.style.setProperty('--final-angle', totalRotation + 'deg');
  els.gunSpinner.classList.remove('spinning');
  void els.gunSpinner.offsetWidth;
  els.gunSpinner.classList.add('spinning');

  await sleep(2800);
  els.spinResult.textContent = goesFirst === 'player' ? '🎯 VOCÊ COMEÇA!' : '🤖 BOT COMEÇA!';

  await sleep(2000);

  state.currentTurn = goesFirst;
  showScreen('game');
  startTurn();
}

// ---- START GAME ----
function startGame() {
  state.playerLives = 3;
  state.botLives = 3;
  state.playerSpun = false;
  state.botSpun = false;
  state.busy = false;

  loadCylinder();
  updateLivesUI();
  updateChamberUI();

  // Set initial images
  setPlayerImg('char_normal');
  setBotImg('char_normal');

  // Center gun
  els.centerGun.src = IMAGES.gun_only;
  els.centerGun.classList.add('hidden');

  doInitialSpin();
}

// ---- START BUTTON ----
els.btnStart.addEventListener('click', () => {
  startGame();
});

// ---- INIT ----
(function init() {
  // Set default images for menu preview (just ensure IMAGES loaded)
  window.addEventListener('load', () => {
    if (typeof IMAGES === 'undefined') {
      console.error('images.js not loaded!');
    }
  });
})();
