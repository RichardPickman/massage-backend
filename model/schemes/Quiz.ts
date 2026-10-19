import mongoose from "mongoose";
import { Schema } from "mongoose";

const quizSchema = new Schema({
  questions: [{ type: Schema.Types.ObjectId, ref: "questions" }],
  title: String,
  author: { type: Schema.Types.ObjectId, ref: "users" },
});

const quizModel = mongoose.model("quiz", quizSchema);

export default quizModel;
