import { db } from './db';

export interface TopicDef {
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

    getRandomTopic(packId: string = "starter_pack"): TopicDef {
        try {
            const topic = db.query(`
                SELECT topic, min_label, max_label
                FROM topics
                WHERE pack_id = $packId
                ORDER BY RANDOM()
                LIMIT 1
            `).get({ $packId: packId }) as TopicDef | null;

            if (!topic) {
                return { topic: "No topics found", min_label: "Error", max_label: "Error" };
            }

            // Handle potentially null labels if DB schema allows it (though we inserted strings)
            return {
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
