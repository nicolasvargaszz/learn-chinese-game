/**
 * Battle Mode - Real-time Multiplayer Quiz (Kahoot-style)
 */

// ==================== BATTLE STATE ====================
const battleState = {
    socket: null,
    roomCode: null,
    playerId: null,
    playerName: '',
    isHost: false,
    players: [],
    currentQuestion: 0,
    totalQuestions: 10,
    myScore: 0,
    myStreak: 0,
    timerInterval: null,
    timeLeft: 15,
    hasAnswered: false
};

// ==================== DOM ELEMENTS ====================
const battleDom = {
    // Views
    lobby: document.getElementById('battle-lobby'),
    waitingRoom: document.getElementById('battle-waiting-room'),
    game: document.getElementById('battle-game'),
    leaderboard: document.getElementById('battle-leaderboard'),
    finalResults: document.getElementById('battle-final-results'),
    
    // Lobby
    playerNameInput: document.getElementById('battle-player-name'),
    createRoomBtn: document.getElementById('create-battle-room'),
    joinRoomBtn: document.getElementById('join-battle-room'),
    roomCodeInput: document.getElementById('battle-room-code-input'),
    errorMessage: document.getElementById('battle-error'),
    
    // Waiting Room
    roomCodeDisplay: document.getElementById('battle-room-code-display'),
    playerCount: document.getElementById('battle-player-count'),
    playersList: document.getElementById('battle-players-list'),
    startBattleBtn: document.getElementById('start-battle-btn'),
    waitingForHost: document.getElementById('waiting-for-host'),
    leaveBattleBtn: document.getElementById('leave-battle-btn'),
    
    // Game
    countdown: document.getElementById('battle-countdown'),
    countdownNumber: document.getElementById('countdown-number'),
    questionNum: document.getElementById('battle-question-num'),
    totalQuestions: document.getElementById('battle-total-questions'),
    timerRing: document.getElementById('battle-timer-ring'),
    timer: document.getElementById('battle-timer'),
    myScore: document.getElementById('battle-my-score'),
    questionText: document.getElementById('battle-question-text'),
    options: document.getElementById('battle-options'),
    feedback: document.getElementById('battle-feedback'),
    feedbackIcon: document.getElementById('battle-feedback-icon'),
    feedbackText: document.getElementById('battle-feedback-text'),
    feedbackPoints: document.getElementById('battle-feedback-points'),
    answersCount: document.getElementById('battle-answers-count'),
    playersTotal: document.getElementById('battle-players-total'),
    
    // Leaderboard
    leaderboardQuestionNum: document.getElementById('leaderboard-question-num'),
    leaderboardTotalQuestions: document.getElementById('leaderboard-total-questions'),
    leaderboardCorrectAnswer: document.getElementById('leaderboard-correct-answer'),
    leaderboardCorrectPinyin: document.getElementById('leaderboard-correct-pinyin'),
    rankings: document.getElementById('leaderboard-rankings'),
    
    // Final Results
    podium1stName: document.getElementById('podium-1st-name'),
    podium1stScore: document.getElementById('podium-1st-score'),
    podium2ndName: document.getElementById('podium-2nd-name'),
    podium2ndScore: document.getElementById('podium-2nd-score'),
    podium3rdName: document.getElementById('podium-3rd-name'),
    podium3rdScore: document.getElementById('podium-3rd-score'),
    finalRankings: document.getElementById('final-rankings'),
    playAgainBtn: document.getElementById('battle-play-again'),
    goHomeBtn: document.getElementById('battle-go-home'),
    
    // Navigation
    backToHome: document.getElementById('battle-back-to-home')
};

// ==================== INITIALIZATION ====================
function initBattle() {
    // Connect to Socket.IO with polling only (for Render free tier compatibility)
    battleState.socket = io({
        transports: ['polling'],  // Only use polling, no websocket
        upgrade: false,           // Don't try to upgrade to websocket
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 30000
    });
    
    // Bind UI events
    bindBattleEvents();
    
    // Bind socket events
    bindSocketEvents();
    
    console.log('⚔️ Battle Mode initialized');
}

