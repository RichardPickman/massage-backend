import mongoose from "mongoose";

const quizQuestionSchema = new mongoose.Schema({
  question: String,
  img: String,
  answers: [String],
  correctAnswers: [Number],
})

const quizSchema = new mongoose.Schema({
  questions: [quizQuestionSchema],
  title: String,
});

const quizModel = mongoose.model('quiz', quizSchema);

export default quizModel;
