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

// Initialize services
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Re-export common functions
export { 
    signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut,
    doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit, serverTimestamp 
};

export default app;
