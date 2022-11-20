import mongoose from "mongoose";
import quizModel from "../model/schemes/Quiz";
import Question from "./Question";

class QuizService {
  async create(props: Record<any, any>) {
    const createQuiz = new quizModel({
      questions: [],
      title: props.title,
    });

    for (let questionId of props.questions) {
      const question = await Question.find(questionId);

      if (!question) {
        break;
      }

      createQuiz.questions.push(question._id);
    }

    await createQuiz.save();

    const getCreatedQuiz = await this.find(createQuiz._id);

    return getCreatedQuiz;
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
      .exec();

    console.log("FIND ELEMENT: ", quiz);

    return quiz;
  }

  async findAll() {
    const quizzes = await quizModel.find({});

    return quizzes;
  }
}

const Quiz = new QuizService();

export default Quiz;
