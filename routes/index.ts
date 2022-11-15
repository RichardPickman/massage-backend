import Router from "express";
import userRouter from "./userRouter";
import quizRouter from "./quizRouter";
import lectureRouter from "./lectureRouter";

const router = Router();

router.use("/users", userRouter);
router.use("/quiz", quizRouter);
router.use("/lectures", lectureRouter);

export default router;
