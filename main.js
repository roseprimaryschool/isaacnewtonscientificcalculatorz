// Nova Portal - Firebase Integrated
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, orderBy, limit, serverTimestamp, onSnapshot, addDoc, increment 
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

// --- Firestore Error Handling ---
const OperationType = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
    WRITE: 'write',
};

function handleFirestoreError(error, operationType, path) {
    const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        code: error.code || 'unknown',
        authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            emailVerified: auth.currentUser?.emailVerified,
            isAnonymous: auth.currentUser?.isAnonymous,
            tenantId: auth.currentUser?.tenantId,
            providerInfo: auth.currentUser?.providerData.map(provider => ({
                providerId: provider.providerId,
                displayName: provider.displayName,
                email: provider.email,
                photoUrl: provider.photoURL
            })) || []
        },
        operationType,
        path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    
    // Show user-friendly error
    const errorEl = document.getElementById('auth-error'); // Reuse auth error or show a toast
    if (errorEl) {
        let userMsg = "A database error occurred. Please try again.";
        if (errInfo.code === 'permission-denied') {
            userMsg = "Permission denied. Please check your account.";
        } else if (errInfo.error.toLowerCase().includes('index')) {
            userMsg = "Database index required. Please contact support.";
            console.warn("INDEX REQUIRED: Click the link in the console error above to create the required index.");
        }
        errorEl.innerText = userMsg;
        errorEl.classList.remove('hidden');
        setTimeout(() => errorEl.classList.add('hidden'), 5000);
    }
    
    throw new Error(JSON.stringify(errInfo));
}

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
        const shopView = document.getElementById('nova-shop-view');
        const chatView = document.getElementById('chat-view');
        
        [calcView, gamesView, authView, videosView, shopView, chatView].forEach(v => {
            if (v) {
                v.style.display = 'none';
                v.classList.remove('active');
            }
        });

        let target;
        switch(view) {
            case 'calculator': target = calcView; break;
            case 'games': 
                target = gamesView; 
                loadGames(); 
                break;
            case 'videos': 
                target = videosView; 
                loadVideos(); 
                break;
            case 'shop': 
                target = shopView; 
                loadShop(); 
                break;
            case 'chat':
                target = document.getElementById('chat-view');
                if (auth.currentUser) {
                    loadChatRooms();
                } else {
                    switchView('auth');
                    return;
                }
                break;
            case 'auth': target = authView; break;
            default: target = authView;
        }

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

        // Setup Hero Button
        const heroBtn = document.querySelector('.hero-play-btn');
        if (heroBtn && videos.length > 0) {
            heroBtn.onclick = () => playVideo(videos[0].url, videos[0].title);
        }

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
        
        // Handle Google Drive links specifically with a bypass strategy
        if (url.includes('drive.google.com')) {
            const driveId = url.match(/\/d\/([^/]+)/)?.[1] || url.match(/id=([^&]+)/)?.[1];
            if (driveId) {
                // Using docs.google.com instead of drive.google.com often bypasses filters
                // Using <embed> instead of <iframe> often bypasses iframe-specific blocks
                // This also avoids CORS issues entirely as it's a document embed
                const bypassUrl = `https://docs.google.com/file/d/${driveId}/preview`;
                container.innerHTML = `
                    <div class="video-embed-wrapper" style="width: 100%; height: 100%; background: black;">
                        <embed src="${bypassUrl}" style="width: 100%; height: 100%; border: none;" allowfullscreen="true">
                    </div>
                `;
                modal.classList.remove('hidden');
                return;
            }
        }

        // Detect if it's a direct video file or from a known direct-link host
        const isDirectVideo = url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || 
                             url.includes('discordapp.com') || 
                             url.includes('github.com') ||
                             url.includes('dropbox.com');
        
        if (isDirectVideo) {
            let videoUrl = url;
            
            // Handle Dropbox links (replace dl=0 with dl=1 for direct access)
            if (url.includes('dropbox.com')) {
                videoUrl = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
            }
            
            container.innerHTML = `
                <div class="native-video-wrapper" style="width: 100%; height: 100%; position: relative; background: black;">
                    <video id="native-video-player" playsinline controls style="width: 100%; height: 100%;">
                        <source src="${videoUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>
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
                    coins: 100, // Starting bonus
                    ownedThemes: ['default'],
                    ownedTitles: [],
                    activeTheme: 'default',
                    activeTitle: '',
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

    function updateUserProfileUI() {
        const user = getCurrentUser();
        const avatarImg = document.getElementById('user-avatar-img');
        if (user && avatarImg) {
            if (user.activeAvatar) {
                const avatarItem = SHOP_ITEMS.avatars.find(a => a.id === user.activeAvatar);
                if (avatarItem) avatarImg.src = avatarItem.preview;
            } else {
                avatarImg.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`;
            }
        }
    }

    function updateAuthUI(user = null) {
        const loginBtn = document.getElementById('btn-login-trigger');
        const profile = document.getElementById('user-profile');
        const nameDisplay = document.getElementById('display-username');
        const coinDisplay = document.getElementById('user-coins');

        if (user) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (profile) profile.classList.remove('hidden');
            
            // Fetch username from Firestore if not already in state
            if (currentUserData && currentUserData.username) {
                if (nameDisplay) nameDisplay.innerText = currentUserData.username;
                if (coinDisplay) coinDisplay.innerText = Math.floor(currentUserData.coins || 0);
                applyTheme(currentUserData.activeTheme);
                updateUserProfileUI();
            } else {
                const path = `users/${user.uid}`;
                getDoc(doc(db, 'users', user.uid)).then(snap => {
                    if (snap.exists()) {
                        const data = snap.data();
                        setCurrentUser({ ...data, uid: user.uid });
                        if (nameDisplay) nameDisplay.innerText = data.username;
                        if (coinDisplay) coinDisplay.innerText = Math.floor(data.coins || 0);
                        applyTheme(data.activeTheme);
                        updateUserProfileUI();
                    }
                }).catch(err => handleFirestoreError(err, OperationType.GET, path));
            }
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (profile) profile.classList.add('hidden');
            setCurrentUser(null);
            applyTheme('default');
        }
    }

    // --- Shop Logic ---
    const SHOP_ITEMS = {
        themes: [
            { id: 'default', title: 'Emerald (Default)', price: 0, desc: 'The classic Nova look.', preview: 'https://picsum.photos/seed/emerald/300/200' },
            { id: 'cyberpunk', title: 'Cyberpunk', price: 500, desc: 'Neon lights and dark nights.', preview: 'https://picsum.photos/seed/cyberpunk/300/200' },
            { id: 'retro', title: 'Retro Terminal', price: 300, desc: 'Classic green phosphor vibe.', preview: 'https://picsum.photos/seed/terminal/300/200' },
            { id: 'stealth', title: 'Stealth Mode', price: 1000, desc: 'Looks like a boring document.', preview: 'https://picsum.photos/seed/office/300/200' },
            { id: 'galaxy', title: 'Galaxy', price: 1000, desc: 'Animated cosmic journey.', preview: 'https://picsum.photos/seed/galaxy/300/200' },
            { id: 'sunset', title: 'Sunset Horizon', price: 750, desc: 'Warm gradients and chill vibes.', preview: 'https://picsum.photos/seed/sunset/300/200' },
            { id: 'retrowave', title: 'Retro Wave', price: 1200, desc: '80s synthwave aesthetics.', preview: 'https://picsum.photos/seed/synthwave/300/200' }
        ],
        titles: [
            { id: 'Novice', title: 'Novice', price: 100, desc: 'Just getting started.' },
            { id: 'Pro', title: 'Pro Gamer', price: 500, desc: 'You know your way around.' },
            { id: 'Legend', title: 'Legend', price: 2000, desc: 'A true Nova veteran.' },
            { id: 'Nova-God', title: 'Nova God', price: 5000, desc: 'The ultimate rank.' }
        ],
        avatars: [
            { id: 'bot1', title: 'Nova Bot', price: 200, desc: 'A friendly companion.', preview: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nova' },
            { id: 'pixel1', title: 'Pixel Hero', price: 400, desc: 'Retro gaming icon.', preview: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Hero' },
            { id: 'space1', title: 'Astronaut', price: 600, desc: 'Ready for lift off.', preview: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Space' },
            { id: 'cyber1', title: 'Cyberpunk', price: 800, desc: 'Future is now.', preview: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cyber' }
        ]
    };

    let currentShopTab = 'themes';

    function loadShop() {
        const grid = document.getElementById('shop-grid');
        const coinDisplay = document.getElementById('shop-user-coins');
        const user = getCurrentUser();
        
        if (!grid) return;
        if (coinDisplay) coinDisplay.innerText = Math.floor(user?.coins || 0);

        const items = SHOP_ITEMS[currentShopTab];
        
        grid.innerHTML = items.map(item => {
            const isOwned = user && (
                currentShopTab === 'themes' ? user.ownedThemes?.includes(item.id) : 
                currentShopTab === 'titles' ? user.ownedTitles?.includes(item.id) :
                user.ownedAvatars?.includes(item.id)
            );
            
            const isActive = user && (
                currentShopTab === 'themes' ? user.activeTheme === item.id : 
                currentShopTab === 'titles' ? user.activeTitle === item.id :
                user.activeAvatar === item.id
            );

            let btnText = 'Buy';
            let btnClass = 'can-buy';
            
            const userCoins = user?.coins || 0;
            
            if (isActive) {
                btnText = 'Active';
                btnClass = 'active';
            } else if (isOwned) {
                btnText = 'Equip';
                btnClass = 'can-buy';
            } else if (user && userCoins < item.price) {
                btnClass = 'owned'; // Insufficient coins look
                btnText = 'Buy';
            }

            return `
                <div class="shop-item">
                    ${(currentShopTab === 'themes' || currentShopTab === 'avatars') ? `
                        <div class="item-preview ${currentShopTab === 'avatars' ? 'avatar-preview' : ''}">
                            <img src="${item.preview}" alt="${item.title}">
                        </div>
                    ` : ''}
                    <div class="item-info">
                        <h3>${item.title}</h3>
                        <p>${item.desc}</p>
                    </div>
                    <div class="item-footer">
                        <div class="item-price">
                            <svg class="nova-coin" viewBox="0 0 32 32" width="16" height="16">
                                <path d="M4 4h24v24H4z" fill="#f59e0b" />
                                <path d="M6 6h20v20H6z" fill="#fbbf24" />
                                <path d="M8 8h16v16H8z" fill="#fcd34d" />
                                <path d="M10 10h2v12h-2zM20 10h2v12h-2zM12 10h8v2h-8zM12 20h8v2h-8z" fill="#b45309" opacity="0.3" />
                                <path d="M11 11h2v10h-2zM19 11h2v10h-2zM13 11h6v2h-6zM13 15h6v2h-6z" fill="#92400e" />
                            </svg>
                            <span>${item.price}</span>
                        </div>
                        <div class="item-actions">
                            ${currentShopTab === 'themes' ? `
                                <button class="preview-btn" onclick="previewTheme('${item.id}')">
                                    Preview
                                </button>
                            ` : ''}
                            <button class="buy-btn ${btnClass}" onclick="handleShopAction('${currentShopTab}', '${item.id}', ${item.price})">
                                ${btnText}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        if (window.lucide) window.lucide.createIcons();
    }

    window.handleShopAction = async (type, id, price) => {
        const user = auth.currentUser;
        if (!user) {
            switchView('auth');
            return;
        }

        const userData = getCurrentUser();
        if (!userData) return;

        const userCoins = userData.coins || 0;
        const isOwned = type === 'themes' ? userData.ownedThemes?.includes(id) : 
                        type === 'titles' ? userData.ownedTitles?.includes(id) :
                        userData.ownedAvatars?.includes(id);

        if (isOwned) {
            // Equip
            try {
                const userRef = doc(db, 'users', user.uid);
                const updateData = {};
                if (type === 'themes') {
                    updateData.activeTheme = id;
                    applyTheme(id);
                } else if (type === 'titles') {
                    updateData.activeTitle = id;
                } else {
                    updateData.activeAvatar = id;
                }
                await updateDoc(userRef, updateData);
                setCurrentUser({ ...userData, ...updateData });
                loadShop();
                updateUserProfileUI();
            } catch (e) {
                console.error('Equip failed:', e);
            }
            return;
        }

        // Purchase
        if (typeof price !== 'number' || userCoins < price) {
            console.log('Insufficient funds or invalid price');
            return;
        }

        try {
            const userRef = doc(db, 'users', user.uid);
            const newCoins = Math.floor(userCoins - price);
            const updateData = {
                coins: newCoins
            };
            
            if (type === 'themes') {
                updateData.ownedThemes = [...(userData.ownedThemes || []), id];
                updateData.activeTheme = id;
                applyTheme(id);
            } else if (type === 'titles') {
                updateData.ownedTitles = [...(userData.ownedTitles || []), id];
                updateData.activeTitle = id;
            } else {
                updateData.ownedAvatars = [...(userData.ownedAvatars || []), id];
                updateData.activeAvatar = id;
            }

            await updateDoc(userRef, updateData);
            setCurrentUser({ ...userData, ...updateData });
            updateUserProfileUI();
            
            // Update UI
            const coinDisplay = document.getElementById('user-coins');
            if (coinDisplay) coinDisplay.innerText = Math.floor(updateData.coins);
            
            loadShop();
        } catch (e) {
            console.error('Purchase failed:', e);
        }
    };

    let previewTimeout = null;
    let originalTheme = null;

    window.previewTheme = (themeId) => {
        if (previewTimeout) {
            clearTimeout(previewTimeout);
        } else {
            originalTheme = getCurrentUser()?.activeTheme || 'default';
        }

        applyTheme(themeId);

        previewTimeout = setTimeout(() => {
            applyTheme(originalTheme);
            previewTimeout = null;
            originalTheme = null;
        }, 3000);
    };

    function applyTheme(themeId) {
        document.body.className = '';
        if (themeId && themeId !== 'default') {
            document.body.classList.add(`theme-${themeId}`);
        }
    }
    async function updatePlayTime() {
        if (!gameStartTime || !currentGameId) return;
        
        const user = auth.currentUser;
        if (!user) return;

        const endTime = Date.now();
        const durationMs = endTime - gameStartTime;
        const durationHours = durationMs / (1000 * 60 * 60);
        
        // Award coins: 10 coins per minute
        const coinsEarned = (durationMs / (1000 * 60)) * 10;

        try {
            const userRef = doc(db, 'users', user.uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
                const data = snap.data();
                const newTotal = (data.totalHours || 0) + durationHours;
                const newCoins = (data.coins || 0) + Math.floor(coinsEarned);
                const newGameStats = { ...(data.gameStats || {}) };
                newGameStats[currentGameId] = (newGameStats[currentGameId] || 0) + durationHours;
                
                await updateDoc(userRef, {
                    totalHours: newTotal,
                    coins: newCoins,
                    gameStats: newGameStats,
                    updatedAt: serverTimestamp()
                });
                
                // Update local state
                const updatedData = { ...data, totalHours: newTotal, coins: newCoins, gameStats: newGameStats, uid: user.uid };
                setCurrentUser(updatedData);
                
                // Update UI
                const coinDisplay = document.getElementById('user-coins');
                if (coinDisplay) coinDisplay.innerText = Math.floor(newCoins);
            }
        } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
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
                    title: data.activeTitle || '',
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
                    <span class="user-name">
                        ${u.username} ${isMe ? '(You)' : ''}
                        ${u.title ? `<span class="user-title">${u.title}</span>` : ''}
                    </span>
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

    // --- Private Chat Logic ---
    let chatRoomsUnsubscribe = null;
    let activeChatUnsubscribe = null;
    let activeRoomId = null;

    let isChatInitialized = false;
    function initPrivateChat() {
        if (isChatInitialized) return;
        isChatInitialized = true;

        const addFriendBtn = document.getElementById('btn-add-friend');
        const closeAddFriendBtn = document.getElementById('btn-close-add-friend');
        const addFriendModal = document.getElementById('add-friend-modal');
        const searchFriendBtn = document.getElementById('btn-search-friend');
        const searchFriendInput = document.getElementById('search-friend-input');
        const privateChatForm = document.getElementById('private-chat-form');
        const privateChatInput = document.getElementById('private-chat-input');

        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', () => {
                addFriendModal.classList.remove('hidden');
                searchFriendInput.focus();
            });
        }

        if (closeAddFriendBtn) {
            closeAddFriendBtn.addEventListener('click', () => {
                addFriendModal.classList.add('hidden');
            });
        }

        if (searchFriendBtn) {
            searchFriendBtn.addEventListener('click', searchFriends);
        }

        if (searchFriendInput) {
            searchFriendInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') searchFriends();
            });
        }

        if (privateChatForm) {
            privateChatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const text = privateChatInput.value.trim();
                if (!text || !activeRoomId) return;
                
                try {
                    await sendPrivateMessage(activeRoomId, text);
                    privateChatInput.value = '';
                } catch (err) {
                    console.error('Failed to send private message:', err);
                }
            });
        }
    }

    async function searchFriends() {
        const input = document.getElementById('search-friend-input');
        const results = document.getElementById('search-results');
        if (!input || !results) return;

        const username = input.value.trim();
        if (!username) return;

        results.innerHTML = '<div class="loading">Searching...</div>';

        try {
            const q = query(collection(db, 'users'), where('username', '==', username), limit(5));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                results.innerHTML = '<div class="no-results">No users found.</div>';
                return;
            }

            results.innerHTML = snap.docs.map(doc => {
                const data = doc.data();
                if (doc.id === auth.currentUser.uid) return ''; // Don't show self
                return `
                    <div class="search-result-item">
                        <div class="search-result-user">
                            <div class="friend-avatar">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.username)}" alt="">
                            </div>
                            <span>${data.username}</span>
                        </div>
                        <button class="start-chat-btn" data-id="${doc.id}" data-name="${data.username}">Chat</button>
                    </div>
                `;
            }).join('');

            results.querySelectorAll('.start-chat-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    startChat(btn.dataset.id, btn.dataset.name);
                });
            });
        } catch (err) {
            handleFirestoreError(err, OperationType.LIST, 'users');
        }
    }
    async function startChat(friendId, friendName) {
        const user = auth.currentUser;
        if (!user) return;

        // Hide modal
        const modal = document.getElementById('add-friend-modal');
        if (modal) modal.classList.add('hidden');

        // Check if room exists
        try {
            // Room ID is deterministic for 2 participants: sorted UIDs joined by underscore
            const roomId = [user.uid, friendId].sort().join('_');
            const roomRef = doc(db, 'chatRooms', roomId);
            const roomSnap = await getDoc(roomRef);

            if (!roomSnap.exists()) {
                const userData = getCurrentUser();
                if (!userData) {
                    console.error('User data not loaded yet');
                    return;
                }
                await setDoc(roomRef, {
                    participants: [user.uid, friendId],
                    participantNames: {
                        [user.uid]: userData.username,
                        [friendId]: friendName
                    },
                    updatedAt: serverTimestamp()
                });
            }

            openChatRoom(roomId, friendName);
        } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `chatRooms`);
        }
    }
    window.startChat = startChat;

    function loadChatRooms() {
        const user = auth.currentUser;
        if (!user) return;

        if (chatRoomsUnsubscribe) chatRoomsUnsubscribe();

        const q = query(
            collection(db, 'chatRooms'), 
            where('participants', 'array-contains', user.uid),
            orderBy('updatedAt', 'desc')
        );

        chatRoomsUnsubscribe = onSnapshot(q, (snapshot) => {
            const friendsList = document.getElementById('friends-list');
            if (!friendsList) return;

            const rooms = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(room => room.lastMessage || room.id === activeRoomId);

            if (rooms.length === 0) {
                friendsList.innerHTML = '<div class="empty-list">No chats yet.</div>';
                return;
            }

            friendsList.innerHTML = rooms.map(room => {
                const friendId = room.participants.find(p => p !== user.uid);
                const friendName = room.participantNames[friendId];
                const lastMsg = room.lastMessage || 'No messages yet';
                const isActive = activeRoomId === room.id;

                return `
                    <div class="friend-item ${isActive ? 'active' : ''}" data-room-id="${room.id}" data-friend-name="${friendName}">
                        <div class="friend-avatar">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(friendName)}" alt="">
                        </div>
                        <div class="friend-details">
                            <div class="friend-name">${friendName}</div>
                            <div class="friend-last-msg">${lastMsg}</div>
                        </div>
                    </div>
                `;
            }).join('');

            friendsList.querySelectorAll('.friend-item').forEach(item => {
                item.addEventListener('click', () => {
                    openChatRoom(item.dataset.roomId, item.dataset.friendName);
                });
            });
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'chatRooms'));
    }

    function openChatRoom(roomId, friendName) {
        activeRoomId = roomId;
        
        // Update UI
        const emptyState = document.getElementById('chat-empty-state');
        const activeChat = document.getElementById('active-chat');
        const friendNameEl = document.getElementById('active-friend-name');
        const friendImgEl = document.getElementById('active-friend-img');

        if (emptyState) emptyState.classList.add('hidden');
        if (activeChat) activeChat.classList.remove('hidden');
        if (friendNameEl) friendNameEl.innerText = friendName;
        if (friendImgEl) friendImgEl.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(friendName)}`;
        
        // Highlight in sidebar
        document.querySelectorAll('.friend-item').forEach(item => {
            if (item.dataset.roomId === roomId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        listenToMessages(roomId);
    }
    window.openChatRoom = openChatRoom;

    function listenToMessages(roomId) {
        if (activeChatUnsubscribe) activeChatUnsubscribe();

        const q = query(
            collection(db, 'chatRooms', roomId, 'messages'),
            orderBy('timestamp', 'asc'),
            limit(100)
        );

        activeChatUnsubscribe = onSnapshot(q, (snapshot) => {
            const container = document.getElementById('private-messages');
            if (!container) return;

            const user = auth.currentUser;
            container.innerHTML = snapshot.docs.map(doc => {
                const msg = doc.data();
                const isOwn = msg.senderId === user.uid;
                const time = msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';

                return `
                    <div class="message ${isOwn ? 'own' : ''}">
                        <div class="message-content">${escapeHtml(msg.text)}</div>
                        <div class="message-time">${time}</div>
                    </div>
                `;
            }).join('');

            container.scrollTop = container.scrollHeight;
        }, (err) => handleFirestoreError(err, OperationType.GET, `chatRooms/${roomId}/messages`));
    }

    async function sendPrivateMessage(roomId, text) {
        const user = auth.currentUser;
        const userData = getCurrentUser();
        if (!user || !userData) return;

        const messageData = {
            senderId: user.uid,
            senderName: userData.username,
            text: text,
            timestamp: serverTimestamp()
        };

        try {
            // Add message to subcollection
            await addDoc(collection(db, 'chatRooms', roomId, 'messages'), messageData);

            // Update room's last message and timestamp
            await updateDoc(doc(db, 'chatRooms', roomId), {
                lastMessage: text,
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `chatRooms/${roomId}`);
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
    async function testConnection() {
        try {
            // Test connection to Firestore
            const { getDocFromServer } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (error) {
            if (error instanceof Error && error.message.includes('the client is offline')) {
                console.error("Please check your Firebase configuration. ");
            }
            // Skip logging for other errors, as this is simply a connection test.
        }
    }

    // --- Daily Spin Logic ---
    function initDailySpin() {
        const modal = document.getElementById('daily-spin-modal');
        const btnOpen = document.getElementById('btn-daily-spin');
        const btnClose = document.getElementById('close-spin-modal');
        const btnSpin = document.getElementById('spin-button');
        const wheel = document.getElementById('spin-wheel');
        const resultEl = document.getElementById('spin-result');

        if (!modal || !btnOpen || !btnClose || !btnSpin || !wheel) return;

        btnOpen.addEventListener('click', () => {
            modal.classList.remove('hidden');
            resultEl.classList.add('hidden');
            wheel.style.transition = 'none';
            wheel.style.transform = 'rotate(0deg)';
            
            // Check if already spun today
            const lastSpin = localStorage.getItem('last_spin_date');
            const today = new Date().toDateString();
            if (lastSpin === today) {
                btnSpin.disabled = true;
                btnSpin.innerText = 'ALREADY SPUN TODAY';
            } else {
                btnSpin.disabled = false;
                btnSpin.innerText = 'SPIN WHEEL';
            }
        });

        btnClose.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        btnSpin.addEventListener('click', async () => {
            if (btnSpin.disabled) return;
            
            const user = auth.currentUser;
            if (!user) {
                alert('Please log in to spin the wheel!');
                return;
            }

            btnSpin.disabled = true;
            btnSpin.innerText = 'SPINNING...';

            // Probabilities and results
            // We use equal visual segments (72deg each) but weighted probabilities
            const options = [
                { val: 10, angle: 36, prob: 0.4 },
                { val: 50, angle: 108, prob: 0.2 },
                { val: 100, angle: 180, prob: 0.2 },
                { val: 200, angle: 252, prob: 0.15 },
                { val: 500, angle: 324, prob: 0.05 }
            ];

            const rand = Math.random();
            let cumulative = 0;
            let selected = options[0];
            for (const opt of options) {
                cumulative += opt.prob;
                if (rand <= cumulative) {
                    selected = opt;
                    break;
                }
            }

            // Calculate final rotation
            // Add a small random offset within the 72deg segment (+/- 20deg) to look natural
            const offset = (Math.random() - 0.5) * 40;
            const rotations = 5 + Math.floor(Math.random() * 5);
            const finalAngle = (rotations * 360) + (360 - selected.angle) + offset;

            wheel.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)';
            wheel.style.transform = `rotate(${finalAngle}deg)`;

            setTimeout(async () => {
                const userData = getCurrentUser();
                if (userData) {
                    try {
                        const userRef = doc(db, 'users', user.uid);
                        await updateDoc(userRef, {
                            coins: increment(selected.val),
                            updatedAt: serverTimestamp()
                        });
                        
                        // Update local state and UI
                        const newCoins = (userData.coins || 0) + selected.val;
                        setCurrentUser({ ...userData, coins: newCoins });
                        
                        const coinDisplay = document.getElementById('user-coins');
                        const shopCoinDisplay = document.getElementById('shop-user-coins');
                        if (coinDisplay) coinDisplay.innerText = Math.floor(newCoins);
                        if (shopCoinDisplay) shopCoinDisplay.innerText = Math.floor(newCoins);
                        
                        resultEl.innerText = `YOU WON ${selected.val} COINS!`;
                        resultEl.classList.remove('hidden');
                        
                        localStorage.setItem('last_spin_date', new Date().toDateString());
                        btnSpin.innerText = 'ALREADY SPUN TODAY';
                    } catch (err) {
                        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
                        btnSpin.disabled = false;
                        btnSpin.innerText = 'SPIN WHEEL';
                    }
                }
            }, 4100);
        });
    }

    function init() {
        testConnection();
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
        document.getElementById('btn-open-shop')?.addEventListener('click', () => switchView('shop'));
        document.getElementById('btn-open-shop-videos')?.addEventListener('click', () => switchView('shop'));
        document.getElementById('btn-open-shop-chat')?.addEventListener('click', () => switchView('shop'));
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

        document.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentShopTab = tab.dataset.tab;
                loadShop();
            });
        });

        // Periodic update of playtime if game is open
        setInterval(updatePlayTime, 30000); // Every 30 seconds

        window.addEventListener('beforeunload', updatePlayTime);

        // Firebase Auth Listener
        onAuthStateChanged(auth, (user) => {
            updateAuthUI(user);
            if (user) {
                initPrivateChat();
            } else {
                if (chatRoomsUnsubscribe) {
                    chatRoomsUnsubscribe();
                    chatRoomsUnsubscribe = null;
                }
                if (activeChatUnsubscribe) {
                    activeChatUnsubscribe();
                    activeChatUnsubscribe = null;
                }
            }
        });

        updateDisplay();
        loadGames();
        initDailySpin();
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
