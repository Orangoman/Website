let allFlags = [];
let activeFlags = [];
let currentFlag = null;

let score = 0;
let lives = 3;
let timeRemaining = 60;
let timerInterval = null;
let gameActive = false;
// Screen Navigation Functions (Global Scope for inline onclicks)
function showMainMenu() {
    document.getElementById('main-menu').removeAttribute('hidden');
    document.getElementById('singleplayer-screen').setAttribute('hidden', 'true');
    document.getElementById('multiplayer-screen').setAttribute('hidden', 'true');
}

function showSinglePlayer() {
    document.getElementById('main-menu').setAttribute('hidden', 'true');
    document.getElementById('singleplayer-screen').removeAttribute('hidden');
    document.getElementById('multiplayer-screen').setAttribute('hidden', 'true');
}

function showMultiplayer() {
    document.getElementById('main-menu').setAttribute('hidden', 'true');
    document.getElementById('singleplayer-screen').setAttribute('hidden', 'true');
    document.getElementById('multiplayer-screen').removeAttribute('hidden');
}

// ... Rest of your existing game script below ...
// 1. Fetch JSON Data safely across GitHub Pages paths
async function loadFlags() {
    const paths = [
        'flags.json?v=' + Date.now(),
        'data/flags.json?v=' + Date.now(),
        './flags.json?v=' + Date.now(),
        './data/flags.json?v=' + Date.now()
    ];

    for (const path of paths) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                allFlags = await response.json();
                populateCountryDropdown(allFlags);
                console.log("✅ Flags loaded successfully from:", path, "Total:", allFlags.length);
                return;
            }
        } catch (e) {
            // Check next potential folder path
        }
    }

    console.error("❌ Could not load flags.json from any path.");
    const feedbackEl = document.getElementById('feedback');
    if (feedbackEl) {
        feedbackEl.textContent = "❌ Failed to load flags.json. Make sure flags.json is uploaded to GitHub in the same folder as flag_game.html!";
        feedbackEl.style.color = "red";
    }
}

// 2. Filter flags based on selected region
function updateActiveFlags() {
    const selectElement = document.getElementById('region-select');
    const rawValue = selectElement ? selectElement.value.trim() : 'World';

    if (!rawValue || rawValue.toLowerCase() === 'world' || rawValue.toLowerCase() === 'all') {
        activeFlags = [...allFlags];
    } else {
        const target = rawValue.toLowerCase();
        activeFlags = allFlags.filter(flag => {
            if (!flag.region) return true;
            const reg = flag.region.toLowerCase();
            return reg.includes(target) || target.includes(reg);
        });
    }

    if (activeFlags.length === 0) {
        console.warn("No flags matched region filter. Falling back to all flags.");
        activeFlags = [...allFlags];
    }
}

// 3. Start Game (Reveals the hidden game board)
function startGame() {
    if (!allFlags || allFlags.length === 0) {
        alert("Flags are still loading or failed to load. Please refresh the page.");
        return;
    }

    // Reveal Game Board
    const gameArea = document.getElementById('game-area');
    if (gameArea) {
        gameArea.removeAttribute('hidden');
    }

    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.textContent = "Restart Game";

    const modeSelect = document.getElementById('mode-select');
    const selectedMode = modeSelect ? modeSelect.value : 'classic';

    updateActiveFlags();

    score = 0;
    lives = 3;
    timeRemaining = 60;
    gameActive = true;
    clearInterval(timerInterval);

    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.textContent = score;

    const feedbackEl = document.getElementById('feedback');
    if (feedbackEl) feedbackEl.textContent = "";

    const guessInput = document.getElementById('guess-input');
    const submitBtn = document.getElementById('submit-btn');
    if (guessInput) guessInput.disabled = false;
    if (submitBtn) submitBtn.disabled = false;

    const timerDisp = document.getElementById('timer-display');
    const livesDisp = document.getElementById('lives-display');
    if (timerDisp) timerDisp.style.display = selectedMode === 'timed' ? 'inline' : 'none';
    if (livesDisp) livesDisp.style.display = selectedMode === 'survival' ? 'inline' : 'none';

    updateLivesDisplay();

    if (selectedMode === 'timed') {
        const timerEl = document.getElementById('timer');
        if (timerEl) timerEl.textContent = timeRemaining;
        timerInterval = setInterval(updateTimer, 1000);
    }

    nextFlag();
}

