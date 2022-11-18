import Router from "express";
import QuestionController from "../controllers/questionController";
import multer from "multer";

const question = new QuestionController();
const router = Router();

const upload = multer({ dest: "./static/lectures" });

router.post("/create", upload.single("img"), question.create);
router.post("/update/:id", upload.single("img"), question.update);
router.post("/remove/:id", question.remove);

router.get("/:id", question.get);

export default router;
