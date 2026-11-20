import mongoose from "mongoose";
import { Schema } from "mongoose";

const attemptSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "users", required: true },
    quiz: { type: Schema.Types.ObjectId, ref: "quiz", required: true },
    correctCount: Number,
    questionCount: Number,
    percent: Number,
    // The rules this attempt was judged by, frozen at submission time. A quiz
    // whose threshold is raised later must not turn a past pass into a fail.
    threshold: { type: Number, default: null },
    passed: { type: Boolean, default: null },
    quizTitle: String,
    answers: [
      {
        _id: false,
        question: { type: Schema.Types.ObjectId, ref: "questions" },
        // Snapshot: the question as the student saw it. The referenced question
        // may be edited or deleted afterwards, and the review must still show
        // what was actually asked and answered.
        questionText: String,
        answers: [{ _id: false, id: String, text: String }],
        correctAnswers: [String],
        selected: [String],
        correct: Boolean,
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