function bindBattleEvents() {
    // Create room
    battleDom.createRoomBtn?.addEventListener('click', createRoom);
    
    // Join room
    battleDom.joinRoomBtn?.addEventListener('click', joinRoom);
    battleDom.roomCodeInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
    
    // Auto-uppercase room code
    battleDom.roomCodeInput?.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
    
    // Start battle
    battleDom.startBattleBtn?.addEventListener('click', startBattle);
    
    // Leave battle
    battleDom.leaveBattleBtn?.addEventListener('click', leaveBattle);
    
    // Final buttons
    battleDom.playAgainBtn?.addEventListener('click', () => {
        resetBattleState();
        showBattleView('lobby');
    });
    
    battleDom.goHomeBtn?.addEventListener('click', () => {
        leaveBattle();
        showSection('home');
    });
    
    // Back to home
    battleDom.backToHome?.addEventListener('click', () => {
        if (battleState.roomCode) {
            leaveBattle();
        }
        showSection('home');
    });
}

function bindSocketEvents() {
    const socket = battleState.socket;
    
    // Connection events for debugging
    socket.on('connect', () => {
        console.log('✅ Socket connected! ID:', socket.id);
        if (battleDom.errorMessage) {
            battleDom.errorMessage.textContent = '';
            battleDom.errorMessage.classList.add('hidden');
        }
    });
    
    socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        showBattleError('Connection error. Please refresh and try again.');
    });
    
    socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
            // Server disconnected us, try to reconnect
            socket.connect();
        }
    });
    
    // Room created
    socket.on('room_created', (data) => {
        console.log('Room created:', data);
        battleState.roomCode = data.room_code;
        battleState.playerId = data.player_id;
        battleState.isHost = data.is_host;
        
        battleDom.roomCodeDisplay.textContent = data.room_code;
        showBattleView('waiting');
        updateHostControls();
    });
    
    // Room joined
    socket.on('room_joined', (data) => {
        console.log('Room joined:', data);
        battleState.roomCode = data.room_code;
        battleState.playerId = data.player_id;
        battleState.isHost = data.is_host;
        
        battleDom.roomCodeDisplay.textContent = data.room_code;
        showBattleView('waiting');
        updateHostControls();
    });
    
    // Join error
    socket.on('join_error', (data) => {
        showBattleError(data.message);
    });
    
    // Lobby update
    socket.on('lobby_update', (data) => {
        console.log('Lobby update:', data);
        battleState.players = data.players;
        updatePlayersList();
    });
    
    // Player joined
    socket.on('player_joined', (data) => {
        console.log('Player joined:', data.name);
        playSound('correct');
    });
    
    // Player left
    socket.on('player_left', (data) => {
        console.log('Player left:', data.name);
    });
    
    // Battle starting
    socket.on('battle_starting', (data) => {
        console.log('Battle starting!');
        showBattleView('game');
        startCountdown(data.countdown);
    });
    
    // New question
    socket.on('new_question', (data) => {
        console.log('New question:', data);
        displayQuestion(data);
    });
    
    // Answer result
    socket.on('answer_result', (data) => {
        console.log('Answer result:', data);
        showAnswerFeedback(data);
    });
    
    // Answer count update
    socket.on('answer_count', (data) => {
        battleDom.answersCount.textContent = data.answered;
        battleDom.playersTotal.textContent = data.total;
    });
    
    // Show leaderboard
    socket.on('show_leaderboard', (data) => {
        console.log('Leaderboard:', data);
        displayLeaderboard(data);
    });
    
    // Battle ended
    socket.on('battle_ended', (data) => {
        console.log('Battle ended:', data);
        displayFinalResults(data);
    });
    
    // Error
    socket.on('error', (data) => {
        showBattleError(data.message);
    });
}

// ==================== ROOM MANAGEMENT ====================
function createRoom() {
    const name = battleDom.playerNameInput?.value.trim() || 'Host';
    if (!name) {
        showBattleError('Please enter your name!');
        return;
    }
    
    battleState.playerName = name;
    battleState.socket.emit('create_room', { name });
}

function joinRoom() {
    const name = battleDom.playerNameInput?.value.trim() || 'Player';
    const roomCode = battleDom.roomCodeInput?.value.trim().toUpperCase();
    
    if (!name) {
        showBattleError('Please enter your name!');
        return;
    }
    
    if (!roomCode || roomCode.length !== 6) {
        showBattleError('Please enter a valid 6-character room code!');
        return;
    }
    
    battleState.playerName = name;
    battleState.socket.emit('join_room', { name, room_code: roomCode });
}

function startBattle() {
    if (!battleState.isHost) return;
    battleState.socket.emit('start_battle', { room_code: battleState.roomCode });
}

function leaveBattle() {
    battleState.socket.emit('leave_battle', {
        room_code: battleState.roomCode,
        player_id: battleState.playerId
    });
    resetBattleState();
    showBattleView('lobby');
}

