let score = 0;
let currentFlag = null;
let flagData = [];

// 1. Fetch JSON and build the autocomplete dropdown list
async function loadFlags() {
    try {
        const response = await fetch('data/flags.json');
        flagData = await response.json();
        
        // Populate the <datalist> with ALL world countries
        populateCountryDropdown();
        
        nextFlag();
    } catch (error) {
        console.error("Error loading flags:", error);
    }
}

// 2. Insert all country names into the <datalist>
function populateCountryDropdown() {
    const datalist = document.getElementById('country-options');
    datalist.innerHTML = ''; // Clear existing items

    // Get array of all names and sort them alphabetically
    const sortedNames = flagData.map(country => country.name).sort();

    sortedNames.forEach(countryName => {
        const option = document.createElement('option');
        option.value = countryName;
        datalist.appendChild(option);
    });
}

// 3. Load next flag
function nextFlag() {
    const randomIndex = Math.floor(Math.random() * flagData.length);
    currentFlag = flagData[randomIndex];
    
    document.getElementById('flag-image').src = currentFlag.image;
    document.getElementById('feedback').textContent = "";
    document.getElementById('guess-input').value = ""; // Reset input box
}

// 4. Validate the guess
function checkGuess() {
    const inputField = document.getElementById('guess-input');
    const userGuess = inputField.value.trim();

    if (!userGuess) return;

    // Simple comparison against the canonical name (case-insensitive)
    if (userGuess.toLowerCase() === currentFlag.name.toLowerCase()) {
        score++;
        document.getElementById('score').textContent = score;
        nextFlag();
    } else {
        document.getElementById('feedback').textContent = "Incorrect, try again!";
        document.getElementById('feedback').style.color = "red";
    }
}

// Event Listeners
document.getElementById('submit-btn').addEventListener('click', checkGuess);

// Automatically trigger validation when user hits Enter or selects from dropdown
document.getElementById('guess-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        checkGuess();
    }
});

loadFlags();