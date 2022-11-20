import mongoose from "mongoose";
import { Schema } from "mongoose";

const quizSchema = new Schema({
  questions: [{ type: Schema.Types.ObjectId, ref: "questions" }],
  title: String,
});

const quizModel = mongoose.model("quiz", quizSchema);

export default quizModel;
