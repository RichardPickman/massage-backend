import mongoose from "mongoose";
import { questionSchema } from "./Question";

const quizSchema = new mongoose.Schema({
  questions: [questionSchema],
  title: String,
});

const quizModel = mongoose.model("quiz", quizSchema);

export default quizModel;
