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
let connections = []; // Host tracks clients
let hostConn = null;   // Guest tracks Host connection
let currentRoomCode = null;
let isHost = false;
let roomPlayers = [];  // Array of { name, isHost, score }
let myPlayerName = "";
let isMultiplayerMode = false;

// Multiplayer Settings
let mpRegion = "World";
let mpMode = "timed";

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
    isMultiplayerMode = false;
    const main = document.getElementById('main-menu');
    const sp = document.getElementById('singleplayer-screen');
    const mp = document.getElementById('multiplayer-screen');

    if (main) main.setAttribute('hidden', 'true');
    if (sp) sp.removeAttribute('hidden');
    if (mp) mp.setAttribute('hidden', 'true');
}

function showMultiplayer() {
    isMultiplayerMode = true;
    const main = document.getElementById('main-menu');
    const sp = document.getElementById('singleplayer-screen');
    const mp = document.getElementById('multiplayer-screen');

    if (main) main.setAttribute('hidden', 'true');
    if (sp) sp.setAttribute('hidden', 'true');
    if (mp) mp.removeAttribute('hidden');
}

// 2. PeerJS Multiplayer Lobby Logic
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
    roomPlayers = [{ name: myPlayerName, isHost: true, score: 0 }];

    const peerId = 'flaggame-' + currentRoomCode;
    peer = new Peer(peerId);

    peer.on('open', () => {
        console.log("👑 Lobby created with Code:", currentRoomCode);
        document.getElementById('lobby-setup').setAttribute('hidden', 'true');
        updateWaitingRoomUI();
    });

    peer.on('connection', (conn) => {
        connections.push(conn);

        conn.on('data', (data) => {
            if (data.type === 'JOIN') {
                roomPlayers.push({ name: data.playerName, isHost: false, score: 0 });
                broadcastToAll({ 
                    type: 'LOBBY_STATE', 
                    players: roomPlayers, 
                    region: mpRegion, 
                    mode: mpMode 
                });
                updateWaitingRoomUI();
            }

            if (data.type === 'SCORE_UPDATE') {
                const player = roomPlayers.find(p => p.name === data.name);
                if (player) player.score = data.score;
                broadcastToAll({ type: 'LEADERBOARD_UPDATE', players: roomPlayers });
                updateLeaderboardUI();
            }
        });

        conn.on('close', () => {
            connections = connections.filter(c => c !== conn);
        });
    });

    peer.on('error', (err) => {
        alert("Room code collision or error. Please try again!");
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
            document.getElementById('lobby-setup').setAttribute('hidden', 'true');
            hostConn.send({ type: 'JOIN', playerName: myPlayerName });
        });

        hostConn.on('data', (data) => {
            if (data.type === 'LOBBY_STATE') {
                roomPlayers = data.players;
                mpRegion = data.region;
                mpMode = data.mode;
                updateWaitingRoomUI();
            }
            if (data.type === 'LEADERBOARD_UPDATE') {
                roomPlayers = data.players;
                updateLeaderboardUI();
            }
            if (data.type === 'START_GAME') {
                mpRegion = data.region;
                mpMode = data.mode;
                launchMultiplayerBoard();
            }
            if (data.type === 'PLAY_AGAIN') {
                resetAndStartMpRound();
            }
        });

        hostConn.on('error', () => {
            alert("Could not find room code: " + currentRoomCode);
        });
    });
}

