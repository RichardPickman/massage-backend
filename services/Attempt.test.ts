// The attempt service against a real collection.
//
// History is what a student sees after a test and what the stats page counts, and
// both go through two queries: every attempt of one user, optionally narrowed to
// one quiz. The order and the populated quiz title are the contract.

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import mongoose from "mongoose";
import { clear, connect, disconnect } from "../test/mongo";
import quizModel from "../model/schemes/Quiz";
import userModel from "../model/schemes/User";
import Attempt from "./Attempt";

before(connect);
after(disconnect);
beforeEach(clear);

const makeQuiz = async (title: string) => String((await quizModel.create({ title, questions: [] }))._id);

// `user` is an ObjectId on the schema, so the account is written first: a string
// nickname fails validation exactly as it would in production.
const makeUser = async (nickname: string) => String((await userModel.create({ user: nickname }))._id);

const saveAttempt = async (user: string, quiz: string, percent: number) => {
    const attempt = await Attempt.create({
        user,
        quiz,
        correctCount: percent / 10,
        questionCount: 10,
        percent,
        threshold: 60,
        passed: percent >= 60,
        quizTitle: "Zapisany tytuł",
        answers: [],
    });

    // createdAt has millisecond resolution: two attempts in the same millisecond
    // would make the "newest first" assertion a coin toss.
    await new Promise((resolve) => setTimeout(resolve, 5));

    return attempt;
};

test("stores an attempt and returns a plain object", async () => {
    const quiz = await makeQuiz("Alfabet");
    const ania = await makeUser("Ania");

    const saved = await saveAttempt(ania, quiz, 70);

    assert.equal(saved.percent, 70);
    assert.equal(saved.passed, true);
});

test("keeps the frozen threshold next to the verdict", async () => {
    const quiz = await makeQuiz("Progi");
    const ania = await makeUser("Ania");
    await saveAttempt(ania, quiz, 70);

    // Raising the quiz threshold later must not re-judge this attempt.
    await quizModel.updateOne({ _id: quiz }, { threshold: 95 });

    const [stored] = await Attempt.findByUser(ania);

    assert.equal(stored?.threshold, 60);
    assert.equal(stored?.passed, true);
});

test("lists one student's attempts newest first", async () => {
    const first = await makeQuiz("Pierwszy");
    const second = await makeQuiz("Drugi");
    const ania = await makeUser("Ania");

    await saveAttempt(ania, first, 40);
    await saveAttempt(ania, second, 80);

    const attempts = await Attempt.findByUser(ania);

    assert.equal(attempts.length, 2);
    assert.equal(attempts[0]?.percent, 80);
});

test("never mixes in another student's attempts", async () => {
    const quiz = await makeQuiz("Wspólny");
    const ania = await makeUser("Ania");
    const ola = await makeUser("Ola");

    await saveAttempt(ania, quiz, 40);
    await saveAttempt(ola, quiz, 90);

    const attempts = await Attempt.findByUser(ania);

    assert.equal(attempts.length, 1);
    assert.equal(attempts[0]?.percent, 40);
});

test("carries the quiz title so history renders without a second request", async () => {
    const quiz = await makeQuiz("Instrumentarium chirurgiczne");
    const ania = await makeUser("Ania");
    await saveAttempt(ania, quiz, 60);

    const [attempt] = await Attempt.findByUser(ania);

    assert.equal((attempt?.quiz as any)?.title, "Instrumentarium chirurgiczne");
});

test("narrows history to one quiz", async () => {
    const first = await makeQuiz("Pierwszy");
    const second = await makeQuiz("Drugi");
    const ania = await makeUser("Ania");

    await saveAttempt(ania, first, 40);
    await saveAttempt(ania, second, 80);

    const only = await Attempt.findByUserAndQuiz(ania, second);

    assert.equal(only.length, 1);
    assert.equal(only[0]?.percent, 80);
});

test("answers an empty list for a student who never took a test", async () => {
    const nobody = await makeUser("Nikt");

    assert.deepEqual(await Attempt.findByUser(nobody), []);
});

test("records a snapshot of what was asked", async () => {
    const quiz = await makeQuiz("Migawka");
    const ania = await makeUser("Ania");

    await Attempt.create({
        user: ania,
        quiz,
        percent: 100,
        answers: [
            {
                question: new mongoose.Types.ObjectId(),
                questionText: "Które narzędzie?",
                answers: [{ id: "a", text: "Kiretka" }, { id: "b", text: "Hak" }],
                correctAnswers: ["a"],
                selected: ["a"],
                correct: true,
            },
        ],
    });

    const [stored] = await Attempt.findByUser(ania);

    // The question itself may be edited or deleted afterwards; the review must
    // still show what was on screen.
    assert.equal(stored?.answers[0]?.questionText, "Które narzędzie?");
    assert.deepEqual(stored?.answers[0]?.selected, ["a"]);
});
