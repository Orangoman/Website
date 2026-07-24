let allFlags = [];
let activeFlags = [];
let currentFlag = null;

let score = 0;
let lives = 3;
let timeRemaining = 60;
let timerInterval = null;
let gameActive = false;

// 1. Fetch JSON Data Safely
async function loadFlags() {
    try {
        // Try loading from data folder first, then relative path
        let response = await fetch('data/flags.json?v=2').catch(() => null);
        if (!response || !response.ok) {
            response = await fetch('flags.json?v=2');
        }
        
        allFlags = await response.json();
        console.log("✅ Flags loaded successfully:", allFlags);
        populateCountryDropdown(allFlags);
    } catch (error) {
        console.error("❌ Error loading JSON file:", error);
        alert("Could not load flags.json! Make sure the file exists in your project folder.");
    }
}

// 2. Filter flags based on dropdown value
function updateActiveFlags() {
    const selectElement = document.getElementById('region-select');
    if (!selectElement) {
        activeFlags = [...allFlags];
        return;
    }

    const rawValue = selectElement.value.toLowerCase().trim();

    // If "World", "All", or blank is selected, load every flag
    if (rawValue === 'world' || rawValue === 'all' || rawValue === '') {
        activeFlags = [...allFlags];
    } else {
        activeFlags = allFlags.filter(flag => {
            if (!flag.region) return true; // keep if region isn't specified
            return rawValue.includes(flag.region.toLowerCase());
        });
    }

    // Fallback safety net
    if (activeFlags.length === 0) {
        console.warn("No flags matched region filter. Loading all flags as fallback.");
        activeFlags = [...allFlags];
    }
}

// 3. Start or Reset the Game
function startGame() {
    if (allFlags.length === 0) {
        alert("Flags are still loading! Please wait a moment and try again.");
        return;
    }

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
    document.getElementById('guess-input').disabled = false;
    document.getElementById('submit-btn').disabled = false;

    // Toggle HUD elements depending on game mode
    const timerDisp = document.getElementById('timer-display');
    const livesDisp = document.getElementById('lives-display');
    if (timerDisp) timerDisp.style.display = selectedMode === 'timed' ? 'inline' : 'none';
    if (livesDisp) livesDisp.style.display = selectedMode === 'survival' ? 'inline' : 'none';
    
    updateLivesDisplay();

    if (selectedMode === 'timed') {
        document.getElementById('timer').textContent = timeRemaining;
        timerInterval = setInterval(updateTimer, 1000);
    }

    nextFlag();
}

// 4. Populate datalist for autocomplete
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
    document.getElementById('timer').textContent = timeRemaining;
    if (timeRemaining <= 0) {
        endGame("⏱️ Time's up!");
    }
}

function updateLivesDisplay() {
    const livesEl = document.getElementById('lives');
    if (livesEl) livesEl.textContent = "❤️".repeat(lives);
}

function nextFlag() {
    if (!activeFlags || activeFlags.length === 0) {
        console.error("No active flags available.");
        return;
    }

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
    const userGuess = inputField.value.trim();
    const modeSelect = document.getElementById('mode-select');
    const mode = modeSelect ? modeSelect.value : 'classic';

    if (!userGuess) return;

    if (userGuess.toLowerCase() === currentFlag.name.toLowerCase()) {
        score++;
        document.getElementById('score').textContent = score;
        document.getElementById('feedback').textContent = "Correct! 🎉";
        document.getElementById('feedback').style.color = "green";
        nextFlag();
    } else {
        document.getElementById('feedback').textContent = "Wrong answer! ❌";
        document.getElementById('feedback').style.color = "red";

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
    document.getElementById('guess-input').disabled = true;
    document.getElementById('submit-btn').disabled = true;
    document.getElementById('feedback').textContent = `${message} Final Score: ${score}`;
}

// 6. Safe Initialization (Runs when page finishes loading)
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