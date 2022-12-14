import { Request, Response } from "express";

import MassageResolver from "../services/Massage";
import ApiError from "../Error";

class MassageController {
  async create(req: Request, res: Response, next: any) {
    const { title, items } = req.body;

    const massage = await MassageResolver.create({ title, items });

    if (!massage) {
      return res.json({
        message: "Something went wrong while creating",
      });
    }

    res.json({ message: "Item created successfully", payload: massage });

    return;
  }

  async get(req: Request, res: Response, next: any) {
    const { id } = req.params;

    const massage = await MassageResolver.find(id);

    if (!massage) {
      return res.json({ message: "Not found", code: 404 });
    }

    res.json({ message: "Found", payload: massage });
  }

  async getAll(req: Request, res: Response, next: any) {
    const getMassages = await MassageResolver.findAll();

    console.log(getMassages);

    res.json({ message: "Successfully found", payload: getMassages });
  }

  async remove(req: Request, res: Response, next: any) {
    const id = req.params.id;

    const removeQuiz = await MassageResolver.delete(id);

    res.json({ message: "Removed successfully", payload: removeQuiz });
  }
}

export default MassageController;
