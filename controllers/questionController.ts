import { Request, Response } from "express";

import QuestionResolver from "../services/Question";
import ImagesController from "./imagesController";

const ImageController = new ImagesController();

class QuestionController {
  async create(req: Request, res: Response, next: any) {
    let img = null;

    if (req.file) {
      img = await ImageController.create(req.file);
    }

    const result = await QuestionResolver.create({
      ...req.body,
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

    const getUrl = await ImageController.getUrl(question.img);

    res.json({
      message: "Nothing to report",
      payload: getUrl,
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
        await ImageController.remove(question?.img as string);
      }

      const createImage = await ImageController.create(req.file);

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

    // // IMAGE DOESN'T EXIST, RETURN UPDATED DATA;
    // if (!question.img) {
    //   const result = await QuestionResolver.update({
    //     ...req.body,
    //     _id: req.params.id,
    //   });

    //   return res.json({
    //     message: "Item updated successfully",
    //     payload: result,
    //   });
    // }

    // // IMAGE NOT POSTED AND IMAGE EXIST, RETURN UPDATED DATA WTIH IMAGE URL;
    // if (question.img) {
    //   const getUrl = await ImageController.getUrl(question.img as string);

    //   return res.json({
    //     message: "Nothing to report",
    //     payload: { ...question, img: getUrl },
    //   });
    // }
  }

  async remove(req: Request, res: Response, next: any) {
    const removeQuestion = await QuestionResolver.delete(req.params.id);

    res.json({ message: "Removed successfully", payload: removeQuestion });
  }
}

export default QuestionController;
