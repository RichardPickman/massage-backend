import lessonController from "../controllers/lessonController";
import authMiddleware from "../middleware/auth";

const e = require("express");

const router = e();

router.post("/create", authMiddleware, lessonController.create);
router.post("/remove", authMiddleware, lessonController.remove);
router.post("/:id", lessonController.get);
router.get("/all", lessonController.getAll);

export default router;
