// Nova Portal - Firebase Integrated
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit, serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  "projectId": "gen-lang-client-0444183176",
  "appId": "1:25079534751:web:71e050a0fc49a39d9cfeaa",
  "apiKey": "AIzaSyCk3mWbdc1crz5AcVN0KOUOIzHWiZ18ikM",
  "authDomain": "gen-lang-client-0444183176.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-78be3f93-89ca-44ef-92ee-04869b020253",
  "storageBucket": "gen-lang-client-0444183176.firebasestorage.app",
  "messagingSenderId": "25079534751",
  "measurementId": ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

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

    // --- Firebase Auth Session ---
    let currentUserData = null;
    const getCurrentUser = () => currentUserData;
    const setCurrentUser = (user) => { currentUserData = user; };

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
        const videosView = document.getElementById('videos-view');
        
        [calcView, gamesView, authView, videosView].forEach(v => {
            if (v) {
                v.style.display = 'none';
                v.classList.remove('active');
            }
        });

        let target;
        if (view === 'calculator') target = calcView;
        else if (view === 'games') {
            target = gamesView;
            loadGames();
        }
        else if (view === 'videos') {
            target = videosView;
            loadVideos();
        }
        else target = authView;

        if (target) {
            target.style.display = 'flex';
            target.classList.add('active');
        }
        currentView = view;
    }
    window.switchView = switchView;

    // --- Videos ---
    function loadVideos() {
        const grid = document.getElementById('videos-grid');
        if (!grid) return;

        const videos = [
            { 
                id: 'buried-alive', 
                title: "I Spent 7 Days Buried Alive", 
                thumbnail: "https://img.youtube.com/vi/0e3GPea1Tyg/maxresdefault.jpg", 
                duration: "18:40", 
                views: "200M",
                url: "https://drive.google.com/file/d/1zHVlLaYLgfLbb0iCmyQQaM-iRbXQSniL/view?usp=sharing"
            }
        ];

        if (videos.length === 0) {
            grid.innerHTML = `
                <div class="videos-empty">
                    <i data-lucide="video-off"></i>
                    <h3>New Content Coming Soon</h3>
                    <p>We're currently updating our video library. Check back later for the latest gaming highlights!</p>
                </div>
            `;
        } else {
            grid.innerHTML = videos.map(vid => `
                <div class="video-card" onclick="playVideo('${vid.url}', '${vid.title.replace(/'/g, "\\'")}')">
                    <div class="video-thumb">
                        <img src="${vid.thumbnail}" alt="${vid.title}" referrerPolicy="no-referrer">
                        <span class="video-duration">${vid.duration}</span>
                        <div class="video-play-overlay"><i data-lucide="play"></i></div>
                    </div>
                    <div class="video-info">
                        <h3 class="video-title">${vid.title}</h3>
                        <div class="video-meta">
                            <span>${vid.views} views</span>
                            <span class="dot">•</span>
                            <span>Just now</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        if (window.lucide) window.lucide.createIcons();
    }

    window.playVideo = function(url, title) {
        const modal = document.getElementById('video-player-modal');
        const titleEl = document.getElementById('video-player-title');
        const container = document.getElementById('video-player-container');
        
        if (!modal || !container) return;

        if (titleEl) titleEl.innerText = title;
        
        // Detect if it's a direct video file or from a known direct-link host
        const isDirectVideo = url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || 
                             url.includes('discordapp.com') || 
                             url.includes('github.com') ||
                             url.includes('dropbox.com') ||
                             url.includes('drive.google.com');
        
        if (isDirectVideo) {
            let videoUrl = url;
            
            // Handle Dropbox links (replace dl=0 with dl=1 for direct access)
            if (url.includes('dropbox.com')) {
                videoUrl = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
            }
            
            // Handle Google Drive links
            if (url.includes('drive.google.com')) {
                const driveId = url.match(/\/d\/([^/]+)/)?.[1];
                if (driveId) {
                    videoUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
                }
            }
            
            container.innerHTML = `
                <video id="native-video-player" controls playsinline class="native-video" style="width: 100%; height: 100%; background: black;">
                    <source src="${videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
        } else {
            container.innerHTML = `<iframe src="${url}" allowfullscreen allow="autoplay; fullscreen" style="width: 100%; height: 100%; border: none;"></iframe>`;
        }
        
        modal.classList.remove('hidden');
    };

    // --- Firebase Auth Logic ---
    async function handleAuth(e) {
        e.preventDefault();
        const usernameEl = document.getElementById('auth-username');
        const passwordEl = document.getElementById('auth-password');
        const errorEl = document.getElementById('auth-error');
        
        if (!usernameEl || !passwordEl) return;
        
        const username = usernameEl.value.trim();
        const password = passwordEl.value;

        if (!username || !password) {
            if (errorEl) {
                errorEl.innerText = "Username and password are required";
                errorEl.classList.remove('hidden');
            }
            return;
        }

        // We use username as part of a dummy email for Firebase Auth
        const email = `${username.toLowerCase().replace(/\s+/g, '')}@nova.media`;

        try {
            if (authMode === 'signup') {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                // Create user profile in Firestore
                await setDoc(doc(db, 'users', user.uid), {
                    username: username,
                    totalHours: 0,
                    gameStats: {},
                    updatedAt: serverTimestamp()
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            // onAuthStateChanged will handle the UI update
            const modal = document.getElementById('auth-modal');
            if (modal) modal.classList.add('hidden');
            switchView('games');
        } catch (err) {
            console.error('Auth Error:', err);
            if (errorEl) {
                let msg = "Authentication failed.";
                if (err.code === 'auth/email-already-in-use') msg = "Username taken.";
                if (err.code === 'auth/invalid-credential') msg = "Invalid credentials.";
                if (err.code === 'auth/weak-password') msg = "Password too weak.";
                errorEl.innerText = msg;
                errorEl.classList.remove('hidden');
            }
        }
    }

    function updateAuthUI(user = null) {
        const loginBtn = document.getElementById('btn-login-trigger');
        const profile = document.getElementById('user-profile');
        const nameDisplay = document.getElementById('display-username');

        if (user) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (profile) profile.classList.remove('hidden');
            // Fetch username from Firestore if not already in state
            if (currentUserData && currentUserData.username) {
                if (nameDisplay) nameDisplay.innerText = currentUserData.username;
            } else {
                getDoc(doc(db, 'users', user.uid)).then(snap => {
                    if (snap.exists()) {
                        const data = snap.data();
                        setCurrentUser({ ...data, uid: user.uid });
                        if (nameDisplay) nameDisplay.innerText = data.username;
                    }
                });
            }
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (profile) profile.classList.add('hidden');
            setCurrentUser(null);
        }
    }

    // --- Leaderboard Logic (Firestore) ---
    async function updatePlayTime() {
        if (!gameStartTime || !currentGameId) return;
        
        const user = auth.currentUser;
        if (!user) return;

        const endTime = Date.now();
        const durationMs = endTime - gameStartTime;
        const durationHours = durationMs / (1000 * 60 * 60);

        try {
            const userRef = doc(db, 'users', user.uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
                const data = snap.data();
                const newTotal = (data.totalHours || 0) + durationHours;
                const newGameStats = { ...(data.gameStats || {}) };
                newGameStats[currentGameId] = (newGameStats[currentGameId] || 0) + durationHours;
                
                await updateDoc(userRef, {
                    totalHours: newTotal,
                    gameStats: newGameStats,
                    updatedAt: serverTimestamp()
                });
                
                // Update local state
                setCurrentUser({ ...data, totalHours: newTotal, gameStats: newGameStats, uid: user.uid });
            }
        } catch (e) {
            console.error('Failed to update playtime:', e);
        }

        gameStartTime = Date.now(); // Reset for continuous tracking
    }

    async function showLeaderboard(gameId = null) {
        const modal = document.getElementById('leaderboard-modal');
        const title = document.getElementById('leaderboard-title');
        const list = document.getElementById('leaderboard-list');
        const currentUser = getCurrentUser();

        if (!modal || !list) return;

        title.innerText = gameId ? `Leaderboard: ${gameId}` : "Global Leaderboard";
        
        try {
            const usersCol = collection(db, 'users');
            let q;
            if (gameId) {
                q = query(usersCol, orderBy(`gameStats.${gameId}`, 'desc'), limit(100));
            } else {
                q = query(usersCol, orderBy('totalHours', 'desc'), limit(100));
            }
            
            const snap = await getDocs(q);
            const sortedUsers = snap.docs.map(doc => {
                const data = doc.data();
                return {
                    username: data.username,
                    score: gameId ? (data.gameStats[gameId] || 0) : (data.totalHours || 0)
                };
            }).filter(u => u.score > 0.0001);

            renderLeaderboard(sortedUsers);
            modal.classList.remove('hidden');
        } catch (e) {
            console.error('Failed to load leaderboard:', e);
            list.innerHTML = '<div class="leaderboard-empty"><p>Failed to load leaderboard.</p></div>';
            modal.classList.remove('hidden');
        }
    }

    function renderLeaderboard(sortedUsers) {
        const list = document.getElementById('leaderboard-list');
        const currentUser = getCurrentUser();
        if (!list) return;

        let html = sortedUsers.map((u, i) => {
            const time = u.score;
            const isMe = currentUser && u.username === currentUser.username;
            let timeStr = time.toFixed(2) + 'h';
            if (time > 0 && time < 0.01) timeStr = '< 0.01h';

            return `
                <div class="leaderboard-item ${isMe ? 'current-user' : ''}">
                    <span class="rank">${i + 1}</span>
                    <span class="user-name">${u.username} ${isMe ? '(You)' : ''}</span>
                    <span class="play-time">${timeStr}</span>
                </div>
            `;
        }).join('');

        if (!html) {
            html = `
                <div class="leaderboard-empty">
                    <i data-lucide="info"></i>
                    <p>No data recorded yet.</p>
                    ${!currentUser ? '<p class="login-hint">Log in to start tracking your playtime!</p>' : ''}
                </div>
            `;
        } else if (!currentUser) {
            html += `
                <div class="leaderboard-footer-hint">
                    <p>Log in to see your rank and track time!</p>
                </div>
            `;
        }

        list.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    }

    // --- Games ---
    async function loadGames() {
        try {
            console.log('Loading games...');
            const url = new URL('games.json', window.location.href).href;
            const res = await fetch(`${url}?v=${Date.now()}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const games = await res.json();
            console.log('Games loaded:', games.length);
            const grid = document.getElementById('games-grid');
            if (grid) {
                grid.innerHTML = games.map(game => {
                    const gameTitleJson = JSON.stringify(game.title).replace(/"/g, '&quot;');
                    return `
                        <div class="game-card">
                            <div class="game-icon" style="background-color: ${game.color}">
                                <i data-lucide="gamepad-2"></i>
                            </div>
                            <div class="game-category">${game.category}</div>
                            <h3 class="game-title">${game.title}</h3>
                            <p class="game-desc">${game.description}</p>
                            <div class="game-actions">
                                <button class="play-btn" onclick="playGame(${JSON.stringify(game).replace(/"/g, '&quot;')})">PLAY</button>
                                <button class="game-leaderboard-btn" onclick="event.stopPropagation(); showLeaderboard(${gameTitleJson})" title="Game Leaderboard">
                                    <i data-lucide="trophy"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
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
        if (player) {
            player.classList.add('hidden');
            player.classList.remove('pseudo-fullscreen');
        }
        if (iframe) iframe.src = '';
    }

    function toggleFullscreen(elementId = 'game-player') {
        const player = document.getElementById(elementId);
        if (!player) return;

        const requestFS = player.requestFullscreen || 
                          player.webkitRequestFullscreen || 
                          player.webkitEnterFullscreen ||
                          player.mozRequestFullScreen || 
                          player.msRequestFullscreen;

        if (requestFS) {
            // For iOS Safari, webkitEnterFullscreen only works on video elements
            // but we'll try the standard way first
            const promise = requestFS.call(player);
            if (promise && promise.catch) {
                promise.catch(err => {
                    console.warn("Native fullscreen failed, using pseudo-fullscreen", err);
                    player.classList.toggle('pseudo-fullscreen');
                });
            }
        } else {
            // Fallback for iOS Safari
            player.classList.toggle('pseudo-fullscreen');
        }
    }

    // --- Init ---
    function init() {
        // Attach Listeners
        document.getElementById('btn-clear')?.addEventListener('click', clear);
        document.getElementById('btn-equal')?.addEventListener('click', calculate);
        document.getElementById('btn-backspace')?.addEventListener('click', backspace);
        document.getElementById('btn-exit-portal')?.addEventListener('click', () => switchView('calculator'));
        document.getElementById('btn-back-to-hub')?.addEventListener('click', closeGame);
        document.getElementById('btn-toggle-native-fs')?.addEventListener('click', () => toggleFullscreen('game-player'));
        document.getElementById('btn-video-fs')?.addEventListener('click', () => toggleFullscreen('video-player-modal'));
        document.getElementById('btn-login-trigger')?.addEventListener('click', () => switchView('auth'));
        document.getElementById('btn-leaderboard-global')?.addEventListener('click', () => showLeaderboard());
        document.getElementById('btn-nav-videos')?.addEventListener('click', () => switchView('videos'));
        document.getElementById('btn-nav-games')?.addEventListener('click', () => switchView('games'));
        document.getElementById('btn-close-leaderboard')?.addEventListener('click', () => {
            document.getElementById('leaderboard-modal')?.classList.add('hidden');
        });

        document.getElementById('btn-close-video')?.addEventListener('click', () => {
            const modal = document.getElementById('video-player-modal');
            const container = document.getElementById('video-player-container');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('pseudo-fullscreen');
            }
            if (container) container.innerHTML = ''; // Stop video playback
        });
        document.getElementById('btn-logout')?.addEventListener('click', async () => {
            await updatePlayTime();
            await signOut(auth);
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
            // Username is now always required for both signup and login
            document.getElementById('username-group').style.display = 'block'; 
            document.getElementById('auth-submit-btn').innerText = authMode === 'signup' ? 'Sign Up' : 'Log In';
        });

        // Periodic update of playtime if game is open
        setInterval(updatePlayTime, 30000); // Every 30 seconds

        window.addEventListener('beforeunload', updatePlayTime);

        // Firebase Auth Listener
        onAuthStateChanged(auth, (user) => {
            updateAuthUI(user);
        });

        updateDisplay();
        loadGames();
        if (window.lucide) window.lucide.createIcons();
    }

    // Since this is a module, it's already deferred.
    // Call init directly or check readyState.
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => {
            init();
        });
    } else {
        init();
    }
})();
