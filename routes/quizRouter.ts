import Router from "express";
import QuizController from "../controllers/quizController";

const quiz = new QuizController();
const router = Router();

router.post("/create", quiz.create);
router.post("/all", quiz.getAll);
router.post("/update/:id", quiz.update);
router.post("/remove/:id", quiz.remove);
router.post("/:id", quiz.get);

export default router;
