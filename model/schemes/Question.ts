import mongoose from "mongoose";
import { Schema } from "mongoose";

export const questionSchema = new Schema({
  question: String,
  answers: [Object],
  correctAnswers: [String],
  img: String,
});

const questionModel = mongoose.model("questions", questionSchema);

export default questionModel;
