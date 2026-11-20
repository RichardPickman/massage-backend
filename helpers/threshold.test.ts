import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_THRESHOLD, parseThreshold } from "./threshold";

test("treats a missing threshold as absent, not as the default", () => {
  assert.equal(parseThreshold(undefined), null);
  assert.equal(parseThreshold(null), null);
  assert.equal(parseThreshold(""), null);
});

test("accepts the whole range and both ends", () => {
  assert.deepEqual(parseThreshold(0), { ok: true, value: 0 });
  assert.deepEqual(parseThreshold(50), { ok: true, value: 50 });
  assert.deepEqual(parseThreshold(100), { ok: true, value: 100 });
});

test("accepts numbers sent as strings from a form", () => {
  assert.deepEqual(parseThreshold("75"), { ok: true, value: 75 });
  assert.deepEqual(parseThreshold(" 75 "), { ok: true, value: 75 });
});

test("rejects out-of-range values instead of clamping them", () => {
  const low = parseThreshold(-1);
  const high = parseThreshold(101);

  assert.equal(low?.ok, false);
  assert.equal(high?.ok, false);
});

test("rejects fractions and nonsense", () => {
  assert.equal(parseThreshold(50.5)?.ok, false);
  assert.equal(parseThreshold("abc")?.ok, false);
  assert.equal(parseThreshold(Number.NaN)?.ok, false);
});

test("keeps the default where a create has to fall back", () => {
  assert.equal(DEFAULT_THRESHOLD, 50);
});
