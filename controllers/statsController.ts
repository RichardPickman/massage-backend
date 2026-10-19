import type { Response } from "express";
import type { AuthedRequest } from "../middleware/Token";
import AttemptResolver from "../services/Attempt";

interface AttemptLike {
  percent?: number | null;
  // Mongoose may hand back a populated ObjectId, an unpopulated one, or a
  // lean subdocument, so it is narrowed where the grouping happens.
  quiz?: unknown;
  createdAt?: Date | string;
}

const summarize = (attempts: AttemptLike[]) => {
  const percents = attempts.map((attempt) => Number(attempt.percent ?? 0));

  if (percents.length === 0) {
    return { count: 0, best: 0, average: 0, last: 0 };
  }

  const total = percents.reduce((sum, percent) => sum + percent, 0);

  return {
    count: percents.length,
    best: Math.max(...percents),
    average: Math.round(total / percents.length),
    last: percents[0],
  };
};

class StatsController {
  // Everything this user has ever played, grouped per quiz.
  async mine(req: AuthedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorised" });
    }

    const attempts = (await AttemptResolver.findByUser(
      req.user.id
    )) as AttemptLike[];

    const grouped = new Map<
      string,
      { quizId: string; title: string; attempts: AttemptLike[] }
    >();

    attempts.forEach((attempt) => {
      const quizRef = attempt.quiz;
      const quizRecord =
        quizRef && typeof quizRef === "object"
          ? (quizRef as Record<string, unknown>)
          : null;
      const quizId = String(quizRecord?._id ?? quizRef ?? "");
      const existing = grouped.get(quizId);

      if (existing) {
        existing.attempts.push(attempt);

        return;
      }

      grouped.set(quizId, {
        quizId,
        title:
          typeof quizRecord?.title === "string"
            ? quizRecord.title
            : "Deleted quiz",
        attempts: [attempt],
      });
    });

    const quizzes = Array.from(grouped.values()).map((group) => ({
      quizId: group.quizId,
      title: group.title,
      ...summarize(group.attempts),
      history: group.attempts.map((attempt) => ({
        percent: Number(attempt.percent ?? 0),
        createdAt: attempt.createdAt,
      })),
    }));

    return res.json({
      message: "return stats",
      payload: {
        ...summarize(attempts),
        quizzes,
      },
    });
  }

  // One user's history on one quiz.
  async forQuiz(req: AuthedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorised" });
    }

    const attempts = (await AttemptResolver.findByUserAndQuiz(
      req.user.id,
      req.params.id
    )) as AttemptLike[];

    return res.json({
      message: "return stats",
      payload: {
        ...summarize(attempts),
        history: attempts.map((attempt) => ({
          percent: Number(attempt.percent ?? 0),
          createdAt: attempt.createdAt,
        })),
      },
    });
  }
}

export default StatsController;
