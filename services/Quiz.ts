import mongoose from "mongoose";
import { pageRange, type PageQuery } from "../helpers/pagination";
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

    // The controller supplies the signed-in user. Dropping it here left every
    // quiz ownerless, so the ownership checks could never pass for its author.
    const createQuiz = await new quizModel({
      questions: questions,
      title: props.title,
      author: props.author,
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
      .exec();

    return quiz?.toObject();
  }

  async findAll() {
    // The quiz schema has no timestamps, so `_id` is the only ordering that
    // reflects insertion order and does not shuffle between two requests.
    const quizzes = await quizModel.find({}).sort({ _id: -1 });

    return quizzes;
  }

  async findPage(query: PageQuery) {
    const total = await quizModel.countDocuments({});
    const range = pageRange(query, total);

    const quizzes = await quizModel
      .find({})
      .sort({ _id: -1 })
      .skip(range.skip)
      .limit(query.limit);

    return {
      items: quizzes,
      total,
      page: range.page,
      limit: query.limit,
      pages: range.pages,
    };
  }
}

const Quiz = new QuizService();

export default Quiz;
