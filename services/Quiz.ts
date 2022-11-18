import { Document } from "mongoose";
import ApiError from "../Error";
import quizModel from "../model/schemes/Quiz";

class QuizService {
  async create(props: Record<any, any>) {
    const createQuiz = await new quizModel(props)
      .save()
      .then((item) => this.find(item.id));

    return createQuiz;
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

  async find(id: any) {
    const quiz = quizModel.findOne({ _id: id });

    return quiz;
  }

  async findAll() {
    const quizzes = await quizModel.find({});

    return quizzes;
  }
}

const Quiz = new QuizService();

export default Quiz;
