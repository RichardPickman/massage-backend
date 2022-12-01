const Multer = require("multer");
import lectureController from "../controllers/lectureController";

const lecture = new lectureController();
const e = require("express");

const router = e();

const upload = Multer({ dest: "./static/lectures" });

router.post("/create", upload.array("images", 100), lecture.create);
router.get("/all", lecture.getAll);
router.delete("/remove/:id", lecture.remove);

router.get("/:id", lecture.get);

export default router;
