let allFlags = [];
let activeFlags = [];
let currentFlag = null;

let score = 0;
let lives = 3;
let timeRemaining = 60;
let timerInterval = null;
let gameActive = false;

// 1. Load Data
async function loadFlags() {
    try {
        const response = await fetch('data/flags.json?v=2');
        allFlags = await response.json();
        populateCountryDropdown(allFlags);
    } catch (error) {
        console.error("Error loading JSON:", error);
    }
}

// 2. Filter flags SAFELY based on HTML value
function updateActiveFlags() {
    const htmlValue = document.getElementById('region-select').value;

    activeFlags = allFlags.filter(flag => {
        // If the country doesn't have a region in JSON, keep it so it doesn't break
        if (!flag.region) return true; 

        // Check if the region exists inside your HTML value string
        return htmlValue.toLowerCase().includes(flag.region.toLowerCase());
    });

    // SAFETY NET: If the filtered list is empty, default to showing all flags
    if (activeFlags.length === 0) {
        console.warn("No flags matched your filter! Defaulting to all flags.");
        activeFlags = [...allFlags];
    }
}

// 3. Start Game (Calls updateActiveFlags here)
function startGame() {
    const selectedMode = document.getElementById('mode-select').value;

    // Filter flags safely before picking the first flag
    updateActiveFlags();

    // Reset Stats
    score = 0;
    lives = 3;
    timeRemaining = 60;
    gameActive = true;
    clearInterval(timerInterval);

    document.getElementById('score').textContent = score;
    document.getElementById('feedback').textContent = "";
    document.getElementById('guess-input').disabled = false;
    document.getElementById('submit-btn').disabled = false;

    // Setup UI based on mode
    document.getElementById('timer-display').style.display = selectedMode === 'timed' ? 'inline' : 'none';
    document.getElementById('lives-display').style.display = selectedMode === 'survival' ? 'inline' : 'none';
    updateLivesDisplay();

    if (selectedMode === 'timed') {
        document.getElementById('timer').textContent = timeRemaining;
        timerInterval = setInterval(updateTimer, 1000);
    }

    nextFlag();
}

// 4. Populate autocomplete dropdown
function populateCountryDropdown(flagList) {
    const datalist = document.getElementById('country-options');
    datalist.innerHTML = '';
    const sortedNames = flagList.map(c => c.name).sort();
    
    sortedNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        datalist.appendChild(option);
    });
}

// 5. Game Loop Functions
function updateTimer() {
    timeRemaining--;
    document.getElementById('timer').textContent = timeRemaining;
    if (timeRemaining <= 0) {
        endGame("⏱️ Time's up!");
    }
}

function updateLivesDisplay() {
    document.getElementById('lives').textContent = "❤️".repeat(lives);
}

function nextFlag() {
    const randomIndex = Math.floor(Math.random() * activeFlags.length);
    currentFlag = activeFlags[randomIndex];
    document.getElementById('flag-image').src = currentFlag.image;
    document.getElementById('guess-input').value = "";
    document.getElementById('guess-input').focus();
}

function checkGuess() {
    if (!gameActive) return;

    const inputField = document.getElementById('guess-input');
    const userGuess = inputField.value.trim();
    const mode = document.getElementById('mode-select').value;

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

// Event Listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('submit-btn').addEventListener('click', checkGuess);
document.getElementById('guess-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkGuess();
});

loadFlags();