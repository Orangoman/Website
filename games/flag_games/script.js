let allFlags = [];
let activeFlags = [];
let currentFlag = null;

let score = 0;
let lives = 3;
let timeRemaining = 60;
let timerInterval = null;
let gameActive = false;

// Real-Time PeerJS Networking Variables
let peer = null;
let connections = []; // Host uses this to track joined clients
let hostConn = null;   // Guest uses this to send data to Host
let currentRoomCode = null;
let isHost = false;
let roomPlayers = [];
let myPlayerName = "";

// 1. Screen Navigation Functions
function showMainMenu() {
    const main = document.getElementById('main-menu');
    const sp = document.getElementById('singleplayer-screen');
    const mp = document.getElementById('multiplayer-screen');

    if (main) main.removeAttribute('hidden');
    if (sp) sp.setAttribute('hidden', 'true');
    if (mp) mp.setAttribute('hidden', 'true');
}

function showSinglePlayer() {
    const main = document.getElementById('main-menu');
    const sp = document.getElementById('singleplayer-screen');
    const mp = document.getElementById('multiplayer-screen');

    if (main) main.setAttribute('hidden', 'true');
    if (sp) sp.removeAttribute('hidden');
    if (mp) mp.setAttribute('hidden', 'true');
}

function showMultiplayer() {
    const main = document.getElementById('main-menu');
    const sp = document.getElementById('singleplayer-screen');
    const mp = document.getElementById('multiplayer-screen');

    if (main) main.setAttribute('hidden', 'true');
    if (sp) sp.setAttribute('hidden', 'true');
    if (mp) mp.removeAttribute('hidden');
}

// 2. Real-Time PeerJS Multiplayer Logic
function createLobby() {
    const nameInput = document.getElementById('player-name');
    myPlayerName = nameInput ? nameInput.value.trim() : '';

    if (!myPlayerName) {
        alert("Please enter a nickname first!");
        return;
    }

    const rawCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    currentRoomCode = rawCode;
    isHost = true;
    roomPlayers = [{ name: myPlayerName, isHost: true }];

    // Register peer on public PeerJS network
    const peerId = 'flaggame-' + currentRoomCode;
    peer = new Peer(peerId);

    peer.on('open', () => {
        console.log("👑 Lobby created on PeerJS network with Code:", currentRoomCode);
        updateWaitingRoomUI();
    });

    peer.on('connection', (conn) => {
        connections.push(conn);

        conn.on('data', (data) => {
            if (data.type === 'JOIN') {
                roomPlayers.push({ name: data.playerName, isHost: false });
                broadcastToAll({ type: 'PLAYER_LIST', players: roomPlayers });
                updateWaitingRoomUI();
            }
        });

        conn.on('close', () => {
            connections = connections.filter(c => c !== conn);
        });
    });

    peer.on('error', (err) => {
        console.error("PeerJS Error:", err);
        alert("Could not create lobby code. Please try again!");
    });
}

function joinLobby() {
    const nameInput = document.getElementById('player-name');
    const codeInput = document.getElementById('room-code-input');

    myPlayerName = nameInput ? nameInput.value.trim() : '';
    const code = codeInput ? codeInput.value.trim().toUpperCase() : '';

    if (!myPlayerName) {
        alert("Please enter a nickname first!");
        return;
    }
    if (!code) {
        alert("Please enter a room code!");
        return;
    }

    currentRoomCode = code;
    isHost = false;

    peer = new Peer();

    peer.on('open', () => {
        const targetPeerId = 'flaggame-' + currentRoomCode;
        hostConn = peer.connect(targetPeerId);

        hostConn.on('open', () => {
            console.log("Connected to Host room:", currentRoomCode);
            hostConn.send({ type: 'JOIN', playerName: myPlayerName });
            updateWaitingRoomUI();
        });

        hostConn.on('data', (data) => {
            if (data.type === 'PLAYER_LIST') {
                roomPlayers = data.players;
                updateWaitingRoomUI();
            }
            if (data.type === 'START_GAME') {
                launchMultiplayerBoard();
            }
        });

        hostConn.on('error', () => {
            alert("Could not find room code: " + currentRoomCode);
        });
    });
}

function broadcastToAll(data) {
    connections.forEach(conn => {
        if (conn.open) conn.send(data);
    });
}