// ==================== GAME LOGIC ====================
function startCountdown(seconds) {
    battleDom.countdown.classList.remove('hidden');
    let count = seconds;
    
    const updateCount = () => {
        battleDom.countdownNumber.textContent = count;
        battleDom.countdownNumber.classList.add('animate-bounce');
        
        if (count > 0) {
            count--;
            setTimeout(updateCount, 1000);
        } else {
            battleDom.countdown.classList.add('hidden');
            // Request first question
            if (battleState.isHost) {
                battleState.socket.emit('request_question', { room_code: battleState.roomCode });
            }
        }
    };
    
    updateCount();
}

function displayQuestion(data) {
    battleState.hasAnswered = false;
    battleState.currentQuestion = data.question_num;
    battleState.totalQuestions = data.total_questions;
    
    // Hide leaderboard, show game
    showBattleView('game');
    battleDom.countdown.classList.add('hidden');
    battleDom.feedback.classList.add('hidden');
    
    // Update header
    battleDom.questionNum.textContent = data.question_num;
    battleDom.totalQuestions.textContent = data.total_questions;
    battleDom.answersCount.textContent = '0';
    battleDom.playersTotal.textContent = battleState.players.length;
    
    // Show question
    battleDom.questionText.textContent = data.question;
    
    // Create options
    battleDom.options.innerHTML = '';
    const colors = [
        'from-red-500 to-pink-500',
        'from-blue-500 to-cyan-500',
        'from-green-500 to-emerald-500',
        'from-yellow-500 to-orange-500'
    ];
    const shapes = ['▲', '◆', '●', '■'];
    
    data.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = `battle-option p-6 rounded-2xl bg-gradient-to-br ${colors[i]} text-white font-bold text-xl transition-all hover:scale-105 hover:shadow-lg active:scale-95`;
        btn.innerHTML = `
            <div class="text-3xl mb-2">${shapes[i]}</div>
            <div class="text-3xl mb-1" style="font-family: 'Noto Sans TC', sans-serif; font-weight: 900;">${opt.traditional}</div>
            <div class="text-sm opacity-80">${opt.pinyin}</div>
        `;
        btn.addEventListener('click', () => submitAnswer(opt.traditional));
        battleDom.options.appendChild(btn);
    });
    
    // Start timer
    startQuestionTimer(data.time_limit);
}

function submitAnswer(answer) {
    if (battleState.hasAnswered) return;
    battleState.hasAnswered = true;
    
    // Disable all options
    const options = battleDom.options.querySelectorAll('.battle-option');
    options.forEach(opt => {
        opt.disabled = true;
        opt.classList.add('opacity-50', 'cursor-not-allowed');
        opt.classList.remove('hover:scale-105');
    });
    
    // Send answer
    battleState.socket.emit('submit_answer', {
        room_code: battleState.roomCode,
        player_id: battleState.playerId,
        answer: answer
    });
}

function showAnswerFeedback(data) {
    stopTimer();
    
    // Update score
    battleState.myScore = data.total_score;
    battleState.myStreak = data.streak;
    battleDom.myScore.textContent = data.total_score;
    
    // Show feedback
    battleDom.feedback.classList.remove('hidden');
    
    if (data.correct) {
        battleDom.feedback.className = 'p-6 rounded-2xl text-center bg-jade/20 border-2 border-jade';
        battleDom.feedbackIcon.textContent = '✅';
        battleDom.feedbackText.textContent = 'Correct!';
        battleDom.feedbackText.className = 'text-xl font-bold text-jade';
        battleDom.feedbackPoints.textContent = `+${data.points_earned} points`;
        battleDom.feedbackPoints.className = 'text-lg text-jade font-medium';
        playSound('correct');
    } else {
        battleDom.feedback.className = 'p-6 rounded-2xl text-center bg-vermillion/20 border-2 border-vermillion';
        battleDom.feedbackIcon.textContent = '❌';
        battleDom.feedbackText.textContent = 'Wrong!';
        battleDom.feedbackText.className = 'text-xl font-bold text-vermillion';
        battleDom.feedbackPoints.innerHTML = `Correct: <span style="font-family: 'Noto Sans TC', sans-serif;">${data.correct_answer}</span> (${data.pinyin})`;
        battleDom.feedbackPoints.className = 'text-lg text-ink font-medium';
        playSound('wrong');
    }
    
    // Show streak if applicable
    if (data.streak >= 2) {
        battleDom.feedbackPoints.innerHTML += `<br><span class="text-vermillion">🔥 ${data.streak} streak!</span>`;
    }
}

