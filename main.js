// Nova Portal - Reverted to Simple Logic
(function() {
    // --- State ---
    let displayValue = '0';
    let expressionValue = '';
    let history = [];
    let lastInputSequence = '';
    let currentView = 'calculator';
    let authMode = 'signup';
    
    // Playtime tracking
    let gameStartTime = null;
    let currentGameId = null;

    // --- Simple Local Auth ---
    const getUsers = () => JSON.parse(localStorage.getItem('nova_users') || '[]');
    const saveUsers = (users) => localStorage.setItem('nova_users', JSON.stringify(users));
    const getCurrentUser = () => JSON.parse(localStorage.getItem('nova_current_user') || 'null');
    const setCurrentUser = (user) => localStorage.setItem('nova_current_user', JSON.stringify(user));

    // --- Core Functions ---
    function updateDisplay() {
        const main = document.getElementById('calc-main-display');
        const expr = document.getElementById('calc-expression');
        if (main) main.innerText = displayValue;
        if (expr) expr.innerText = expressionValue;
    }

    function handleNumber(num) {
        if (displayValue === '0' || displayValue === 'Error') {
            displayValue = num;
        } else {
            displayValue += num;
        }
        lastInputSequence = (lastInputSequence + num).slice(-4);
        updateDisplay();
    }

    function handleOperator(op) {
        expressionValue = displayValue + ' ' + op + ' ';
        displayValue = '0';
        updateDisplay();
    }

    function calculate() {
        try {
            const exp = expressionValue + displayValue;
            let result;
            if (window.math) {
                result = window.math.evaluate(exp);
            } else {
                result = eval(exp.replace(/×/g, '*').replace(/÷/g, '/'));
            }
            
            const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(4).replace(/\.?0+$/, '');
            
            history.unshift(`${exp} = ${formatted}`);
            history = history.slice(0, 5);
            
            displayValue = formatted;
            expressionValue = '';
            updateHistory();
            updateDisplay();
        } catch (e) {
            displayValue = 'Error';
            updateDisplay();
        }
    }

    function updateHistory() {
        const historyBar = document.getElementById('calc-history');
        if (historyBar && history.length > 0) {
            historyBar.innerHTML = history.map(h => `<span class="history-item">${h}</span>`).join('');
        }
    }

    function clear() {
        if (lastInputSequence === '6326') {
            switchView('games');
            lastInputSequence = '';
            return;
        }
        displayValue = '0';
        expressionValue = '';
        lastInputSequence = '';
        updateDisplay();
    }

    function backspace() {
        if (displayValue.length > 1) {
            displayValue = displayValue.slice(0, -1);
        } else {
            displayValue = '0';
        }
        updateDisplay();
    }

    function scientific(func) {
        try {
            const val = parseFloat(displayValue);
            let result;
            if (!window.math) throw new Error('MathJS not loaded');
            
            switch (func) {
                case 'sin': result = window.math.sin(val); break;
                case 'cos': result = window.math.cos(val); break;
                case 'tan': result = window.math.tan(val); break;
                case 'sqrt': result = window.math.sqrt(val); break;
                case 'log': result = window.math.log10(val); break;
                case 'ln': result = window.math.log(val); break;
                case 'exp': result = window.math.exp(val); break;
                case 'pow': 
                    expressionValue = displayValue + ' ^ '; 
                    displayValue = '0'; 
                    updateDisplay();
                    return;
                default: return;
            }
            displayValue = result.toFixed(4).replace(/\.?0+$/, '');
            updateDisplay();
        } catch (e) {
            displayValue = 'Error';
            updateDisplay();
        }
    }

    function switchView(view) {
        const calcView = document.getElementById('calculator-view');
        const gamesView = document.getElementById('games-view');
        const authView = document.getElementById('auth-view');
        
        [calcView, gamesView, authView].forEach(v => {
            if (v) {
                v.style.display = 'none';
                v.classList.remove('active');
            }
        });

        let target;
        if (view === 'calculator') target = calcView;
        else if (view === 'games') {
            target = gamesView;
            loadGames(); // Refresh games list when entering hub
        }
        else target = authView;

        if (target) {
            target.style.display = 'flex';
            target.classList.add('active');
        }
        currentView = view;
    }

    // --- Auth ---
    function handleAuth(e) {
        e.preventDefault();
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value;
        const errorEl = document.getElementById('auth-error');

        try {
            const users = getUsers();
            if (authMode === 'signup') {
                if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
                    throw new Error('Username taken');
                }
                const newUser = { 
                    username, 
                    password, 
                    totalHours: 0,
                    gameStats: {} // { gameId: hours }
                };
                users.push(newUser);
                saveUsers(users);
                setCurrentUser(newUser);
            } else {
                const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
                if (!user) throw new Error('Invalid login');
                setCurrentUser(user);
            }
            updateAuthUI();
            switchView('games');
        } catch (err) {
            if (errorEl) {
                errorEl.innerText = err.message;
                errorEl.classList.remove('hidden');
            }
        }
    }

    function updateAuthUI() {
        const user = getCurrentUser();
        const loginBtn = document.getElementById('btn-login-trigger');
        const profile = document.getElementById('user-profile');
        const nameDisplay = document.getElementById('display-username');

        if (user) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (profile) profile.classList.remove('hidden');
            if (nameDisplay) nameDisplay.innerText = user.username;
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (profile) profile.classList.add('hidden');
        }
    }

    // --- Leaderboard Logic ---
    function updatePlayTime() {
        if (!gameStartTime || !currentGameId) return;
        
        const user = getCurrentUser();
        if (!user) return;

        const endTime = Date.now();
        const durationMs = endTime - gameStartTime;
        const durationHours = durationMs / (1000 * 60 * 60);

        const users = getUsers();
        const userIdx = users.findIndex(u => u.username === user.username);
        
        if (userIdx !== -1) {
            users[userIdx].totalHours = (users[userIdx].totalHours || 0) + durationHours;
            if (!users[userIdx].gameStats) users[userIdx].gameStats = {};
            users[userIdx].gameStats[currentGameId] = (users[userIdx].gameStats[currentGameId] || 0) + durationHours;
            
            saveUsers(users);
            setCurrentUser(users[userIdx]);
        }

        gameStartTime = Date.now(); // Reset for continuous tracking
    }

    function showLeaderboard(gameId = null) {
        const modal = document.getElementById('leaderboard-modal');
        const title = document.getElementById('leaderboard-title');
        const list = document.getElementById('leaderboard-list');
        const currentUser = getCurrentUser();

        if (!modal || !list) return;

        title.innerText = gameId ? `Leaderboard: ${gameId}` : "Global Leaderboard";
        
        const users = getUsers();
        let sortedUsers;

        if (gameId) {
            sortedUsers = users
                .filter(u => u.gameStats && u.gameStats[gameId])
                .sort((a, b) => b.gameStats[gameId] - a.gameStats[gameId]);
        } else {
            sortedUsers = users
                .sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0));
        }

        list.innerHTML = sortedUsers.map((u, i) => {
            const time = gameId ? (u.gameStats[gameId] || 0) : (u.totalHours || 0);
            const isMe = currentUser && u.username === currentUser.username;
            return `
                <div class="leaderboard-item ${isMe ? 'current-user' : ''}">
                    <span class="rank">${i + 1}</span>
                    <span class="user-name">${u.username}</span>
                    <span class="play-time">${time.toFixed(2)}h</span>
                </div>
            `;
        }).join('') || '<div class="leaderboard-item"><span class="user-name">No data yet</span></div>';

        modal.classList.remove('hidden');
    }

    // --- Games ---
    async function loadGames() {
        try {
            console.log('Loading games...');
            const res = await fetch(`./games.json?v=${Date.now()}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const games = await res.json();
            console.log('Games loaded:', games.length);
            const grid = document.getElementById('games-grid');
            if (grid) {
                grid.innerHTML = games.map(game => `
                    <div class="game-card">
                        <div class="game-icon" style="background-color: ${game.color}">
                            <i data-lucide="gamepad-2"></i>
                        </div>
                        <div class="game-category">${game.category}</div>
                        <h3 class="game-title">${game.title}</h3>
                        <p class="game-desc">${game.description}</p>
                        <div class="game-actions">
                            <button class="play-btn" onclick="playGame(${JSON.stringify(game).replace(/"/g, '&quot;')})">PLAY</button>
                            <button class="game-leaderboard-btn" onclick="event.stopPropagation(); showLeaderboard('${game.title}')" title="Game Leaderboard">
                                <i data-lucide="trophy"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
                if (window.lucide) window.lucide.createIcons();
            }
        } catch (e) {
            console.error('Failed to load games:', e);
        }
    }

    window.showLeaderboard = showLeaderboard;

    window.playGame = (game) => {
        const grid = document.getElementById('games-grid');
        const player = document.getElementById('game-player');
        const iframe = document.getElementById('game-iframe');
        const title = document.getElementById('current-game-title');

        if (grid) grid.classList.add('hidden');
        if (player) player.classList.remove('hidden');
        if (iframe) iframe.src = game.iframeUrl;
        if (title) title.innerText = game.title;

        // Start tracking
        gameStartTime = Date.now();
        currentGameId = game.title;
    };

    function closeGame() {
        // Stop tracking
        updatePlayTime();
        gameStartTime = null;
        currentGameId = null;

        const grid = document.getElementById('games-grid');
        const player = document.getElementById('game-player');
        const iframe = document.getElementById('game-iframe');
        if (grid) grid.classList.remove('hidden');
        if (player) player.classList.add('hidden');
        if (iframe) iframe.src = '';
    }

    // --- Init ---
    function init() {
        // Attach Listeners
        document.getElementById('btn-clear')?.addEventListener('click', clear);
        document.getElementById('btn-equal')?.addEventListener('click', calculate);
        document.getElementById('btn-backspace')?.addEventListener('click', backspace);
        document.getElementById('btn-exit-portal')?.addEventListener('click', () => switchView('calculator'));
        document.getElementById('btn-back-to-hub')?.addEventListener('click', closeGame);
        document.getElementById('btn-login-trigger')?.addEventListener('click', () => switchView('auth'));
        document.getElementById('btn-leaderboard-global')?.addEventListener('click', () => showLeaderboard());
        document.getElementById('btn-close-leaderboard')?.addEventListener('click', () => {
            document.getElementById('leaderboard-modal')?.classList.add('hidden');
        });
        document.getElementById('btn-logout')?.addEventListener('click', () => {
            updatePlayTime();
            setCurrentUser(null);
            updateAuthUI();
            switchView('calculator');
        });

        document.querySelectorAll('.btn.num').forEach(b => {
            b.addEventListener('click', () => handleNumber(b.dataset.val));
        });
        document.querySelectorAll('.btn.op').forEach(b => {
            b.addEventListener('click', () => handleOperator(b.dataset.op));
        });
        document.querySelectorAll('.btn.sci').forEach(b => {
            b.addEventListener('click', () => scientific(b.dataset.func));
        });

        const authForm = document.getElementById('auth-form');
        if (authForm) authForm.addEventListener('submit', handleAuth);

        const toggleBtn = document.getElementById('auth-toggle-btn');
        if (toggleBtn) toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authMode = authMode === 'signup' ? 'login' : 'signup';
            document.getElementById('auth-title').innerText = authMode === 'signup' ? 'Create Account' : 'Welcome Back';
            document.getElementById('username-group').style.display = authMode === 'signup' ? 'block' : 'none';
            document.getElementById('auth-submit-btn').innerText = authMode === 'signup' ? 'Sign Up' : 'Log In';
        });

        // Periodic update of playtime if game is open
        setInterval(updatePlayTime, 30000); // Every 30 seconds

        updateDisplay();
        updateAuthUI();
        loadGames();
        if (window.lucide) window.lucide.createIcons();
    }

    window.addEventListener('DOMContentLoaded', init);
})();
