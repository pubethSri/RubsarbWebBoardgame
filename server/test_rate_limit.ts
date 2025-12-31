const BASE_URL = "http://localhost:3000";

async function createPack(i: number) {
    const res = await fetch(`${BASE_URL}/api/packs`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-creator-password": process.env.CREATOR_PASSWORD || '8nS4"0F;'
        },
        body: JSON.stringify({
            name: `Test Pack ${i}`,
            author: "Tester",
            topics: [
                { text: "T1", type: "NORMAL" },
                { text: "T2", type: "NORMAL" },
                { text: "T3", type: "NORMAL" },
                { text: "T4", type: "NORMAL" },
                { text: "T5", type: "NORMAL" },
            ]
        })
    });
    console.log(`Request ${i}: Status ${res.status}`);
}

// Flood
for (let i = 1; i <= 6; i++) {
    createPack(i);
}
