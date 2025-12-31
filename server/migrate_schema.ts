import { db } from './src/db';

console.log("🧹 Starting Database Cleanup & Migration...");

// 1. Cleanup Orphaned Topics (The user's reported issue)
try {
    const res = db.query('DELETE FROM topics WHERE pack_id NOT IN (SELECT id FROM packs)').run();
    console.log(`✅ Deleted ${res.changes} orphaned topics.`);
} catch (e) {
    console.error("❌ Cleanup failed:", e);
}

// 2. Rename Column 'text' -> 'topic'
try {
    // Check if column needs renaming (simple check if SELECT topic fails)
    try {
        db.query("SELECT topic FROM topics LIMIT 1").get();
        console.log("ℹ️ Column 'topic' already exists.");
    } catch {
        console.log("🔄 Renaming column 'text' to 'topic'...");
        db.query("ALTER TABLE topics RENAME COLUMN text TO topic").run();
        console.log("✅ Column renamed successfully.");
    }
} catch (e) {
    console.error("❌ Rename failed:", e);
}

console.log("✨ database maintenance complete.");
