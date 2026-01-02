
import { db } from "../src/server/db/client";

import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
}

const sql = postgres(connectionString);

async function main() {
    console.log("Inspecting accounts table...");
    try {
        const accounts = await sql`SELECT * FROM web_account`;
        console.log("Accounts found:", accounts.length);
        console.log(JSON.stringify(accounts, null, 2));

        const users = await sql`SELECT * FROM web_user`;
        console.log("Users found:", users.length);
        console.log(JSON.stringify(users, null, 2));
    } catch (error) {
        console.error("Error inspecting DB:", error);
    } finally {
        await sql.end();
    }
}

main();
