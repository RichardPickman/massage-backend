const Multer = require("multer");
import lectureController from "../controllers/lectureController";
import JwtMiddleware from "../middleware/Token";

const lecture = new lectureController();
const e = require("express");

const router = e();

const upload = Multer({ dest: "./static/lectures" });

router.post("/create", JwtMiddleware, upload.array("images", 100), lecture.create);
router.get("/all", lecture.getAll);
router.put(
  "/update/:id",
  JwtMiddleware,
  upload.array("images", 100),
  lecture.update
);
router.delete("/remove/:id", JwtMiddleware, lecture.remove);

router.get("/:id", lecture.get);

export default router;
