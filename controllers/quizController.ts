import { Request, Response } from "express";
import { getBucketConfig } from "../config";
import { S3Client } from "@aws-sdk/client-s3";

import QuizResolver from "../services/Quiz";
import ApiError from "../Error";

const { accesskey, secretkey, region } = getBucketConfig();

const s3 = new S3Client({
  credentials: {
    accessKeyId: accesskey,
    secretAccessKey: secretkey,
  },
  region: region,
});

class QuizController {
  async create(req: Request, res: Response, next: any) {
    const { questions, title } = req.body;

    console.log(req.body);
    console.log(req.files);

    // res.json({ message: "Item created successfully" });

    if (!questions || !title) {
      next(ApiError.internal("Incorrect input"));
    }

    const quiz = await QuizResolver.create({ ...req.body });

    res.json({ message: "Item created successfully", payload: quiz });

    return;
  }

  async update(req: Request, res: Response, next: any) {
    const quiz = await QuizResolver.find({ ...req.body });

    res.json({ message: "return item", payload: quiz });
  }

  async get(req: Request, res: Response, next: any) {
    const { id } = req.body;

    const quiz = await QuizResolver.find(id);

    res.json({ message: "return item", payload: quiz });
  }

  async getAll(req: Request, res: Response, next: any) {
    const getItems = await QuizResolver.findAll();

    res.json({ message: "return quizes", payload: getItems });
  }

  async remove(req: Request, res: Response, next: any) {
    const removeQuiz = await QuizResolver.delete(req.body.id);

    res.json({ message: "Removed successfully", payload: removeQuiz });
  }
}

export default QuizController;
