import { Request, Response } from "express";

import QuestionResolver from "../services/Question";
import ImagesController from "./imagesController";

class QuestionController {
  async create(req: Request, res: Response, next: any) {
    const body = req.body;
    let img = null;

    if (req.file) {
      img = await ImagesController.create(req.file);
    }

    const parseAnswers = body.answers.map((item: string) => JSON.parse(item));

    const result = await QuestionResolver.create({
      ...body,
      answers: parseAnswers,
      img: img ? (img.fieldname as string) : null,
    });

    res.json({ message: "Item created successfully", payload: result });
  }

  async get(req: Request, res: Response, next: any) {
    const { id } = req.params;

    const question = await QuestionResolver.find(id);

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    if (!question.img) {
      return res.json({
        message: "Nothing to report",
        payload: { ...question },
      });
    }

    const getUrl = await ImagesController.getUrl(question.img);

    res.json({
      message: "Nothing to report",
      payload: { ...question, img: getUrl },
    });
  }

  async update(req: Request, res: Response, next: any) {
    const question = await QuestionResolver.find(req.params.id);

    if (!question) {
      res.status(404).send({ message: "Item not found" });

      return;
    }

    // IMAGE POSTED, REMOVE PREVIOUS IMAGE IF EXIST, RETURN UPDATED DATA WITH IMAGE URL;
    if (req.file) {
      const hasImage = !!question.img;

      if (hasImage) {
        await ImagesController.remove(question?.img as string);
      }

      const createImage = await ImagesController.create(req.file);

      if (!createImage) {
        res.json({
          message: "Error occured",
        });

        return;
      }

      const result = await QuestionResolver.update({
        ...req.body,
        _id: req.params.id,
        img: createImage.fieldname,
      });

      res.json({
        message: "Item updated successfully",
        payload: result,
      });

      return;
    }

    const result = await QuestionResolver.update({
      ...req.body,
      _id: req.params.id,
    });

    return res.json({
      message: "Item updated successfully",
      payload: result,
    });
  }

  async remove(req: Request, res: Response, next: any) {
    const removeQuestion = await QuestionResolver.delete(req.params.id);

    res.json({ message: "Removed successfully", payload: removeQuestion });
  }
}

export default QuestionController;
