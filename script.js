/* =========================================================================
   GIRLFRIEND'S DAY SECRET — CONFIG
   -------------------------------------------------------------------------
   Everything you are likely to want to personalise lives in this block.
   Nothing else in the file needs to be touched to re-theme the puzzles.
   ========================================================================= */
const CONFIG = {

  // ---- Puzzle 1 : Romantic riddle -----------------------------------
  // EDIT ME: swap the riddle and/or the accepted answers (lowercase).
  PUZZLE1_RIDDLE:
    "I have no wings, but I fly to you every time you smile. " +
    "I have no voice, but you always hear me loud and clear. What am I?",
  PUZZLE1_ANSWERS: ["heart", "my heart", "your heart", "love"],
  PUZZLE1_HINT: "Hint: it beats a little faster whenever you're close.",
  PUZZLE1_ATTEMPTS_BEFORE_HINT: 3,

  // ---- Puzzle 2 : Special date ---------------------------------------
  // EDIT ME: set the real date that matters to you two.
  PUZZLE2_DATE: { day: 30, month: 5, year: 2026 },

  // ---- Puzzle 3 : Caesar cipher ---------------------------------------
  // EDIT ME: change the secret phrase and/or the shift amount.
  PUZZLE3_PLAINTEXT: "YOU ARE MY FAVOURITE PERSON",
  PUZZLE3_SHIFT: 3,
  PUZZLE3_HINT: "Hint: shift every letter backwards through the alphabet by the same amount.",
  PUZZLE3_ATTEMPTS_BEFORE_HINT: 2,

  // ---- Puzzle 4 : Memory question --------------------------------------
  // EDIT ME: ask about something only the two of you would know.
  PUZZLE4_QUESTION: "Where did we go on our very first date?",
  PUZZLE4_ANSWERS: ["cafe", "the cafe", "coffee shop", "our cafe"],

  // ---- Final level : six hearts ----------------------------------------
  FAKE_HEART_MESSAGES: [
    "Nope ❤️",
    "Almost...",
    "You're getting closer...",
    "Still not the real secret.",
    "You really thought it was this easy?"
  ],

  FIRST_ENVELOPE_TEXT: "You found a message... but this still isn't the real one.",
  LAST_SECRET_LINE: "There was one last secret hidden for you...",

  // ---- The real message --------------------------------------------------
  // Reproduced exactly as written.
  REAL_MESSAGE:
`don't know how time changes at first we talked on Vedant's account but now uthli ka mi zhopto ha and all.

Tu meri pahile beti thi aur ab tere sath beton ke sapne dekhta hu (minimum 2 haa.. 😄)

Mujhe tujhe milne se pahile hamesha lagta tha ki aaj gym nahi jaunga to physique pe asar padega...

Par tujhe milke samajh aaya ki mental health pe accha asar padta hai.

Abhi jyada likh nahi raha kyu ki kantala aa raha hai 😅

Par jo bhi ho...

Ye message tujhe Girlfriend's Day par milega.

Aur ek baat...

Tu hamesha mere liye special thi...

Hai...

Aur hamesha rahegi. ❤️`,

  TOTAL_LEVELS: 5
};

/* =========================================================================
   STATE
   ========================================================================= */
const state = {
  wrongAttempts: { 1: 0, 3: 0 },
  heartsOpenedCount: 0,
  fakeMsgPool: [...CONFIG.FAKE_HEART_MESSAGES],
  soundOn: localStorage.getItem("gfday_sound") !== "off",
  audioCtx: null,
  ambientNodes: null,
  typewriterRunning: false
};

/* =========================================================================
   SMALL HELPERS
   ========================================================================= */
const $ = (sel) => document.querySelector(sel);
const $id = (id) => document.getElementById(id);

