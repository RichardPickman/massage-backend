import { Request, Response } from "express";

import GripResolver from "../services/Grip";

class GripsController {
  async create(req: Request, res: Response, next: any) {
    const { title } = req.body;

    const Grip = await GripResolver.create({ title });

    if (!Grip) {
      return res.json({ message: "Something went wrong while creating" });
    }

    res.json({ message: "Item created successfully" });
  }

  async getAll(req: Request, res: Response, next: any) {
    const grips = await GripResolver.findAll();

    res.json(grips);
  }

  async update(req: Request, res: Response, next: any) {
    const { id, ...rest } = req.body;
    const updatedGrip = await GripResolver.update(id, { ...rest });
    const allGrips = await GripResolver.findAll();

    console.log(allGrips);

    res.json(allGrips);
  }

  async remove(req: Request, res: Response, next: any) {
    const id = req.params.id;

    const removeQuiz = await GripResolver.delete(id);

    res.json({ message: "Removed successfully", payload: removeQuiz });
  }
}

export default GripsController;
