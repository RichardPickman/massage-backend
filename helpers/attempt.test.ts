import assert from "node:assert/strict";
import test from "node:test";
import { buildAttemptAnswers } from "./attempt";
import { scoreAttempt } from "./score";

const questions = [
  {
    _id: "q1",
    question: "Which muscle closes the jaw?",
    answers: [
      { id: "a", text: "Masseter" },
      { id: "b", text: "Orbicularis oris" },
    ],
    correctAnswers: ["a"],
  },
  {
    _id: "q2",
    question: "Which nerve is affected in Bell's palsy?",
    answers: [
      { id: "c", text: "Facial" },
      { id: "d", text: "Trigeminal" },
    ],
    correctAnswers: ["c"],
  },
];

test("snapshots every question, answered or not", () => {
  const score = scoreAttempt(questions, [{ questionId: "q1", selected: ["a"] }]);
  const snapshot = buildAttemptAnswers(score.results, [
    { questionId: "q1", selected: ["a"] },
  ]);

  assert.equal(snapshot.length, 2);
  assert.equal(snapshot[1].questionText, "Which nerve is affected in Bell's palsy?");
  assert.deepEqual(snapshot[1].selected, []);
  assert.equal(snapshot[1].correct, false);
});

test("carries the answers and the key the student was graded against", () => {
  const score = scoreAttempt(questions, [
    { questionId: "q1", selected: ["a"] },
    { questionId: "q2", selected: ["c"] },
  ]);
  const snapshot = buildAttemptAnswers(score.results, [
    { questionId: "q1", selected: ["a"] },
    { questionId: "q2", selected: ["c"] },
  ]);

  assert.deepEqual(snapshot[0].answers, [
    { id: "a", text: "Masseter" },
    { id: "b", text: "Orbicularis oris" },
  ]);
  assert.deepEqual(snapshot[0].correctAnswers, ["a"]);
  assert.equal(snapshot[0].correct, true);
});

test("ignores answers for questions that are not on the quiz", () => {
  const score = scoreAttempt(questions, [
    { questionId: "invented", selected: ["a"] },
  ]);
  const snapshot = buildAttemptAnswers(score.results, [
    { questionId: "invented", selected: ["a"] },
  ]);

  assert.equal(snapshot.length, 2);
  assert.deepEqual(snapshot[0].selected, []);
});

test("keeps the snapshot independent of later edits to the source question", () => {
  const score = scoreAttempt(questions, [
    { questionId: "q1", selected: ["a"] },
  ]);
  const snapshot = buildAttemptAnswers(score.results, [
    { questionId: "q1", selected: ["a"] },
  ]);

  // The review must render from the snapshot, so mutating the question later
  // cannot change what this attempt shows.
  questions[0].question = "EDITED AFTER SUBMISSION";
  questions[0].answers[0].text = "EDITED";

  assert.equal(snapshot[0].questionText, "Which muscle closes the jaw?");
  assert.equal(snapshot[0].answers[0].text, "Masseter");

  questions[0].question = "Which muscle closes the jaw?";
  questions[0].answers[0].text = "Masseter";
});
