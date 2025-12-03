/**
 * 華語學習 - Chinese Learning Game
 * Complete JavaScript Application
 */

// ==================== STATE MANAGEMENT ====================
const state = {
    // Data
    allWords: [],
    filteredWords: [],
    currentLesson: 'all',
    
    // Flashcard state
    fcIndex: 0,
    fcFlipped: false,
    fcLearned: new Set(),

    // Writing state
    wrIndex: 0,
    
    // Quiz state
    quizDeck: [],
    quizCurrent: null,
    quizRound: 0,
    quizMaxRounds: 12,
    quizScore: 0,
    quizStreak: 0,
    quizBestStreak: 0,
    quizAttempts: 0,
    quizCorrect: 0,
    quizTimer: 15,
    quizTimerInterval: null,
    quizLocked: false,
    quizTimerFrozen: false,
    quizDoublePoints: false,
    
    // Power-ups
    powerUps: {
        fiftyFifty: 3,
        freeze: 2,
        doublePoints: 1
    },
    
    // App state
    currentSection: 'home',
    soundEnabled: true,
    stats: {
        totalLearned: 0,
        bestStreak: 0
    }
};

// ==================== DOM SELECTORS ====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
    // Sections
    sections: {
        home: $('#home'),
        flashcards: $('#flashcards'),
        writing: $('#writing'),
        quiz: $('#quiz'),
        battle: $('#battle'),
        lessons: $('#lessons')
    },
    
    // Navigation
    navLogo: $('#nav-logo'),
    navLinks: $$('[data-nav]'),
    navStreak: $('#nav-streak'),
    soundToggle: $('#sound-toggle'),
    
    // Home
    startFlashcards: $('#start-flashcards'),
    startQuiz: $('#start-quiz'),
    studyModeCards: $$('.study-mode-card'),
    wordsLearned: $('#words-learned'),
    bestStreak: $('#best-streak'),
    
    // Flashcard
    fcBackBtn: $('#fc-back-to-home'),
    fcLessonFilter: $('#fc-lesson-filter'),
    fcProgressText: $('#fc-progress-text'),
    fcProgressBar: $('#fc-progress-bar'),
    flashcard: $('#flashcard'),
    fcChinese: $('#fc-chinese'),
    fcCategory: $('#fc-category'),
    fcLesson: $('#fc-lesson'),
    fcPos: $('#fc-pos'),
    fcPinyinBack: $('#fc-pinyin-back'),
    fcEnglishBack: $('#fc-english-back'),
    fcHintBack: $('#fc-hint-back'),
    fcPrevBtn: $('#fc-prev'),
    fcFlipBtn: $('#fc-flip'),
    fcNextBtn: $('#fc-next'),
    knowledgeBtns: $$('.knowledge-btn'),
    
    // Quiz
    quizBackBtn: $('#quiz-back-to-home'),
    quizScore: $('#quiz-score'),
    quizStreak: $('#quiz-streak'),
    quizTimer: $('#quiz-timer'),
    quizTimerRing: $('#quiz-timer-ring'),
    quizRoundText: $('#quiz-round-text'),
    quizProgressBar: $('#quiz-progress-bar'),
    quizCategory: $('#quiz-category'),
    quizLessonBadge: $('#quiz-lesson-badge'),
    quizQuestion: $('#quiz-question'),
    quizHint: $('#quiz-hint'),
    quizPinyin: $('#quiz-pinyin'),
    quizOptions: $('#quiz-options'),
    quizComboFeed: $('#quiz-combo-feed'),
    quizParticles: $('#quiz-particles'),
    
    // Lessons
    lessonsBackBtn: $('#lessons-back-to-home'),
    lessonCards: $('#lesson-cards'),
    lessonWordList: $('#lesson-word-list'),
    wordGrid: $('#word-grid'),
    closeWordList: $('#close-word-list'),
    categoryFilterBtns: $$('.category-filter-btn'),
    lessonActionBtns: $$('.lesson-action-btn'),

    // Writing
    writingBackBtn: $('#writing-back-to-home'),
    wrWordSelect: $('#wr-word-select'),
    wrChinese: $('#wr-chinese'),
    wrPinyin: $('#wr-pinyin'),
    wrEnglish: $('#wr-english'),
    wrHint: $('#wr-hint'),
    wrLesson: $('#wr-lesson'),
    wrPrevBtn: $('#wr-prev'),
    wrNextBtn: $('#wr-next'),
    
    // Modals
    resultModal: $('#result-modal'),
    modalEmoji: $('#modal-emoji'),
    modalKicker: $('#modal-kicker'),
    modalHeading: $('#modal-heading'),
    modalCharacter: $('#modal-character'),
    modalPinyin: $('#modal-pinyin'),
    modalEnglish: $('#modal-english'),
    modalHint: $('#modal-hint'),
    modalNextBtn: $('#modal-next-btn'),
    
    completionModal: $('#completion-modal'),
    finalScore: $('#final-score'),
    finalAccuracy: $('#final-accuracy'),
    finalBestStreak: $('#final-best-streak'),
    restartQuizBtn: $('#restart-quiz-btn'),
    goHomeBtn: $('#go-home-btn'),
    
    // Audio
    sfxCorrect: $('#sfx-correct'),
    sfxWrong: $('#sfx-wrong'),
    sfxFlip: $('#sfx-flip')
};