function updateMpSettings() {
    if (!isHost) return;
    const regSel = document.getElementById('mp-region-select');
    const modeSel = document.getElementById('mp-mode-select');

    if (regSel) mpRegion = regSel.value;
    if (modeSel) mpMode = modeSel.value;

    broadcastToAll({ 
        type: 'LOBBY_STATE', 
        players: roomPlayers, 
        region: mpRegion, 
        mode: mpMode 
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
    const settingsPanel = document.getElementById('mp-settings-panel');

    if (waitingRoom) waitingRoom.removeAttribute('hidden');
    if (roomCodeDisplay) roomCodeDisplay.textContent = currentRoomCode;

    if (playerList) {
        playerList.innerHTML = roomPlayers.map(p => `<li>${p.name} ${p.isHost ? '👑 (Host)' : ''}</li>`).join('');
    }

    // Disable settings dropdowns for guests
    if (settingsPanel) {
        const selects = settingsPanel.querySelectorAll('select');
        selects.forEach(s => s.disabled = !isHost);
    }

    if (startMpBtn) {
        if (isHost) {
            startMpBtn.removeAttribute('hidden');
            if (statusText) statusText.textContent = `Region: ${mpRegion} | Mode: ${mpMode}`;
        } else {
            startMpBtn.setAttribute('hidden', 'true');
            if (statusText) statusText.textContent = `Waiting for host... (${mpRegion} - ${mpMode})`;
        }
    }
}

function updateLeaderboardUI() {
    const listEl = document.getElementById('mp-leaderboard-list');
    if (!listEl) return;

    // Sort players by highest score
    const sorted = [...roomPlayers].sort((a, b) => b.score - a.score);

    listEl.innerHTML = sorted.map((p, idx) => `
        <li>
            <span>${idx === 0 ? '👑' : `#${idx+1}`} ${p.name}</span>
            <span>${p.score} pts</span>
        </li>
    `).join('');
}

function startMultiplayerGame() {
    if (!isHost) return;
    broadcastToAll({ type: 'START_GAME', region: mpRegion, mode: mpMode });
    launchMultiplayerBoard();
}

function launchMultiplayerBoard() {
    document.getElementById('waiting-room').setAttribute('hidden', 'true');
    document.getElementById('mp-game-area').removeAttribute('hidden');
    document.getElementById('mp-active-game').removeAttribute('hidden');
    document.getElementById('round-over-box').setAttribute('hidden', 'true');

    // Reset round scores
    roomPlayers.forEach(p => p.score = 0);
    updateLeaderboardUI();

    startGameEngine(mpRegion, mpMode);
}

function playAgainMultiplayer() {
    if (!isHost) return;
    broadcastToAll({ type: 'PLAY_AGAIN' });
    resetAndStartMpRound();
}

function resetAndStartMpRound() {
    document.getElementById('mp-active-game').removeAttribute('hidden');
    document.getElementById('round-over-box').setAttribute('hidden', 'true');

    roomPlayers.forEach(p => p.score = 0);
    updateLeaderboardUI();

    if (isHost) {
        broadcastToAll({ type: 'LEADERBOARD_UPDATE', players: roomPlayers });
    }

    startGameEngine(mpRegion, mpMode);
}

// 3. Fetch JSON Data safely
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
                console.log("✅ Flags loaded successfully!");
                return;
            }
        } catch (e) {}
    }

    console.error("❌ Could not load flags.json.");
}

// 4. Filter flags based on selected region
function filterFlags(selectedRegion) {
    if (!selectedRegion || selectedRegion.toLowerCase() === 'world' || selectedRegion.toLowerCase() === 'all') {
        activeFlags = [...allFlags];
    } else {
        const target = selectedRegion.toLowerCase();
        activeFlags = allFlags.filter(flag => {
            if (!flag.region) return true;
            const reg = flag.region.toLowerCase();
            return reg.includes(target) || target.includes(reg);
        });
    }

    if (activeFlags.length === 0) activeFlags = [...allFlags];
}

// 5. Game Core Engine
function startGame() { // Single player entry
    const reg = document.getElementById('region-select')?.value || 'World';
    const mode = document.getElementById('mode-select')?.value || 'classic';
    document.getElementById('game-area')?.removeAttribute('hidden');
    startGameEngine(reg, mode);
}

function startGameEngine(region, mode) {
    if (!allFlags || allFlags.length === 0) {
        alert("Flags are still loading or failed to load. Please refresh the page.");
        return;
    }

    filterFlags(region);

    score = 0;
    lives = 3;
    timeRemaining = 60;
    gameActive = true;
    clearInterval(timerInterval);

    // Update HUD display
    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.textContent = score;

    const feedbackEl = isMultiplayerMode ? document.getElementById('mp-feedback') : document.getElementById('feedback');
    if (feedbackEl) feedbackEl.textContent = "";

    const guessInput = isMultiplayerMode ? document.getElementById('mp-guess-input') : document.getElementById('guess-input');
    const submitBtn = isMultiplayerMode ? document.getElementById('mp-submit-btn') : document.getElementById('submit-btn');
    if (guessInput) guessInput.disabled = false;
    if (submitBtn) submitBtn.disabled = false;

    // Timed & Survival Displays
    const timerDisp = isMultiplayerMode ? document.getElementById('mp-timer-display') : document.getElementById('timer-display');
    const livesDisp = isMultiplayerMode ? document.getElementById('mp-lives-display') : document.getElementById('lives-display');

    if (timerDisp) timerDisp.style.display = mode === 'timed' ? 'block' : 'none';
    if (livesDisp) livesDisp.style.display = mode === 'survival' ? 'block' : 'none';

    updateLivesDisplay();

    if (mode === 'timed') {
        const timerEl = isMultiplayerMode ? document.getElementById('mp-timer') : document.getElementById('timer');
        if (timerEl) timerEl.textContent = timeRemaining;
        timerInterval = setInterval(() => updateTimer(mode), 1000);
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

// 7. Game Loop & Guess Checks
function updateTimer(mode) {
    timeRemaining--;
    const timerEl = isMultiplayerMode ? document.getElementById('mp-timer') : document.getElementById('timer');
    if (timerEl) timerEl.textContent = timeRemaining;

    if (timeRemaining <= 0) {
        endGame("⏱️ Time's up!");
    }
}

function updateLivesDisplay() {
    const livesEl = isMultiplayerMode ? document.getElementById('mp-lives') : document.getElementById('lives');
    if (livesEl) livesEl.textContent = "❤️".repeat(lives);
}

function nextFlag() {
    if (!activeFlags || activeFlags.length === 0) return;

    const randomIndex = Math.floor(Math.random() * activeFlags.length);
    currentFlag = activeFlags[randomIndex];

    const flagImg = isMultiplayerMode ? document.getElementById('mp-flag-image') : document.getElementById('flag-image');
    if (flagImg && currentFlag) flagImg.src = currentFlag.image;

    const input = isMultiplayerMode ? document.getElementById('mp-guess-input') : document.getElementById('guess-input');
    if (input) { input.value = ""; input.focus(); }
}

function checkGuess() {
    if (!gameActive) return;

    const inputField = isMultiplayerMode ? document.getElementById('mp-guess-input') : document.getElementById('guess-input');
    if (!inputField) return;

    const userGuess = inputField.value.trim();
    const currentMode = isMultiplayerMode ? mpMode : (document.getElementById('mode-select')?.value || 'classic');

    if (!userGuess) return;

    if (userGuess.toLowerCase() === currentFlag.name.toLowerCase()) {
        score++;
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = score;

        const feedbackEl = isMultiplayerMode ? document.getElementById('mp-feedback') : document.getElementById('feedback');
        if (feedbackEl) {
            feedbackEl.textContent = "Correct! 🎉";
            feedbackEl.style.color = "green";
        }

        // Send real-time multiplayer score sync
        if (isMultiplayerMode) {
            const self = roomPlayers.find(p => p.name === myPlayerName);
            if (self) self.score = score;
            updateLeaderboardUI();

            if (isHost) {
                broadcastToAll({ type: 'LEADERBOARD_UPDATE', players: roomPlayers });
            } else if (hostConn && hostConn.open) {
                hostConn.send({ type: 'SCORE_UPDATE', name: myPlayerName, score: score });
            }
        }

        nextFlag();
    } else {
        const feedbackEl = isMultiplayerMode ? document.getElementById('mp-feedback') : document.getElementById('feedback');
        if (feedbackEl) {
            feedbackEl.textContent = "Wrong answer! ❌";
            feedbackEl.style.color = "red";
        }

        if (currentMode === 'survival') {
            lives--;
            updateLivesDisplay();
            if (lives <= 0) endGame("💥 Game Over! You ran out of lives.");
        }
    }
}

function endGame(message) {
    gameActive = false;
    clearInterval(timerInterval);

    const guessInput = isMultiplayerMode ? document.getElementById('mp-guess-input') : document.getElementById('guess-input');
    const submitBtn = isMultiplayerMode ? document.getElementById('mp-submit-btn') : document.getElementById('submit-btn');

    if (guessInput) guessInput.disabled = true;
    if (submitBtn) submitBtn.disabled = true;

    if (isMultiplayerMode) {
        document.getElementById('mp-active-game').setAttribute('hidden', 'true');
        const roundOverBox = document.getElementById('round-over-box');
        const winnerText = document.getElementById('round-winner-text');
        const playAgainBtn = document.getElementById('mp-play-again-btn');

        roundOverBox.removeAttribute('hidden');

        // Calculate Round Winner
        const sorted = [...roomPlayers].sort((a, b) => b.score - a.score);
        const winner = sorted[0];

        if (winnerText) {
            winnerText.innerHTML = `<strong>${winner.name}</strong> won the round with <strong>${winner.score} points</strong>! 🎉`;
        }

        if (playAgainBtn) {
            if (isHost) playAgainBtn.removeAttribute('hidden');
            else playAgainBtn.setAttribute('hidden', 'true');
        }
    } else {
        const feedbackEl = document.getElementById('feedback');
        if (feedbackEl) feedbackEl.textContent = `${message} Final Score: ${score}`;
    }
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