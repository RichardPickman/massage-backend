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

type MailConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
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

export const getMailConfig = (): MailConfig => ({
  host: process.env.SMTP_HOST as string,
  port: Number(process.env.SMTP_PORT),
  user: process.env.SMTP_USER as string,
  password: process.env.SMTP_PASSWORD as string,
});

export const getBucketConfig = (): BucketConfig => ({
  accesskey: process.env.BUCKET_ACCESS_KEY as string,
  secretkey: process.env.BUCKET_SECRET_KEY as string,
  region: process.env.BUCKET_REGION as string,
  bucketname: process.env.BUCKET_NAME as string,
});
