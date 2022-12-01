import QuizController from "../controllers/quizController";

const quiz = new QuizController();
const e = require("express");

const router = e();

router.post("/create", quiz.create);
router.get("/all", quiz.getAll);
router.put("/update/:id", quiz.update);
router.post("/remove/:id", quiz.remove);
router.get("/:id", quiz.get);

export default router;