function startQuestionTimer(seconds) {
    stopTimer();
    battleState.timeLeft = seconds;
    const circumference = 2 * Math.PI * 28;
    
    battleDom.timer.textContent = seconds;
    battleDom.timerRing.style.strokeDasharray = circumference;
    battleDom.timerRing.style.strokeDashoffset = 0;
    
    battleState.timerInterval = setInterval(() => {
        battleState.timeLeft--;
        battleDom.timer.textContent = battleState.timeLeft;
        
        // Update ring
        const offset = circumference - (battleState.timeLeft / seconds) * circumference;
        battleDom.timerRing.style.strokeDashoffset = offset;
        
        // Warning color
        if (battleState.timeLeft <= 5) {
            battleDom.timer.classList.add('text-vermillion');
            battleDom.timerRing.style.stroke = '#d1462f';
        } else {
            battleDom.timer.classList.remove('text-vermillion');
            battleDom.timerRing.style.stroke = '';
        }
        
        if (battleState.timeLeft <= 0) {
            stopTimer();
            if (battleState.isHost) {
                battleState.socket.emit('time_up', { room_code: battleState.roomCode });
            }
        }
    }, 1000);
}

function stopTimer() {
    if (battleState.timerInterval) {
        clearInterval(battleState.timerInterval);
        battleState.timerInterval = null;
    }
}

// ==================== LEADERBOARD ====================
function displayLeaderboard(data) {
    stopTimer();
    showBattleView('leaderboard');
    
    // Update header
    battleDom.leaderboardQuestionNum.textContent = data.question_num;
    battleDom.leaderboardTotalQuestions.textContent = data.total_questions;
    
    // Show correct answer
    battleDom.leaderboardCorrectAnswer.textContent = data.correct_answer;
    battleDom.leaderboardCorrectPinyin.textContent = data.pinyin;
    
    // Animate rankings
    battleDom.rankings.innerHTML = '';
    
    data.leaderboard.forEach((player, index) => {
        const rankDiv = document.createElement('div');
        rankDiv.className = `flex items-center justify-between p-4 rounded-xl transition-all transform opacity-0 translate-y-4`;
        
        // Different styles for top 3
        if (player.rank === 1) {
            rankDiv.classList.add('bg-gradient-to-r', 'from-gold/30', 'to-yellow-300/30', 'border-2', 'border-gold');
        } else if (player.rank === 2) {
            rankDiv.classList.add('bg-gradient-to-r', 'from-gray-400/30', 'to-gray-300/30', 'border-2', 'border-gray-400');
        } else if (player.rank === 3) {
            rankDiv.classList.add('bg-gradient-to-r', 'from-amber-700/30', 'to-amber-600/30', 'border-2', 'border-amber-600');
        } else {
            rankDiv.classList.add('bg-paper-warm', 'border-2', 'border-paper-dark');
        }
        
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        const isMe = player.name === battleState.playerName;
        
        rankDiv.innerHTML = `
            <div class="flex items-center gap-4">
                <span class="text-2xl">${medals[player.rank - 1] || player.rank}</span>
                <span class="font-bold text-lg ${isMe ? 'text-purple-600' : 'text-ink'}">${player.name}${isMe ? ' (You)' : ''}</span>
                ${player.streak >= 2 ? `<span class="text-sm text-vermillion">🔥${player.streak}</span>` : ''}
            </div>
            <span class="text-2xl font-black ${player.rank === 1 ? 'text-gold' : 'text-ink'}">${player.score}</span>
        `;
        
        battleDom.rankings.appendChild(rankDiv);
        
        // Animate in with delay
        setTimeout(() => {
            rankDiv.classList.remove('opacity-0', 'translate-y-4');
        }, index * 200);
    });
    
    // Auto-advance after 5 seconds (host only)
    if (battleState.isHost) {
        setTimeout(() => {
            battleState.socket.emit('next_question', { room_code: battleState.roomCode });
        }, 5000);
    }
}

