// The question service against a real collection.
//
// A question is edited through the constructor, which sends the whole object back:
// `update` writes over it and then re-reads, so both the write and the read are
// checked here.

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { clear, connect, disconnect } from "../test/mongo";
import questionModel from "../model/schemes/Question";
import Question from "./Question";

before(connect);
after(disconnect);
beforeEach(clear);

const base = {
    question: "Które kleszcze?",
    answers: [
        { id: "a", text: "Anatomiczne" },
        { id: "b", text: "Chirurgiczne" },
    ],
    correctAnswers: ["b"],
};

test("creates a question and returns the stored document", async () => {
    const created = await Question.create(base);

    assert.equal(created?.question, "Które kleszcze?");
    assert.deepEqual(created?.correctAnswers, ["b"]);
});

test("keeps the picture key with the question", async () => {
    const created = await Question.create({ ...base, img: "a1b2c3d4e5f60718293a4b5c6d7e8f90" });

    assert.equal(created?.img, "a1b2c3d4e5f60718293a4b5c6d7e8f90");
});

test("rewrites the answers and the key on update", async () => {
    const created = await Question.create(base);

    const updated = await Question.update({
        _id: created?._id,
        question: "Które kleszcze? Poprawione",
        answers: [
            { id: "a", text: "Anatomiczne" },
            { id: "b", text: "Chirurgiczne (zmienione)" },
            { id: "c", text: "Naczyniowe" },
        ],
        correctAnswers: ["c"],
    } as any);

    assert.equal(updated?.question, "Które kleszcze? Poprawione");
    assert.equal(updated?.answers.length, 3);
    // The key is answer *ids*: editing a text must not move it.
    assert.deepEqual(updated?.correctAnswers, ["c"]);
});

test("answers undefined for an unknown question", async () => {
    assert.equal(await Question.find("6b09b1429d310dea6317a205"), null);
});

test("deletes one question only", async () => {
    const doomed = await Question.create({ ...base, question: "Do usunięcia" });
    await Question.create({ ...base, question: "Zostaje" });

    const result = await Question.delete(String(doomed?._id));

    assert.equal(result.deletedCount, 1);
    assert.equal(await questionModel.countDocuments({}), 1);
});
