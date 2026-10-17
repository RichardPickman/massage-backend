import assert from "node:assert/strict";
import test from "node:test";
import { scoreAttempt } from "./score.ts";

const questions = [
  { _id: "q1", correctAnswers: ["a"] },
  { _id: "q2", correctAnswers: ["b", "c"] },
  { _id: "q3", correctAnswers: ["d"] },
];

test("counts an exact match as correct", () => {
  const result = scoreAttempt(questions, [
    { questionId: "q1", selected: ["a"] },
    { questionId: "q2", selected: ["b", "c"] },
    { questionId: "q3", selected: ["d"] },
  ]);

  assert.equal(result.correctCount, 3);
  assert.equal(result.questionCount, 3);
  assert.equal(result.percent, 100);
});

test("treats a partial selection as wrong, never as partial credit", () => {
  const result = scoreAttempt(questions, [
    { questionId: "q1", selected: ["a"] },
    { questionId: "q2", selected: ["b"] },
    { questionId: "q3", selected: [] },
  ]);

  assert.equal(result.correctCount, 1);
  assert.equal(result.percent, 33);
});

test("treats an extra wrong answer as wrong", () => {
  const result = scoreAttempt(questions, [
    { questionId: "q1", selected: ["a", "z"] },
  ]);

  assert.equal(result.results[0].correct, false);
  assert.equal(result.correctCount, 0);
});

test("ignores answer order", () => {
  const result = scoreAttempt(questions, [
    { questionId: "q2", selected: ["c", "b"] },
  ]);

  assert.equal(result.results[1].correct, true);
});

test("ignores duplicated selections", () => {
  const result = scoreAttempt(questions, [
    { questionId: "q1", selected: ["a", "a"] },
  ]);

  assert.equal(result.results[0].correct, false);
});

test("ignores questions that are not part of the quiz", () => {
  const result = scoreAttempt(questions, [
    { questionId: "q1", selected: ["a"] },
    { questionId: "invented", selected: ["a"] },
  ]);

  assert.equal(result.questionCount, 3);
  assert.equal(result.correctCount, 1);
});

test("counts an unanswered question as wrong without crashing", () => {
  const result = scoreAttempt(questions, []);

  assert.equal(result.correctCount, 0);
  assert.equal(result.percent, 0);
  assert.equal(result.results.length, 3);
});

test("never awards a question with no stored answers", () => {
  const result = scoreAttempt([{ _id: "q1", correctAnswers: [] }], [
    { questionId: "q1", selected: [] },
  ]);

  assert.equal(result.results[0].correct, false);
  assert.equal(result.percent, 0);
});

test("handles an empty quiz", () => {
  const result = scoreAttempt([], []);

  assert.deepEqual(result, {
    correctCount: 0,
    questionCount: 0,
    percent: 0,
    results: [],
  });
});
