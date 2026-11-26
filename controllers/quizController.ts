import type { Response } from "express";
import { replaceNameToLink } from "./helpers";

import ApiError from "../Error";
import { buildAttemptAnswers } from "../helpers/attempt";
import { readPageQuery } from "../helpers/pagination";
import { shuffle } from "../helpers/shuffle";
import {
    scoreAttempt,
    type StoredAnswer,
    type StoredQuestion,
    type SubmittedAnswer,
} from "../helpers/score";
import {
    DEFAULT_THRESHOLD,
    isThresholdError,
    parseThreshold,
} from "../helpers/threshold";
import type { RequestWithUser } from "../middleware/Token";
import AttemptResolver from "../services/Attempt";
import QuizResolver from "../services/Quiz";

// Mongoose hands back ObjectIds and lean documents, so the fields this
// controller inspects are kept unknown and narrowed where they are used.
interface QuizDocument {
    _id: unknown;
    author?: unknown;
    questions?: unknown;
    threshold?: unknown;
    title?: unknown;
}

const isOwner = (author: unknown, req: RequestWithUser) =>
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

        const { _id, correctAnswers, question: questionText, answers } =
            question as {
                _id?: unknown;
                correctAnswers?: unknown;
                question?: unknown;
                answers?: unknown;
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
                // The scorer copies these into the attempt, so the review keeps
                // showing what was asked even if the question changes later.
                question: questionText == null ? "" : String(questionText),
                answers: Array.isArray(answers) ? (answers as StoredAnswer[]) : [],
            },
        ];
    });
};

