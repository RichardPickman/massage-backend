import Router from "express";
import multer from "multer";
import lectureController from "../controllers/lectureController";

const lecture = new lectureController();
const router = Router();

const upload = multer({ dest: "./static/lectures" });

router.post("/create", upload.array("images", 100), lecture.create);
router.get("/all", lecture.getAll);
router.post("/remove", lecture.remove);

router.get("/:id", lecture.get);

export default router;
