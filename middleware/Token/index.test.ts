// The token gate: everything behind `/api` answers through it, so its refusals are
// the difference between a guest and a 500.
//
// Nothing here needs a database — the middleware only reads a header and verifies a
// signature — but nothing covered it either, and a change in the fallback shapes
// (a bare token without "Bearer", a payload signed as a plain string) would only
// show up as a broken sign-in.

import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import type { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import Token, { readToken, toTokenUser, type RequestWithUser } from "./index";

const SECRET = "test-secret";

beforeEach(() => {
    process.env.SECRET_KEY = SECRET;
});

const run = (req: Partial<RequestWithUser>) => {
    const state: { status?: number; body?: unknown; nexted: boolean } = { nexted: false };
    const res = {
        status(code: number) {
            state.status = code;

            return this;
        },
        json(body: unknown) {
            state.body = body;

            return this;
        },
    } as unknown as Response;
    const next = (() => {
        state.nexted = true;
    }) as NextFunction;

    Token(req as RequestWithUser, res, next);

    return state;
};

test("reads a token with the Bearer prefix", () => {
    assert.equal(readToken({ headers: { authorization: "Bearer abc" } } as any), "abc");
});

test("reads a bare token, because a proxy may strip the prefix", () => {
    assert.equal(readToken({ headers: { authorization: "abc" } } as any), "abc");
});

test("answers null when there is no authorization header", () => {
    assert.equal(readToken({ headers: {} } as any), null);
});

test("lets a preflight request through without a token", () => {
    const state = run({ method: "OPTIONS", headers: {} } as any);

    assert.equal(state.nexted, true);
    assert.equal(state.status, undefined);
});

test("refuses a request with no token", () => {
    const state = run({ method: "GET", headers: {} } as any);

    assert.equal(state.status, 401);
    assert.deepEqual(state.body, { message: "Not authorised", code: "auth.notAuthorised" });
});

test("attaches the user of a valid token to the request", () => {
    const token = jwt.sign({ id: "123", email: "a@students.local", role: "admin" }, SECRET);
    const req: RequestWithUser = { method: "GET", headers: { authorization: `Bearer ${token}` } } as any;

    const state = run(req);

    assert.equal(state.nexted, true);
    assert.deepEqual(req.user, { id: "123", email: "a@students.local", role: "admin" });
});

test("fills the gaps of an old token instead of sending undefined", () => {
    // Tokens minted before nicknames and roles existed carry neither field.
    const token = jwt.sign({ id: "123" }, SECRET);
    const req: RequestWithUser = { method: "GET", headers: { authorization: `Bearer ${token}` } } as any;

    run(req);

    assert.deepEqual(req.user, { id: "123", email: "", role: "user" });
});

test("refuses a token signed with another secret", () => {
    const token = jwt.sign({ id: "123" }, "not-our-secret");
    const state = run({ method: "GET", headers: { authorization: `Bearer ${token}` } } as any);

    assert.equal(state.status, 401);
});

test("refuses a token whose payload is a plain string", () => {
    // jsonwebtoken accepts a string payload; the middleware reads an object, so this
    // path must end in 401 rather than a crash on `decoded.id` of a string.
    const token = jwt.sign("just-a-string", SECRET);
    const state = run({ method: "GET", headers: { authorization: `Bearer ${token}` } } as any);

    assert.equal(state.status, 401);
});

test("maps a payload to a token user", () => {
    assert.deepEqual(toTokenUser({ id: 7, email: "a@b", role: "admin" }), { id: "7", email: "a@b", role: "admin" });
});
