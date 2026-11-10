import assert from "node:assert/strict";
import test from "node:test";
import { countPages, pageRange, readPageQuery } from "./pagination.ts";

test("answers a bare request exactly like page 1 of the default size", () => {
  const first = { page: 1, limit: 10 };

  assert.deepEqual(readPageQuery({}), first);
  assert.deepEqual(readPageQuery(undefined), first);
  assert.deepEqual(readPageQuery(null), first);
});

test("reads page and limit", () => {
  assert.deepEqual(readPageQuery({ page: "2", limit: "25" }), {
    page: 2,
    limit: 25,
  });
});

test("defaults the parameter a request leaves out", () => {
  assert.deepEqual(readPageQuery({ page: "3" }), { page: 3, limit: 10 });
  assert.deepEqual(readPageQuery({ limit: "12" }), { page: 1, limit: 12 });
});

test("falls back to page 1 for values that are not whole positive numbers", () => {
  for (const page of ["abc", "0", "-2", "1.5", "", " ", "NaN", "Infinity"]) {
    assert.equal(readPageQuery({ page }).page, 1, `page=${page}`);
  }
});

test("falls back to the default limit for invalid values", () => {
  for (const limit of ["abc", "0", "-5", "2.5", ""]) {
    assert.equal(readPageQuery({ limit }).limit, 10, `limit=${limit}`);
  }
});

test("caps the limit", () => {
  assert.equal(readPageQuery({ limit: "500" }).limit, 50);
  assert.equal(readPageQuery({ limit: "49" }).limit, 49);
});

test("ignores a parameter sent twice", () => {
  assert.deepEqual(readPageQuery({ page: ["1", "9"], limit: ["10", "20"] }), {
    page: 1,
    limit: 10,
  });
});

test("counts pages, rounding up", () => {
  assert.equal(countPages(1, 10), 1);
  assert.equal(countPages(10, 10), 1);
  assert.equal(countPages(11, 10), 2);
  assert.equal(countPages(120, 12), 10);
});

test("counts no pages for an empty collection", () => {
  assert.equal(countPages(0, 10), 0);
});

test("counts no pages when the limit is zero", () => {
  assert.equal(countPages(5, 0), 0);
});

test("skips the rows of the pages before the current one", () => {
  const query = readPageQuery({ page: "3", limit: "10" });

  assert.deepEqual(pageRange(query, 95), { page: 3, pages: 10, skip: 20 });
});

test("clamps a page past the end to the last page", () => {
  const query = readPageQuery({ page: "999", limit: "10" });

  assert.deepEqual(pageRange(query, 95), { page: 10, pages: 10, skip: 90 });
});

test("clamps a page that no longer has rows after a delete", () => {
  const query = readPageQuery({ page: "2", limit: "10" });

  assert.deepEqual(pageRange(query, 10), { page: 1, pages: 1, skip: 0 });
});

test("answers the first page of an empty collection", () => {
  const query = readPageQuery({ page: "4" });

  assert.deepEqual(pageRange(query, 0), { page: 1, pages: 0, skip: 0 });
});