class QuizController {
    async create(req: RequestWithUser, res: Response, next: any) {
        const { questions, title } = req.body;

        if (!questions || !title) {
            return next(ApiError.internal("Incorrect input"));
        }

        if (!req.user) {
            return res.status(401).json({
                message: "Not authorised",
                code: "auth.notAuthorised",
            });
        }

        // Not silent clamping: a threshold of 500 is a client bug, and storing
        // 100 would hide it instead of reporting it.
        const parsedThreshold = parseThreshold(req.body.threshold);

        if (isThresholdError(parsedThreshold)) {
            return res.status(400).json({
                message: parsedThreshold.message,
                code: "quiz.invalidThreshold",
            });
        }

        const quiz = (await QuizResolver.create({
            ...req.body,
            threshold: parsedThreshold?.ok
                ? parsedThreshold.value
                : DEFAULT_THRESHOLD,
            author: req.user.id,
        })) as QuizDocument | undefined;

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz create failed",
                code: "quiz.createFailed",
            });
        }

        const questionsWithUrls = await replaceNameToLink(
            quiz?.questions ?? [],
        );

        res.json({
            message: "Item created successfully",
            code: "quiz.created",
            payload: { ...quiz, questions: questionsWithUrls },
        });

        return;
    }

    async update(req: RequestWithUser, res: Response, next: any) {
        const id = req.params.id || req.body.id;

        const existing = (await QuizResolver.find(id)) as
            | QuizDocument
            | undefined;

        if (!existing) {
            return res.status(404).json({
                message: "Quiz not found",
                code: "quiz.notFound",
            });
        }

        if (!isOwner(existing.author, req)) {
            return res.status(403).json({
                message: "Not allowed",
                code: "common.forbidden",
            });
        }

        const { id: _id, _id: __id, author: _author, ...body } = req.body;

        // Same validation as create, but an absent threshold means "leave the
        // stored one alone" rather than "reset to default".
        const parsedThreshold = parseThreshold(body.threshold);

        if (isThresholdError(parsedThreshold)) {
            return res.status(400).json({
                message: parsedThreshold.message,
                code: "quiz.invalidThreshold",
            });
        }

        if (parsedThreshold?.ok) {
            body.threshold = parsedThreshold.value;
        } else {
            delete body.threshold;
        }

        const quiz = await QuizResolver.update(id, body);

        res.json({ message: "return item", payload: quiz });
    }

    async get(req: RequestWithUser, res: Response) {
        const id = req.params.id;

        const quiz = (await QuizResolver.find(id)) as QuizDocument | undefined;

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found",
                code: "quiz.notFound",
            });
        }

        const questionsWithUrls = await replaceNameToLink(
            withoutAnswers(quiz.questions),
        );

        // Order is decided per request, not per quiz. A student who learned the
        // syllabus in its own order (the finger alphabet is the clearest case)
        // would otherwise answer from the sequence instead of from the picture.
        // Scoring is untouched: answers are submitted against question ids.
        res.json({
            message: "return item",
            payload: { ...quiz, questions: shuffle(questionsWithUrls) },
        });
    }

    // Full questions including the correct answers, for the author editing a quiz.
    async edit(req: RequestWithUser, res: Response) {
        const quiz = (await QuizResolver.find(req.params.id)) as
            | QuizDocument
            | undefined;

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found",
                code: "quiz.notFound",
            });
        }

        if (!isOwner(quiz.author, req)) {
            return res.status(403).json({
                message: "Not allowed",
                code: "common.forbidden",
            });
        }

        res.json({
            message: "return item",
            payload: {
                ...quiz,
                questions: await replaceNameToLink(quiz.questions ?? []),
            },
        });
    }

    // Always one page: a request carrying no parameters asks for page 1 at the
    // default size, so no client has to send a parameter to get an answer it
    // can read.
    async getAll(req: RequestWithUser, res: Response) {
        const query = readPageQuery(req.query);

        const page = await QuizResolver.findPage(query);

        res.json({ message: "return quizes", payload: page });
    }

    // Scores the submission against the stored questions. The client is never
    // trusted with its own score.
    async submit(req: RequestWithUser, res: Response) {
        if (!req.user) {
            return res.status(401).json({
                message: "Not authorised",
                code: "auth.notAuthorised",
            });
        }

        const id = req.params.id;
        const answers: SubmittedAnswer[] = Array.isArray(req.body.answers)
            ? req.body.answers
            : [];

        const quiz = (await QuizResolver.find(id)) as QuizDocument | undefined;

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found",
                code: "quiz.notFound",
            });
        }

        const questions = toStoredQuestions(quiz.questions);

        // The quiz's threshold is copied onto the attempt, so raising it later
        // does not retroactively fail attempts that already passed. A quiz
        // stored before the field existed has no threshold: those attempts get
        // no verdict at all rather than being failed after the fact.
        const threshold =
            typeof quiz.threshold === "number" ? quiz.threshold : null;
        const score = scoreAttempt(questions, answers, threshold);

        const attempt = await AttemptResolver.create({
            user: req.user.id,
            quiz: id,
            correctCount: score.correctCount,
            questionCount: score.questionCount,
            percent: score.percent,
            threshold: score.threshold,
            passed: score.passed,
            quizTitle: quiz.title == null ? "" : String(quiz.title),
            answers: buildAttemptAnswers(score.results, answers),
        });

        return res.json({
            message: "Attempt saved",
            code: "attempt.saved",
            payload: {
                attempt,
                correctCount: score.correctCount,
                questionCount: score.questionCount,
                percent: score.percent,
                threshold: score.threshold,
                passed: score.passed,
                results: score.results,
            },
        });
    }

    async remove(req: RequestWithUser, res: Response) {
        const id = req.params.id || req.body.id;

        const existing = (await QuizResolver.find(id)) as
            | QuizDocument
            | undefined;

        if (!existing) {
            return res.status(404).json({
                message: "Quiz not found",
                code: "quiz.notFound",
            });
        }

        if (!isOwner(existing.author, req)) {
            return res.status(403).json({
                message: "Not allowed",
                code: "common.forbidden",
            });
        }

        const removeQuiz = await QuizResolver.delete(id);

        res.json({
            message: "Removed successfully",
            code: "quiz.removed",
            payload: removeQuiz,
        });
    }
}

export default QuizController;
