document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    lucide.createIcons();

    // --- State ---
    let displayValue = '0';
    let expressionValue = '';
    let history = [];
    let lastInputSequence = '';
    let currentView = 'calculator';

    // --- DOM Elements ---
    const mainDisplay = document.getElementById('calc-main-display');
    const expressionDisplay = document.getElementById('calc-expression');
    const historyBar = document.getElementById('calc-history');
    const calculatorView = document.getElementById('calculator-view');
    const gamesView = document.getElementById('games-view');
    const gamesGrid = document.getElementById('games-grid');
    const gamePlayer = document.getElementById('game-player');
    const gameIframe = document.getElementById('game-iframe');
    const gameTitle = document.getElementById('current-game-title');
    const externalLink = document.getElementById('external-link');

    // --- Calculator Logic ---
    const updateDisplay = () => {
        mainDisplay.textContent = displayValue;
        expressionDisplay.textContent = expressionValue;
    };

    const handleNumber = (num) => {
        if (displayValue === '0' || displayValue === 'Error') {
            displayValue = num;
        } else {
            displayValue += num;
        }
        lastInputSequence = (lastInputSequence + num).slice(-4);
        updateDisplay();
    };

    const handleOperator = (op) => {
        expressionValue = displayValue + ' ' + op + ' ';
        displayValue = '0';
        updateDisplay();
    };

    const calculate = () => {
        try {
            const result = math.evaluate(expressionValue + displayValue);
            const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(8).replace(/\.?0+$/, '');
            
            history.unshift(`${expressionValue}${displayValue} = ${formatted}`);
            history = history.slice(0, 5);
            
            displayValue = formatted;
            expressionValue = '';
            updateHistory();
            updateDisplay();
        } catch (e) {
            displayValue = 'Error';
            updateDisplay();
        }
    };

    const updateHistory = () => {
        if (history.length === 0) return;
        historyBar.innerHTML = history.map(h => `<span class="history-item">${h}</span>`).join('');
    };

    const clear = () => {
        if (lastInputSequence === '6326') {
            switchView('games');
            return;
        }
        displayValue = '0';
        expressionValue = '';
        lastInputSequence = '';
        updateDisplay();
    };

    const backspace = () => {
        if (displayValue.length > 1) {
            displayValue = displayValue.slice(0, -1);
        } else {
            displayValue = '0';
        }
        updateDisplay();
    };

    const scientific = (func) => {
        try {
            const val = parseFloat(displayValue);
            let result;
            switch (func) {
                case 'sin': result = math.sin(val); break;
                case 'cos': result = math.cos(val); break;
                case 'tan': result = math.tan(val); break;
                case 'sqrt': result = math.sqrt(val); break;
                case 'log': result = math.log10(val); break;
                case 'ln': result = math.log(val); break;
                case 'exp': result = math.exp(val); break;
                case 'pow': 
                    expressionValue = displayValue + ' ^ '; 
                    displayValue = '0'; 
                    updateDisplay();
                    return;
                default: return;
            }
            displayValue = result.toFixed(8).replace(/\.?0+$/, '');
            updateDisplay();
        } catch (e) {
            displayValue = 'Error';
            updateDisplay();
        }
    };

    // --- View Switching ---
    const switchView = (view) => {
        currentView = view;
        if (view === 'games') {
            calculatorView.classList.remove('active');
            setTimeout(() => {
                calculatorView.style.display = 'none';
                gamesView.style.display = 'flex';
                setTimeout(() => gamesView.classList.add('active'), 50);
            }, 400);
        } else {
            gamesView.classList.remove('active');
            setTimeout(() => {
                gamesView.style.display = 'none';
                calculatorView.style.display = 'flex';
                setTimeout(() => calculatorView.classList.add('active'), 50);
            }, 400);
        }
    };

    // --- Games Logic ---
    const loadGames = async (isInitial = false) => {
        try {
            const response = await fetch(`./games.json?v=${Date.now()}`);
            const games = await response.json();
            renderGames(games);
            if (isInitial) checkUrlParams(games);
        } catch (e) {
            console.error('Failed to load games:', e);
        }
    };

    const checkUrlParams = (games) => {
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('game');
        if (gameId) {
            const game = games.find(g => g.id === gameId);
            if (game) {
                // Skip calculator and go straight to game
                calculatorView.style.display = 'none';
                gamesView.style.display = 'flex';
                gamesView.classList.add('active');
                window.playGame(game);
            }
        }
    };

    const renderGames = (games) => {
        gamesGrid.innerHTML = games.map(game => `
            <div class="game-card" onclick="window.playGame(${JSON.stringify(game).replace(/"/g, '&quot;')})">
                <div class="game-icon" style="background-color: ${game.color}">
                    <i data-lucide="gamepad-2"></i>
                </div>
                <div class="game-category">${game.category}</div>
                <h3 class="game-title">${game.title}</h3>
                <p class="game-desc">${game.description}</p>
                <button class="play-btn">
                    <i data-lucide="play"></i> PLAY NOW
                </button>
            </div>
        `).join('');
        lucide.createIcons();
    };

    window.playGame = (game) => {
        gamesGrid.classList.add('hidden');
        gamePlayer.classList.remove('hidden');
        gameIframe.src = game.iframeUrl;
        gameTitle.textContent = game.title;
        
        // Update external link to point to this app with the game parameter
        const baseUrl = window.location.origin + window.location.pathname;
        externalLink.href = `${baseUrl}?game=${game.id}`;
        
        lucide.createIcons();
    };

    const closeGame = () => {
        gamePlayer.classList.add('hidden');
        gamesGrid.classList.remove('hidden');
        gameIframe.src = '';
    };

    // --- Event Listeners ---
    document.querySelectorAll('.btn.num').forEach(btn => {
        btn.addEventListener('click', () => handleNumber(btn.dataset.val));
    });

    document.querySelectorAll('.btn.op').forEach(btn => {
        btn.addEventListener('click', () => handleOperator(btn.dataset.op));
    });

    document.querySelectorAll('.btn.sci').forEach(btn => {
        btn.addEventListener('click', () => scientific(btn.dataset.func));
    });

    document.getElementById('btn-clear').addEventListener('click', clear);
    document.getElementById('btn-equal').addEventListener('click', calculate);
    document.getElementById('btn-backspace').addEventListener('click', backspace);
    document.getElementById('btn-exit-portal').addEventListener('click', () => switchView('calculator'));
    document.getElementById('btn-back-to-hub').addEventListener('click', closeGame);

    // Initial load check
    loadGames(true);
});
