import mongoose from "mongoose";
import User from "../model/schemes/User";
import quizModel from "../model/schemes/Quiz";
import Question from "./Question";

class QuizService {
  async create(props: Record<any, any>) {
    const questionPromises = props.questions.map((questionId: string) =>
      Question.find(questionId)
    );

    const questions = await Promise.all(questionPromises).then((result) =>
      result.map((question) => (question ? question._id : null))
    );

    const currentUser = await User.findOne({ _id: props.userId });

    const createQuiz = await new quizModel({
      questions: questions,
      title: props.title,
      image: props.image,
      author: currentUser,
    }).save();

    const createdQuiz = await this.find(createQuiz._id);

    return createdQuiz;
  }

  async delete(id: string) {
    const removeQuiz = await quizModel.deleteOne({ _id: id });

    return removeQuiz;
  }

  async update(id: string, props: Record<string, unknown>) {
    const updateQuiz = quizModel.findOneAndUpdate(
      { _id: id },
      { ...props },
      { new: true },
      (data, err) => {
        if (err) console.log(err);

        return data;
      }
    );

    return updateQuiz;
  }

  async find(id: mongoose.Types.ObjectId | string) {
    const quiz = await quizModel
      .findOne({ _id: id })
      .populate("questions")
      .populate("author")
      .exec();

    return quiz?.toObject();
  }

  async findAll() {
    const quizzes = await quizModel.find({}).populate("author");

    return quizzes;
  }
}

const Quiz = new QuizService();

export default Quiz;
