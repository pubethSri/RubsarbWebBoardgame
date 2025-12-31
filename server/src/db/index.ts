import { Database } from "bun:sqlite";

// persistent sqlite database
const db = new Database("rubsarb.sqlite", { create: true });

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

    console.log("Database initialized (WAL mode enabled)");
}

export { db };
