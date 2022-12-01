// import Router from "express";
import userRouter from "./userRouter";
import quizRouter from "./quizRouter";
import lectureRouter from "./lectureRouter";
import questionRouter from "./questionRouter";

const e = require("express");

const router = e();

router.use("/users", userRouter);
router.use("/quiz", quizRouter);
router.use("/lectures", lectureRouter);
router.use("/question", questionRouter);

export default router;
