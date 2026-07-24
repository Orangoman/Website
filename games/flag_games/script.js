let allFlags = [];
let activeFlags = [];
let currentFlag = null;

let score = 0;
let lives = 3;
let timeRemaining = 60;
let timerInterval = null;
let gameActive = false;

// 1. Fetch JSON Data
async function loadFlags() {
    try {
        let response = await fetch('data/flags.json?v=2').catch(() => null);
        if (!response || !response.ok) {
            response = await fetch('flags.json?v=2');
        }
        
        allFlags = await response.json();
        populateCountryDropdown(allFlags);
        console.log("✅ Flags loaded successfully:", allFlags.length);
    } catch (error) {
        console.error("❌ Error loading JSON:", error);
    }
}

// 2. Filter flags based on selected region
function updateActiveFlags() {
    const selectElement = document.getElementById('region-select');
    const rawValue = selectElement ? selectElement.value.toLowerCase().trim() : 'world';

    if (!rawValue || rawValue.includes('world') || rawValue === 'all') {
        activeFlags = [...allFlags];
    } else {
        activeFlags = allFlags.filter(flag => {
            if (!flag.region) return true; 
            return rawValue.includes(flag.region.toLowerCase());
        });
    }

    if (activeFlags.length === 0) {
        activeFlags = [...allFlags];
    }
}

// 3. Start Game (Reveals the hidden game board)
function startGame() {
    if (allFlags.length === 0) {
        alert("Flags are still loading! Please wait a second and try again.");
        return;
    }

    // 🔓 REVEAL THE GAME BOARD
    const gameArea = document.getElementById('game-area');
    if (gameArea) {
        gameArea.removeAttribute('hidden');
    }

    // Change start button text to "Restart Game"
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

    document.getElementById('score').textContent = score;
    document.getElementById('feedback').textContent = "";
    
    const guessInput = document.getElementById('guess-input');
    const submitBtn = document.getElementById('submit-btn');
    if (guessInput) guessInput.disabled = false;
    if (submitBtn) submitBtn.disabled = false;

    // Toggle Mode Displays
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
        document.getElementById('score').textContent = score;
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

// 6. Bind Event Listeners
window.addEventListener('DOMContentLoaded', () => {
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
});