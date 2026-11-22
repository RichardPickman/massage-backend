import QuizController from "../controllers/quizController";
import StatsController from "../controllers/statsController";
import JwtMiddleware from "../middleware/Token";

const quiz = new QuizController();
const stats = new StatsController();
const e = require("express");

const router = e();

router.post("/create", JwtMiddleware, quiz.create);
// Same reason as lectures: a test that anyone can fetch is also a test anyone
// can scrape, and the content belongs to the class.
router.get("/all", JwtMiddleware, quiz.getAll);
router.put("/update/:id", JwtMiddleware, quiz.update);
router.post("/remove/:id", JwtMiddleware, quiz.remove);

router.get("/:id/edit", JwtMiddleware, quiz.edit);
router.post("/:id/submit", JwtMiddleware, quiz.submit);
router.get("/:id/stats", JwtMiddleware, stats.forQuiz);

router.get("/:id", JwtMiddleware, quiz.get);

export default router;
