(function() {
    console.log('Nova Portal v3.0 Initializing...');

    // --- Simple Local Storage Auth ---
    const getUsers = () => JSON.parse(localStorage.getItem('nova_users') || '[]');
    const saveUsers = (users) => localStorage.setItem('nova_users', JSON.stringify(users));
    const getCurrentUser = () => JSON.parse(localStorage.getItem('nova_current_user') || 'null');
    const setCurrentUser = (user) => localStorage.setItem('nova_current_user', JSON.stringify(user));

    // --- State ---
    let displayValue = '0';
    let expressionValue = '';
    let history = [];
    let lastInputSequence = '';
    let currentView = 'calculator';
    let authMode = 'signup';

    // --- DOM References (will be populated in init) ---
    let els = {};

    const selectElements = () => {
        const ids = [
            'auth-view', 'auth-form', 'auth-title', 'auth-subtitle', 
            'auth-submit-btn', 'auth-toggle-btn', 'auth-toggle-text', 
            'auth-error', 'username-group', 'user-profile', 
            'btn-login-trigger', 'display-username', 'calc-main-display', 
            'calc-expression', 'calc-history', 'calculator-view', 
            'games-view', 'games-grid', 'game-player', 'game-iframe', 
            'current-game-title', 'external-link', 'btn-clear', 
            'btn-equal', 'btn-backspace', 'btn-exit-portal', 
            'btn-back-to-hub', 'btn-logout'
        ];
        ids.forEach(id => {
            els[id] = document.getElementById(id);
        });
    };

    // --- Event Listeners ---
    const attachListeners = () => {
        console.log('Attaching listeners...');
        
        const safeListen = (id, event, fn) => {
            if (els[id]) {
                els[id].addEventListener(event, fn);
                // Also add touchstart for mobile responsiveness
                if (event === 'click') {
                    els[id].addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        fn(e);
                    }, { passive: false });
                }
            } else {
                console.warn(`Element #${id} not found for listener`);
            }
        };

        safeListen('btn-clear', 'click', (e) => { clear(); });
        safeListen('btn-equal', 'click', (e) => { calculate(); });
        safeListen('btn-backspace', 'click', (e) => { backspace(); });
        safeListen('btn-exit-portal', 'click', (e) => { switchView('calculator'); });
        safeListen('btn-back-to-hub', 'click', (e) => { closeGame(); });
        safeListen('btn-login-trigger', 'click', (e) => { switchView('auth'); });
        safeListen('btn-logout', 'click', (e) => { handleLogout(); });

        // Number buttons
        document.querySelectorAll('.btn.num').forEach(btn => {
            const handler = (e) => {
                e.preventDefault();
                const val = btn.getAttribute('data-val');
                handleNumber(val);
            };
            btn.addEventListener('click', handler);
            btn.addEventListener('touchstart', handler, { passive: false });
        });

        // Operator buttons
        document.querySelectorAll('.btn.op').forEach(btn => {
            const handler = (e) => {
                e.preventDefault();
                const op = btn.getAttribute('data-op');
                handleOperator(op);
            };
            btn.addEventListener('click', handler);
            btn.addEventListener('touchstart', handler, { passive: false });
        });

        // Scientific buttons
        document.querySelectorAll('.btn.sci').forEach(btn => {
            const handler = (e) => {
                e.preventDefault();
                const func = btn.getAttribute('data-func');
                scientific(func);
            };
            btn.addEventListener('click', handler);
            btn.addEventListener('touchstart', handler, { passive: false });
        });

        if (els['auth-form']) els['auth-form'].addEventListener('submit', handleAuth);
        if (els['auth-toggle-btn']) els['auth-toggle-btn'].addEventListener('click', toggleAuthMode);
    };

    // --- Calculator Logic ---
    const updateDisplay = () => {
        if (els['calc-main-display']) els['calc-main-display'].textContent = displayValue;
        if (els['calc-expression']) els['calc-expression'].textContent = expressionValue;
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
            if (typeof math === 'undefined') {
                displayValue = 'Math Error';
                updateDisplay();
                return;
            }
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
        if (history.length === 0 || !els['calc-history']) return;
        els['calc-history'].innerHTML = history.map(h => `<span class="history-item">${h}</span>`).join('');
    };

    const clear = () => {
        console.log('Clear clicked, sequence:', lastInputSequence);
        if (lastInputSequence === '6326') {
            switchView('games');
            lastInputSequence = '';
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
            if (typeof math === 'undefined') return;
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
        console.log('Switching to view:', view);
        const views = [els['calculator-view'], els['games-view'], els['auth-view']];
        views.forEach(v => {
            if (v) {
                v.classList.remove('active');
                v.style.display = 'none';
            }
        });

        const target = view === 'calculator' ? els['calculator-view'] : 
                       view === 'games' ? els['games-view'] : els['auth-view'];
        
        if (target) {
            target.style.display = 'flex';
            setTimeout(() => target.classList.add('active'), 10);
        }
        currentView = view;
    };

    // --- Auth Logic ---
    const toggleAuthMode = (e) => {
        if (e) e.preventDefault();
        authMode = authMode === 'signup' ? 'login' : 'signup';
        
        if (authMode === 'login') {
            els['auth-title'].textContent = 'Welcome Back';
            els['auth-subtitle'].textContent = 'Log in to your Nova account';
            els['auth-submit-btn'].querySelector('span').textContent = 'Log In';
            els['auth-toggle-text'].innerHTML = `Don't have an account? <a href="#" id="auth-toggle-btn">Sign Up</a>`;
            if (els['username-group']) els['username-group'].classList.add('hidden');
        } else {
            els['auth-title'].textContent = 'Create Account';
            els['auth-subtitle'].textContent = 'Join the Nova Portal';
            els['auth-submit-btn'].querySelector('span').textContent = 'Sign Up';
            els['auth-toggle-text'].innerHTML = `Already have an account? <a href="#" id="auth-toggle-btn">Log In</a>`;
            if (els['username-group']) els['username-group'].classList.remove('hidden');
        }
        
        const newToggleBtn = document.getElementById('auth-toggle-btn');
        if (newToggleBtn) newToggleBtn.addEventListener('click', toggleAuthMode);
        if (els['auth-error']) els['auth-error'].classList.add('hidden');
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value;
        
        if (els['auth-error']) els['auth-error'].classList.add('hidden');
        els['auth-submit-btn'].disabled = true;

        try {
            const users = getUsers();
            
            if (authMode === 'signup') {
                if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
                    throw new Error('Username already taken');
                }
                const newUser = { username, password, createdAt: new Date().toISOString() };
                users.push(newUser);
                saveUsers(users);
                setCurrentUser(newUser);
                updateAuthUI(newUser);
            } else {
                const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
                if (!user) {
                    throw new Error('Invalid username or password');
                }
                setCurrentUser(user);
                updateAuthUI(user);
            }
            
            switchView('games');
        } catch (error) {
            console.error('Auth Error:', error);
            if (els['auth-error']) {
                els['auth-error'].textContent = error.message;
                els['auth-error'].classList.remove('hidden');
            }
        } finally {
            els['auth-submit-btn'].disabled = false;
        }
    };

    const updateAuthUI = (user) => {
        if (user) {
            if (els['btn-login-trigger']) els['btn-login-trigger'].classList.add('hidden');
            if (els['user-profile']) els['user-profile'].classList.remove('hidden');
            if (els['display-username']) els['display-username'].textContent = user.username;
        } else {
            if (els['btn-login-trigger']) els['btn-login-trigger'].classList.remove('hidden');
            if (els['user-profile']) els['user-profile'].classList.add('hidden');
            if (els['display-username']) els['display-username'].textContent = 'Guest';
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        updateAuthUI(null);
        switchView('calculator');
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
                document.body.classList.add('is-fullscreen');
                if (els['calculator-view']) els['calculator-view'].style.display = 'none';
                if (els['games-view']) {
                    els['games-view'].style.display = 'flex';
                    els['games-view'].classList.add('active');
                }
                window.playGame(game);
            }
        }
    };

    const renderGames = (games) => {
        if (!els['games-grid']) return;
        els['games-grid'].innerHTML = games.map(game => `
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
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.playGame = (game) => {
        if (els['games-grid']) els['games-grid'].classList.add('hidden');
        if (els['game-player']) els['game-player'].classList.remove('hidden');
        if (els['game-iframe']) els['game-iframe'].src = game.iframeUrl;
        if (els['current-game-title']) els['current-game-title'].textContent = game.title;
        
        const baseUrl = window.location.origin + window.location.pathname;
        if (els['external-link']) els['external-link'].href = `${baseUrl}?game=${game.id}`;
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    const closeGame = () => {
        document.body.classList.remove('is-fullscreen');
        if (els['game-player']) els['game-player'].classList.add('hidden');
        if (els['games-grid']) els['games-grid'].classList.remove('hidden');
        if (els['game-iframe']) els['game-iframe'].src = '';
        
        const url = new URL(window.location);
        url.searchParams.delete('game');
        window.history.replaceState({}, '', url);
    };

    // --- Initialization ---
    const init = () => {
        console.log('Init starting...');
        selectElements();
        attachListeners();
        updateDisplay();
        loadGames(true);
        
        const user = getCurrentUser();
        if (user) updateAuthUI(user);
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
        console.log('Init complete.');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
