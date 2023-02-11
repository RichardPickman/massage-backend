import ApiError from "../exceptions";
import { Request, Response, NextFunction } from "express";
import TeacherService from "../services/Teacher";
import { validationResult } from "express-validator";
import ImagesController from "./imagesController";

class TeacherController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(ApiError.BadRequest("Validation error", errors.array()));
      }

      let img = null;

      if (req.file) {
        img = await ImagesController.create(req.file, 200, 200, "cover");
      }

      const body = req.body;

      const payload = {
        ...body,
        lessons: JSON.parse(body.lessons),
        img: img ? await ImagesController.getUrl(img.fieldname) : null,
      };

      const teacherData = await TeacherService.create(payload);

      res.json(teacherData);
    } catch (error) {
      next(error);
    }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const teacherData = await TeacherService.get(id);

      res.json(teacherData);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(ApiError.BadRequest("Validation error", errors.array()));
      }
      const { id } = req.params;

      const body = req.body;
      const previousData = await TeacherService.get(id);
      let img = previousData.img;

      if (req.file) {
        const image = await ImagesController.create(
          req.file,
          200,
          200,
          "cover"
        );

        img = await ImagesController.getUrl(image.fieldname);
      }

      if (body.img === "string") {
        img = body.img;
      }

      console.log(body);

      const payload = {
        ...body,
        lessons: JSON.parse(body.lessons) || previousData.lessons,
        img: img,
      };

      const teacherData = await TeacherService.update(id, payload);

      res.json(teacherData);
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const removeData = await TeacherService.remove(id);

      res.json(removeData);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const teachers = await TeacherService.getAll();

      res.json(teachers);
    } catch (error) {
      next(error);
    }
  }
}

export default new TeacherController();
