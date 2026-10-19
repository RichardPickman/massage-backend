import QuestionController from "../controllers/questionController";
import JwtMiddleware from "../middleware/Token";
const Multer = require("multer");

const question = new QuestionController();
const e = require("express");

const router = e();

const upload = Multer({ dest: "./static/lectures" });

router.post(
  "/create",
  JwtMiddleware,
  upload.single("img"),
  question.create
);
router.put(
  "/update/:id",
  JwtMiddleware,
  upload.single("img"),
  question.update
);
router.delete("/remove/:id", JwtMiddleware, question.remove);

router.get("/:id", question.get);

export default router;