function updateWaitingRoomUI() {
    const waitingRoom = document.getElementById('waiting-room');
    const roomCodeDisplay = document.getElementById('display-room-code');
    const playerList = document.getElementById('player-list');
    const startMpBtn = document.getElementById('start-multiplayer-btn');
    const statusText = document.getElementById('lobby-status');

    if (waitingRoom) waitingRoom.removeAttribute('hidden');
    if (roomCodeDisplay) roomCodeDisplay.textContent = currentRoomCode;

    if (playerList) {
        playerList.innerHTML = roomPlayers.map(p => `<li>${p.name} ${p.isHost ? '👑 (Host)' : ''}</li>`).join('');
    }

    if (startMpBtn) {
        if (isHost) {
            startMpBtn.removeAttribute('hidden');
            if (statusText) statusText.textContent = "You are the host! Click start when everyone is ready.";
        } else {
            startMpBtn.setAttribute('hidden', 'true');
            if (statusText) statusText.textContent = "Waiting for host to start the game...";
        }
    }
}

function startMultiplayerGame() {
    if (!isHost) return;
    broadcastToAll({ type: 'START_GAME' });
    launchMultiplayerBoard();
}

function launchMultiplayerBoard() {
    const waitingRoom = document.getElementById('waiting-room');
    const mpGameArea = document.getElementById('mp-game-area');

    if (waitingRoom) waitingRoom.setAttribute('hidden', 'true');
    if (mpGameArea) mpGameArea.removeAttribute('hidden');

    startGame(); // Fires single player flag engine on everyone's screen simultaneously!
}

// 3. Fetch JSON Data safely across GitHub Pages paths
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
        } catch (e) {}
    }

    console.error("❌ Could not load flags.json from any path.");
}

// 4. Filter flags based on selected region
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

    if (activeFlags.length === 0) activeFlags = [...allFlags];
}

// 5. Start Game
function startGame() {
    if (!allFlags || allFlags.length === 0) {
        alert("Flags are still loading or failed to load. Please refresh the page.");
        return;
    }

    const gameArea = document.getElementById('game-area');
    if (gameArea) gameArea.removeAttribute('hidden');

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

// 6. Autocomplete Datalist
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

// 7. Game Loop Controls
function updateTimer() {
    timeRemaining--;
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = timeRemaining;
    if (timeRemaining <= 0) endGame("⏱️ Time's up!");
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
    const mpFlagImg = document.getElementById('mp-flag-image');

    if (flagImg && currentFlag) flagImg.src = currentFlag.image;
    if (mpFlagImg && currentFlag) mpFlagImg.src = currentFlag.image;

    const input = document.getElementById('guess-input');
    const mpInput = document.getElementById('mp-guess-input');
    if (input) { input.value = ""; input.focus(); }
    if (mpInput) { mpInput.value = ""; mpInput.focus(); }
}

function checkGuess() {
    if (!gameActive) return;

    const inputField = document.getElementById('guess-input') || document.getElementById('mp-guess-input');
    if (!inputField) return;

    const userGuess = inputField.value.trim();
    const modeSelect = document.getElementById('mode-select');
    const mode = modeSelect ? modeSelect.value : 'classic';

    if (!userGuess) return;

    if (userGuess.toLowerCase() === currentFlag.name.toLowerCase()) {
        score++;
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = score;

        const feedbackEl = document.getElementById('feedback') || document.getElementById('mp-feedback');
        if (feedbackEl) {
            feedbackEl.textContent = "Correct! 🎉";
            feedbackEl.style.color = "green";
        }
        nextFlag();
    } else {
        const feedbackEl = document.getElementById('feedback') || document.getElementById('mp-feedback');
        if (feedbackEl) {
            feedbackEl.textContent = "Wrong answer! ❌";
            feedbackEl.style.color = "red";
        }

        if (mode === 'survival') {
            lives--;
            updateLivesDisplay();
            if (lives <= 0) endGame("💥 Game Over! You ran out of lives.");
        }
    }
}

function endGame(message) {
    gameActive = false;
    clearInterval(timerInterval);

    const guessInput = document.getElementById('guess-input');
    const submitBtn = document.getElementById('submit-btn');
    const feedbackEl = document.getElementById('feedback') || document.getElementById('mp-feedback');

    if (guessInput) guessInput.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (feedbackEl) feedbackEl.textContent = `${message} Final Score: ${score}`;
}

// 8. Initialization
function init() {
    const startBtn = document.getElementById('start-btn');
    const submitBtn = document.getElementById('submit-btn');
    const mpSubmitBtn = document.getElementById('mp-submit-btn');
    const guessInput = document.getElementById('guess-input');
    const mpGuessInput = document.getElementById('mp-guess-input');

    if (startBtn) startBtn.addEventListener('click', startGame);
    if (submitBtn) submitBtn.addEventListener('click', checkGuess);
    if (mpSubmitBtn) mpSubmitBtn.addEventListener('click', checkGuess);

    if (guessInput) {
        guessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkGuess();
        });
    }
    if (mpGuessInput) {
        mpGuessInput.addEventListener('keypress', (e) => {
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