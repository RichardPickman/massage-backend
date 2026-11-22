import "../helpers/slowBufferCompat";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after, before } from "node:test";
import * as jwt from "jsonwebtoken";
import ApiError from "../Error";
import errorHandler from "../middleware/ErrorHandle/index";
import LectureResolver from "../services/Lecture";
import QuizResolver from "../services/Quiz";
import AttemptResolver from "../services/Attempt";
import UserResolver from "../services/User";
import lectureRouter from "./lectureRouter";
import quizRouter from "./quizRouter";
import userRouter from "./userRouter";

process.env.SECRET_KEY = "spec-secret-key";

// The three resolvers behind these routes are replaced with answers a test can
// steer, so the assertions are about the response envelope, not Mongo.
let lectureFound: unknown = null;
let lectureUpdate: () => Promise<unknown> = () =>
    Promise.resolve({ _id: "l1" });
let quizFound: unknown = null;

LectureResolver.find = ((id: string) =>
    Promise.resolve(lectureFound)) as unknown as typeof LectureResolver.find;
LectureResolver.create = (() =>
    Promise.resolve({
        _id: "l1",
    })) as unknown as typeof LectureResolver.create;
LectureResolver.update = ((id: string) =>
    lectureUpdate()) as unknown as typeof LectureResolver.update;
LectureResolver.delete = (() =>
    Promise.resolve({
        deletedCount: 1,
    })) as unknown as typeof LectureResolver.delete;

QuizResolver.find = ((id: string) =>
    Promise.resolve(quizFound)) as unknown as typeof QuizResolver.find;
QuizResolver.create = (() =>
    Promise.resolve({
        _id: "q1",
        questions: [],
    })) as unknown as typeof QuizResolver.create;
QuizResolver.delete = (() =>
    Promise.resolve({
        deletedCount: 1,
    })) as unknown as typeof QuizResolver.delete;

AttemptResolver.create = (() =>
    Promise.resolve({ _id: "a1" })) as unknown as typeof AttemptResolver.create;
UserResolver.delete = (() =>
    Promise.resolve({
        deletedCount: 1,
    })) as unknown as typeof UserResolver.delete;

const app = express();
let server: Server;
let base = "";

