// import Router from "express";
import userRouter from "./userRouter";
import quizRouter from "./quizRouter";
import lectureRouter from "./lectureRouter";
import questionRouter from "./questionRouter";
import massageRouter from "./massageRouter";
import gripsRouter from "./gripsRouter";
import lessonRouter from "./lessonRouter";
import teacherRouter from "./teacherRouter";


const e = require("express");

const router = e();

router.use("/users", userRouter);
router.use("/quiz", quizRouter);
router.use("/lectures", lectureRouter);
router.use("/question", questionRouter);
router.use("/massage", massageRouter);
router.use("/grips", gripsRouter);
router.use("/lesson", lessonRouter);
router.use("/teacher", teacherRouter);

export default router;
