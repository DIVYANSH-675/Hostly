
import { Redis } from "ioredis";

// Force load env from apps/web/.env if needed or assume process.env is populated
const REDIS_URL = process.env.REDIS_URL || "rediss://default:ASsuAAIncDFkNmU5MjYwNDZhMTU0OGRiODM5NmYwZjE4MDAyMWJjM3AxMTEwNTQ@concise-chimp-11054.upstash.io:6379";

const redis = new Redis(REDIS_URL);
const SUBDOMAIN = "first-7f25f93";

async function main() {
    console.log(`Checking Redis for subdomain: ${SUBDOMAIN}`);
    const sha = await redis.get(`sha:${SUBDOMAIN}`);

    if (sha) {
        console.log(`✅ SHA found: ${sha}`);
    } else {
        console.log("❌ SHA not found in Redis.");
    }

    redis.disconnect();
}

main();
