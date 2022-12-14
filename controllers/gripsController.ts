import { Request, Response } from "express";

import GripResolver from "../services/Grip";

class GripsController {
  async create(req: Request, res: Response, next: any) {
    const { text } = req.body;

    const Grip = await GripResolver.create({ text });

    if (!Grip) {
      return res.json({ message: "Something went wrong while creating" });
    }

    res.json({ message: "Item created successfully" });

    return;
  }

  async getAll(req: Request, res: Response, next: any) {
    const getGrips = await GripResolver.findAll();

    res.json({ message: "return quizes", payload: getGrips });
  }

  async remove(req: Request, res: Response, next: any) {
    const id = req.params.id;

    const removeQuiz = await GripResolver.delete(id);

    res.json({ message: "Removed successfully", payload: removeQuiz });
  }
}

export default GripsController;
