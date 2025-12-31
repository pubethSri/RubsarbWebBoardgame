import { db } from './src/db';

console.log("🔒 Starting Phase 2 Migration (Share Codes)...");

// 1. Add share_code column
try {
    const tableInfo = db.query("PRAGMA table_info(packs)").all() as any[];
    const hasShareCode = tableInfo.some(c => c.name === 'share_code');

    if (!hasShareCode) {
        console.log("📝 Adding 'share_code' column...");
        // SQLite limitation: cannot ADD COLUMN ... UNIQUE directly if table has data (or just simpler to do index sep)
        db.query("ALTER TABLE packs ADD COLUMN share_code TEXT").run();

        // Create unique index to enforce constraint
        db.query("CREATE UNIQUE INDEX IF NOT EXISTS idx_packs_share_code ON packs(share_code)").run();
        console.log("✅ Column and Index added.");
    } else {
        console.log("ℹ️ 'share_code' column already exists.");
    }
} catch (e) {
    console.error("❌ Failed to alter table:", e);
}

// 2. Backfill existing packs
try {
    const packs = db.query("SELECT id, name FROM packs WHERE share_code IS NULL").all() as { id: string, name: string }[];

    if (packs.length > 0) {
        console.log(`🔄 Backfilling codes for ${packs.length} packs...`);
        const update = db.prepare("UPDATE packs SET share_code = $code WHERE id = $id");

        for (const pack of packs) {
            // Generate simple 6-char alphanumeric code
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            update.run({ $id: pack.id, $code: code });
            console.log(`   > Assigned ${code} to "${pack.name}"`);
        }
        console.log("✅ Backfill complete.");
    } else {
        console.log("✨ All packs have share codes.");
    }

} catch (e) {
    console.error("❌ Backfill failed:", e);
}
