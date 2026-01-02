import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { lookup } from "mime-types";
import { Redis } from "ioredis";
import type { StatusCode } from "hono/utils/http-status";
import { compress } from "hono/compress";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { LRUCache } from "lru-cache";

const REDIS_URL = process.env.REDIS_URL || "";
const S3_BUCKET = process.env.BUILD_BUCKET || "";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

// Initialize S3 client
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

const client = new Redis(REDIS_URL);
const app = new Hono();
app.use(compress());

// Cache interface
interface CacheEntry {
  value: string | null;
  timestamp: number;
}

const shaCache = new Map<string, CacheEntry>();
const CACHE_TTL = 3000; // 3 seconds in milliseconds

async function getSha(subdomain: string): Promise<string | null> {
  const now = Date.now();
  const cached = shaCache.get(subdomain);

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  const sha = await client.get(`sha:${subdomain}`);
  // Cache both successful and unsuccessful results
  shaCache.set(subdomain, { value: sha || null, timestamp: now });

  return sha;
}

const fileCache = new LRUCache<string, { data: Buffer; contentType: string }>({
  maxSize: 50 * 1024 * 1024, // 50MB max cache size
  sizeCalculation: (value) => {
    return value.data.byteLength;
  },
  ttl: 1000 * 60 * 5, // 5 minutes TTL
});

// Helper function to get file from S3
async function getFileFromS3(sha: string, path: string): Promise<{ data: Buffer; contentType: string } | null> {
  const key = `${sha}/${path}`;

  // Check cache first
  const cached = fileCache.get(key);
  if (cached) {
    // console.log(`[CACHE] Hit: ${key}`);
    return cached;
  }

  try {
    console.log(`[DEBUG] Fetching from S3. Bucket: ${S3_BUCKET}, Key: ${key}`);
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      console.log(`[DEBUG] No body in S3 response for key: ${key}`);
      return null;
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks);

    const contentType = response.ContentType || lookup(path) || "application/octet-stream";

    const result = { data, contentType };

    // Store in cache
    fileCache.set(key, result);
    // console.log(`[CACHE] Miss: ${key} (Cached ${data.byteLength} bytes)`);

    return result;
  } catch (error: any) {
    if (error.name === "NoSuchKey") {
      return null;
    }
    console.error(`Error fetching from S3: ${key}`, error);
    return null;
  }
}

app.use("*", async (c, next) => {
  const host = c.req.header("host");
  let subdomain = host?.split(".")[0];

  if (!subdomain) {
    return c.text("Invalid subdomain", 404);
  }

  const sha = await getSha(subdomain);

  console.log(`[ROUTER] Host: ${host}, Subdomain: ${subdomain}, SHA: ${sha}`);

  if (!sha) {
    console.log(`[ROUTER] No SHA found for subdomain: ${subdomain}`);
    return c.text("Not found", 404);
  }

  // Get the path or default to index.html
  const path = c.req.path === "/" ? "index.html" : c.req.path.slice(1);

  // Serve static files from S3
  const file = await getFileFromS3(sha, path);

  if (!file) {
    // Try index.html for SPA routing
    if (!path.includes(".")) {
      const indexFile = await getFileFromS3(sha, "index.html");
      if (indexFile) {
        c.header("Content-Type", indexFile.contentType);
        return c.body(indexFile.data as any);
      }
    }
    return c.text("File not found", 404);
  }

  c.header("Content-Type", file.contentType);
  return c.body(file.data as any);
});

serve(
  {
    fetch: app.fetch,
    port: 8080,
  },
  (info) => {
    console.log(`Server is running on http://${info.address}:${info.port}`);
  }
);

export default app;
