// import Router from "express";
import userRouter from "./userRouter";
import quizRouter from "./quizRouter";
import lectureRouter from "./lectureRouter";
import questionRouter from "./questionRouter";
import statsRouter from "./statsRouter";
import massageRouter from "./massageRouter";
import gripsRouter from "./gripsRouter";

const e = require("express");

const router = e();

router.use("/users", userRouter);
router.use("/quiz", quizRouter);
router.use("/lectures", lectureRouter);
router.use("/question", questionRouter);
router.use("/stats", statsRouter);
router.use("/massage", massageRouter);
router.use("/grips", gripsRouter);

export default router;