// 4. Autocomplete Datalist
function populateCountryDropdown(flagList) {
    const datalist = document.getElementById('country-options');
    if (!datalist) return;
    datalist.innerHTML = '';

    const sortedNames = flagList.map(c => c.name).sort();
    sortedNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        datalist.appendChild(option);
    });
}

// 5. Game Loop Controls
function updateTimer() {
    timeRemaining--;
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = timeRemaining;
    if (timeRemaining <= 0) {
        endGame("⏱️ Time's up!");
    }
}

function updateLivesDisplay() {
    const livesEl = document.getElementById('lives');
    if (livesEl) livesEl.textContent = "❤️".repeat(lives);
}

function nextFlag() {
    if (!activeFlags || activeFlags.length === 0) return;

    const randomIndex = Math.floor(Math.random() * activeFlags.length);
    currentFlag = activeFlags[randomIndex];

    const flagImg = document.getElementById('flag-image');
    if (flagImg && currentFlag) {
        flagImg.src = currentFlag.image;
    }

    const input = document.getElementById('guess-input');
    if (input) {
        input.value = "";
        input.focus();
    }
}

function checkGuess() {
    if (!gameActive) return;

    const inputField = document.getElementById('guess-input');
    if (!inputField) return;

    const userGuess = inputField.value.trim();
    const modeSelect = document.getElementById('mode-select');
    const mode = modeSelect ? modeSelect.value : 'classic';

    if (!userGuess) return;

    if (userGuess.toLowerCase() === currentFlag.name.toLowerCase()) {
        score++;
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = score;

        const feedbackEl = document.getElementById('feedback');
        if (feedbackEl) {
            feedbackEl.textContent = "Correct! 🎉";
            feedbackEl.style.color = "green";
        }
        nextFlag();
    } else {
        const feedbackEl = document.getElementById('feedback');
        if (feedbackEl) {
            feedbackEl.textContent = "Wrong answer! ❌";
            feedbackEl.style.color = "red";
        }

        if (mode === 'survival') {
            lives--;
            updateLivesDisplay();
            if (lives <= 0) {
                endGame("💥 Game Over! You ran out of lives.");
            }
        }
    }
}

function endGame(message) {
    gameActive = false;
    clearInterval(timerInterval);

    const guessInput = document.getElementById('guess-input');
    const submitBtn = document.getElementById('submit-btn');
    const feedbackEl = document.getElementById('feedback');

    if (guessInput) guessInput.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (feedbackEl) feedbackEl.textContent = `${message} Final Score: ${score}`;
}

// 6. Safe Initialization (Guarantees listeners attach even if page is already loaded)
function init() {
    const startBtn = document.getElementById('start-btn');
    const submitBtn = document.getElementById('submit-btn');
    const guessInput = document.getElementById('guess-input');

    if (startBtn) startBtn.addEventListener('click', startGame);
    if (submitBtn) submitBtn.addEventListener('click', checkGuess);

    if (guessInput) {
        guessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkGuess();
        });
    }

    loadFlags();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
// Screen Navigation Functions
function showMainMenu() {
    document.getElementById('main-menu').removeAttribute('hidden');
    document.getElementById('singleplayer-screen').setAttribute('hidden', 'true');
    document.getElementById('multiplayer-screen').setAttribute('hidden', 'true');
}

function showSinglePlayer() {
    document.getElementById('main-menu').setAttribute('hidden', 'true');
    document.getElementById('singleplayer-screen').removeAttribute('hidden');
}

function showMultiplayer() {
    document.getElementById('main-menu').setAttribute('hidden', 'true');
    document.getElementById('multiplayer-screen').removeAttribute('hidden');
}

// Bind Navigation Events in init()
function initNavigation() {
    const spBtn = document.getElementById('choose-sp-btn');
    const mpBtn = document.getElementById('choose-mp-btn');
    const backBtns = document.querySelectorAll('.back-btn');

    if (spBtn) spBtn.addEventListener('click', showSinglePlayer);
    if (mpBtn) mpBtn.addEventListener('click', showMultiplayer);
    
    backBtns.forEach(btn => {
        btn.addEventListener('click', showMainMenu);
    });
}

// Add initNavigation() inside your existing DOM loading block
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initNavigation();
        init(); // Calls your existing start-up logic
    });
} else {
    initNavigation();
    init();
}