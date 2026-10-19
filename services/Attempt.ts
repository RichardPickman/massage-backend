import attemptModel from "../model/schemes/Attempt";

class AttemptService {
  async create(props: Record<string, unknown>) {
    const createAttempt = await new attemptModel(props).save();

    return createAttempt.toObject();
  }

  async findByUser(user: string) {
    const attempts = await attemptModel
      .find({ user })
      .sort({ createdAt: -1 })
      .populate("quiz", "title")
      .lean();

    return attempts;
  }

  async findByUserAndQuiz(user: string, quiz: string) {
    const attempts = await attemptModel
      .find({ user, quiz })
      .sort({ createdAt: -1 })
      .lean();

    return attempts;
  }
}

const Attempt = new AttemptService();

export default Attempt;
