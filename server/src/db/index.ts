import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";

// Ensure db directory exists
try { mkdirSync("db"); } catch (e) { }

// persistent sqlite database
const db = new Database("db/rubsarb.sqlite", { create: true });

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
        );
    `).run();

    db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'USER',
            token TEXT,
            created_at INTEGER DEFAULT (unixepoch())
        );
    `).run();

    console.log("Database initialized (WAL mode enabled)");
}

export { db };
