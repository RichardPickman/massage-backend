import mongoose from "mongoose";
import { Schema } from "mongoose";

const quizSchema = new Schema({
  questions: [{ type: Schema.Types.ObjectId, ref: "questions" }],
  title: String,
  // Percentage a student has to reach to pass. Kept on the quiz, and copied
  // onto every attempt, so changing it later cannot re-judge old results.
  threshold: { type: Number, default: 50, min: 0, max: 100 },
  author: { type: Schema.Types.ObjectId, ref: "users" },
  // A lecture has at most one quiz, which is what the lectures list links to.
  // Sparse keeps the index valid for quizzes that are not attached at all.
  lecture: {
    type: Schema.Types.ObjectId,
    ref: "lectures",
    unique: true,
    sparse: true,
  },
});

const quizModel = mongoose.model("quiz", quizSchema);

export default quizModel;