// ==================== FINAL RESULTS ====================
function displayFinalResults(data) {
    stopTimer();
    showBattleView('final');
    
    const leaderboard = data.final_leaderboard;
    
    // Update podium
    if (leaderboard[0]) {
        battleDom.podium1stName.textContent = leaderboard[0].name;
        battleDom.podium1stScore.textContent = `${leaderboard[0].score} pts`;
    }
    if (leaderboard[1]) {
        battleDom.podium2ndName.textContent = leaderboard[1].name;
        battleDom.podium2ndScore.textContent = `${leaderboard[1].score} pts`;
    }
    if (leaderboard[2]) {
        battleDom.podium3rdName.textContent = leaderboard[2].name;
        battleDom.podium3rdScore.textContent = `${leaderboard[2].score} pts`;
    }
    
    // Show all rankings
    battleDom.finalRankings.innerHTML = '';
    
    leaderboard.forEach((player, index) => {
        if (index >= 3) { // Only show 4th place and below here
            const isMe = player.name === battleState.playerName;
            const div = document.createElement('div');
            div.className = `flex items-center justify-between p-3 rounded-xl ${isMe ? 'bg-purple-500/20 border-2 border-purple-400' : 'bg-paper-warm border-2 border-paper-dark'}`;
            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-lg font-bold text-ink-light">#${player.rank}</span>
                    <span class="font-medium ${isMe ? 'text-purple-600' : 'text-ink'}">${player.name}${isMe ? ' (You)' : ''}</span>
                </div>
                <div class="text-right">
                    <span class="font-bold text-ink">${player.score}</span>
                    <span class="text-sm text-ink-light/60 ml-2">${player.correct_answers}/${player.total_questions}</span>
                </div>
            `;
            battleDom.finalRankings.appendChild(div);
        }
    });
    
    // Play victory sound
    playSound('correct');
}

// ==================== UI HELPERS ====================
function showBattleView(view) {
    // Hide all views
    battleDom.lobby?.classList.add('hidden');
    battleDom.waitingRoom?.classList.add('hidden');
    battleDom.game?.classList.add('hidden');
    battleDom.leaderboard?.classList.add('hidden');
    battleDom.finalResults?.classList.add('hidden');
    
    // Show requested view
    switch (view) {
        case 'lobby':
            battleDom.lobby?.classList.remove('hidden');
            break;
        case 'waiting':
            battleDom.waitingRoom?.classList.remove('hidden');
            break;
        case 'game':
            battleDom.game?.classList.remove('hidden');
            break;
        case 'leaderboard':
            battleDom.leaderboard?.classList.remove('hidden');
            break;
        case 'final':
            battleDom.finalResults?.classList.remove('hidden');
            break;
    }
}

function updatePlayersList() {
    battleDom.playerCount.textContent = battleState.players.length;
    battleDom.playersList.innerHTML = '';
    
    battleState.players.forEach((player, index) => {
        const div = document.createElement('div');
        const isMe = player.name === battleState.playerName;
        div.className = `flex items-center justify-between p-3 rounded-xl ${isMe ? 'bg-purple-500/20 border-2 border-purple-400' : 'bg-paper-aged border border-paper-dark'}`;
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-2xl">${player.is_host ? '👑' : '🎮'}</span>
                <span class="font-medium ${isMe ? 'text-purple-600' : 'text-ink'}">${player.name}${isMe ? ' (You)' : ''}</span>
            </div>
            ${player.is_host ? '<span class="text-xs px-2 py-1 bg-gold/20 text-gold rounded-full font-medium">Host</span>' : ''}
        `;
        battleDom.playersList.appendChild(div);
    });
}

function updateHostControls() {
    if (battleState.isHost) {
        battleDom.startBattleBtn?.classList.remove('hidden');
        battleDom.waitingForHost?.classList.add('hidden');
    } else {
        battleDom.startBattleBtn?.classList.add('hidden');
        battleDom.waitingForHost?.classList.remove('hidden');
    }
}

function showBattleError(message) {
    battleDom.errorMessage.textContent = message;
    battleDom.errorMessage.classList.remove('hidden');
    
    setTimeout(() => {
        battleDom.errorMessage.classList.add('hidden');
    }, 4000);
}

function resetBattleState() {
    stopTimer();
    battleState.roomCode = null;
    battleState.playerId = null;
    battleState.isHost = false;
    battleState.players = [];
    battleState.currentQuestion = 0;
    battleState.myScore = 0;
    battleState.myStreak = 0;
    battleState.hasAnswered = false;
    
    // Reset UI
    battleDom.myScore.textContent = '0';
    battleDom.roomCodeInput.value = '';
}

function playSound(type) {
    try {
        const audio = document.getElementById(`sfx-${type}`);
        if (audio) {
            audio.currentTime = 0;
            audio.play();
        }
    } catch (e) {}
}

// ==================== INITIALIZE ON DOM READY ====================
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on a page with battle elements
    if (document.getElementById('battle')) {
        initBattle();
    }
});
