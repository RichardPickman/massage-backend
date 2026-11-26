import assert from "node:assert/strict";
import test from "node:test";
import { shuffle } from "./shuffle";

test("keeps every item, and only their order changes", () => {
  const source = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const out = shuffle(source);

  assert.equal(out.length, source.length);
  assert.deepEqual([...out].sort(), [...source].sort());
});

test("never mutates what it was given", () => {
  const source = ["A", "B", "C", "D"];
  const copy = [...source];

  shuffle(source, () => 0.5);

  // The quiz document is shared state: reordering it in place would rewrite the
  // stored order on the next save.
  assert.deepEqual(source, copy);
});

test("actually reorders when the dice are lopsided", () => {
  const source = ["A", "B", "C", "D", "E"];

  // random() === 0 always picks index 0, which rotates the whole list.
  assert.deepEqual(shuffle(source, () => 0), ["B", "C", "D", "E", "A"]);
});

test("is the same list twice with a fixed dice", () => {
  const source = ["A", "B", "C", "D", "E", "F"];
  const dice = () => 0.42;

  assert.deepEqual(shuffle(source, dice), shuffle(source, dice));
});

test("handles the empty and single-item lists", () => {
  assert.deepEqual(shuffle([]), []);
  assert.deepEqual(shuffle(["A"]), ["A"]);
});

test("reaches every position over many draws", () => {
  const source = ["A", "B", "C", "D", "E"];
  const seen = new Set<number>();

  for (let run = 0; run < 200; run += 1) {
    seen.add(shuffle(source).indexOf("A"));
  }

  // A biased shuffle (the sort-with-random shortcut) tends to leave the first
  // item near its place; Fisher–Yates spreads it over the whole list.
  assert.equal(seen.size, source.length);
});
