import { getBucketConfig } from "../config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getFormattedBuffer, getRandomName } from "../helpers";

import ImageResolver from "../services/Images";

const { accesskey, secretkey, region, bucketname } = getBucketConfig();

const s3 = new S3Client({
  credentials: {
    accessKeyId: accesskey,
    secretAccessKey: secretkey,
  },
  region: region,
});

class ImagesController {
  async create(file: Express.Multer.File) {
    const imageName = getRandomName();
    const result = await ImageResolver.create({ fieldname: imageName });

    if (result) {
      const buffer = await getFormattedBuffer(file.path, 1280, 720);

      const params = {
        Bucket: bucketname,
        Key: imageName,
        Body: buffer,
        ContentType: file.mimetype,
      };

      const command = new PutObjectCommand(params);

      s3.send(command);

      return result;
    }
  }

  async find(fieldname: string) {
    const result = await ImageResolver.find(fieldname);

    return result;
  }

  async getUrl(fieldname: string) {
    const getImage = await ImageResolver.find(fieldname);

    if (getImage) {
      const getObjectParams = {
        Bucket: bucketname,
        Key: getImage.fieldname,
      };

      const command = new GetObjectCommand(getObjectParams);

      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

      return url;
    }

    return "";
  }

  async remove(fieldname: string) {
    const image = await this.find(fieldname);

    await ImageResolver.delete(image?.fieldname as string);

    const getObjectParams = {
      Bucket: bucketname,
      Key: image?.fieldname as string,
    };

    new DeleteObjectCommand(getObjectParams);

    return;
  }
}

export default ImagesController;
