import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";
import test from "node:test";
import { throttle } from ".";

const limit = 3;
const start = 1_700_000_000_000;

let clock = start;

// Each test gets its own guard, so its own counters, but time only moves when a
// test asks it to.
const makeGuard = () =>
    throttle({
        limit,
        windowMs: 60_000,
        message: "Too many attempts",
        now: () => clock,
    });

type Guard = ReturnType<typeof makeGuard>;

const attempt = (guard: Guard, ip = "1.2.3.4") => {
    const headers: Record<string, string> = {};
    const failures: { status: number; message: string }[] = [];
    const res = {
        set(name: string, value: string) {
            headers[name] = value;

            return this;
        },
    };

    guard(
        { ip } as Request,
        res as unknown as Response,
        ((error?: { status: number; message: string }) => {
            // next() with no argument is the pass-through path, not a refusal.
            if (error !== undefined) {
                failures.push(error);
            }
        }) as unknown as NextFunction,
    );

    return { headers, failures };
};

test("lets a caller through up to the limit", () => {
    clock = start;

    const guard = makeGuard();

    for (let tryNumber = 1; tryNumber <= limit; tryNumber += 1) {
        assert.deepEqual(attempt(guard).failures, [], `try ${tryNumber}`);
    }
});

test("refuses the next attempt, with a 429 and a wait", () => {
    clock = start;

    const guard = makeGuard();

    for (let tryNumber = 1; tryNumber <= limit; tryNumber += 1) {
        attempt(guard);
    }

    const { headers, failures } = attempt(guard);

    assert.equal(failures.length, 1);
    assert.equal(failures[0].status, 429);
    assert.equal(failures[0].message, "Too many attempts");
    assert.equal(headers["Retry-After"], "60");
});

test("keeps refusing while the window is open, without extending it", () => {
    clock = start;

    const guard = makeGuard();

    for (let tryNumber = 1; tryNumber <= limit + 1; tryNumber += 1) {
        attempt(guard);
    }

    clock = start + 59_000;

    const { headers, failures } = attempt(guard);

    assert.equal(failures[0].status, 429);
    // Still counting down from the first attempt, not from the last refusal.
    assert.equal(headers["Retry-After"], "1");
});

test("lets the caller back in once the window has passed", () => {
    clock = start;

    const guard = makeGuard();

    for (let tryNumber = 1; tryNumber <= limit + 1; tryNumber += 1) {
        attempt(guard);
    }

    clock = start + 60_001;

    assert.deepEqual(attempt(guard).failures, []);
});

test("counts each caller separately", () => {
    clock = start;

    const guard = makeGuard();

    for (let tryNumber = 1; tryNumber <= limit + 1; tryNumber += 1) {
        attempt(guard, "10.0.0.1");
    }

    assert.deepEqual(attempt(guard, "10.0.0.2").failures, []);
    assert.equal(attempt(guard, "10.0.0.1").failures[0].status, 429);
});
