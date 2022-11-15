import sharp from "sharp";
import fs from "fs";
import crypto from "crypto";

export const getFormattedBuffer = async (path: string) =>
  sharp(fs.readFileSync(path))
    .resize({ height: 1080, width: 1920, fit: "contain" })
    .toBuffer();

export const getRandomName = (bytes = 16) =>
  crypto.randomBytes(bytes).toString("hex");