function normalizeAnswer(str) {
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

function saveProgress(levelNumber) {
  try { localStorage.setItem("gfday_progress", String(levelNumber)); } catch (e) {}
}
function getSavedProgress() {
  try { return parseInt(localStorage.getItem("gfday_progress") || "0", 10); } catch (e) { return 0; }
}
function clearProgress() {
  try { localStorage.removeItem("gfday_progress"); } catch (e) {}
}

/* =========================================================================
   SCREEN TRANSITIONS + PROGRESS BAR
   ========================================================================= */
const SCREEN_IDS = [
  "loading-screen", "landing-screen",
  "level-1", "level-2", "level-3", "level-4", "level-5",
  "reveal-stage", "message-screen"
];

function goToScreen(targetId, { updateProgressFor } = {}) {
  const current = document.querySelector(".screen:not(.hidden)");
  const target = $id(targetId);
  if (!target) return;

  const show = () => {
    SCREEN_IDS.forEach((id) => {
      const el = $id(id);
      if (el && id !== targetId) el.classList.add("hidden");
    });
    target.classList.remove("hidden");
    target.classList.remove("leaving");
    // Force reflow so the screenIn animation replays every time
    void target.offsetWidth;
    target.style.animation = "none";
    void target.offsetWidth;
    target.style.animation = "";
  };

  if (current && current !== target) {
    current.classList.add("leaving");
    setTimeout(show, 480);
  } else {
    show();
  }

  const progressWrap = $id("progress-wrap");
  if (updateProgressFor) {
    progressWrap.classList.remove("hidden");
    const pct = (updateProgressFor / CONFIG.TOTAL_LEVELS) * 100;
    $id("progress-fill").style.width = pct + "%";
    $id("progress-label").textContent = `Level ${updateProgressFor} of ${CONFIG.TOTAL_LEVELS}`;
  } else if (targetId === "loading-screen" || targetId === "landing-screen") {
    progressWrap.classList.add("hidden");
  }
}

/* =========================================================================
   AMBIENT VISUALS: fireflies (canvas), floating hearts, stars, confetti
   ========================================================================= */

// ---- Fireflies -----------------------------------------------------------
const fireflyCanvas = $id("fireflies-canvas");
const fCtx = fireflyCanvas.getContext("2d");
let fireflies = [];

function resizeCanvases() {
  [fireflyCanvas, $id("confetti-canvas")].forEach((c) => {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  });
}
window.addEventListener("resize", resizeCanvases);
resizeCanvases();

function initFireflies() {
  fireflies = Array.from({ length: 22 }, () => ({
    x: Math.random() * fireflyCanvas.width,
    y: Math.random() * fireflyCanvas.height,
    r: 1 + Math.random() * 1.8,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    alpha: Math.random(),
    alphaDir: Math.random() > 0.5 ? 1 : -1
  }));
}
initFireflies();

function drawFireflies() {
  fCtx.clearRect(0, 0, fireflyCanvas.width, fireflyCanvas.height);
  fireflies.forEach((f) => {
    f.x += f.vx; f.y += f.vy;
    f.alpha += f.alphaDir * 0.006;
    if (f.alpha <= 0.1 || f.alpha >= 1) f.alphaDir *= -1;
    if (f.x < 0) f.x = fireflyCanvas.width; if (f.x > fireflyCanvas.width) f.x = 0;
    if (f.y < 0) f.y = fireflyCanvas.height; if (f.y > fireflyCanvas.height) f.y = 0;

    const grad = fCtx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 6);
    grad.addColorStop(0, `rgba(242,201,138,${f.alpha})`);
    grad.addColorStop(1, "rgba(242,201,138,0)");
    fCtx.fillStyle = grad;
    fCtx.beginPath();
    fCtx.arc(f.x, f.y, f.r * 6, 0, Math.PI * 2);
    fCtx.fill();
  });
  requestAnimationFrame(drawFireflies);
}
requestAnimationFrame(drawFireflies);

