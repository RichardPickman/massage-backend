import { config } from "dotenv";

type ServerConfig = {
  port: string;
  host: string;
};

type dbConfig = {
  username: string;
  password: string;
  hostname: string;
  database: string;
};

type BucketConfig = {
  accesskey: string;
  secretkey: string;
  region: string;
  bucketname: string;
};

type InviteConfig = {
  secret: string;
  adminEmails: string;
};

config();

export const getConfig = (): dbConfig => ({
  username: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  hostname: process.env.DB_HOST as string,
  database: process.env.DB as string,
});

export const getServerConfig = (): ServerConfig => ({
  port: process.env.PORT as string,
  host: process.env.HOST as string,
});

export const getBucketConfig = (): BucketConfig => ({
  accesskey: process.env.BUCKET_ACCESS_KEY as string,
  secretkey: process.env.BUCKET_SECRET_KEY as string,
  region: process.env.BUCKET_REGION as string,
  bucketname: process.env.BUCKET_NAME as string,
});

export const getInviteConfig = (): InviteConfig => ({
  secret: (process.env.INVITE_SECRET as string) || "",
  adminEmails: (process.env.ADMIN_EMAILS as string) || "",
});

// The variables without which the app cannot do its job. INVITE_SECRET and
// ADMIN_EMAILS are deliberately absent: leaving them unset closes registration
// to everyone but the bootstrap addresses, which is a valid deployment rather
// than a mistake.
const requiredKeys = [
  "DB_USER",
  "DB_PASSWORD",
  "DB_HOST",
  "DB",
  "PORT",
  "SECRET_KEY",
] as const;

// Pure, so it can be tested against fabricated environments: a spec that reads
// the real one would pass or fail depending on who runs it.
export const getMissingConfig = (env: NodeJS.ProcessEnv) =>
  requiredKeys.filter((key) => !String(env[key] ?? "").trim());

type ThrottleConfig = {
  limit: number;
  windowMs: number;
};

// Defaults are safe with nothing configured: a person who mistypes a password
// twice is never refused, and an unset environment variable never means "no
// limit".
export const getThrottleConfig = (): ThrottleConfig => ({
  limit: Number(process.env.AUTH_ATTEMPT_LIMIT) || 10,
  windowMs: Number(process.env.AUTH_ATTEMPT_WINDOW_MS) || 15 * 60 * 1000,
});
