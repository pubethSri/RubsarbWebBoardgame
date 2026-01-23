import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";

// Ensure db directory exists
try { mkdirSync("db"); } catch (e) { }

// persistent sqlite database
const db = new Database("db/game.sqlite", { create: true });

// Optimize for concurrency and data integrity
db.query("PRAGMA journal_mode = WAL;").run();
db.query("PRAGMA foreign_keys = ON;").run();

// Create Tables
export function initDB() {
    db.query(`
        CREATE TABLE IF NOT EXISTS packs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            author TEXT NOT NULL,
            share_code TEXT,
            is_official INTEGER DEFAULT 0,
            created_at INTEGER DEFAULT (unixepoch())
        );
    `).run();

    db.query(`
        CREATE TABLE IF NOT EXISTS topics (
            id TEXT PRIMARY KEY,
            pack_id TEXT NOT NULL,
            topic TEXT NOT NULL,
            type TEXT DEFAULT 'NORMAL',
            min_label TEXT,
            max_label TEXT,
            FOREIGN KEY(pack_id) REFERENCES packs(id) ON DELETE CASCADE
        );
    `).run();

    // Re-create users table for OIDC (Drop legacy password-based table)
    try {
        const userTableCheck = db.query("PRAGMA table_info(users)").all() as any[];
        const hasPassword = userTableCheck.some(col => col.name === 'password');

        if (hasPassword) {
            console.log("♻️ Legacy user table detected. Dropping and recreating for OIDC...");
            db.query("DROP TABLE users").run();
        }
    } catch (e) {
        // Table might not exist, ignore
    }

    // Check for id_token column and add if missing (Migration)
    try {
        const userCols = db.query("PRAGMA table_info(users)").all() as any[];
        const hasIdToken = userCols.some(col => col.name === 'id_token');
        if (!hasIdToken && userCols.length > 0) {
            console.log("♻️ Adding id_token column to users table...");
            db.query("ALTER TABLE users ADD COLUMN id_token TEXT").run();
        }
    } catch (e) { }

    db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, -- authentik 'sub'
            username TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL DEFAULT 'USER',
            token TEXT, -- active session token
            id_token TEXT, -- OIDC id_token for logout hint
            created_at INTEGER DEFAULT (unixepoch())
        );
    `).run();

    db.query(`
        CREATE TABLE IF NOT EXISTS game_logs (
            id TEXT PRIMARY KEY,
            room_code TEXT NOT NULL,
            session_id TEXT NOT NULL,
            pack_name TEXT,
            level INTEGER,
            result TEXT,
            players_snapshot TEXT,
            created_at INTEGER DEFAULT (unixepoch())
        );
    `).run();

    console.log("Database initialized (WAL mode enabled)");
}

export { db };
