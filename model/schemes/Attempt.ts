import mongoose from "mongoose";
import { Schema } from "mongoose";

const attemptSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "users", required: true },
    quiz: { type: Schema.Types.ObjectId, ref: "quiz", required: true },
    correctCount: Number,
    questionCount: Number,
    percent: Number,
    answers: [
      {
        _id: false,
        question: { type: Schema.Types.ObjectId, ref: "questions" },
        selected: [String],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Every stats read is scoped to one user, optionally one quiz.
attemptSchema.index({ user: 1, quiz: 1 });

const attemptModel = mongoose.model("attempts", attemptSchema);

export default attemptModel;
