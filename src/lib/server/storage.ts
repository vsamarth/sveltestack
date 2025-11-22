import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

const s3Client = new S3Client({
  endpoint: env.STORAGE_ENDPOINT,
  region: env.STORAGE_REGION,
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY,
    secretAccessKey: env.STORAGE_SECRET_KEY,
  },
});

export async function initBucket() {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: env.STORAGE_BUCKET }));
    console.log(`Bucket '${env.STORAGE_BUCKET}' already exists`);
  } catch (_error) {
    // Bucket doesn't exist, create it
    try {
      await s3Client.send(
        new CreateBucketCommand({ Bucket: env.STORAGE_BUCKET }),
      );
      console.log(`Created bucket '${env.STORAGE_BUCKET}'`);
    } catch (createError) {
      console.error("Failed to create bucket:", createError);
      throw createError;
    }
  }
}

export async function getPresignedUploadUrl(
  key: string,
  contentType?: string,
  expiresIn = 3600,
) {
  const command = new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}
