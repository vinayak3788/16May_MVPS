import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import AWS from "aws-sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const BUCKET_FOLDER = process.env.AWS_BUCKET_FOLDER || "";

export async function uploadFileToS3(buffer, originalFileName, orderNumber) {
  if (!BUCKET_NAME) {
    throw new Error("❌ AWS_S3_BUCKET_NAME is missing in environment");
  }
  const ext = originalFileName.split(".").pop();
  const base = originalFileName.replace(/\.[^/.]+$/, "");
  const cleanFileName = `${orderNumber}_${base}.${ext}`;
  const Key = BUCKET_FOLDER
    ? `${BUCKET_FOLDER}/${cleanFileName}`
    : cleanFileName;

  await s3
    .upload({
      Bucket: BUCKET_NAME,
      Key,
      Body: buffer,
      ContentType: "application/pdf",
    })
    .promise();

  const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;
  console.log(`✅ File uploaded to S3: ${s3Url}`);
  return { cleanFileName, s3Url };
}

// ——— Make sure this is actually exported! ———
export async function getSignedUrl(fileName) {
  if (!BUCKET_NAME) {
    throw new Error("❌ AWS_S3_BUCKET_NAME is missing in environment");
  }
  const Key = `${BUCKET_FOLDER}/${fileName}`;
  return s3.getSignedUrlPromise("getObject", {
    Bucket: BUCKET_NAME,
    Key,
    Expires: 60,
  });
}
