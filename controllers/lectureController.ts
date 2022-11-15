import { Request, Response } from "express";
import { getBucketConfig } from "../config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getFormattedBuffer, getRandomName } from "../helpers";

import LectureResolver from "../services/Lecture";
import ApiError from "../Error";

const { accesskey, secretkey, region, bucketname } = getBucketConfig();

const s3 = new S3Client({
  credentials: {
    accessKeyId: accesskey,
    secretAccessKey: secretkey,
  },
  region: region,
});

class LectureController {
  async create(req: Request, res: Response, next: any) {
    const { topic } = req.body;
    const files = Object(req.files);
    const imagesNames = [];

    if (!topic) {
      res.json({ message: "Incorrect inputs" });
    }

    for (let file of files) {
      const buffer = await getFormattedBuffer(file.path);

      const imageName = getRandomName();

      imagesNames.push(imageName);

      const params = {
        Bucket: bucketname,
        Key: imageName,
        Body: buffer,
        ContentType: file.mimetype,
      };

      const command = new PutObjectCommand(params);

      s3.send(command);
    }

    const result = await LectureResolver.create({
      ...req.body,
      images: imagesNames,
    });

    res.json({ message: "Item created successfully", payload: result });

    return;
  }

  async get(req: Request, res: Response, next: any) {
    const { id } = req.params;

    const lecture = await LectureResolver.find(id);

    if (lecture) {
      const images = [];

      for (let img of lecture.images) {
        const getObjectParams = {
          Bucket: bucketname,
          Key: img,
        };

        const command = new GetObjectCommand(getObjectParams);

        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        images.push(url);
      }

      res.json({ message: "successful", payload: { images } });

      return;
    }

    res.json({ message: "Not found", code: 404 });
  }

  async getAll(req: Request, res: Response, next: any) {
    const getItems = await LectureResolver.findAll();

    res.json({ message: "return quizes", payload: getItems });
  }

  async remove(req: Request, res: Response, next: any) {
    const removeQuiz = await LectureResolver.delete(req.body.id);

    res.json({ message: "Removed successfully", payload: removeQuiz });
  }
}

export default LectureController;
