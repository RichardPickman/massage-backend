import e from "express";
import Multer from "multer";
import lectureController from "../controllers/lectureController";
import JwtMiddleware from "../middleware/Token";

const lecture = new lectureController();

const router = e();

const upload = Multer({ dest: "./static/lectures" });

router.post(
    "/create",
    JwtMiddleware,
    upload.array("images", 100),
    lecture.create,
);
// Reading is signed-in only: the content is for a class, and an open list is an
// open door for automated traffic.
router.get("/all", JwtMiddleware, lecture.getAll);
router.put(
    "/update/:id",
    JwtMiddleware,
    upload.array("images", 100),
    lecture.update,
);
router.delete("/remove/:id", JwtMiddleware, lecture.remove);

router.get("/:id", JwtMiddleware, lecture.get);

export default router;
