// What the schemas actually enforce once a server is behind them.
//
// Every one of these rules lives in an index, and an index only exists when a
// connection does: the fakes used elsewhere cannot tell a working rule from a
// missing one. The cases chosen are the ones a user can reach — a second "Ania"
// registering, a second quiz attached to one lecture, an attempt belonging to
// nobody.

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import mongoose from "mongoose";
import { clear, connect, disconnect } from "../../test/mongo";
import Attempt from "./Attempt";
import Lecture from "./Lecture";
import Question from "./Question";
import Quiz from "./Quiz";
import User from "./User";

before(connect);
after(disconnect);
beforeEach(clear);

test("refuses a second account with the same nickname in another case", async () => {
    await User.init();

    await User.create({ user: "Ania", userKey: "ania", email: "a@students.local" });

    await assert.rejects(
        User.create({ user: "ANIA", userKey: "ania", email: "b@students.local" }),
        (error: any) => error.code === 11000,
    );
});

test("keeps two accounts without a nickname apart", async () => {
    await User.init();

    // `userKey` is unique *and* sparse: accounts written before nicknames existed
    // have no key at all, and a plain unique index would let only one of them exist.
    await User.create({ email: "old@students.local" });
    await User.create({ email: "older@students.local" });

    assert.equal(await User.countDocuments({}), 2);
});

test("attaches one quiz to a lecture at most", async () => {
    await Quiz.init();

    const lecture = await Lecture.create({ topic: "Anatomia" });
    await Quiz.create({ title: "Pierwszy", lecture: lecture._id });

    await assert.rejects(
        Quiz.create({ title: "Drugi", lecture: lecture._id }),
        (error: any) => error.code === 11000,
    );
});

test("keeps quizzes that belong to no lecture", async () => {
    await Quiz.init();

    // Detached quizzes exist (a picture test made from a poster); the unique index
    // must not turn the second one into a duplicate.
    await Quiz.create({ title: "Bez wykładu" });
    await Quiz.create({ title: "Też bez wykładu" });

    assert.equal(await Quiz.countDocuments({}), 2);
});

test("rejects a threshold outside 0..100", async () => {
    await assert.rejects(Quiz.create({ title: "Zły próg", threshold: 140 }));
});

test("refuses an attempt that belongs to no user", async () => {
    await assert.rejects(
        Attempt.create({ quiz: new mongoose.Types.ObjectId() }),
        (error: any) => error.name === "ValidationError",
    );
});

test("defaults an attempt to an unjudged state", async () => {
    const attempt = await Attempt.create({
        user: new mongoose.Types.ObjectId(),
        quiz: new mongoose.Types.ObjectId(),
    });

    // `null`, not `false`: an attempt saved before thresholds existed was never
    // judged, and history must not read it as a failed student.
    assert.equal(attempt.threshold, null);
    assert.equal(attempt.passed, null);
});

test("stamps a lecture with its creation time", async () => {
    const lecture = await Lecture.create({ topic: "Chirurgia" });

    assert.ok(lecture.createdAt instanceof Date);
});

test("stores question answers as given and keeps the key on ids", async () => {
    const question = await Question.create({
        question: "Które narzędzie?",
        answers: [
            { id: "a", text: "Kleszcze" },
            { id: "b", text: "Kiretka" },
        ],
        correctAnswers: ["b"],
    });

    const stored = await Question.findById(question._id).lean();

    assert.deepEqual(stored?.correctAnswers, ["b"]);
    assert.equal(stored?.answers.length, 2);
});
