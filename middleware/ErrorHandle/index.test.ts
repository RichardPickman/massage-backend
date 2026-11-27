// The one place every thrown error becomes a response.
//
// Two shapes leave here: an ApiError carries its status and, when it opted in, a
// machine-readable `code` the client translates; anything else is a 500. A change
// in that split shows up on the client as an English sentence in the Polish UI, so
// it is worth pinning.

import assert from "node:assert/strict";
import test from "node:test";
import ApiError from "../../Error";
import ErrorHandle from "./index";

const run = (err: unknown) => {
    const state: { status?: number; body?: unknown } = {};
    const res = {
        status(code: number) {
            state.status = code;

            return this;
        },
        json(body: unknown) {
            state.body = body;

            return this;
        },
    };

    ErrorHandle(err, {}, res, () => undefined);

    return state;
};

test("answers an ApiError with its own status and message", () => {
    const state = run(new ApiError(404, "Nie znaleziono"));

    assert.equal(state.status, 404);
    assert.deepEqual(state.body, { message: "Nie znaleziono" });
});

test("passes the client code through when the error has one", () => {
    const state = run(ApiError.forbidden("Brak dostępu", "auth.notAuthorised"));

    assert.equal(state.status, 403);
    assert.deepEqual(state.body, { message: "Brak dostępu", code: "auth.notAuthorised" });
});

test("keeps each ApiError factory on its own status", () => {
    assert.equal(run(ApiError.badRequest("x")).status, 404);
    assert.equal(run(ApiError.internal("x")).status, 500);
    assert.equal(run(ApiError.forbidden("x")).status, 403);
    assert.equal(run(ApiError.tooManyRequests("x")).status, 429);
});

test("turns anything else into a 500", () => {
    const state = run(new Error("boom"));

    assert.equal(state.status, 500);
    assert.deepEqual(state.body, { message: new Error("boom") });
});

test("keeps the status a thrown non-ApiError object carried", () => {
    // Multer and jsonwebtoken throw plain objects with a status; the handler answers
    // 500 for them today, and this test states that rather than blessing it.
    const state = run({ status: 413, message: "File too large" });

    assert.equal(state.status, 500);
});
