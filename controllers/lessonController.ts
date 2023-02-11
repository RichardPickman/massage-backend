import ApiError from "../exceptions";
import { Request, Response, NextFunction } from "express";
import LessonService from "../services/Lesson";

class LessonController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body;
      const lessonData = await LessonService.create(body);

      return res.json(lessonData);
    } catch (error) {
      next(error);
    }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.body;

      const lessonData = await LessonService.get(id);

      res.json(lessonData);
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.body;

      const removeData = await LessonService.remove(id);

      res.json(removeData);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const lessons = await LessonService.getAll();

      res.json(lessons);
    } catch (error) {
      next(error);
    }
  }
}

export default new LessonController();
