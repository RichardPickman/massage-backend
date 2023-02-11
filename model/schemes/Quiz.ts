import mongoose from "mongoose";
import { Schema } from "mongoose";

const quizSchema = new Schema(
  {
    questions: [{ type: Schema.Types.ObjectId, ref: "questions" }],
    author: { type: Schema.Types.ObjectId, ref: "users" },
    title: String,
    image: String,
  },
  {
    timestamps: true,
  }
);

const quizModel = mongoose.model("quiz", quizSchema);

export default quizModel;