// ==================== MESSAGES ====================
const STREAK_MESSAGES = new Map([
    [2, '🔥 Double combo! Keep going!'],
    [3, '🔥🔥 Triple streak! Amazing!'],
    [5, '🎆 INCREDIBLE! 5 in a row!'],
    [7, '🏆 LEGENDARY! 7 streak!'],
    [10, '👑 UNSTOPPABLE! 10 streak!']
]);

const CORRECT_MESSAGES = [
    '🎉 Perfect!',
    '✨ Excellent!',
    '💯 Nailed it!',
    '🌟 Brilliant!',
    '⭐ Amazing!'
];

const WRONG_MESSAGES = [
    '💪 Keep trying!',
    '🌟 Almost there!',
    '💫 Learning is a journey!',
    '🎯 You\'ll get it next time!'
];

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        await loadVocabulary();
        loadStats();
        bindEvents();
        updateHomeStats();
        console.log('🐉 App initialized with', state.allWords.length, 'words');
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
}

async function loadVocabulary() {
    const response = await fetch('/api/v1/words');
    const data = await response.json();
    state.allWords = data.words || [];
    state.filteredWords = [...state.allWords];
}

function loadStats() {
    const saved = localStorage.getItem('chineseAppStats');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.stats = { ...state.stats, ...parsed };
            state.fcLearned = new Set(parsed.learnedIds || []);
        } catch (e) {}
    }
}

function saveStats() {
    const toSave = {
        ...state.stats,
        learnedIds: Array.from(state.fcLearned)
    };
    localStorage.setItem('chineseAppStats', JSON.stringify(toSave));
}

function updateHomeStats() {
    if (dom.wordsLearned) dom.wordsLearned.textContent = state.fcLearned.size;
    if (dom.bestStreak) dom.bestStreak.textContent = state.stats.bestStreak;
}

// ==================== EVENT BINDING ====================
function bindEvents() {
    // Navigation
    dom.navLogo?.addEventListener('click', () => showSection('home'));
    dom.writingBackBtn?.addEventListener('click', () => showSection('home'));
    dom.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(link.dataset.nav);
        });
    });
    
    // Sound toggle
    dom.soundToggle?.addEventListener('click', toggleSound);
    
    // Home buttons
    dom.startFlashcards?.addEventListener('click', () => showSection('flashcards'));
    dom.startQuiz?.addEventListener('click', () => {
        showSection('quiz');
        startQuiz();
    });
    
    // Study mode cards
    dom.studyModeCards.forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            if (mode === 'flashcards') showSection('flashcards');
            else if (mode === 'quiz') {
                showSection('quiz');
                startQuiz();
            }
            else if (mode === 'writing') {
                showSection('writing');
                initWriting();
            }
            else if (mode === 'battle') showSection('battle');
            else if (mode === 'lessons') showSection('lessons');
        });
    });
    
    // Flashcard events
    dom.fcBackBtn?.addEventListener('click', () => showSection('home'));
    dom.flashcard?.addEventListener('click', flipFlashcard);
    dom.fcFlipBtn?.addEventListener('click', flipFlashcard);
    dom.fcPrevBtn?.addEventListener('click', prevFlashcard);
    dom.fcNextBtn?.addEventListener('click', nextFlashcard);
    dom.fcLessonFilter?.addEventListener('change', filterFlashcards);
    
    dom.knowledgeBtns.forEach(btn => {
        btn.addEventListener('click', () => rateKnowledge(parseInt(btn.dataset.level)));
    });
    
    // Writing prev/next
    dom.wrPrevBtn?.addEventListener('click', prevWriting);
    dom.wrNextBtn?.addEventListener('click', nextWriting);

    // Quiz events
    dom.quizBackBtn?.addEventListener('click', () => {
        stopQuizTimer();
        showSection('home');
    });
    
    // Quiz lesson filter
    document.getElementById('quiz-lesson-filter')?.addEventListener('change', (e) => {
        const lesson = e.target.value;
        state.currentLesson = lesson;
        startQuiz(lesson === 'all' ? null : parseInt(lesson));
    });
    
    // Power-up events
    document.getElementById('quiz-5050-btn')?.addEventListener('click', useFiftyFifty);
    document.getElementById('quiz-freeze-btn')?.addEventListener('click', useFreeze);
    document.getElementById('quiz-double-btn')?.addEventListener('click', useDoublePoints);
    document.getElementById('quiz-hint-btn')?.addEventListener('click', showQuizHint);
    document.getElementById('quiz-skip-btn')?.addEventListener('click', skipQuestion);
    
    // Lessons events
    dom.lessonsBackBtn?.addEventListener('click', () => showSection('home'));
    dom.closeWordList?.addEventListener('click', () => {
        dom.lessonWordList?.classList.add('hidden');
    });
    
    dom.categoryFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => filterByCategory(btn.dataset.category));
    });
    
    dom.lessonActionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lesson = parseInt(btn.dataset.lesson);
            const action = btn.dataset.action;
            if (action === 'flashcards') {
                state.currentLesson = lesson;
                filterFlashcardsByLesson(lesson);
                showSection('flashcards');
            } else if (action === 'quiz') {
                state.currentLesson = lesson;
                showSection('quiz');
                startQuiz(lesson);
            }
        });
    });
    
    // Modal events
    dom.modalNextBtn?.addEventListener('click', handleModalNext);
    dom.restartQuizBtn?.addEventListener('click', () => {
        dom.completionModal?.close();
        startQuiz();
    });
    dom.goHomeBtn?.addEventListener('click', () => {
        dom.completionModal?.close();
        showSection('home');
    });
    
    // Prevent modal close on backdrop click
    dom.resultModal?.addEventListener('cancel', (e) => e.preventDefault());
    dom.completionModal?.addEventListener('cancel', (e) => e.preventDefault());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

