
import "dotenv/config";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const S3_BUCKET = process.env.BUILD_BUCKET || "";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

console.log("Config:", {
    S3_BUCKET,
    AWS_REGION,
    ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID?.slice(0, 5) + "...",
});

const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    } : undefined,
});

async function main() {
    const key = "6ec39aac2a310508d473581883b1a75bdd94987c/index.html";
    console.log(`Fetching ${key} from ${S3_BUCKET}...`);

    try {
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
        });

        const response = await s3Client.send(command);
        console.log("Response Status:", response.$metadata.httpStatusCode);
        console.log("Content Type:", response.ContentType);

        if (response.Body) {
            console.log("✅ Body present");
        }
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();