// ---- Floating hearts -------------------------------------------------
const heartsLayer = $id("floating-hearts-layer");
function spawnFloatingHeart() {
  const el = document.createElement("div");
  el.className = "floating-heart";
  el.innerHTML = "&hearts;";
  const left = Math.random() * 100;
  const size = 12 + Math.random() * 18;
  const duration = 9 + Math.random() * 8;
  const drift = (Math.random() - 0.5) * 120;
  el.style.left = left + "vw";
  el.style.fontSize = size + "px";
  el.style.setProperty("--drift", drift + "px");
  el.style.animationDuration = duration + "s";
  heartsLayer.appendChild(el);
  setTimeout(() => el.remove(), duration * 1000 + 200);
}
setInterval(spawnFloatingHeart, 1200);

// ---- Stars (finale only) ----------------------------------------------
function spawnStars(count = 60) {
  const layer = $id("stars-layer");
  layer.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "star";
    const size = 1 + Math.random() * 2.4;
    s.style.width = size + "px";
    s.style.height = size + "px";
    s.style.left = Math.random() * 100 + "%";
    s.style.top = Math.random() * 100 + "%";
    s.style.animationDelay = (Math.random() * 2.6) + "s";
    layer.appendChild(s);
  }
}

// ---- Confetti -----------------------------------------------------------
const confettiCanvas = $id("confetti-canvas");
const cCtx = confettiCanvas.getContext("2d");
let confettiParticles = [];
const CONFETTI_COLORS = ["#e78ea0", "#f2c98a", "#f3b6c2", "#d9ab6a", "#fbeef1"];

function burstConfetti(durationMs = 3200) {
  const count = 140;
  confettiParticles = Array.from({ length: count }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -20 - Math.random() * confettiCanvas.height * 0.4,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 10,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    vy: 2 + Math.random() * 3,
    vx: (Math.random() - 0.5) * 2,
    rot: Math.random() * 360,
    vRot: (Math.random() - 0.5) * 10
  }));
  const start = performance.now();
  function frame(t) {
    cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiParticles.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vRot;
      cCtx.save();
      cCtx.translate(p.x, p.y);
      cCtx.rotate((p.rot * Math.PI) / 180);
      cCtx.fillStyle = p.color;
      cCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cCtx.restore();
    });
    if (t - start < durationMs) {
      requestAnimationFrame(frame);
    } else {
      cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }
  requestAnimationFrame(frame);
}

/* =========================================================================
   SOUND — procedurally generated ambient pad using the Web Audio API
   (no external audio files needed)
   ========================================================================= */
function ensureAudioCtx() {
  if (!state.audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new Ctx();
  }
  return state.audioCtx;
}

function startAmbientSound() {
  const ctx = ensureAudioCtx();
  if (ctx.state === "suspended") ctx.resume();
  if (state.ambientNodes) return;

  const master = ctx.createGain();
  master.gain.value = 0.05;
  master.connect(ctx.destination);

  const freqs = [261.6, 329.6, 392.0]; // soft C major triad
  const oscs = freqs.map((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0;
    osc.connect(g).connect(master);
    osc.start();
    // gentle fade-in, slightly staggered
    g.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 1.4 + i * 0.3);
    return { osc, g };
  });

  // slow LFO shimmer
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.02;
  lfo.connect(lfoGain).connect(master.gain);
  lfo.start();

  state.ambientNodes = { master, oscs, lfo };
}

function stopAmbientSound() {
  if (!state.ambientNodes || !state.audioCtx) return;
  const ctx = state.audioCtx;
  const { master, oscs, lfo } = state.ambientNodes;
  master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  setTimeout(() => {
    oscs.forEach(({ osc }) => { try { osc.stop(); } catch (e) {} });
    try { lfo.stop(); } catch (e) {}
  }, 700);
  state.ambientNodes = null;
}