// ==================== NAVIGATION ====================
function showSection(sectionName) {
    // Stop quiz timer if leaving quiz section
    if (state.currentSection === 'quiz' && sectionName !== 'quiz') {
        stopQuizTimer();
        state.quizLocked = true;
    }
    
    // Hide all sections
    Object.values(dom.sections).forEach(section => {
        section?.classList.add('hidden');
    });
    
    // Show target section
    const targetSection = dom.sections[sectionName];
    if (targetSection) {
        targetSection.classList.remove('hidden');
        state.currentSection = sectionName;
        
        // Initialize section if needed
        if (sectionName === 'flashcards') {
            initFlashcards();
        } else if (sectionName === 'writing') {
            initWriting();
        }
    }
    
    // Update nav active state
    dom.navLinks.forEach(link => {
        if (link.dataset.nav === sectionName) {
            link.classList.add('text-cinnabar', 'font-bold');
            link.classList.remove('text-vermillion');
        } else {
            link.classList.remove('text-cinnabar', 'font-bold');
            link.classList.add('text-vermillion');
        }
    });
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== FLASHCARD FUNCTIONS ====================
function initFlashcards() {
    state.fcIndex = 0;
    state.fcFlipped = false;
    if (state.filteredWords.length > 0) {
        renderFlashcard();
    }
}

function filterFlashcards() {
    const lesson = dom.fcLessonFilter?.value;
    filterFlashcardsByLesson(lesson);
}

function filterFlashcardsByLesson(lesson) {
    if (lesson === 'all') {
        state.filteredWords = [...state.allWords];
    } else {
        const lessonNum = parseInt(lesson);
        state.filteredWords = state.allWords.filter(w => w.lesson === lessonNum);
    }
    state.fcIndex = 0;
    state.fcFlipped = false;
    renderFlashcard();
}

function renderFlashcard() {
    if (state.filteredWords.length === 0) return;
    
    const word = state.filteredWords[state.fcIndex];
    
    // Front side
    dom.fcChinese.textContent = word.traditional;
    dom.fcCategory.textContent = `📚 ${word.category}`;
    dom.fcLesson.textContent = `Lesson ${word.lesson}`;
    dom.fcPos.textContent = word.pos || '';
    
    // Back side
    dom.fcPinyinBack.textContent = word.pinyin;
    dom.fcEnglishBack.textContent = word.english;
    dom.fcHintBack.textContent = `💡 ${word.hint || word.category}`;
    
    // Reset flip state
    if (state.fcFlipped) {
        dom.flashcard.classList.remove('flipped');
        state.fcFlipped = false;
    }
    
    // Update progress
    updateFlashcardProgress();
    
    // Update button states
    dom.fcPrevBtn.disabled = state.fcIndex === 0;
    dom.fcNextBtn.disabled = state.fcIndex >= state.filteredWords.length - 1;
}

function updateFlashcardProgress() {
    const current = state.fcIndex + 1;
    const total = state.filteredWords.length;
    const percent = (current / total) * 100;
    
    dom.fcProgressText.textContent = `${current} / ${total}`;
    dom.fcProgressBar.style.width = `${percent}%`;
}

function flipFlashcard() {
    state.fcFlipped = !state.fcFlipped;
    dom.flashcard.classList.toggle('flipped', state.fcFlipped);
    playSound('flip');
}

function prevFlashcard() {
    if (state.fcIndex > 0) {
        state.fcIndex--;
        state.fcFlipped = false;
        dom.flashcard.classList.remove('flipped');
        renderFlashcard();
    }
}

function nextFlashcard() {
    if (state.fcIndex < state.filteredWords.length - 1) {
        state.fcIndex++;
        state.fcFlipped = false;
        dom.flashcard.classList.remove('flipped');
        renderFlashcard();
    }
}

function rateKnowledge(level) {
    const word = state.filteredWords[state.fcIndex];
    
    if (level === 3) {
        // Mark as learned
        state.fcLearned.add(word.traditional);
        state.stats.totalLearned = state.fcLearned.size;
        saveStats();
        updateHomeStats();
    }
    
    // Auto advance to next card
    if (state.fcIndex < state.filteredWords.length - 1) {
        setTimeout(() => {
            nextFlashcard();
        }, 300);
    }
}

// ==================== QUIZ FUNCTIONS ====================
function startQuiz(lessonFilter = null) {
    // Filter words if lesson specified
    let words = [...state.allWords];
    if (lessonFilter && lessonFilter !== 'all') {
        words = words.filter(w => w.lesson === lessonFilter);
    }
    
    // Need at least 4 words for quiz
    if (words.length < 4) {
        alert('Need at least 4 words to start a quiz!');
        return;
    }
    
    // Initialize quiz state
    state.quizDeck = shuffle([...words]);
    state.quizRound = 0;
    state.quizScore = 0;
    state.quizStreak = 0;
    state.quizBestStreak = 0;
    state.quizAttempts = 0;
    state.quizCorrect = 0;
    state.quizMaxRounds = Math.min(12, words.length);
    state.quizLocked = false;
    state.quizTimerFrozen = false;
    state.quizDoublePoints = false;
    
    // Reset power-ups for new quiz
    state.powerUps = {
        fiftyFifty: 3,
        freeze: 2,
        doublePoints: 1
    };
    updatePowerUpButtons();
    
    // Update UI
    updateQuizHud();
    hydrateQuizRound();
}

function hydrateQuizRound() {
    if (state.quizRound >= state.quizMaxRounds) {
        showQuizCompletion();
        return;
    }
    
    // Get current word
    if (state.quizDeck.length < 4) {
        state.quizDeck = shuffle([...state.allWords]);
    }
    
    state.quizCurrent = state.quizDeck.pop();
    state.quizLocked = false;
    state.quizTimer = 15;
    state.quizTimerFrozen = false;
    state.quizDoublePoints = false;
    
    // Hide hint for new round
    const quizHint = document.getElementById('quiz-hint');
    if (quizHint) quizHint.classList.add('hidden');
    
    // Render question
    renderQuizQuestion();
    renderQuizOptions();
    updateQuizHud();
    updatePowerUpButtons();
    startQuizTimer();
}

// ==================== POWER-UP FUNCTIONS ====================
function useFiftyFifty() {
    if (state.quizLocked || state.powerUps.fiftyFifty <= 0) return;
    
    state.powerUps.fiftyFifty--;
    updatePowerUpButtons();
    
    // Get all quiz options
    const quizOptionsEl = document.getElementById('quiz-options');
    const options = quizOptionsEl.querySelectorAll('.quiz-option:not(.eliminated)');
    
    // Find wrong options
    const wrongOptions = [];
    options.forEach(opt => {
        const charEl = opt.querySelector('.character');
        if (charEl && charEl.textContent !== state.quizCurrent.traditional) {
            wrongOptions.push(opt);
        }
    });
    
    // Eliminate 2 random wrong options
    const toEliminate = shuffle(wrongOptions).slice(0, 2);
    toEliminate.forEach(opt => {
        opt.classList.add('eliminated');
        opt.style.opacity = '0.3';
        opt.style.pointerEvents = 'none';
        opt.style.transform = 'scale(0.9)';
    });
    
    // Show feedback
    showPowerUpFeedback('🎲 50/50 - Two wrong answers eliminated!');
}

function useFreeze() {
    if (state.quizLocked || state.powerUps.freeze <= 0 || state.quizTimerFrozen) return;
    
    state.powerUps.freeze--;
    state.quizTimerFrozen = true;
    updatePowerUpButtons();
    
    // Stop the timer
    stopQuizTimer();
    
    // Visual feedback on timer
    const quizTimerEl = document.getElementById('quiz-timer');
    const quizTimerRing = document.getElementById('quiz-timer-ring');
    if (quizTimerEl) {
        quizTimerEl.textContent = '❄️';
        quizTimerEl.classList.add('text-blue-400');
    }
    if (quizTimerRing) {
        quizTimerRing.style.stroke = '#60a5fa';
    }
    
    showPowerUpFeedback('❄️ Timer frozen for 10 seconds!');
    
    // Resume timer after 10 seconds
    setTimeout(() => {
        if (!state.quizLocked) {
            state.quizTimerFrozen = false;
            if (quizTimerEl) {
                quizTimerEl.classList.remove('text-blue-400');
            }
            if (quizTimerRing) {
                quizTimerRing.style.stroke = '';
            }
            startQuizTimer();
        }
    }, 10000);
}

function useDoublePoints() {
    if (state.quizLocked || state.powerUps.doublePoints <= 0 || state.quizDoublePoints) return;
    
    state.powerUps.doublePoints--;
    state.quizDoublePoints = true;
    updatePowerUpButtons();
    
    showPowerUpFeedback('⚡ Double points activated for this question!');
    
    // Visual feedback
    const quizCard = document.querySelector('.quiz-card');
    if (quizCard) {
        quizCard.style.boxShadow = '0 0 30px rgba(201, 162, 39, 0.4)';
        quizCard.style.borderColor = '#c9a227';
    }
}

function showQuizHint() {
    const quizHint = document.getElementById('quiz-hint');
    if (quizHint) {
        quizHint.classList.remove('hidden');
        quizHint.textContent = `💡 Pinyin: ${state.quizCurrent.pinyin}`;
    }
}

function skipQuestion() {
    if (state.quizLocked) return;
    
    // Penalty for skipping
    state.quizScore = Math.max(0, state.quizScore - 50);
    state.quizStreak = 0;
    state.quizAttempts++;
    state.quizRound++;
    
    stopQuizTimer();
    updateQuizHud();
    
    showPowerUpFeedback('⏭️ Question skipped! (-50 points)');
    
    // Move to next round after a short delay
    setTimeout(() => {
        hydrateQuizRound();
    }, 1000);
}

function updatePowerUpButtons() {
    const fiftyFiftyBtn = document.getElementById('quiz-5050-btn');
    const freezeBtn = document.getElementById('quiz-freeze-btn');
    const doubleBtn = document.getElementById('quiz-double-btn');
    
    if (fiftyFiftyBtn) {
        const countEl = fiftyFiftyBtn.querySelector('span:last-child');
        if (countEl) countEl.textContent = `x${state.powerUps.fiftyFifty}`;
        fiftyFiftyBtn.disabled = state.powerUps.fiftyFifty <= 0;
        if (state.powerUps.fiftyFifty <= 0) {
            fiftyFiftyBtn.style.opacity = '0.4';
            fiftyFiftyBtn.style.cursor = 'not-allowed';
        } else {
            fiftyFiftyBtn.style.opacity = '1';
            fiftyFiftyBtn.style.cursor = 'pointer';
        }
    }
    
    if (freezeBtn) {
        const countEl = freezeBtn.querySelector('span:last-child');
        if (countEl) countEl.textContent = `x${state.powerUps.freeze}`;
        freezeBtn.disabled = state.powerUps.freeze <= 0 || state.quizTimerFrozen;
        if (state.powerUps.freeze <= 0 || state.quizTimerFrozen) {
            freezeBtn.style.opacity = '0.4';
            freezeBtn.style.cursor = 'not-allowed';
        } else {
            freezeBtn.style.opacity = '1';
            freezeBtn.style.cursor = 'pointer';
        }
    }
    
    if (doubleBtn) {
        const countEl = doubleBtn.querySelector('span:last-child');
        if (countEl) countEl.textContent = `x${state.powerUps.doublePoints}`;
        doubleBtn.disabled = state.powerUps.doublePoints <= 0 || state.quizDoublePoints;
        if (state.powerUps.doublePoints <= 0 || state.quizDoublePoints) {
            doubleBtn.style.opacity = '0.4';
            doubleBtn.style.cursor = 'not-allowed';
        } else {
            doubleBtn.style.opacity = '1';
            doubleBtn.style.cursor = 'pointer';
        }
    }
}

function showPowerUpFeedback(message) {
    const quizComboFeed = document.getElementById('quiz-combo-feed');
    if (quizComboFeed) {
        const log = quizComboFeed.querySelector('.combo-log');
        if (log) {
            log.textContent = message;
            log.classList.add('celebrate');
            setTimeout(() => log.classList.remove('celebrate'), 500);
        }
    }
}

function renderQuizQuestion() {
    const word = state.quizCurrent;
    
    // Re-query elements to ensure they exist
    const quizCategory = document.getElementById('quiz-category');
    const quizLessonBadge = document.getElementById('quiz-lesson-badge');
    const quizQuestion = document.getElementById('quiz-question');
    const quizHint = document.getElementById('quiz-hint');
    const quizComboFeed = document.getElementById('quiz-combo-feed');
    
    if (quizCategory) quizCategory.textContent = `📚 ${word.category}`;
    if (quizLessonBadge) quizLessonBadge.textContent = `Lesson ${word.lesson}`;
    if (quizQuestion) quizQuestion.textContent = word.english;
    if (quizHint) quizHint.textContent = `💡 ${word.hint || 'Think about the meaning...'}`;
    if (quizComboFeed) {
        const comboLog = quizComboFeed.querySelector('.combo-log');
        if (comboLog) comboLog.textContent = '🎯 Choose the correct character!';
    }
    
    console.log('Quiz question rendered:', word.english);
}

function renderQuizOptions() {
    // Get the quiz options container - re-query in case it wasn't available at init
    const quizOptionsEl = document.getElementById('quiz-options');
    
    if (!quizOptionsEl) {
        console.error('Quiz options container not found!');
        return;
    }
    
    // Get 3 random distractors
    const distractors = shuffle(
        state.allWords.filter(w => w.traditional !== state.quizCurrent.traditional)
    ).slice(0, 3);
    
    // Combine and shuffle
    const options = shuffle([state.quizCurrent, ...distractors]);
    
    // Clear and render
    quizOptionsEl.innerHTML = '';
    
    options.forEach((word, index) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option group';
        btn.style.opacity = '0';
        btn.style.transform = 'translateY(20px)';
        btn.style.transition = 'all 0.3s ease';
        btn.innerHTML = `
            <span class="option-number">${index + 1}</span>
            <div class="character" style="font-family: 'Noto Sans TC', sans-serif; font-weight: 900; font-size: 3.5rem; color: #1a1a2e; margin-bottom: 0.5rem;">${word.traditional}</div>
            <div class="pinyin" style="font-size: 1rem; color: #4a8c7b; font-weight: 600;">${word.pinyin}</div>
        `;
        btn.addEventListener('click', () => handleQuizGuess(btn, word));
        quizOptionsEl.appendChild(btn);
        
        // Animate in
        setTimeout(() => {
            btn.style.opacity = '1';
            btn.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    console.log('Quiz options rendered:', options.length, 'options');
}

function handleQuizGuess(optionEl, word) {
    if (state.quizLocked) return;
    state.quizLocked = true;
    state.quizAttempts++;
    stopQuizTimer();
    
    const isCorrect = word.traditional === state.quizCurrent.traditional;
    
    // Mark options - re-query the container
    const quizOptionsEl = document.getElementById('quiz-options');
    const options = quizOptionsEl.querySelectorAll('.quiz-option');
    options.forEach(opt => {
        opt.classList.add('disabled');
        const charEl = opt.querySelector('.character');
        if (charEl && charEl.textContent === state.quizCurrent.traditional) {
            opt.classList.add('correct');
        }
    });
    
    if (isCorrect) {
        optionEl.classList.add('correct');
        state.quizCorrect++;
        state.quizStreak++;
        state.quizBestStreak = Math.max(state.quizBestStreak, state.quizStreak);
        
        // Calculate score with bonuses
        let baseScore = 100;
        const streakBonus = Math.max(0, (state.quizStreak - 1) * 25);
        const timeBonus = state.quizTimer * 5;
        let roundScore = baseScore + streakBonus + timeBonus;
        
        // Apply double points if active
        if (state.quizDoublePoints) {
            roundScore *= 2;
        }
        
        state.quizScore += roundScore;
        
        playSound('correct');
        spawnParticles(dom.quizParticles, 15);
        updateComboFeed(true);
        
        showResultModal('correct');
    } else {
        optionEl.classList.add('wrong');
        state.quizStreak = 0;
        
        playSound('wrong');
        updateComboFeed(false);
        
        showResultModal('wrong');
    }
    
    state.quizRound++;
    updateQuizHud();
}

function updateQuizHud() {
    // Re-query elements
    const quizScore = document.getElementById('quiz-score');
    const quizStreak = document.getElementById('quiz-streak');
    const navStreak = document.getElementById('nav-streak');
    const quizRoundText = document.getElementById('quiz-round-text');
    const quizProgressBar = document.getElementById('quiz-progress-bar');
    const quizCorrect = document.getElementById('quiz-correct');
    
    if (quizScore) quizScore.textContent = state.quizScore;
    if (quizStreak) quizStreak.textContent = state.quizStreak;
    if (navStreak) navStreak.textContent = state.quizStreak;
    if (quizCorrect) quizCorrect.textContent = state.quizCorrect;
    
    const roundDisplay = Math.min(state.quizRound + 1, state.quizMaxRounds);
    if (quizRoundText) quizRoundText.textContent = `${roundDisplay} / ${state.quizMaxRounds}`;
    
    const progress = (state.quizRound / state.quizMaxRounds) * 100;
    if (quizProgressBar) quizProgressBar.style.width = `${progress}%`;
}

function updateComboFeed(correct) {
    const quizComboFeed = document.getElementById('quiz-combo-feed');
    if (!quizComboFeed) return;
    
    const log = quizComboFeed.querySelector('.combo-log');
    if (!log) return;
    
    if (correct) {
        if (STREAK_MESSAGES.has(state.quizStreak)) {
            log.textContent = STREAK_MESSAGES.get(state.quizStreak);
        } else if (state.quizStreak > 10) {
            log.textContent = `🌟 GODLIKE! ${state.quizStreak} streak!`;
        } else {
            log.textContent = randomFrom(CORRECT_MESSAGES);
        }
        log.classList.add('celebrate');
        setTimeout(() => log.classList.remove('celebrate'), 500);
    } else {
        log.textContent = randomFrom(WRONG_MESSAGES);
    }
}

// ==================== TIMER ====================
function startQuizTimer() {
    stopQuizTimer();
    state.quizTimer = 15;
    updateTimerDisplay();
    
    state.quizTimerInterval = setInterval(() => {
        state.quizTimer--;
        updateTimerDisplay();
        
        if (state.quizTimer <= 0) {
            handleTimeout();
        }
    }, 1000);
}

function stopQuizTimer() {
    if (state.quizTimerInterval) {
        clearInterval(state.quizTimerInterval);
        state.quizTimerInterval = null;
    }
}

function updateTimerDisplay() {
    const quizTimer = document.getElementById('quiz-timer');
    const quizTimerRing = document.getElementById('quiz-timer-ring');
    
    if (quizTimer) quizTimer.textContent = state.quizTimer;
    
    // Update ring
    if (quizTimerRing) {
        const circumference = 2 * Math.PI * 20;
        const offset = circumference - (state.quizTimer / 15) * circumference;
        quizTimerRing.style.strokeDasharray = circumference;
        quizTimerRing.style.strokeDashoffset = offset;
        
        // Warning state
        if (state.quizTimer <= 5) {
            quizTimerRing.classList.add('timer-ring-warning');
            if (quizTimer) quizTimer.classList.add('text-red-400');
        } else {
            quizTimerRing.classList.remove('timer-ring-warning');
            if (quizTimer) quizTimer.classList.remove('text-red-400');
        }
    }
}

function handleTimeout() {
    if (state.quizLocked) return;
    state.quizLocked = true;
    stopQuizTimer();
    state.quizAttempts++;
    state.quizStreak = 0;
    
    // Highlight correct answer - re-query the container
    const quizOptionsEl = document.getElementById('quiz-options');
    const options = quizOptionsEl.querySelectorAll('.quiz-option');
    options.forEach(opt => {
        opt.classList.add('disabled');
        const charEl = opt.querySelector('.character');
        if (charEl && charEl.textContent === state.quizCurrent.traditional) {
            opt.classList.add('correct');
        }
    });
    
    playSound('wrong');
    state.quizRound++;
    updateQuizHud();
    
    showResultModal('timeout');
}

// ==================== MODALS ====================
function showResultModal(result) {
    const word = state.quizCurrent;
    
    dom.modalCharacter.textContent = word.traditional;
    dom.modalPinyin.textContent = word.pinyin;
    dom.modalEnglish.textContent = word.english;
    dom.modalHint.textContent = word.hint || word.category;
    
    if (result === 'correct') {
        dom.modalEmoji.textContent = '🎉';
        dom.modalKicker.textContent = 'Correct!';
        dom.modalHeading.textContent = randomFrom(CORRECT_MESSAGES);
    } else if (result === 'wrong') {
        dom.modalEmoji.textContent = '💫';
        dom.modalKicker.textContent = 'Not Quite';
        dom.modalHeading.textContent = 'Here\'s the correct answer:';
    } else {
        dom.modalEmoji.textContent = '⏰';
        dom.modalKicker.textContent = 'Time\'s Up!';
        dom.modalHeading.textContent = 'Be quicker next time!';
    }
    
    if (state.quizRound >= state.quizMaxRounds) {
        dom.modalNextBtn.textContent = '🏆 See Results';
    } else {
        dom.modalNextBtn.textContent = '➡️ Next Round';
    }
    
    dom.resultModal.showModal();
}

function handleModalNext() {
    dom.resultModal.close();
    
    if (state.quizRound >= state.quizMaxRounds) {
        showQuizCompletion();
    } else {
        hydrateQuizRound();
    }
}

function showQuizCompletion() {
    stopQuizTimer();
    
    const accuracy = state.quizAttempts > 0 
        ? Math.round((state.quizCorrect / state.quizAttempts) * 100) 
        : 0;
    
    dom.finalScore.textContent = state.quizScore;
    dom.finalAccuracy.textContent = `${accuracy}%`;
    dom.finalBestStreak.textContent = state.quizBestStreak;
    
    // Update global best streak
    if (state.quizBestStreak > state.stats.bestStreak) {
        state.stats.bestStreak = state.quizBestStreak;
        saveStats();
        updateHomeStats();
    }
    
    dom.completionModal.showModal();
}

// ==================== LESSONS ====================
function filterByCategory(category) {
    // Update button states
    dom.categoryFilterBtns.forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.add('active', 'bg-vermillion/15', 'text-vermillion', 'border-vermillion/30');
            btn.classList.remove('bg-paper-warm', 'text-ink-light', 'border-paper-dark');
        } else {
            btn.classList.remove('active', 'bg-vermillion/15', 'text-vermillion', 'border-vermillion/30');
            btn.classList.add('bg-paper-warm', 'text-ink-light', 'border-paper-dark');
        }
    });
    
    // Filter lesson cards (simplified - shows all for now)
    // Could be enhanced to filter based on category content
}

function showWordList(lesson) {
    const words = state.allWords.filter(w => w.lesson === lesson);
    
    dom.wordGrid.innerHTML = '';
    
    words.forEach(word => {
        const card = document.createElement('div');
        card.className = 'word-card';
        card.innerHTML = `
            <div class="chinese">${word.traditional}</div>
            <div class="pinyin">${word.pinyin}</div>
            <div class="english">${word.english}</div>
        `;
        dom.wordGrid.appendChild(card);
    });
    
    dom.lessonWordList.classList.remove('hidden');
}

// ==================== UTILITIES ====================
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function playSound(type) {
    if (!state.soundEnabled) return;
    
    try {
        let audio;
        if (type === 'correct') audio = dom.sfxCorrect;
        else if (type === 'wrong') audio = dom.sfxWrong;
        else if (type === 'flip') audio = dom.sfxFlip;
        
        if (audio) {
            audio.currentTime = 0;
            audio.volume = 0.3;
            audio.play().catch(() => {});
        }
    } catch (e) {}
}

function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    dom.soundToggle.textContent = state.soundEnabled ? '🔊' : '🔇';
}

