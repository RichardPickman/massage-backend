import Router from "express";
import QuizController from "../controllers/quizController";
import multer from "multer";

const quiz = new QuizController();
const router = Router();

const upload = multer({ dest: "./static/lectures" });

router.post("/create", quiz.create);
router.post("/all", quiz.getAll);
router.post("/update/:id", quiz.update);
router.post("/remove/:id", quiz.remove);
router.post("/:id", quiz.get);

export default router;