function playChime() {
  if (!state.soundOn) return;
  const ctx = ensureAudioCtx();
  if (ctx.state === "suspended") ctx.resume();
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    g.gain.value = 0;
    osc.connect(g).connect(ctx.destination);
    const startAt = ctx.currentTime + i * 0.12;
    osc.start(startAt);
    g.gain.linearRampToValueAtTime(0.12, startAt + 0.05);
    g.gain.linearRampToValueAtTime(0, startAt + 0.7);
    osc.stop(startAt + 0.75);
  });
}

function updateSoundIcon() {
  $id("sound-on-icon").style.display = state.soundOn ? "block" : "none";
  $id("sound-off-icon").style.display = state.soundOn ? "none" : "block";
}
updateSoundIcon();

$id("sound-toggle").addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  localStorage.setItem("gfday_sound", state.soundOn ? "on" : "off");
  updateSoundIcon();
  if (state.soundOn) startAmbientSound(); else stopAmbientSound();
});

/* =========================================================================
   RESTART
   ========================================================================= */
$id("restart-btn").addEventListener("click", () => {
  if (confirm("Restart the whole story from the beginning?")) {
    clearProgress();
    window.location.reload();
  }
});
$id("replay-btn").addEventListener("click", () => {
  clearProgress();
  window.location.reload();
});

/* =========================================================================
   LOADING → LANDING
   ========================================================================= */
window.addEventListener("load", () => {
  setTimeout(() => {
    const saved = getSavedProgress();
    if (saved > 0 && saved <= CONFIG.TOTAL_LEVELS) {
      resumeAtLevel(saved);
    } else {
      goToScreen("landing-screen");
    }
  }, 1800);
});

$id("begin-btn").addEventListener("click", startGame);
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !$id("landing-screen").classList.contains("hidden")) {
    startGame();
  }
});

function startGame() {
  if (state.soundOn) startAmbientSound();
  setupLevel1();
  goToScreen("level-1", { updateProgressFor: 1 });
  saveProgress(1);
}

function resumeAtLevel(n) {
  if (state.soundOn) startAmbientSound();
  const setups = { 1: setupLevel1, 2: setupLevel2, 3: setupLevel3, 4: setupLevel4, 5: setupLevel5 };
  setups[n]();
  goToScreen(`level-${n}`, { updateProgressFor: n });
}

/* =========================================================================
   PUZZLE 1 — RIDDLE
   ========================================================================= */
function setupLevel1() {
  $id("riddle-text").textContent = CONFIG.PUZZLE1_RIDDLE;
  $id("feedback-1").textContent = "";
  $id("hint-1").classList.add("hidden");
  $id("input-1").value = "";
}
$id("form-1").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $id("input-1");
  const val = normalizeAnswer(input.value);
  const ok = CONFIG.PUZZLE1_ANSWERS.some((a) => normalizeAnswer(a) === val);
  const feedback = $id("feedback-1");
  if (ok) {
    feedback.textContent = "Yes! ❤️";
    feedback.classList.add("ok");
    playChime();
    setTimeout(() => {
      setupLevel2();
      goToScreen("level-2", { updateProgressFor: 2 });
      saveProgress(2);
    }, 650);
  } else {
    state.wrongAttempts[1]++;
    feedback.classList.remove("ok");
    feedback.textContent = "Not quite ❤️ Try again.";
    input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake");
    if (state.wrongAttempts[1] >= CONFIG.PUZZLE1_ATTEMPTS_BEFORE_HINT) {
      const hint = $id("hint-1");
      hint.textContent = CONFIG.PUZZLE1_HINT;
      hint.classList.remove("hidden");
    }
  }
});

/* =========================================================================
   PUZZLE 2 — SPECIAL DATE
   ========================================================================= */
const MONTH_NAMES = ["january","february","march","april","may","june","july","august","september","october","november","december"];

function pad2(n) { return String(n).padStart(2, "0"); }

