import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import cron from "node-cron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "db.json");
const CONFIG_FILE = path.join(__dirname, "firebase-applet-config.json");

let firebaseAdmin: admin.app.App | null = null;
let firestore: admin.firestore.Firestore | null = null;

async function initFirebase() {
    try {
        const configData = await fs.readFile(CONFIG_FILE, "utf-8");
        const config = JSON.parse(configData);
        
        firebaseAdmin = admin.initializeApp({
            projectId: config.projectId,
        }, "server-admin");
        
        firestore = firebaseAdmin.firestore();
        console.log("Firebase Admin initialized successfully");
        
        // Schedule weekly cleanup: Every Sunday at 00:00
        cron.schedule("0 0 * * 0", async () => {
            console.log("Running weekly chat cleanup...");
            await cleanupChatMessages();
        });
        
    } catch (error) {
        console.error("Failed to initialize Firebase Admin:", error);
    }
}

async function cleanupChatMessages(daysToKeep = 7) {
    if (!firestore) return;
    
    try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysToKeep);
        
        console.log(`Cleaning up messages older than ${cutoff.toISOString()}`);
        
        const messagesRef = firestore.collection("messages");
        const snapshot = await messagesRef.where("timestamp", "<", cutoff).get();
        
        if (snapshot.empty) {
            console.log("No old messages to delete.");
            return;
        }
        
        const batch = firestore.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`Successfully deleted ${snapshot.size} old messages.`);
    } catch (error) {
        console.error("Error during chat cleanup:", error);
    }
}

async function initDB() {
    try {
        await fs.access(DB_FILE);
    } catch {
        await fs.writeFile(DB_FILE, JSON.stringify({ users: [] }, null, 2));
    }
}

async function getDB() {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
}

async function saveDB(db: any) {
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

async function startServer() {
    await initDB();
    await initFirebase();
    
    const app = express();
    const PORT = 3000;

    app.use(express.json());

    // --- API Routes ---

    // Manual Cleanup Trigger (for testing/admin)
    app.post("/api/admin/cleanup", async (req, res) => {
        // In a real app, you'd check for admin permissions here
        await cleanupChatMessages();
        res.json({ status: "Cleanup triggered" });
    });

    // Signup
    app.post("/api/auth/signup", async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Missing fields" });

        const db = await getDB();
        if (db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase())) {
            return res.status(400).json({ error: "Username taken" });
        }

        const newUser = {
            username,
            password,
            totalHours: 0,
            gameStats: {}
        };
        db.users.push(newUser);
        await saveDB(db);
        
        const { password: _, ...userWithoutPassword } = newUser;
        res.json(userWithoutPassword);
    });

    // Login
    app.post("/api/auth/login", async (req, res) => {
        const { username, password } = req.body;
        const db = await getDB();
        const user = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
        
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    });

    // Update Playtime
    app.post("/api/playtime", async (req, res) => {
        const { username, gameId, durationHours } = req.body;
        if (!username || durationHours === undefined) return res.status(400).json({ error: "Invalid data" });

        const db = await getDB();
        const userIdx = db.users.findIndex((u: any) => u.username === username);
        
        if (userIdx !== -1) {
            db.users[userIdx].totalHours = (db.users[userIdx].totalHours || 0) + durationHours;
            if (gameId) {
                if (!db.users[userIdx].gameStats) db.users[userIdx].gameStats = {};
                db.users[userIdx].gameStats[gameId] = (db.users[userIdx].gameStats[gameId] || 0) + durationHours;
            }
            await saveDB(db);
            const { password: _, ...userWithoutPassword } = db.users[userIdx];
            res.json(userWithoutPassword);
        } else {
            res.status(404).json({ error: "User not found" });
        }
    });

    // Get Leaderboard
    app.get("/api/leaderboard", async (req, res) => {
        try {
            const { gameId } = req.query;
            console.log(`Leaderboard request for gameId: ${gameId || 'Global'}`);
            const db = await getDB();
            
            let sortedUsers;
            if (gameId) {
                const gId = gameId as string;
                sortedUsers = db.users
                    .filter((u: any) => u.gameStats && u.gameStats[gId] > 0.0001)
                    .sort((a: any, b: any) => b.gameStats[gId] - a.gameStats[gId])
                    .map((u: any) => ({ username: u.username, score: u.gameStats[gId] }));
            } else {
                sortedUsers = db.users
                    .filter((u: any) => (u.totalHours || 0) > 0.0001)
                    .sort((a: any, b: any) => (b.totalHours || 0) - (a.totalHours || 0))
                    .map((u: any) => ({ username: u.username, score: u.totalHours }));
            }

            console.log(`Returning ${sortedUsers.length} leaderboard entries`);
            res.json(sortedUsers.slice(0, 100)); // Top 100
        } catch (error) {
            console.error('Leaderboard API Error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        app.use(express.static(path.join(__dirname, "dist")));
        app.get("*", (req, res) => {
            res.sendFile(path.join(__dirname, "dist", "index.html"));
        });
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();
