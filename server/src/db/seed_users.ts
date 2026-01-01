import { db, initDB } from "./index";
import { database } from "bun:sqlite";

async function seedUsers() {
    initDB(); // Ensure tables exist
    const adminPass = process.env.ADMIN_PASSWORD;
    const creatorPass = process.env.CREATOR_PASSWORD;

    if (!adminPass || !creatorPass) {
        console.error("❌ Missing ADMIN_PASSWORD or CREATOR_PASSWORD in .env");
        process.exit(1);
    }

    const hashPassword = async (pwd: string) => await Bun.password.hash(pwd);

    const insertUser = db.prepare(`
        INSERT INTO users (id, username, password, role)
        VALUES ($id, $username, $password, $role)
        ON CONFLICT(username) DO UPDATE SET password = $password
    `);

    try {
        const adminHash = await hashPassword(adminPass);
        insertUser.run({
            $id: crypto.randomUUID(),
            $username: "admin",
            $password: adminHash,
            $role: "ADMIN"
        });
        console.log("✅ User 'admin' seeded.");

        const creatorHash = await hashPassword(creatorPass);
        insertUser.run({
            $id: crypto.randomUUID(),
            $username: "creator",
            $password: creatorHash,
            $role: "CREATOR"
        });
        console.log("✅ User 'creator' seeded.");

    } catch (error) {
        console.error("❌ Failed to seed users:", error);
    }
}

seedUsers();
