import { Request, Response } from "express";
import { getBucketConfig } from "../config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getFormattedBuffer, getRandomName } from "../helpers";

import ImageResolver from "../services/Images";
import ApiError from "../Error";
import { Image } from "../types";

const { accesskey, secretkey, region, bucketname } = getBucketConfig();

const s3 = new S3Client({
  credentials: {
    accessKeyId: accesskey,
    secretAccessKey: secretkey,
  },
  region: region,
});

class ImagesController {
  async create(req: Request, res: Response, next: any) {
    const file = req.file as Image;
    const buffer = await getFormattedBuffer(file.path);

    const imageName = getRandomName();

    const params = {
      Bucket: bucketname,
      Key: imageName,
      Body: buffer,
      ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);

    s3.send(command);

    const result = await ImageResolver.create({ fieldname: file.fieldname });

    return result;
  }

  async get(req: Request, res: Response, next: any) {
    const { id } = req.params;

    const image = await ImageResolver.find(id);

    if (image) {
      const getObjectParams = {
        Bucket: bucketname,
        Key: image.fieldname,
      };

      const command = new GetObjectCommand(getObjectParams);

      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

      return url;
    }

    return;
  }

  async remove(req: Request, res: Response, next: any) {
    const removeQuiz = await ImageResolver.delete(req.body.id);

    return;
  }
}

export default ImagesController;
