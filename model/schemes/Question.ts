import mongoose from "mongoose";
import { imageSchema } from "./Image";

export const questionSchema = new mongoose.Schema({
  question: String,
  answers: [String],
  correctAnswers: [Number],
  img: String,
});

const questionModel = mongoose.model("questions", questionSchema);

export default questionModel;
