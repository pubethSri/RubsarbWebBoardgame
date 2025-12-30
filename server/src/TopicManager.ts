import { parse } from 'yaml';
import { join } from 'path';
import { readFileSync } from 'fs';

export interface TopicDef {
    text: string;
    min_label: string;
    max_label: string;
}

export interface TopicPack {
    id: string;
    name: string;
    description: string;
    topics: TopicDef[];
}

export interface YamlSchema {
    packs: TopicPack[];
}

export class TopicManager {
    private topics: TopicDef[] = [];

    constructor() {
        this.loadTopics();
    }

    private loadTopics() {
        try {
            // Adjust path: assume running from server root or src?
            // Usually server/src/topics.yaml.
            // If running with bun src/index.ts, cwd is server root.
            const path = join(process.cwd(), 'src', 'topics.yaml');
            const file = readFileSync(path, 'utf8');
            const data = parse(file) as YamlSchema;

            // Flatten all topics from all packs (for now)
            // Or just use "starter_pack" / "The Essentials"
            const starterPack = data.packs.find(p => p.id === 'starter_pack');
            if (starterPack) {
                this.topics = starterPack.topics;
            } else {
                // Fallback: all topics
                this.topics = data.packs.flatMap(p => p.topics);
            }

            console.log(`📚 Loaded ${this.topics.length} topics.`);
        } catch (e) {
            console.error("Failed to load topics.yaml:", e);
            // Fallback topic
            this.topics = [{
                text: "Failed to load topics",
                min_label: "Error",
                max_label: "Error"
            }];
        }
    }

    getRandomTopic(): TopicDef {
        if (this.topics.length === 0) {
            return { text: "No Topics Available", min_label: "?", max_label: "?" };
        }
        const index = Math.floor(Math.random() * this.topics.length);
        return this.topics[index]!;
    }
}

