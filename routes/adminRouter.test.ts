import "../helpers/slowBufferCompat";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after, before } from "node:test";
import * as jwt from "jsonwebtoken";
import { makeInviteCode, verifyInviteCode } from "../helpers/invite";
import errorHandler from "../middleware/ErrorHandle/index";
import adminRouter from "./adminRouter";

const secret = "spec-invite-secret";

process.env.SECRET_KEY = "spec-secret-key";
process.env.INVITE_SECRET = secret;

const app = express();
let server: Server;
let base = "";

// Mounted where the real app mounts it, behind the same error handler, so the
// refusal a caller sees here is the one they would see in production.
app.use("/api/admin", adminRouter);
app.use(errorHandler);

before(
    () =>
        new Promise<void>((resolve) => {
            server = app.listen(0, () => {
                const { port } = server.address() as AddressInfo;

                base = `http://127.0.0.1:${port}`;

                resolve();
            });
        }),
);

after(
    () =>
        new Promise<void>((resolve) => {
            server.close(() => resolve());
        }),
);

const tokenFor = (role: string) =>
    jwt.sign({ id: "u1", email: "a@b.c", role }, "spec-secret-key");

const invite = (email: string, options: { token?: string; method?: string } = {}) => {
    const headers: Record<string, string> = {};

    if (options.token !== undefined) {
        headers.authorization = `Bearer ${options.token}`;
    }

    return fetch(
        `${base}/api/admin/invites?email=${encodeURIComponent(email)}`,
        { method: options.method ?? "GET", headers },
    );
};

test("refuses a caller with no token", async () => {
    const response = await invite("friend@example.com");

    assert.equal(response.status, 401);
});

test("refuses a caller who is not an admin", async () => {
    const response = await invite("friend@example.com", {
        token: tokenFor("user"),
    });

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { message: "Not authorized" });
});

test("lets a preflight request through, so the browser's own call can happen", async () => {
    const response = await invite("friend@example.com", { method: "OPTIONS" });

    assert.notEqual(response.status, 401);
    assert.notEqual(response.status, 403);
});

test("answers a malformed address with a refusal, never with a code", async () => {
    const response = await invite("not-an-address", { token: tokenFor("admin") });

    assert.equal(response.status, 400);

    const body = (await response.json()) as { message: string; code?: string };

    assert.equal(body.code, undefined);
});

test("hands an admin the same code the minting script would", async () => {
    const response = await invite(" Friend@Example.com ", {
        token: tokenFor("admin"),
    });

    assert.equal(response.status, 200);

    const body = (await response.json()) as { email: string; code: string };

    assert.equal(body.email, "friend@example.com");
    assert.equal(body.code, makeInviteCode("friend@example.com", secret));
    // And it is the code the registration gate accepts, which is the whole point.
    assert.equal(verifyInviteCode("friend@example.com", body.code, secret), true);
    assert.equal(verifyInviteCode("someone@else.c", body.code, secret), false);
});

test("says so instead of minting when no secret is configured", async () => {
    const configured = process.env.INVITE_SECRET;

    process.env.INVITE_SECRET = "";

    try {
        const response = await invite("friend@example.com", {
            token: tokenFor("admin"),
        });

        assert.equal(response.status, 500);
    } finally {
        process.env.INVITE_SECRET = configured;
    }
});
