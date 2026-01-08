
import { db, initDB } from "./index";
import { database } from "bun:sqlite";

async function debugUser() {
    initDB();
    const adminPass = process.env.ADMIN_PASSWORD || "R,9x741uuHsV+Z";
    console.log("Checking password for:", adminPass);

    const user = db.query("SELECT * FROM users WHERE username = 'admin'").get() as any;
    if (!user) {
        console.error("❌ User 'admin' NOT FOUND in DB!");
        return;
    }

    console.log("✅ User found:", user.username);
    console.log("Stored Hash:", user.password);

    const isValid = await Bun.password.verify(adminPass, user.password);
    console.log(`Verify Result: ${isValid ? "✅ MATCH" : "❌ MISMATCH"}`);

    if (!isValid) {
        // Try re-hashing
        const newHash = await Bun.password.hash(adminPass);
        console.log("New Hash would be:", newHash);
        console.log("Difference:", newHash === user.password ? "SAME" : "DIFFERENT");
    }
}

debugUser();
