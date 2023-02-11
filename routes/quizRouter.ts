import QuizController from "../controllers/quizController";
import authMiddleware from "../middleware/auth";

const quiz = new QuizController();
const e = require("express");

const router = e();

router.post("/create", authMiddleware, quiz.create);
router.get("/all", quiz.getAll);
router.put("/update/:id", authMiddleware, quiz.update);
router.delete("/remove/:id", authMiddleware, quiz.remove);
router.get("/:id", quiz.get);

export default router;
