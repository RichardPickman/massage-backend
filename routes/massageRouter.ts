import MassageController from "../controllers/massageController";
import authMiddleware from "../middleware/auth";
import { body } from "express-validator";

const e = require("express");

const router = e();

router.post(
  "/create",
  authMiddleware,
  body("title").notEmpty(),
  MassageController.create
);
router.get("/all", MassageController.getAll);
router.delete("/remove/:id", authMiddleware, MassageController.remove);

router.get("/:id", MassageController.get);

export default router;
