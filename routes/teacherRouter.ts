import { NextFunction, Request, Response } from "express";
import { body } from "express-validator";
import teacherController from "../controllers/teacherController";
import authMiddleware from "../middleware/auth";

const Multer = require("multer");

const e = require("express");

const router = e();

const upload = Multer({ dest: "./static/lectures" });

router.post(
  "/create",
  authMiddleware,
  upload.single("img"),
  body("email").isEmail(),
  teacherController.create
);

router.delete("/remove/:id", authMiddleware, teacherController.remove);

router.put(
  "/update/:id",
  authMiddleware,
  upload.single("img"),
  body("email").isEmail(),
  teacherController.update
);

router.get("/all", teacherController.getAll);

router.get("/:id", teacherController.get);

export default router;
