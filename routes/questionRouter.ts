import QuestionController from "../controllers/questionController";
const Multer = require("multer");

const question = new QuestionController();
const e = require("express");

const router = e();

const upload = Multer({ dest: "./static/lectures" });

router.post("/create", upload.single("img"), question.create);
router.put("/update/:id", upload.single("img"), question.update);
router.delete("/remove/:id", question.remove);

router.get("/:id", question.get);

export default router;