function spawnParticles(container, count = 12) {
    if (!container) return;
    
    // Ink & Paper theme colors
    const colors = ['#d1462f', '#c9a227', '#4a8c7b', '#e85d4c'];
    
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${30 + Math.random() * 40}%`;
        particle.style.bottom = '40%';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.animationDelay = `${Math.random() * 0.3}s`;
        container.appendChild(particle);
        
        setTimeout(() => particle.remove(), 1500);
    }
}

function handleKeyboard(e) {
    if (state.currentSection === 'flashcards') {
        if (e.code === 'Space') {
            e.preventDefault();
            flipFlashcard();
        } else if (e.code === 'ArrowLeft') {
            prevFlashcard();
        } else if (e.code === 'ArrowRight') {
            nextFlashcard();
        } else if (e.code === 'Digit1') {
            rateKnowledge(1);
        } else if (e.code === 'Digit2') {
            rateKnowledge(2);
        } else if (e.code === 'Digit3') {
            rateKnowledge(3);
        }
    } else if (state.currentSection === 'quiz' && !state.quizLocked) {
        // Number keys 1-4 to select quiz options
        const quizOptionsEl = document.getElementById('quiz-options');
        if (quizOptionsEl) {
            const options = quizOptionsEl.querySelectorAll('.quiz-option:not(.eliminated)');
            if (e.code === 'Digit1' && options[0]) {
                options[0].click();
            } else if (e.code === 'Digit2' && options[1]) {
                options[1].click();
            } else if (e.code === 'Digit3' && options[2]) {
                options[2].click();
            } else if (e.code === 'Digit4' && options[3]) {
                options[3].click();
            }
        }
    }
}

// ==================== EXPORT FOR DEBUGGING ====================
window.gameState = state;


// ==================== WRITING FUNCTIONS ====================
function initWriting() {
    if (!state.allWords.length) return;
    populateWritingSelect();
    // If an option is already selected, use it; otherwise default to 0
    if (dom.wrWordSelect && dom.wrWordSelect.value !== '') {
        state.wrIndex = parseInt(dom.wrWordSelect.value) || 0;
    } else {
        state.wrIndex = 0;
    }
    renderWritingCard();
}

function populateWritingSelect() {
    if (!dom.wrWordSelect) return;
    dom.wrWordSelect.innerHTML = '';

    state.allWords.forEach((word, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${word.traditional} – ${word.english}`;
        dom.wrWordSelect.appendChild(opt);
    });

    dom.wrWordSelect.addEventListener('change', () => {
        const val = parseInt(dom.wrWordSelect.value);
        if (!isNaN(val)) {
            state.wrIndex = val;
            renderWritingCard();
        }
    });
}