function buildDateVariants({ day, month, year }) {
  const monthName = MONTH_NAMES[month - 1];
  const monthAbbr = monthName.slice(0, 3);
  const yy = String(year).slice(-2);
  const raw = [
    `${pad2(day)}${pad2(month)}${year}`,
    `${day}${month}${year}`,
    `${pad2(day)}${pad2(month)}${yy}`,
    `${year}${pad2(month)}${pad2(day)}`,
    `${pad2(month)}${pad2(day)}${year}`,
    `${day}${monthName}${year}`,
    `${day}${monthAbbr}${year}`,
    `${monthName}${day}${year}`,
    `${monthAbbr}${day}${year}`,
    `${monthName}${pad2(day)}${year}`,
    `${monthAbbr}${pad2(day)}${year}`
  ];
  return raw.map((s) => s.toLowerCase());
}

function normalizeDateInput(str) {
  let s = str.toLowerCase().trim();
  s = s.replace(/(\d+)(st|nd|rd|th)/g, "$1"); // drop ordinal suffixes
  s = s.replace(/[^a-z0-9]/g, ""); // strip everything but letters/digits
  return s;
}

function setupLevel2() {
  $id("feedback-2").textContent = "";
  $id("input-2").value = "";
}
$id("form-2").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $id("input-2");
  const normalized = normalizeDateInput(input.value);
  const variants = buildDateVariants(CONFIG.PUZZLE2_DATE);
  const ok = variants.includes(normalized);
  const feedback = $id("feedback-2");
  if (ok) {
    feedback.textContent = "That's the one ❤️";
    feedback.classList.add("ok");
    playChime();
    setTimeout(() => {
      setupLevel3();
      goToScreen("level-3", { updateProgressFor: 3 });
      saveProgress(3);
    }, 650);
  } else {
    feedback.classList.remove("ok");
    feedback.textContent = "Not quite ❤️ Try again.";
    input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake");
  }
});

/* =========================================================================
   PUZZLE 3 — CAESAR CIPHER
   ========================================================================= */
function caesarEncode(text, shift) {
  return text.replace(/[A-Z]/g, (ch) => {
    const code = ((ch.charCodeAt(0) - 65 + shift) % 26 + 26) % 26;
    return String.fromCharCode(code + 65);
  });
}

function setupLevel3() {
  $id("cipher-text").textContent = caesarEncode(CONFIG.PUZZLE3_PLAINTEXT, CONFIG.PUZZLE3_SHIFT);
  $id("feedback-3").textContent = "";
  $id("hint-3").classList.add("hidden");
  $id("input-3").value = "";
}
$id("form-3").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $id("input-3");
  const val = normalizeAnswer(input.value).toUpperCase();
  const target = normalizeAnswer(CONFIG.PUZZLE3_PLAINTEXT).toUpperCase();
  const feedback = $id("feedback-3");
  if (val === target) {
    feedback.textContent = "Cracked it ❤️";
    feedback.classList.add("ok");
    playChime();
    setTimeout(() => {
      setupLevel4();
      goToScreen("level-4", { updateProgressFor: 4 });
      saveProgress(4);
    }, 650);
  } else {
    state.wrongAttempts[3]++;
    feedback.classList.remove("ok");
    feedback.textContent = "Not quite ❤️ Try again.";
    input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake");
    if (state.wrongAttempts[3] >= CONFIG.PUZZLE3_ATTEMPTS_BEFORE_HINT) {
      const hint = $id("hint-3");
      hint.textContent = CONFIG.PUZZLE3_HINT;
      hint.classList.remove("hidden");
    }
  }
});

/* =========================================================================
   PUZZLE 4 — MEMORY QUESTION
   ========================================================================= */
