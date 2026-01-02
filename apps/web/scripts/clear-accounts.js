import { db } from "../src/server/db/client";

import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
}

const sql = postgres(connectionString);

async function main() {
    console.log("Clearing accounts table...");
    try {
        await sql`DELETE FROM web_user`;
        console.log("Users (and linked Accounts/Sessions) cleared successfully.");
        console.log("Accounts cleared successfully.");
    } catch (error) {
        console.error("Error clearing accounts:", error);
    } finally {
        await sql.end();
    }
}

main();
