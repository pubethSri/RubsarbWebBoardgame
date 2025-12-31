import { db } from "./index";
import { parse } from "yaml";
import { join } from "path";

export async function migrate() {
    // Check if database is already populated
    const check = db.query("SELECT count(*) as count FROM packs").get() as { count: number };
    if (check.count > 0) {
        console.log("Database already populated. Skipping migration.");
        return;
    }

    console.log("Starting migration from topics.yaml...");

    try {
        const yamlPath = join(import.meta.dir, "../topics.yaml");
        const file = Bun.file(yamlPath);
        const content = await file.text();
        const data = parse(content) as { packs: any[] };

        const insertPack = db.prepare(`
            INSERT INTO packs (id, name, author, is_official)
            VALUES ($id, $name, $author, $is_official)
        `);

        const insertTopic = db.prepare(`
            INSERT INTO topics (id, pack_id, topic, type, min_label, max_label)
            VALUES ($id, $pack_id, $topic, $type, $min_label, $max_label)
        `);

        const transaction = db.transaction(() => {
            for (const pack of data.packs) {
                insertPack.run({
                    $id: pack.id || crypto.randomUUID(),
                    $name: pack.name,
                    $author: "System",
                    $is_official: 1
                });

                for (const topic of pack.topics) {
                    insertTopic.run({
                        $id: crypto.randomUUID(),
                        $pack_id: pack.id || "starter_pack",
                        $topic: topic.text,
                        $type: "NORMAL",
                        $min_label: topic.min_label,
                        $max_label: topic.max_label
                    });
                }
            }
        });

        transaction();
        console.log(`Migration complete: Imported ${data.packs.length} packs.`);

    } catch (error) {
        console.error("Migration failed:", error);
    }
}
