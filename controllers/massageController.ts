import { Request, Response } from "express";

import MassageResolver from "../services/Massage";
import ApiError from "../Error";

class MassageController {
  static async create(req: Request, res: Response, next: any) {
    const { title, technics } = req.body;

    try {
      const massage = await MassageResolver.create({ title, technics });

      res.json({ message: "Item created successfully", payload: massage });
    } catch (e) {
      console.log(e);
      res.status(501).json({
        message: "Something went wrong while creating",
      });
    }

    return;
  }

  static async get(req: Request, res: Response, next: any) {
    const { id } = req.params;

    try {
      const massage = await MassageResolver.find(id);

      res.json({ message: "Found", payload: massage });
    } catch (e) {
      return res.json({ message: "Not found", code: 404 });
    }
  }

  static async getAll(req: Request, res: Response, next: any) {
    const getMassages = await MassageResolver.findAll();

    res.json({ message: "Successfully found", payload: getMassages });
  }

  static async remove(req: Request, res: Response, next: any) {
    const id = req.params.id;

    const removeQuiz = await MassageResolver.delete(id);

    res.json({ message: "Removed successfully", payload: removeQuiz });
  }
}

export default MassageController;
