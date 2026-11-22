import assert from "node:assert/strict";
import test from "node:test";
import { throttle } from "../middleware/Throttle";

// The ceiling that sits in front of /api: one caller gets `limit` requests per
// window, everybody else keeps going.
const makeResponse = () => {
    const headers: Record<string, string> = {};
    const res = {
        set: (key: string, value: string) => {
            headers[key] = value;
        },
    };

    return { res, headers };
};

let clock = 0;
const limiter = throttle({
    limit: 3,
    windowMs: 60_000,
    message: "Too many requests. Slow down and try again shortly.",
    now: () => clock,
});

const ask = (ip: string) => {
    const { res, headers } = makeResponse();
    let failure: { status?: number; message?: string } | null = null;

    limiter(
        { ip } as never,
        res as never,
        (error?: { status?: number; message?: string }) => {
            failure = error ?? null;
        },
    );

    return { failure, headers };
};

test("lets a caller through up to the limit, then refuses with a wait", () => {
    clock = 0;

    for (let i = 0; i < 3; i += 1) {
        assert.equal(ask("10.0.0.1").failure, null);
    }

    const refused = ask("10.0.0.1");

    assert.equal(refused.failure?.status, 429);
    assert.equal(refused.headers["Retry-After"], "60");
});

test("one busy caller does not slow down another", () => {
    clock = 0;

    for (let i = 0; i < 5; i += 1) {
        ask("10.0.0.2");
    }

    assert.equal(ask("10.0.0.3").failure, null);
});

test("forgets a caller once the window has passed", () => {
    clock = 0;

    for (let i = 0; i < 3; i += 1) {
        ask("10.0.0.4");
    }

    assert.notEqual(ask("10.0.0.4").failure, null);

    clock = 61_000;

    assert.equal(ask("10.0.0.4").failure, null);
});
