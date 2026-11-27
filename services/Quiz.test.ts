// The quiz service against a real collection.
//
// The parts that were never covered: a quiz is built from question ids that may
// no longer exist, `find` has to populate them for the screen to render, and the
// list has no timestamp to sort by — `_id` is the only order that stays stable
// between two requests.

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import mongoose from "mongoose";
import { clear, connect, disconnect } from "../test/mongo";
import quizModel from "../model/schemes/Quiz";
import Question from "./Question";
import Quiz from "./Quiz";

before(connect);
after(disconnect);
beforeEach(clear);

const makeQuestions = async (count: number) => {
    const ids: string[] = [];

    for (let index = 0; index < count; index += 1) {
        const question = await Question.create({
            question: `Pytanie ${index}`,
            answers: [{ id: "a", text: "tak" }, { id: "b", text: "nie" }],
            correctAnswers: ["a"],
        });

        ids.push(String(question?._id));
    }

    return ids;
};

test("creates a quiz from question ids and keeps its author", async () => {
    const ids = await makeQuestions(2);
    const author = new mongoose.Types.ObjectId();

    const quiz = await Quiz.create({ questions: ids, title: "Instrumentarium", author });

    assert.equal(quiz?.title, "Instrumentarium");
    assert.equal(quiz?.questions.length, 2);
    assert.equal(String(quiz?.author), String(author));
});

test("drops a question id that no longer exists", async () => {
    const ids = await makeQuestions(1);

    // A constructor tab left open while another admin deletes a question sends a
    // dead id; the quiz must still be created, without a null that breaks populate.
    const quiz = await Quiz.create({
        questions: [...ids, String(new mongoose.Types.ObjectId())],
        title: "Niepełny",
    });

    assert.equal(quiz?.questions.length, 1);
    assert.ok(quiz?.questions[0]);
});

test("returns the questions themselves, not their ids", async () => {
    const ids = await makeQuestions(2);
    const created = await Quiz.create({ questions: ids, title: "Z pytaniami" });

    const found = await Quiz.find(String(created?._id));

    assert.equal(found?.questions.length, 2);
    assert.equal(typeof (found?.questions[0] as any).question, "string");
});

test("answers undefined for an unknown quiz", async () => {
    assert.equal(await Quiz.find(String(new mongoose.Types.ObjectId())), undefined);
});

test("falls back to the default threshold when none is given", async () => {
    const created = await Quiz.create({ questions: [], title: "Domyślny próg" });

    assert.equal(created?.threshold, 50);
});

test("lists the newest quiz first and pages the rest", async () => {
    const first = await Quiz.create({ questions: [], title: "Pierwszy" });
    const second = await Quiz.create({ questions: [], title: "Drugi" });
    await Quiz.create({ questions: [], title: "Trzeci" });

    const page = await Quiz.findPage({ page: 1, limit: 2 });

    assert.deepEqual(page.items.map((item) => item.title), ["Trzeci", "Drugi"]);
    assert.equal(page.total, 3);
    assert.equal(page.pages, 2);
    assert.equal(String(page.items[1]?._id), String(second?._id));
    assert.notEqual(String(page.items[1]?._id), String(first?._id));
});

test("updates a quiz in place and returns the new state", async () => {
    const created = await Quiz.create({ questions: [], title: "Stary tytuł" });

    const updated = await Quiz.update(String(created?._id), { title: "Nowy tytuł", threshold: 75 });

    assert.equal(updated?.title, "Nowy tytuł");
    assert.equal(updated?.threshold, 75);
});

test("deletes one quiz only", async () => {
    const doomed = await Quiz.create({ questions: [], title: "Do usunięcia" });
    await Quiz.create({ questions: [], title: "Zostaje" });

    const result = await Quiz.delete(String(doomed?._id));

    assert.equal(result.deletedCount, 1);
    assert.equal(await quizModel.countDocuments({}), 1);
});
