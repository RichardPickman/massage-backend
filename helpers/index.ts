const sharp = require("sharp");
import * as fs from "fs";
import * as crypto from "crypto";

export const getFormattedBuffer = async (
  path: string,
  width = 1920,
  height = 1080,
  fit = "contain"
) =>
  sharp(fs.readFileSync(path)).resize({ height, width, fit: fit }).toBuffer();

export const getRandomName = (bytes = 16) =>
  crypto.randomBytes(bytes).toString("hex");
