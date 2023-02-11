import { Request, Response } from "express";
import { replaceNameToLink } from "./helpers";

import QuizResolver from "../services/Quiz";
import ApiError from "../exceptions";
import UserDto from "../dtos/user";

interface RequestWithUser extends Request {
  user: UserDto;
}

class QuizController {
  async create(req: RequestWithUser, res: Response, next: any) {
    const { questions, title } = req.body;

    if (!questions || !title) {
      return next(ApiError.BadRequest("Incorrect input"));
    }

    const quiz = await QuizResolver.create({
      ...req.body,
      userId: req.user.id,
    });

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
    try {
      const { id } = req.params;
      const removeQuiz = await QuizResolver.delete(id);

      res.json({ message: "Removed successfully", payload: removeQuiz });
    } catch (error) {
      next(error);
    }
  }
}

export default QuizController;
