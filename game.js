// ============================================================
// RUSSIAN ROULETTE — game.js
//
// IMAGE LOGIC:
//   img4 = idle   (not your turn)
//   img1 = active (your turn, gun in hand)
//   img2 = dead from SHOOT (shot yourself)
//   img5 = dead from SHOOT OTHER (shot by opponent)
//
// TURN FLOW:
//   startTurn()
//     → idle char = img4, active char = img1
//     → if player: enable buttons
//     → if bot: disable ALL buttons, schedule doBotTurn()
//   doBotTurn() runs ONCE, calls shootSelf("bot") or shootOther("bot")
//   after any action → passTurn() or restartRound()
// ============================================================

const DIFF = {
  easy:   { spinChance:.65, shootOtherChance:.40, desc:"Bot spins often. Less aggressive." },
  medium: { spinChance:.35, shootOtherChance:.58, desc:"Balanced behavior." },
  hard:   { spinChance:.07, shootOtherChance:.78, desc:"Bot almost never spins. Very aggressive." },
};

// ── STATE ────────────────────────────────────────────────────
const G = {
  difficulty: "easy",
  playerLives: 3,
  botLives: 3,
  cylinder: [],
  bulletPos: 0,
  turn: "player",       // "player" | "bot"
  playerTurn: false,    // TRUE only when it is actually the player's turn and they can act
  spunThisTurn: false,
};

// ── DOM ──────────────────────────────────────────────────────
function el(id){ return document.getElementById(id); }

const D = {
  sMenu:    el("screen-menu"),
  sSpin:    el("screen-spin"),
  sGame:    el("screen-game"),
  sOver:    el("screen-gameover"),
  diffDesc: el("diff-desc"),
  diffBtns: document.querySelectorAll(".diff-btn"),
  btnStart: el("btn-start"),
  spinP:    el("spin-img-player"),
  spinB:    el("spin-img-bot"),
  gunSpin:  el("gun-spinner"),
  spinRes:  el("spin-result"),
  imgP:     el("img-player"),
  imgB:     el("img-bot"),
  livesP:   el("player-lives"),
  livesB:   el("bot-lives"),
  chambers: el("chambers"),
  turnLbl:  el("turn-label"),
  btnSpin:  el("btn-spin"),
  btnShoot: el("btn-shoot"),
  btnOther: el("btn-shoot-other"),
  status:   el("status-msg"),
  goTitle:  el("go-title"),
  goImg:    el("go-img"),
  goMsg:    el("go-msg"),
  btnRest:  el("btn-restart"),
  btnMenu:  el("btn-menu"),
};

// ── HELPERS ──────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function showScreen(s){
  [D.sMenu, D.sSpin, D.sGame, D.sOver].forEach(x => x.classList.remove("active"));
  s.classList.add("active");
}

function setImg(who, key){
  (who === "player" ? D.imgP : D.imgB).src = IMG[key];
}

function setStatus(msg){ D.status.textContent = msg; }

// The ONLY place buttons are enabled/disabled
// During bot turn: all three are disabled via playerTurn=false
function updateButtons(spinAllowed){
  const on = G.playerTurn;
  D.btnSpin.disabled  = !on || !spinAllowed;
  D.btnShoot.disabled = !on;
  D.btnOther.disabled = !on;
}

// ── CYLINDER ─────────────────────────────────────────────────
function loadCylinder(){
  G.cylinder = [false,false,false,false,false,false];
  G.cylinder[Math.floor(Math.random() * 6)] = true;
  G.bulletPos = 0;
}

function spinCylinder(){ G.bulletPos = Math.floor(Math.random() * 6); }

function pullTrigger(){
  const fired = G.cylinder[G.bulletPos];
  G.bulletPos = (G.bulletPos + 1) % 6;
  return fired;
}

function renderChambers(){
  D.chambers.innerHTML = "";
  for(let i = 0; i < 6; i++){
    const d = document.createElement("div");
    d.className = "chamber" + (i === G.bulletPos ? " cur" : "");
    D.chambers.appendChild(d);
  }
}

// ── LIVES ────────────────────────────────────────────────────
function renderLives(){
  function draw(el, n){
    el.innerHTML = "";
    for(let i = 0; i < 3; i++){
      const h = document.createElement("div");
      h.className = "heart" + (i >= n ? " lost" : "");
      el.appendChild(h);
    }
  }
  draw(D.livesP, G.playerLives);
  draw(D.livesB, G.botLives);
}

// ── GAME OVER ────────────────────────────────────────────────
function doGameOver(playerWon){
  G.playerTurn = false;
  updateButtons(false);
  showScreen(D.sOver);
  if(playerWon){
    D.goTitle.textContent = "YOU WIN!";
    D.goTitle.className   = "go-title win";
    D.goImg.src           = IMG.img4;
    D.goMsg.textContent   = "The bot has been eliminated.";
  } else {
    D.goTitle.textContent = "YOU DIED";
    D.goTitle.className   = "go-title lose";
    D.goImg.src           = IMG.img2;
    D.goMsg.textContent   = "The bullet found its mark.";
  }
}

// ── RESTART ROUND ────────────────────────────────────────────
async function restartRound(whoJustDied){
  await sleep(1400);
  setImg("player", "img4");
  setImg("bot",    "img4");
  loadCylinder();
  G.turn = (whoJustDied === "player") ? "bot" : "player";
  startTurn();
}

