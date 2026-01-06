import { db } from './db';

export interface TopicDef {
    id?: string;
    topic: string;
    min_label: string;
    max_label: string;
}

export class TopicManager {
    constructor() {
        this.logStats();
    }

    private logStats() {
        try {
            const count = db.query("SELECT count(*) as count FROM topics").get() as { count: number };
            console.log(`📚 TopicManager ready. Serving ${count.count} topics from SQLite.`);
        } catch (e) {
            console.warn("⚠️ TopicManager: DB not ready or empty (This is normal during first boot/migration)");
        }
    }

    getRandomTopic(packId: string = "starter_pack", excludeIds: string[] = []): TopicDef | null {
        try {
            let query = "SELECT id, topic, min_label, max_label FROM topics WHERE pack_id = $packId";
            const params: any = { $packId: packId };

            if (excludeIds.length > 0) {
                // Dynamic placeholders for IN clause
                const placeholders = excludeIds.map((_, i) => `$ex${i}`).join(", ");
                query += ` AND id NOT IN (${placeholders})`;

                // Bind values
                excludeIds.forEach((id, i) => {
                    params[`$ex${i}`] = id;
                });
            }

            query += " ORDER BY RANDOM() LIMIT 1";

            const topic = db.query(query).get(params) as TopicDef | null;

            if (!topic) {
                // If we have exclusions and found nothing, it implies we exhausted the pack.
                // Return null to signal reset.
                if (excludeIds.length > 0) return null;

                return { topic: "No topics found", min_label: "Error", max_label: "Error" };
            }

            return {
                id: topic.id,
                topic: topic.topic,
                min_label: topic.min_label || "Min",
                max_label: topic.max_label || "Max"
            };
        } catch (e) {
            console.error("DB Error in getRandomTopic:", e);
            return { topic: "Database Error", min_label: "Error", max_label: "Error" };
        }
    }
}
