(function() {
    console.log('Nova Portal Initializing...');
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
    let authMode = 'signup'; // 'signup' or 'login'

    // --- DOM Elements ---
    const authView = document.getElementById('auth-view');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authToggleBtn = document.getElementById('auth-toggle-btn');
    const authToggleText = document.getElementById('auth-toggle-text');
    const authError = document.getElementById('auth-error');
    const usernameGroup = document.getElementById('username-group');
    const userProfile = document.getElementById('user-profile');
    const loginTriggerBtn = document.getElementById('btn-login-trigger');
    const displayUsername = document.getElementById('display-username');
    
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

    // --- Event Listeners ---
    const attachListeners = () => {
        const safeAddListener = (id, event, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, fn);
        };

        safeAddListener('btn-toggle-native-fs', 'click', toggleNativeFullscreen);
        safeAddListener('btn-clear', 'click', clear);
        safeAddListener('btn-equal', 'click', calculate);
        safeAddListener('btn-backspace', 'click', backspace);
        safeAddListener('btn-exit-portal', 'click', () => switchView('calculator'));
        safeAddListener('btn-back-to-hub', 'click', closeGame);
        safeAddListener('btn-login-trigger', 'click', () => switchView('auth'));
        safeAddListener('btn-logout', 'click', handleLogout);

        document.querySelectorAll('.btn.num').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                handleNumber(btn.dataset.val);
            });
        });

        document.querySelectorAll('.btn.op').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                handleOperator(btn.dataset.op);
            });
        });

        document.querySelectorAll('.btn.sci').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                scientific(btn.dataset.func);
            });
        });

        if (authForm) authForm.addEventListener('submit', handleAuth);
        if (authToggleBtn) authToggleBtn.addEventListener('click', toggleAuthMode);
    };

    // --- Safety Check & Initial Setup ---
    const init = () => {
        console.log('Running init...');
        try {
            attachListeners();
            console.log('Listeners attached');
            if (typeof lucide !== 'undefined') lucide.createIcons();
            updateDisplay();
            loadGames(true);
            
            // Check session
            const user = getCurrentUser();
            if (user) {
                updateAuthUI(user);
            }
        } catch (e) {
            console.error('Initialization error:', e);
        }
    };

    // --- Calculator Logic ---
    const updateDisplay = () => {
        if (!mainDisplay || !expressionDisplay) return;
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
            if (typeof math === 'undefined') {
                displayValue = 'Error: MathJS missing';
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
        if (history.length === 0 || !historyBar) return;
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
        const views = [calculatorView, gamesView, authView];
        views.forEach(v => {
            if (v) {
                v.classList.remove('active');
                v.style.display = 'none';
            }
        });

        const target = view === 'calculator' ? calculatorView : 
                       view === 'games' ? gamesView : authView;
        
        if (target) {
            target.style.display = 'flex';
            setTimeout(() => target.classList.add('active'), 50);
        }
        currentView = view;
    };

    // --- Auth Logic ---
    const toggleAuthMode = (e) => {
        if (e) e.preventDefault();
        authMode = authMode === 'signup' ? 'login' : 'signup';
        
        if (authMode === 'login') {
            authTitle.textContent = 'Welcome Back';
            authSubtitle.textContent = 'Log in to your Nova account';
            authSubmitBtn.querySelector('span').textContent = 'Log In';
            authToggleText.innerHTML = `Don't have an account? <a href="#" id="auth-toggle-btn">Sign Up</a>`;
            if (usernameGroup) usernameGroup.classList.add('hidden');
        } else {
            authTitle.textContent = 'Create Account';
            authSubtitle.textContent = 'Join the Nova Portal';
            authSubmitBtn.querySelector('span').textContent = 'Sign Up';
            authToggleText.innerHTML = `Already have an account? <a href="#" id="auth-toggle-btn">Log In</a>`;
            if (usernameGroup) usernameGroup.classList.remove('hidden');
        }
        
        const newToggleBtn = document.getElementById('auth-toggle-btn');
        if (newToggleBtn) newToggleBtn.addEventListener('click', toggleAuthMode);
        if (authError) authError.classList.add('hidden');
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value;
        
        if (authError) authError.classList.add('hidden');
        authSubmitBtn.disabled = true;

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
            if (authError) {
                authError.textContent = error.message;
                authError.classList.remove('hidden');
            }
        } finally {
            authSubmitBtn.disabled = false;
        }
    };

    const updateAuthUI = (user) => {
        if (user) {
            if (loginTriggerBtn) loginTriggerBtn.classList.add('hidden');
            if (userProfile) userProfile.classList.remove('hidden');
            if (displayUsername) displayUsername.textContent = user.username;
        } else {
            if (loginTriggerBtn) loginTriggerBtn.classList.remove('hidden');
            if (userProfile) userProfile.classList.add('hidden');
            if (displayUsername) displayUsername.textContent = 'Guest';
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
                if (calculatorView) calculatorView.style.display = 'none';
                if (gamesView) {
                    gamesView.style.display = 'flex';
                    gamesView.classList.add('active');
                }
                window.playGame(game);
            }
        }
    };

    const renderGames = (games) => {
        if (!gamesGrid) return;
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
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.playGame = (game) => {
        if (gamesGrid) gamesGrid.classList.add('hidden');
        if (gamePlayer) gamePlayer.classList.remove('hidden');
        if (gameIframe) gameIframe.src = game.iframeUrl;
        if (gameTitle) gameTitle.textContent = game.title;
        
        const baseUrl = window.location.origin + window.location.pathname;
        if (externalLink) externalLink.href = `${baseUrl}?game=${game.id}`;
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    const closeGame = () => {
        document.body.classList.remove('is-fullscreen');
        if (gamePlayer) gamePlayer.classList.add('hidden');
        if (gamesGrid) gamesGrid.classList.remove('hidden');
        if (gameIframe) gameIframe.src = '';
        
        const url = new URL(window.location);
        url.searchParams.delete('game');
        window.history.replaceState({}, '', url);
    };

    const toggleNativeFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // Run initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
