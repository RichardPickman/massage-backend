import "../helpers/slowBufferCompat";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after, before } from "node:test";
import * as jwt from "jsonwebtoken";
import errorHandler from "../middleware/ErrorHandle/index";
import adminRouter from "./adminRouter";

const registrationCode = "PRZEMYSLAW-2026-KOD";

process.env.SECRET_KEY = "spec-secret-key";
process.env.REGISTRATION_CODE = registrationCode;

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

const readCode = (options: { token?: string; method?: string } = {}) => {
    const headers: Record<string, string> = {};

    if (options.token !== undefined) {
        headers.authorization = `Bearer ${options.token}`;
    }

    return fetch(`${base}/api/admin/registration-code`, {
        method: options.method ?? "GET",
        headers,
    });
};

test("refuses a caller with no token", async () => {
    const response = await readCode();

    assert.equal(response.status, 401);
});

test("refuses a caller who is not an admin", async () => {
    const response = await readCode({ token: tokenFor("user") });

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { message: "Not authorized" });
});

test("lets a preflight request through, so the browser's own call can happen", async () => {
    const response = await readCode({ method: "OPTIONS" });

    assert.notEqual(response.status, 401);
    assert.notEqual(response.status, 403);
});

test("hands an admin the very code the registration gate accepts", async () => {
    const response = await readCode({ token: tokenFor("admin") });

    assert.equal(response.status, 200);

    const body = (await response.json()) as { code: string };

    // One code for everybody: there is no address in the answer any more, and
    // the panel must never show a code that differs from the one checked.
    assert.equal(body.code, registrationCode);
    assert.deepEqual(Object.keys(body), ["code"]);
});



test("says so instead of showing an empty code when none is configured", async () => {
    const configured = process.env.REGISTRATION_CODE;

    process.env.REGISTRATION_CODE = "";

    try {
        const response = await readCode({ token: tokenFor("admin") });

        assert.equal(response.status, 500);
    } finally {
        process.env.REGISTRATION_CODE = configured;
    }
});
