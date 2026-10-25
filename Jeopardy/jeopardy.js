let GAME_DATA;
let VALUES;
let TEAM_COUNT;
let scores = [];
let activeCard = null;
let currentValue = 0;
let isDailyDouble = false;
let dailyDoubleWager = 0;
const completed = new Set();

const boardEl = () => document.getElementById("board");
const modalBackdropEl = () => document.getElementById("modalBackdrop");
const modalQuestionEl = () => document.getElementById("modalQuestion");
const modalAnswerEl = () => document.getElementById("modalAnswer");
const modalMetaEl = () => document.getElementById("modalMeta");
const wagerModalEl = () => document.getElementById("wagerModal");
const wagerInputEl = () => document.getElementById("wagerInput");

let cardsByCategory = new Map();

function cardId(category, index) {
  return `${category}__${index}`;
}

function buildCardIndex() {
  cardsByCategory.clear();
  if (!GAME_DATA?.cards) return;
  for (const card of GAME_DATA.cards) {
    if (!cardsByCategory.has(card.category)) {
      cardsByCategory.set(card.category, []);
    }
    cardsByCategory.get(card.category).push(card);
  }
  for (const cards of cardsByCategory.values()) {
    cards.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
}

function getCardsForCategory(category) {
  return cardsByCategory.get(category) || [];
}

function getPointValue() {
  return isDailyDouble ? dailyDoubleWager : currentValue;
}

// ── Board ──

function buildBoard() {
  const board = boardEl();
  board.innerHTML = "";

  const categories = GAME_DATA.categories;
  const cols = categories.length;
  board.style.setProperty("--cols", cols);
  document.documentElement.style.setProperty("--cols", cols);

  const fragment = document.createDocumentFragment();
  for (let c = 0; c < categories.length; c++) {
    const div = document.createElement("div");
    div.className = "category";
    div.textContent = categories[c];
    fragment.appendChild(div);
  }

  for (let rowIdx = 0; rowIdx < VALUES.length; rowIdx++) {
    const value = VALUES[rowIdx];
    for (let c = 0; c < categories.length; c++) {
      const category = categories[c];
      const cards = getCardsForCategory(category);
      const card = cards[rowIdx];
      const btn = document.createElement("button");
      btn.className = "tile";
      if (!card || !card.question) {
        btn.className += " empty";
        btn.disabled = true;
      } else {
        const id = cardId(category, rowIdx);
        btn.id = id;
        btn.textContent = `$${value}`;
        btn.onclick = () => openCard(card, value);
        if (completed.has(id)) btn.classList.add("used");
      }
      fragment.appendChild(btn);
    }
  }
  board.appendChild(fragment);
}

// ── Scoreboard ──

function buildScoreboard() {
  const section = document.getElementById("scoreboard");
  section.innerHTML = "";
  scores = new Array(TEAM_COUNT).fill(0);

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < TEAM_COUNT; i++) {
    const team = document.createElement("div");
    team.className = "team";
    team.innerHTML = `
      <div class="team-top">
        <input class="team-name" value="Team ${i + 1}" aria-label="Team ${i + 1} name">
      </div>
      <div class="score" id="score${i}">0</div>
      <div class="score-buttons">
        <button class="btn secondary" type="button" onclick="changeScore(${i}, -getPointValue())">&minus;</button>
        <button class="btn" type="button" onclick="changeScore(${i}, getPointValue())">+</button>
      </div>`;
    fragment.appendChild(team);
  }
  section.appendChild(fragment);
}

// ── Modal ──

function openCard(card, value) {
  const cards = getCardsForCategory(card.category);
  let idx = -1;
  for (let i = 0; i < cards.length; i++) {
    if (cards[i] === card) {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    idx = cards.indexOf(card);
  }
  const id = cardId(card.category, idx);
  if (completed.has(id)) return;

  activeCard = card;
  currentValue = value;
  isDailyDouble = !!card.dailyDouble;

  if (isDailyDouble) {
    let maxWager = 0;
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > maxWager) maxWager = scores[i];
    }
    showWagerModal(card.category, maxWager);
  } else {
    showQuestion(card, value);
  }
}