function setupLevel4() {
  $id("memory-question").textContent = CONFIG.PUZZLE4_QUESTION;
  $id("feedback-4").textContent = "";
  $id("input-4").value = "";
}
$id("form-4").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $id("input-4");
  const val = normalizeAnswer(input.value);
  const ok = CONFIG.PUZZLE4_ANSWERS.some((a) => normalizeAnswer(a) === val);
  const feedback = $id("feedback-4");
  if (ok) {
    feedback.textContent = "You remembered ❤️";
    feedback.classList.add("ok");
    playChime();
    setTimeout(() => {
      setupLevel5();
      goToScreen("level-5", { updateProgressFor: 5 });
      saveProgress(5);
    }, 650);
  } else {
    feedback.classList.remove("ok");
    feedback.textContent = "Not quite ❤️ Try again.";
    input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake");
  }
});

/* =========================================================================
   FINAL LEVEL — SIX HEARTS
   ========================================================================= */
const HEART_SVG = `<svg viewBox="0 0 32 29" width="34" height="34"><path fill="currentColor" d="M23.6 0c-3 0-5.7 1.6-7.6 4.1C14.1 1.6 11.4 0 8.4 0 3.8 0 0 3.7 0 8.4c0 8.4 10.6 14.6 15.1 19 .5.5 1.3.5 1.8 0 4.5-4.4 15.1-10.6 15.1-19C32 3.7 28.2 0 23.6 0z"/></svg>`;

function setupLevel5() {
  state.heartsOpenedCount = 0;
  state.fakeMsgPool = [...CONFIG.FAKE_HEART_MESSAGES];
  const grid = $id("hearts-grid");
  grid.innerHTML = "";
  $id("fake-popup").classList.add("hidden");
  $id("hearts-sub").textContent = "One of these holds the real secret. The rest are just teasing you.";

  for (let i = 0; i < 6; i++) {
    const btn = document.createElement("button");
    btn.className = "heart-btn";
    btn.innerHTML = HEART_SVG;
    btn.setAttribute("aria-label", "A mystery heart");
    btn.addEventListener("click", () => handleHeartClick(btn));
    grid.appendChild(btn);
  }
}

function handleHeartClick(btn) {
  if (btn.classList.contains("opened") || btn.classList.contains("disabled")) return;

  if (state.heartsOpenedCount < 5) {
    // fake heart
    btn.classList.add("opened");
    state.heartsOpenedCount++;
    const idx = Math.floor(Math.random() * state.fakeMsgPool.length);
    const msg = state.fakeMsgPool.splice(idx, 1)[0];
    const popup = $id("fake-popup");
    popup.textContent = msg;
    popup.classList.remove("hidden");
    popup.style.animation = "none"; void popup.offsetWidth; popup.style.animation = "";

    if (state.heartsOpenedCount === 5) {
      // find the one remaining heart and make it glow
      const hearts = Array.from(document.querySelectorAll(".heart-btn"));
      const remaining = hearts.find((h) => !h.classList.contains("opened"));
      if (remaining) {
        remaining.classList.add("glow-final");
        spawnHeartParticles(remaining);
        $id("hearts-sub").innerHTML = '<span class="wait-text">Wait...</span>';
      }
    }
  } else {
    // the real (final) heart
    document.querySelectorAll(".heart-btn").forEach((h) => h.classList.add("disabled"));
    btn.classList.add("opened");
    playChime();
    setTimeout(() => beginRevealSequence(), 500);
  }
}

function spawnHeartParticles(heartEl) {
  const interval = setInterval(() => {
    if (!heartEl.classList.contains("glow-final")) { clearInterval(interval); return; }
    const p = document.createElement("div");
    p.className = "heart-particle";
    const angle = Math.random() * Math.PI * 2;
    const dist = 24 + Math.random() * 18;
    p.style.setProperty("--px", Math.cos(angle) * dist + "px");
    p.style.setProperty("--py", Math.sin(angle) * dist + "px");
    p.style.left = "50%";
    p.style.top = "50%";
    heartEl.appendChild(p);
    setTimeout(() => p.remove(), 1800);
  }, 220);
}

/* =========================================================================
   REVEAL SEQUENCE — envelope → fake message → darkness → golden envelope
   ========================================================================= */
