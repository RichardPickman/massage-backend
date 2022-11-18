import QuestionModel from "../model/schemes/Question";
import { Question } from "../types";

class QuestionService {
  async create(props: Record<any, any>) {
    const createQuestion = await new QuestionModel(props)
      .save()
      .then((item) => this.find(item.id));

    return createQuestion;
  }

  async delete(id: string) {
    const removeQuestion = await QuestionModel.deleteOne({ _id: id });

    return removeQuestion;
  }

  async find(id: string) {
    const Question = await QuestionModel.findOne({ _id: id });

    return Question;
  }

  async update(data: Question) {
    const updateQuestion = await QuestionModel.findOneAndUpdate(
      { _id: data._id },
      { ...data },
      { new: true }
    );

    updateQuestion?.save();

    return this.find(data._id);
  }
}

const Question = new QuestionService();

export default Question;
