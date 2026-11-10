import "../helpers/slowBufferCompat";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after, before } from "node:test";
import errorHandler from "../middleware/ErrorHandle/index";
import UserResolver from "../services/User";
import userRouter from "./userRouter";

process.env.SECRET_KEY = "spec-secret-key";

// The account lookup is the only thing between these requests and the network,
// so it answers "no such account" and leaves the assertions to the fence.
UserResolver.find = (() =>
    Promise.resolve(null)) as unknown as typeof UserResolver.find;

const app = express();
let server: Server;
let base = "";

app.use(express.json());
app.use("/api/users", userRouter);
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

const post = (path: string, body: Record<string, unknown>) =>
    fetch(`${base}/api/users/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });

const attemptSignIn = () =>
    post("login", { email: "stranger@example.com", password: "guess" });

test("lets ten tries through, then refuses with a wait", async () => {
    for (let tryNumber = 1; tryNumber <= 10; tryNumber += 1) {
        const response = await attemptSignIn();

        assert.notEqual(response.status, 429, `try ${tryNumber}`);
    }

    const refused = await attemptSignIn();

    assert.equal(refused.status, 429);
    assert.deepEqual(await refused.json(), {
        message: "Too many attempts. Wait a few minutes and try again.",
    });
    assert.ok(
        Number(refused.headers.get("retry-after")) > 0,
        "a refusal without a wait is a dead end",
    );
});

test("fences registration with the same counter as sign-in", async () => {
    // The window above is spent: one caller cannot dodge the fence by switching
    // from guessing passwords to guessing invite codes.
    const response = await post("registration", {
        email: "someone@example.com",
        password: "a-long-password",
        code: "AAAA-BBBB-CCCC-DDDD",
    });

    assert.equal(response.status, 429);
});