function beginRevealSequence() {
  // reset reveal stage
  $id("envelope").classList.remove("open");
  $id("envelope-letter-text").textContent = "❤";
  $id("envelope-caption").textContent = "Click to open";
  $id("darkness-overlay").classList.add("hidden");
  $id("last-secret-line").classList.add("hidden");
  $id("golden-envelope-wrap").classList.add("hidden");
  $id("golden-envelope").classList.remove("open");
  $id("envelope-wrap").classList.remove("hidden");

  goToScreen("reveal-stage");

  const envelope = $id("envelope");
  const openHandler = () => {
    envelope.classList.add("open");
    $id("envelope-caption").textContent = CONFIG.FIRST_ENVELOPE_TEXT;
    envelope.removeEventListener("click", openHandler);
    setTimeout(fadeToDarknessThenGolden, 2600);
  };
  envelope.addEventListener("click", openHandler);

  const keyHandler = (e) => {
    if ((e.key === "Enter" || e.key === " ") && !$id("reveal-stage").classList.contains("hidden") && !envelope.classList.contains("open")) {
      envelope.click();
    }
  };
  document.addEventListener("keydown", keyHandler, { once: false });
}

function fadeToDarknessThenGolden() {
  $id("envelope-wrap").classList.add("hidden");
  const overlay = $id("darkness-overlay");
  overlay.classList.remove("hidden");
  overlay.style.animation = "none"; void overlay.offsetWidth; overlay.style.animation = "";

  setTimeout(() => {
    const line = $id("last-secret-line");
    line.textContent = CONFIG.LAST_SECRET_LINE;
    line.classList.remove("hidden");
  }, 900);

  setTimeout(() => {
    $id("last-secret-line").classList.add("hidden");
    overlay.classList.add("hidden");
    const goldenWrap = $id("golden-envelope-wrap");
    goldenWrap.classList.remove("hidden");

    const golden = $id("golden-envelope");
    const openGolden = () => {
      golden.classList.add("open");
      golden.removeEventListener("click", openGolden);
      playChime();
      setTimeout(showFinalMessage, 1100);
    };
    golden.addEventListener("click", openGolden);
  }, 3400);
}

/* =========================================================================
   FINAL MESSAGE — typewriter + celebration
   ========================================================================= */
function showFinalMessage() {
  saveProgress(0); // story complete — no longer needs to resume mid-puzzle
  clearProgress();
  $id("progress-wrap").classList.add("hidden");
  goToScreen("message-screen");
  spawnStars(70);

  const target = $id("typewriter-message");
  target.innerHTML = '<span class="caret">&nbsp;</span>';
  $id("signoff").classList.add("hidden");
  $id("replay-btn").classList.add("hidden");

  const fullText = CONFIG.REAL_MESSAGE;
  let i = 0;
  state.typewriterRunning = true;

  function typeNext() {
    if (i >= fullText.length) {
      state.typewriterRunning = false;
      finishMessageCelebration();
      return;
    }
    const chunk = fullText.slice(0, i + 1).replace(/\n/g, "<br>");
    target.innerHTML = chunk + '<span class="caret">&nbsp;</span>';
    i++;
    const ch = fullText[i - 1];
    const delay = ch === "\n" ? 180 : (Math.random() * 18 + 22);
    setTimeout(typeNext, delay);
  }
  typeNext();
}

function finishMessageCelebration() {
  $id("typewriter-message").querySelector(".caret")?.remove();
  $id("signoff").classList.remove("hidden");
  $id("replay-btn").classList.remove("hidden");

  const screen = $id("message-screen");
  screen.classList.add("zoom");
  setTimeout(() => screen.classList.add("bright"), 300);

  burstConfetti(3600);
  // finale: extra floating hearts for a while
  const finaleInterval = setInterval(spawnFloatingHeart, 260);
  setTimeout(() => clearInterval(finaleInterval), 6000);

  if (state.soundOn) playChime();
}
