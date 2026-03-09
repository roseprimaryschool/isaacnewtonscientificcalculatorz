import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
// We use the firestoreDatabaseId from the config if provided
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Re-export common functions without conflict
export { 
    signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut 
} from 'firebase/auth';
export { 
    doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit, serverTimestamp 
} from 'firebase/firestore';

export default app;
