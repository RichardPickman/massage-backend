import { Request, Response } from "express";
import { replaceNameToLink } from "./helpers";

import QuizResolver from "../services/Quiz";
import ApiError from "../Error";

class QuizController {
  async create(req: Request, res: Response, next: any) {
    const { questions, title } = req.body;

    if (!questions || !title) {
      return next(ApiError.internal("Incorrect input"));
    }

    const quiz = await QuizResolver.create({ ...req.body });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz create failed" });
    }

    const questionsWithUrls = replaceNameToLink(quiz?.questions);

    res.json({
      message: "Item created successfully",
      payload: { ...quiz, questions: questionsWithUrls },
    });

    return;
  }

  async update(req: Request, res: Response, next: any) {
    const { id, ...body } = req.body;
    const quiz = await QuizResolver.update(id, body);

    res.json({ message: "return item", payload: quiz });
  }

  async get(req: Request, res: Response, next: any) {
    const id = req.params.id;

    const quiz = await QuizResolver.find(id);

    const questionsWithUrls = replaceNameToLink(quiz?.questions);

    res.json({
      message: "return item",
      payload: { ...quiz, questions: questionsWithUrls },
    });
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
