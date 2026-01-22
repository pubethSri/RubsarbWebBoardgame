import { db, initDB } from "./index";


export async function seedUsers() {
    // Legacy Seeding Disabled for OIDC Migration
    // We can't seed users without knowing their Authentik Subject ID (sub).
    // Admin/Creator roles will be assigned via Authentik Groups (ito-admin, ito-creator).
    // This file remains as a placeholder if we need to seed specific OIDC IDs later.

    console.log("ℹ️  User Seeding Skipped (OIDC Mode Enabled)");
    return;
}
