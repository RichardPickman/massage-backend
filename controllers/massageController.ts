import { Request, Response } from "express";

import MassageResolver from "../services/Massage";
import ApiError from "../exceptions";
import { validationResult } from "express-validator";

class MassageController {
  static async create(req: Request, res: Response, next: any) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.BadRequest("Validation error", errors.array()));
    }

    const { title, technics } = req.body;

    try {
      const massage = await MassageResolver.create({ title, technics });

      res.json({ message: "Item created successfully", payload: massage });
    } catch (e) {
      res.status(501).json({ message: "Something went wrong while creating" });
    }

    return;
  }

  static async get(req: Request, res: Response, next: any) {
    const { id } = req.params;

    try {
      const massage = await MassageResolver.find(id);

      res.json({ message: "Found", payload: massage });
    } catch (e) {
      return res.status(404).json({ message: "Not found" });
    }
  }

  static async getAll(req: Request, res: Response, next: any) {
    try {
      const getMassages = await MassageResolver.findAll();

      res.json({ message: "Successfully found", payload: getMassages });
    } catch (e) {
      res.status(501).json({ message: "Something went wrong while searching" });
    }
  }

  static async remove(req: Request, res: Response, next: any) {
    const id = req.params.id;

    try {
      const removeQuiz = await MassageResolver.delete(id);

      res.json({ message: "Removed successfully", payload: removeQuiz });
    } catch (e) {
      res.status(501).json({ message: "Something went wrong while deleting" });
    }
  }
}

export default MassageController;
