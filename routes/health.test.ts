import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after, before } from "node:test";
import healthRouter from "./health";

const app = express();
let server: Server;
let base = "";

// Deliberately the health router on its own: importing the full router would pull
// in the database and the bucket, and this answer must not depend on either.
app.use("/api/health", healthRouter);

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

test("answers ok with nothing else configured", async () => {
    const response = await fetch(`${base}/api/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
});
