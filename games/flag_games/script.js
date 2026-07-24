let allFlags = [];
let activeFlags = [];
let currentFlag = null;

let score = 0;
let lives = 3;
let timeRemaining = 60;
let timerInterval = null;
let gameActive = false;

// Load Data
async function loadFlags() {
    try {
        const response = await fetch('data/flags.json?v=2');
        allFlags = await response.json();
        populateCountryDropdown(allFlags);
    } catch (error) {
        console.error("Error loading JSON:", error);
    }
}

// Populate the datalist suggestions
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

// Start / Reset Game
function startGame() {
    const selectedRegion = document.getElementById('region-select').value;
    const selectedMode = document.getElementById('mode-select').value;

    // Filter Flags by Region
    if (selectedRegion === 'World') {
        activeFlags = [...allFlags];
    } else {
        activeFlags = allFlags.filter(c => c.region === selectedRegion);
    }

    if (activeFlags.length === 0) {
        alert("No flags found for this region!");
        return;
    }

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

// Handle Timed Mode
function updateTimer() {
    timeRemaining--;
    document.getElementById('timer').textContent = timeRemaining;
    if (timeRemaining <= 0) {
        endGame("⏱️ Time's up!");
    }
}

// Handle Survival Hearts
function updateLivesDisplay() {
    document.getElementById('lives').textContent = "❤️".repeat(lives);
}

// Pick Next Flag
function nextFlag() {
    const randomIndex = Math.floor(Math.random() * activeFlags.length);
    currentFlag = activeFlags[randomIndex];
    document.getElementById('flag-image').src = currentFlag.image;
    document.getElementById('guess-input').value = "";
    document.getElementById('guess-input').focus();
}

// Check Answer
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

        // Survival Mode punishment
        if (mode === 'survival') {
            lives--;
            updateLivesDisplay();
            if (lives <= 0) {
                endGame("💥 Game Over! You ran out of lives.");
            }
        }
    }
}

// End Game State
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