function showWagerModal(category, maxWager) {
  const modal = wagerModalEl();
  document.getElementById("wagerTitle").textContent = "Daily Double!";
  document.getElementById("wagerCategory").textContent = category;
  const input = wagerInputEl();
  input.value = "";
  input.max = maxWager;
  document.getElementById("wagerMax").textContent = `Wager up to $${maxWager}`;
  document.getElementById("wagerError").textContent = "";
  modal.classList.add("show");
  setTimeout(() => input.focus(), 50);
}

function confirmWager() {
  const input = wagerInputEl();
  const maxWager = parseInt(input.max) || 0;
  const wager = parseInt(input.value) || 0;
  if (wager < 0) {
    document.getElementById("wagerError").textContent = "Wager cannot be negative";
    return;
  }
  if (wager > maxWager) {
    document.getElementById("wagerError").textContent = `Max wager is $${maxWager}`;
    return;
  }
  dailyDoubleWager = wager;
  wagerModalEl().classList.remove("show");
  showQuestion(activeCard, dailyDoubleWager);
}

function cancelWager() {
  wagerModalEl().classList.remove("show");
  activeCard = null;
  isDailyDouble = false;
}

function showQuestion(card, value) {
  const meta = isDailyDouble
    ? `${card.category} • Daily Double • $${dailyDoubleWager}`
    : `${card.category} • $${value}`;
  modalMetaEl().textContent = meta;
  modalQuestionEl().textContent = card.question;

  const answer = modalAnswerEl();
  answer.textContent = card.answer;
  answer.classList.remove("show");

  modalBackdropEl().classList.add("show");
}

function showAnswer() {
  modalAnswerEl().classList.add("show");
}

function closeModal() {
  modalBackdropEl().classList.remove("show");
}

function backdropClose(event) {
  if (event.target.id === "modalBackdrop") closeModal();
}

function markCompleteAndClose() {
  if (activeCard) {
    const cards = getCardsForCategory(activeCard.category);
    let idx = -1;
    for (let i = 0; i < cards.length; i++) {
      if (cards[i] === activeCard) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      const id = cardId(activeCard.category, idx);
      completed.add(id);
      const el = document.getElementById(id);
      if (el) el.classList.add("used");
    }
  }
  closeModal();
}

// ── Scores ──

function changeScore(teamIndex, delta) {
  if (!delta) delta = 0;
  scores[teamIndex] += delta;
  const el = document.getElementById(`score${teamIndex}`);
  if (el) el.textContent = scores[teamIndex];
}

function resetScores() {
  for (let i = 0; i < scores.length; i++) {
    scores[i] = 0;
    const el = document.getElementById(`score${i}`);
    if (el) el.textContent = 0;
  }
}

// ── Reset ──

function resetBoard() {
  completed.clear();
  currentValue = 0;
  activeCard = null;
  isDailyDouble = false;
  dailyDoubleWager = 0;
  buildBoard();
  closeModal();
}

// ── Keyboard shortcuts ──

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    cancelWager();
    return;
  }
  if (e.key.toLowerCase() === "a") {
    showAnswer();
    return;
  }
  if (e.key === "Enter") {
    const wagerModal = wagerModalEl();
    if (wagerModal.classList.contains("show")) {
      confirmWager();
    }
  }
});

// ── Init ──

function initGame() {
  buildCardIndex();
  buildScoreboard();
  buildBoard();
  updateThemeButton();
}

// ── Theme ──

function toggleTheme() {
  const isLight = document.documentElement.classList.toggle("light-theme");
  try {
    localStorage.setItem("jeopardy_theme", isLight ? "light" : "dark");
  } catch (_) {}
  updateThemeButton();
}

function updateThemeButton() {
  const label = document.documentElement.classList.contains("light-theme") ? "Dark Mode" : "Light Mode";
  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.textContent = label;
  });
}

function getGameAuthKey(entry) {
  if (!entry) return null;
  if (entry.key) return `jeopardy_auth_${entry.key}`;
  if (entry.username) return `jeopardy_auth_${entry.username}`;
  if (entry.file) return `jeopardy_auth_${entry.file.replace(/[^a-zA-Z0-9]/g, "_")}`;
  return "jeopardy_auth_default";
}

