import QuizController from "../controllers/quizController";
import StatsController from "../controllers/statsController";
import JwtMiddleware from "../middleware/Token";

const quiz = new QuizController();
const stats = new StatsController();
const e = require("express");

const router = e();

router.post("/create", JwtMiddleware, quiz.create);
router.get("/all", quiz.getAll);
router.put("/update/:id", JwtMiddleware, quiz.update);
router.post("/remove/:id", JwtMiddleware, quiz.remove);

router.get("/:id/edit", JwtMiddleware, quiz.edit);
router.post("/:id/submit", JwtMiddleware, quiz.submit);
router.get("/:id/stats", JwtMiddleware, stats.forQuiz);

router.get("/:id", quiz.get);

export default router;