function renderWritingCard() {
    if (!state.allWords.length) return;

    const idx = Math.max(0, Math.min(state.wrIndex, state.allWords.length - 1));
    state.wrIndex = idx;
    const word = state.allWords[idx];

    if (dom.wrChinese) dom.wrChinese.textContent = word.traditional;
    if (dom.wrPinyin) dom.wrPinyin.textContent = word.pinyin;
    if (dom.wrEnglish) dom.wrEnglish.textContent = word.english;
    if (dom.wrHint) dom.wrHint.textContent = word.hint || word.category || '';
    if (dom.wrLesson) dom.wrLesson.textContent = word.lesson ? `Lesson ${word.lesson}` : 'Lesson';

    if (dom.wrWordSelect && dom.wrWordSelect.value !== String(idx)) {
        dom.wrWordSelect.value = String(idx);
    }
}

function prevWriting() {
    if (state.wrIndex > 0) {
        state.wrIndex--;
        renderWritingCard();
    }
}

function nextWriting() {
    if (state.wrIndex < state.allWords.length - 1) {
        state.wrIndex++;
        renderWritingCard();
    }
}


// ========================== HANDWRITING CANVAS (FRONT-END ONLY) ==========================
const canvas = document.getElementById('write-canvas');
let ctx = null;
let drawing = false;

if (canvas) {
    ctx = canvas.getContext('2d');
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a2e';

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches[0]) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDraw = (e) => {
        drawing = true;
        const { x, y } = getPos(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const endDraw = () => {
        drawing = false;
        ctx.beginPath();
    };

    const draw = (e) => {
        if (!drawing) return;
        e.preventDefault();
        const { x, y } = getPos(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseout', endDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', endDraw);
}

const clearBtn = document.getElementById('clear-canvas');
clearBtn?.addEventListener('click', () => {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});
