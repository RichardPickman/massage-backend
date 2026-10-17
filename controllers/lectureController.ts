import type { Response } from "express";
import { getBucketConfig } from "../config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getFormattedBuffer, getRandomName } from "../helpers";

import LectureResolver from "../services/Lecture";
import type { AuthedRequest } from "../middleware/Token";

const { accesskey, secretkey, region, bucketname } = getBucketConfig();

const s3 = new S3Client({
  credentials: {
    accessKeyId: accesskey,
    secretAccessKey: secretkey,
  },
  region: region,
});

interface LectureDocument {
  _id: unknown;
  topic?: string;
  teacher?: string[];
  lesson?: string[];
  date?: string;
  images?: string[];
  author?: unknown;
  toObject?: () => Record<string, unknown>;
}

const isOwner = (author: unknown, req: AuthedRequest) =>
  Boolean(req.user) &&
  (req.user.role === "admin" || String(author ?? "") === req.user.id);

const getImageUrl = async (key: string) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: bucketname, Key: key }), {
    expiresIn: 3600,
  });

const uploadImage = async (file: Express.Multer.File) => {
  const buffer = await getFormattedBuffer(file.path);
  const imageName = getRandomName();

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketname,
      Key: imageName,
      Body: buffer,
      ContentType: file.mimetype,
    })
  );

  return imageName;
};

const removeImage = async (key: string) => {
  try {
    await s3.send(
      new DeleteObjectCommand({ Bucket: bucketname, Key: key })
    );
  } catch (e) {
    // A missing object must not keep the lecture record alive.
    console.log("Lecture image delete failed:", key, e);
  }
};

class LectureController {
  async create(req: AuthedRequest, res: Response) {
    const { topic } = req.body;
    const files = Array.isArray(req.files) ? req.files : [];

    if (!topic) {
      return res.status(400).json({ message: "Incorrect inputs" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Not authorised" });
    }

    const imagesNames = [];

    for (const file of files) {
      try {
        imagesNames.push(await uploadImage(file));
      } catch (e) {
        console.log("Lecture image upload failed:", e);

        return res.status(502).json({ message: "Image upload failed" });
      }
    }

    const result = await LectureResolver.create({
      topic,
      teacher: req.body.teacher,
      lesson: req.body.lesson,
      date: req.body.date,
      images: imagesNames,
      author: req.user.id,
    });

    res.json({ message: "Item created successfully", payload: result });

    return;
  }

  async update(req: AuthedRequest, res: Response) {
    const { id } = req.params;

    const existing = (await LectureResolver.find(id)) as LectureDocument | null;

    if (!existing) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    if (!isOwner(existing.author, req)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const addedImages = [];

    for (const file of files) {
      try {
        addedImages.push(await uploadImage(file));
      } catch (e) {
        console.log("Lecture image upload failed:", e);

        return res.status(502).json({ message: "Image upload failed" });
      }
    }

    const images = [...(existing.images ?? []), ...addedImages];
    const result = await LectureResolver.update(id, {
      topic: req.body.topic,
      teacher: req.body.teacher,
      lesson: req.body.lesson,
      date: req.body.date,
      ...(addedImages.length ? { images } : {}),
    });

    res.json({ message: "Lecture updated successfully", payload: result });

    return;
  }

  async get(req: AuthedRequest, res: Response) {
    const { id } = req.params;

    const lecture = (await LectureResolver.find(id)) as LectureDocument | null;

    if (!lecture) {
      return res.status(404).json({ message: "Not found", code: 404 });
    }

    const images = await Promise.all(
      (lecture.images ?? []).map((image) => getImageUrl(image))
    );

    const fields = lecture.toObject ? lecture.toObject() : { ...lecture };

    res.json({ message: "successful", payload: { ...fields, images } });

    return;
  }

  async getAll(req: AuthedRequest, res: Response) {
    const getItems = await LectureResolver.findAll();

    res.json({ message: "return lectures", payload: getItems });

    return;
  }

  async remove(req: AuthedRequest, res: Response) {
    const id = req.params.id;

    const existing = (await LectureResolver.find(id)) as LectureDocument | null;

    if (!existing) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    if (!isOwner(existing.author, req)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await Promise.all((existing.images ?? []).map((image) => removeImage(image)));

    const removeLecture = await LectureResolver.delete(id);

    res.json({ message: "Removed successfully", payload: removeLecture });

    return;
  }
}

export default LectureController;