app.use(express.json());
app.use("/api/lectures", lectureRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/users", userRouter);
app.use(errorHandler);

before(
    () =>
        new Promise<void>((resolve) => {
            server = app.listen(0, () => {
                const { port } = server.address() as AddressInfo;

                base = `http://127.0.0.1:${port}`;

                resolve();
            });
        }),
);

after(
    () =>
        new Promise<void>((resolve) => {
            server.close(() => resolve());
        }),
);

const token = jwt.sign(
    { id: "u1", email: "a@b.c", role: "user" },
    "spec-secret-key",
);

type Body = { message: string; code?: string; payload?: unknown };

const send = async (
    method: string,
    path: string,
    options: { body?: unknown; token?: string } = {},
) => {
    const headers: Record<string, string> = {
        "content-type": "application/json",
    };

    if (options.token !== undefined) {
        headers.authorization = `Bearer ${options.token}`;
    }

    const response = await fetch(`${base}${path}`, {
        method,
        headers,
        body:
            options.body === undefined
                ? undefined
                : JSON.stringify(options.body),
    });

    return { status: response.status, body: (await response.json()) as Body };
};

// The point of the pair: the machine-readable code is added, and the message
// every existing consumer reads is byte-identical.
const assertCoded = (body: Body, message: string, code: string) => {
    assert.equal(body.message, message);
    assert.equal(body.code, code);
};

test("POST /api/lectures/create answers lecture.created", async () => {
    const { status, body } = await send("POST", "/api/lectures/create", {
        token,
        body: { topic: "Anatomy" },
    });

    assert.equal(status, 200);
    assertCoded(body, "Item created successfully", "lecture.created");
});

test("POST /api/lectures/create answers common.invalidInputs", async () => {
    const { status, body } = await send("POST", "/api/lectures/create", {
        token,
        body: {},
    });

    assert.equal(status, 400);
    assertCoded(body, "Incorrect inputs", "common.invalidInputs");
});

test("POST /api/lectures/create answers auth.notAuthorised", async () => {
    const { status, body } = await send("POST", "/api/lectures/create", {
        body: { topic: "Anatomy" },
    });

    assert.equal(status, 401);
    assertCoded(body, "Not authorised", "auth.notAuthorised");
});

test("PUT /api/lectures/update/:id answers lecture.updated", async () => {
    lectureFound = { _id: "l1", author: "u1", images: [] };

    const { status, body } = await send("PUT", "/api/lectures/update/l1", {
        token,
        body: { topic: "Anatomy" },
    });

    assert.equal(status, 200);
    assertCoded(body, "Lecture updated successfully", "lecture.updated");
});

test("PUT /api/lectures/update/:id answers lecture.notFound", async () => {
    lectureFound = null;

    const { status, body } = await send("PUT", "/api/lectures/update/l9", {
        token,
        body: { topic: "Anatomy" },
    });

    assert.equal(status, 404);
    assertCoded(body, "Lecture not found", "lecture.notFound");
});

test("PUT /api/lectures/update/:id refuses another author with common.forbidden", async () => {
    lectureFound = { _id: "l1", author: "someone-else", images: [] };

    const { status, body } = await send("PUT", "/api/lectures/update/l1", {
        token,
        body: { topic: "Anatomy" },
    });

    assert.equal(status, 403);
    assertCoded(body, "Not allowed", "common.forbidden");
});

test("PUT /api/lectures/update/:id answers lecture.updateFailed", async () => {
    lectureFound = { _id: "l1", author: "u1", images: [] };
    lectureUpdate = () => Promise.reject(new Error("write failed"));

    try {
        const { status, body } = await send("PUT", "/api/lectures/update/l1", {
            token,
            body: { topic: "Anatomy" },
        });

        assert.equal(status, 500);
        assertCoded(body, "Lecture update failed", "lecture.updateFailed");
    } finally {
        lectureUpdate = () => Promise.resolve({ _id: "l1" });
    }
});

test("POST /api/quiz/create answers quiz.created", async () => {
    const { status, body } = await send("POST", "/api/quiz/create", {
        token,
        body: { title: "Quiz", questions: [] },
    });

    assert.equal(status, 200);
    assertCoded(body, "Item created successfully", "quiz.created");
});

test("POST /api/quiz/create answers quiz.invalidThreshold with the dynamic message", async () => {
    const { status, body } = await send("POST", "/api/quiz/create", {
        token,
        body: { title: "Quiz", questions: [], threshold: 500 },
    });

    assert.equal(status, 400);
    // The text still depends on what was wrong; only the code is fixed.
    assertCoded(
        body,
        "Threshold must be between 0 and 100",
        "quiz.invalidThreshold",
    );
});

test("POST /api/quiz/create answers quiz.createFailed", async () => {
    const created = QuizResolver.create;

    QuizResolver.create = (() =>
        Promise.resolve(undefined)) as unknown as typeof QuizResolver.create;

    try {
        const { status, body } = await send("POST", "/api/quiz/create", {
            token,
            body: { title: "Quiz", questions: [] },
        });

        assert.equal(status, 404);
        assertCoded(body, "Quiz create failed", "quiz.createFailed");
    } finally {
        QuizResolver.create = created;
    }
});

test("refuses to list lectures without a token", async () => {
    const { status, body } = await send("GET", "/api/lectures/all");

    assert.equal(status, 401);
    assertCoded(body, "Not authorised", "auth.notAuthorised");
});

test("refuses to list quizzes without a token", async () => {
    const { status, body } = await send("GET", "/api/quiz/all");

    assert.equal(status, 401);
    assertCoded(body, "Not authorised", "auth.notAuthorised");
});

test("refuses to read one lecture without a token", async () => {
    lectureFound = { _id: "l1", topic: "Topic", images: [] };

    const { status } = await send("GET", "/api/lectures/l1");

    assert.equal(status, 401);
});

test("GET /api/quiz/:id answers quiz.notFound", async () => {
    quizFound = null;

    // Reading a quiz needs a token now, so the 404 has to be asked for by someone
    // who may read at all.
    const { status, body } = await send("GET", "/api/quiz/unknown", { token });

    assert.equal(status, 404);
    assertCoded(body, "Quiz not found", "quiz.notFound");
});

test("POST /api/quiz/remove/:id answers quiz.removed", async () => {
    quizFound = { _id: "q1", author: "u1", questions: [] };

    const { status, body } = await send("POST", "/api/quiz/remove/q1", {
        token,
    });

    assert.equal(status, 200);
    assertCoded(body, "Removed successfully", "quiz.removed");
});

test("POST /api/quiz/:id/submit answers attempt.saved", async () => {
    quizFound = {
        _id: "q1",
        author: "u1",
        questions: [],
        threshold: 50,
        title: "Quiz",
    };

    const { status, body } = await send("POST", "/api/quiz/q1/submit", {
        token,
        body: { answers: [] },
    });

    assert.equal(status, 200);
    assertCoded(body, "Attempt saved", "attempt.saved");
});

test("DELETE /api/users/remove/:id answers user.removed", async () => {
    const { status, body } = await send("DELETE", "/api/users/remove/u1", {
        token,
    });

    assert.equal(status, 200);
    assertCoded(body, "Removed successfully", "user.removed");
});

// An error carrying a code reaches the client through the error middleware,
// while an error without one answers exactly as before.
const runErrorHandler = (error: unknown) => {
    const res = {
        statusCode: 0,
        body: undefined as Body | undefined,
        status(code: number) {
            res.statusCode = code;

            return res;
        },
        json(payload: Body) {
            res.body = payload;

            return res;
        },
    };

    errorHandler(error, {}, res, () => {});

    return res;
};

test("forwards an ApiError's code into the response body", () => {
    const res = runErrorHandler(
        ApiError.forbidden("Not allowed", "common.forbidden"),
    );

    assert.equal(res.statusCode, 403);
    assertCoded(res.body as Body, "Not allowed", "common.forbidden");
});

test("an ApiError with no code adds no code field", () => {
    const res = runErrorHandler(ApiError.internal("Something broke"));

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { message: "Something broke" });
});
