import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getBucketConfig } from "../config";

// The config module loads .env, so the bucket settings are safe to read once
// at import time.
const { accesskey, secretkey, region, bucketname } = getBucketConfig();

const s3 = new S3Client({
  credentials: {
    accessKeyId: accesskey,
    secretAccessKey: secretkey,
  },
  region: region,
});

const getImageUrl = async (key: string) => {
  // The bucket is private, so an object URL answers 403. Exchange the stored
  // key for a short-lived signed URL instead. Legacy records that already hold
  // a URL are passed through untouched.
  if (/^https?:\/\//i.test(key)) {
    return key;
  }

  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucketname, Key: key }),
    { expiresIn: 3600 }
  );
};

// Replaces question image keys with viewable URLs. Questions without an image
// get null, which is what the client already expects.
export const replaceNameToLink = async (items: unknown) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return Promise.all(
    items.map(async (item) => {
      const record = (item ?? {}) as Record<string, unknown>;
      const key = typeof record.img === "string" ? record.img : "";

      return { ...record, img: key ? await getImageUrl(key) : null };
    })
  );
};