async function loadGameFile(file, registryUrl, authKey = null, entry = null) {
  const gameUrl = new URL(file, registryUrl);
  if (gameUrl.origin !== window.location.origin) {
    throw new Error("Game files must be hosted on this site");
  }

  const response = await fetch(gameUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load game file (${response.status})`);
  }

  const data = await response.json();
  const game = Array.isArray(data.games) ? data.games[0] : data;
  if (!game || !Array.isArray(game.categories) || !Array.isArray(game.cards) ||
      !Array.isArray(game.values) || !Number.isInteger(game.team_count)) {
    throw new Error("Game data is missing or invalid");
  }

  if (authKey) {
    try {
      localStorage.setItem(authKey, "true");
      if (entry?.username) localStorage.setItem("jeopardy_last_user", entry.username);
    } catch (_) {}
  }

  GAME_DATA = { categories: game.categories, cards: game.cards };
  VALUES = game.values;
  TEAM_COUNT = game.team_count;
  completed.clear();
  activeCard = null;
  currentValue = 0;
  isDailyDouble = false;
  dailyDoubleWager = 0;

  document.getElementById("gameTitle").textContent = game.name || "Jeopardy";
  document.getElementById("loginScreen").hidden = true;
  document.getElementById("gameScreen").hidden = false;

  initGame();
}

async function tryAutoLogin() {
  try {
    const registryResponse = await fetch("data/games.json", { cache: "no-store" });
    if (!registryResponse.ok) return;
    const registry = await registryResponse.json();
    const games = registry.games || [];
    for (let i = 0; i < games.length; i++) {
      const entry = games[i];
      if (!entry || typeof entry.file !== "string") continue;
      const key = getGameAuthKey(entry);
      try {
        if (localStorage.getItem(key) === "true") {
          await loadGameFile(entry.file, registryResponse.url, null, entry);
          return;
        }
      } catch (_) {}
    }
  } catch (_) {}
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const username = form.elements.username.value.trim();
  const password = form.elements.password.value;
  const errorEl = document.getElementById("loginError");
  if (errorEl) errorEl.textContent = "";

  try {
    const registryResponse = await fetch("data/games.json", { cache: "no-store" });
    if (!registryResponse.ok) {
      throw new Error(`Unable to load game registry (${registryResponse.status})`);
    }

    const registry = await registryResponse.json();
    const games = registry.games || [];
    let entry = null;
    for (let i = 0; i < games.length; i++) {
      if (games[i].username === username && games[i].password === password) {
        entry = games[i];
        break;
      }
    }
    if (!entry || typeof entry.file !== "string") {
      if (errorEl) errorEl.textContent = "Username or password is incorrect.";
      return;
    }

    const authKey = getGameAuthKey(entry);
    await loadGameFile(entry.file, registryResponse.url, authKey, entry);
  } catch (loadError) {
    console.error("Failed to open the Jeopardy game.", loadError);
    const errorEl = document.getElementById("loginError");
    if (errorEl) errorEl.textContent = "Unable to load the game. Check the game registry and game file.";
  }
}

function showLogin() {
  const errorEl = document.getElementById("loginError");
  if (errorEl) errorEl.textContent = "";

  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith("jeopardy_auth_")) {
        localStorage.removeItem(key);
      }
    }
    localStorage.removeItem("jeopardy_last_user");
  } catch (storageError) {
    console.error("Failed to clear saved login data.", storageError);
    if (errorEl) errorEl.textContent = "Could not clear saved login data from this browser.";
  }

  document.getElementById("gameScreen").hidden = true;
  document.getElementById("loginScreen").hidden = false;
  const form = document.getElementById("loginForm");
  if (form) form.reset();
}

const loginFormEl = document.getElementById("loginForm");
if (loginFormEl) {
  loginFormEl.addEventListener("submit", handleLogin);
}
const usernameEl = document.getElementById("username");
if (usernameEl) {
  try {
    const lastUser = localStorage.getItem("jeopardy_last_user");
    if (lastUser) usernameEl.value = lastUser;
  } catch (_) {}
  usernameEl.focus();
}

try {
  localStorage.removeItem("jeopardy_scoreboard_base_dpr");
} catch (error) {
  console.error("Unable to remove the saved scoreboard zoom setting.", error);
}

tryAutoLogin();
