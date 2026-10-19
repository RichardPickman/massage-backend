import type { Response } from "express";
import { replaceNameToLink } from "./helpers";

import QuizResolver from "../services/Quiz";
import AttemptResolver from "../services/Attempt";
import ApiError from "../Error";
import { scoreAttempt, type StoredQuestion, type SubmittedAnswer } from "../helpers/score";
import type { AuthedRequest } from "../middleware/Token";

// Mongoose hands back ObjectIds and lean documents, so the fields this
// controller inspects are kept unknown and narrowed where they are used.
interface QuizDocument {
  _id: unknown;
  author?: unknown;
  questions?: unknown;
}

const isOwner = (author: unknown, req: AuthedRequest) =>
  Boolean(req.user) &&
  (req.user.role === "admin" || String(author ?? "") === req.user.id);

// The play view must not hand out the key: the client gets everything it needs
// to render a question, and learns the correct answers only after submitting.
const withoutAnswers = (questions: unknown) => {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions.map((question: unknown) => {
    const record = (question ?? {}) as Record<string, unknown>;

    return { ...record, correctAnswers: [] as string[] };
  });
};

// Only the fields the scorer needs, converted to plain strings: what the
// database stores are ObjectIds, not the strings the scorer compares.
const toStoredQuestions = (questions: unknown): StoredQuestion[] => {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions.flatMap((question: unknown) => {
    if (!question || typeof question !== "object") {
      return [];
    }

    const { _id, correctAnswers } = question as {
      _id?: unknown;
      correctAnswers?: unknown;
    };

    if (!_id) {
      return [];
    }

    return [
      {
        _id: String(_id),
        correctAnswers: Array.isArray(correctAnswers)
          ? correctAnswers.map(String)
          : [],
      },
    ];
  });
};

class QuizController {
  async create(req: AuthedRequest, res: Response, next: any) {
    const { questions, title } = req.body;

    if (!questions || !title) {
      return next(ApiError.internal("Incorrect input"));
    }

    if (!req.user) {
      return res.status(401).json({ message: "Not authorised" });
    }

    const quiz = (await QuizResolver.create({
      ...req.body,
      author: req.user.id,
    })) as QuizDocument | undefined;

    if (!quiz) {
      return res.status(404).json({ message: "Quiz create failed" });
    }

    const questionsWithUrls = replaceNameToLink(quiz?.questions);

    res.json({
      message: "Item created successfully",
      payload: { ...quiz, questions: questionsWithUrls },
    });

    return;
  }

  async update(req: AuthedRequest, res: Response, next: any) {
    const id = req.params.id || req.body.id;

    const existing = (await QuizResolver.find(id)) as QuizDocument | undefined;

    if (!existing) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (!isOwner(existing.author, req)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const { id: _id, _id: __id, author: _author, ...body } = req.body;
    const quiz = await QuizResolver.update(id, body);

    res.json({ message: "return item", payload: quiz });
  }

  async get(req: AuthedRequest, res: Response) {
    const id = req.params.id;

    const quiz = (await QuizResolver.find(id)) as QuizDocument | undefined;

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const questionsWithUrls = replaceNameToLink(
      withoutAnswers(quiz.questions)
    );

    res.json({
      message: "return item",
      payload: { ...quiz, questions: questionsWithUrls },
    });
  }

  // Full questions including the correct answers, for the author editing a quiz.
  async edit(req: AuthedRequest, res: Response) {
    const quiz = (await QuizResolver.find(req.params.id)) as
      | QuizDocument
      | undefined;

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (!isOwner(quiz.author, req)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    res.json({
      message: "return item",
      payload: {
        ...quiz,
        questions: replaceNameToLink(quiz.questions ?? []),
      },
    });
  }

  async getAll(req: AuthedRequest, res: Response) {
    const getItems = await QuizResolver.findAll();

    res.json({ message: "return quizes", payload: getItems });
  }

  // Scores the submission against the stored questions. The client is never
  // trusted with its own score.
  async submit(req: AuthedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorised" });
    }

    const id = req.params.id;
    const answers: SubmittedAnswer[] = Array.isArray(req.body.answers)
      ? req.body.answers
      : [];

    const quiz = (await QuizResolver.find(id)) as QuizDocument | undefined;

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const questions = toStoredQuestions(quiz.questions);

    const score = scoreAttempt(questions, answers);
    const questionIds = new Set(
      score.results.map((result) => result.questionId)
    );

    const attempt = await AttemptResolver.create({
      user: req.user.id,
      quiz: id,
      correctCount: score.correctCount,
      questionCount: score.questionCount,
      percent: score.percent,
      answers: answers
        .filter((answer) => questionIds.has(String(answer.questionId)))
        .map((answer) => ({
          question: String(answer.questionId),
          selected: Array.isArray(answer.selected)
            ? answer.selected.map(String)
            : [],
        })),
    });

    return res.json({
      message: "Attempt saved",
      payload: {
        attempt,
        correctCount: score.correctCount,
        questionCount: score.questionCount,
        percent: score.percent,
        results: score.results,
      },
    });
  }

  async remove(req: AuthedRequest, res: Response) {
    const id = req.params.id || req.body.id;

    const existing = (await QuizResolver.find(id)) as QuizDocument | undefined;

    if (!existing) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (!isOwner(existing.author, req)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const removeQuiz = await QuizResolver.delete(id);

    res.json({ message: "Removed successfully", payload: removeQuiz });
  }
}

export default QuizController;
