import { db } from "../src/server/db/client";
import { siteSubdomains } from "../src/server/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log(`Listing all subdomains...`);

    const records = await db.query.siteSubdomains.findMany({
        with: {
            site: true,
        }
    });

    if (records.length === 0) {
        console.log("❌ No subdomains found in database.");
        return;
    }

    console.log(`✅ Found ${records.length} Subdomains!`);
    console.log("--------------------------------");
    for (const record of records) {
        console.log(`Subdomain:  ${record.subdomain}`);
        console.log(`Site Name:  ${record.site.name}`);
        console.log(`Repo:       ${record.site.repository}`);
        console.log(`Created By: ${record.site.userId}`);
        console.log("--------------------------------");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