// ── START TURN ───────────────────────────────────────────────
function startTurn(){
  G.spunThisTurn = false;
  renderChambers();

  // idle char → img4, active char → img1
  setImg(G.turn === "player" ? "bot" : "player", "img4");
  setImg(G.turn, "img1");

  if(G.turn === "player"){
    D.turnLbl.textContent = "YOUR TURN";
    D.turnLbl.className   = "turn-label";
    G.playerTurn = true;          // ← player can now click
    updateButtons(true);
    setStatus("Choose your action.");
  } else {
    D.turnLbl.textContent = "BOT'S TURN";
    D.turnLbl.className   = "turn-label bot-turn";
    G.playerTurn = false;         // ← player CANNOT click
    updateButtons(false);
    setStatus("Bot is deciding...");
    setTimeout(doBotTurn, 900 + Math.random() * 600);
  }
}

// ── PASS TURN ────────────────────────────────────────────────
function passTurn(){
  G.turn = (G.turn === "player") ? "bot" : "player";
  startTurn();
}

// ── SHOOT SELF ───────────────────────────────────────────────
async function shootSelf(who){
  const fired = pullTrigger();
  renderChambers();

  if(fired){
    setStatus(who === "player" ? "BANG! You shot yourself!" : "BANG! Bot shot itself!");
    setImg(who, "img2");
    await sleep(1000);
    if(who === "player") G.playerLives--;
    else                  G.botLives--;
    renderLives();
    if(G.playerLives <= 0){ doGameOver(false); return; }
    if(G.botLives    <= 0){ doGameOver(true);  return; }
    await restartRound(who);
  } else {
    setStatus("Click! Empty chamber. Turn passes.");
    await sleep(800);
    passTurn();
  }
}

// ── SHOOT OTHER ──────────────────────────────────────────────
async function shootOther(who){
  const other = (who === "player") ? "bot" : "player";
  const fired = pullTrigger();
  renderChambers();

  if(fired){
    setStatus(who === "player" ? "BANG! You shot the bot!" : "BANG! Bot shot you!");
    setImg(other, "img5");
    await sleep(1000);
    if(other === "player") G.playerLives--;
    else                    G.botLives--;
    renderLives();
    if(G.playerLives <= 0){ doGameOver(false); return; }
    if(G.botLives    <= 0){ doGameOver(true);  return; }
    await restartRound(other);
  } else {
    setStatus("Click! Empty. Nothing happens.");
    await sleep(800);
    passTurn();
  }
}

// ── BOT TURN (called once by setTimeout) ────────────────────
async function doBotTurn(){
  // Extra safety: if somehow it's player turn now, abort
  if(G.turn !== "bot") return;

  const cfg = DIFF[G.difficulty];

  // Maybe spin first
  if(!G.spunThisTurn && Math.random() < cfg.spinChance){
    G.spunThisTurn = true;
    spinCylinder();
    renderChambers();
    setStatus("Bot spins the cylinder...");
    await sleep(900);
  }

  // Shoot other or shoot self — one action, then done
  if(Math.random() < cfg.shootOtherChance){
    setStatus("Bot aims at you...");
    await sleep(600);
    await shootOther("bot");
  } else {
    setStatus("Bot points the gun at itself...");
    await sleep(600);
    await shootSelf("bot");
  }
}

// ── PLAYER BUTTONS ───────────────────────────────────────────
D.btnSpin.addEventListener("click", async () => {
  if(!G.playerTurn || G.spunThisTurn) return;
  G.playerTurn = false;       // lock while animating
  updateButtons(false);
  G.spunThisTurn = true;
  spinCylinder();
  renderChambers();
  setStatus("You spin the cylinder...");
  await sleep(700);
  setStatus("Done. Now choose.");
  G.playerTurn = true;
  updateButtons(false);       // spin used, so spinAllowed=false
});

D.btnShoot.addEventListener("click", async () => {
  if(!G.playerTurn) return;
  G.playerTurn = false;
  updateButtons(false);
  await shootSelf("player");
});

D.btnOther.addEventListener("click", async () => {
  if(!G.playerTurn) return;
  G.playerTurn = false;
  updateButtons(false);
  await shootOther("player");
});

// ── DIFFICULTY BUTTONS ───────────────────────────────────────
D.diffBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    D.diffBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    G.difficulty = btn.dataset.diff;
    D.diffDesc.textContent = DIFF[G.difficulty].desc;
  });
});

// ── INITIAL GUN SPIN ─────────────────────────────────────────
async function initialSpin(){
  showScreen(D.sSpin);
  D.spinP.src  = IMG.img4;
  D.spinB.src  = IMG.img4;
  D.gunSpin.src = IMG.gun;
  D.spinRes.textContent = "\u00a0";
  await sleep(400);

  const first = Math.random() < .5 ? "player" : "bot";
  const ea    = 1080 + (first === "player" ? 180 : 0);
  D.gunSpin.style.setProperty("--ea", ea + "deg");
  D.gunSpin.classList.remove("spinning");
  void D.gunSpin.offsetWidth;
  D.gunSpin.classList.add("spinning");

  await sleep(2700);
  D.spinRes.textContent = first === "player" ? "YOU GO FIRST!" : "BOT GOES FIRST!";
  await sleep(1600);

  G.turn = first;
  showScreen(D.sGame);
  startTurn();
}

// ── START GAME ───────────────────────────────────────────────
function startGame(){
  G.playerLives  = 3;
  G.botLives     = 3;
  G.spunThisTurn = false;
  G.playerTurn   = false;
  loadCylinder();
  renderLives();
  renderChambers();
  initialSpin();
}

D.btnStart.addEventListener("click",   startGame);
D.btnRest.addEventListener("click",    startGame);
D.btnMenu.addEventListener("click",    () => showScreen(D.sMenu));
