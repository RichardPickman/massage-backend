import "../helpers/slowBufferCompat";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after, before } from "node:test";
import * as jwt from "jsonwebtoken";
import errorHandler from "../middleware/ErrorHandle/index";
import UserResolver from "../services/User";
import adminRouter from "./adminRouter";

process.env.SECRET_KEY = "spec-secret-key";
process.env.REGISTRATION_CODE = "PRZEMYSLAW-2026-KOD";

const app = express();

app.use(express.json());
app.use("/api/admin", adminRouter);
app.use(errorHandler);

let server: Server;
let base = "";

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

const tokenFor = (id: string, role: string) =>
    jwt.sign({ id, email: "a@b.c", role }, "spec-secret-key");

const admin = () => tokenFor("admin-1", "admin");

const call = (
    path: string,
    { method = "GET", body, token }: { method?: string; body?: unknown; token?: string } = {},
) => {
    const headers: Record<string, string> = {};

    if (token !== undefined) {
        headers.authorization = `Bearer ${token}`;
    }

    if (body !== undefined) {
        headers["content-type"] = "application/json";
    }

    return fetch(`${base}/api/admin${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
};

const stub = <K extends keyof typeof UserResolver>(
    key: K,
    value: unknown,
) => {
    (UserResolver as unknown as Record<string, unknown>)[key as string] = value;
};

test("lists users for an admin, page and search included", async () => {
    stub("list", async ({ page, limit }: { page: number; limit: number }) => ({
        items: [
            { id: "u1", user: "Ania", email: "ania@students.local", role: "user" },
        ],
        total: 1,
        page,
        pages: 1,
        limit,
    }));

    const response = await call("/users?page=1&search=ania", { token: admin() });

    assert.equal(response.status, 200);

    const body = (await response.json()) as {
        items: { user: string }[];
        total: number;
        page: number;
    };

    assert.equal(body.total, 1);
    assert.equal(body.items[0].user, "Ania");
});

test("refuses the list to a non-admin", async () => {
    const response = await call("/users", { token: tokenFor("u1", "user") });

    assert.equal(response.status, 403);
});

test("changes a role", async () => {
    stub("findById", async () => ({ _id: "u2", user: "Marek", role: "user" }));
    stub("countAdmins", async () => 2);
    stub("updateById", async () => ({
        _id: "u2",
        user: "Marek",
        email: "marek@students.local",
        role: "admin",
    }));

    const response = await call("/users/u2", {
        method: "PATCH",
        token: admin(),
        body: { role: "admin" },
    });

    assert.equal(response.status, 200);
    assert.equal(((await response.json()) as { role: string }).role, "admin");
});

test("refuses an unknown role", async () => {
    stub("findById", async () => ({ _id: "u2", user: "Marek", role: "user" }));

    const response = await call("/users/u2", {
        method: "PATCH",
        token: admin(),
        body: { role: "owner" },
    });

    assert.equal(response.status, 400);

    const body = (await response.json()) as { code: string };

    assert.equal(body.code, "admin.roleInvalid");
});

test("refuses a short password, and hashes a sensible one", async () => {
    stub("findById", async () => ({ _id: "u2", user: "Marek", role: "user" }));
    stub("countAdmins", async () => 2);
    let stored = "";

    stub("updateById", async (_id: string, changes: { password?: string }) => {
        stored = changes.password ?? "";

        return { _id: "u2", user: "Marek", email: "marek@students.local", role: "user" };
    });

    const short = await call("/users/u2", {
        method: "PATCH",
        token: admin(),
        body: { password: "abc" },
    });

    assert.equal(short.status, 400);

    const ok = await call("/users/u2", {
        method: "PATCH",
        token: admin(),
        body: { password: "a-long-password" },
    });

    assert.equal(ok.status, 200);
    // Never the plain text, and at the cost registration uses.
    assert.match(stored, /^\$2[aby]\$10\$/);
});

test("refuses to rename onto a nickname somebody else has", async () => {
    stub("findById", async () => ({ _id: "u2", user: "Marek", role: "user" }));
    stub("findByNickname", async () => ({ _id: "u9", user: "Ania" }));

    const response = await call("/users/u2", {
        method: "PATCH",
        token: admin(),
        body: { user: "Ania" },
    });

    assert.equal(response.status, 400);
    assert.equal(
        ((await response.json()) as { code: string }).code,
        "auth.nicknameTaken",
    );
});

test("refuses a patch that would demote the last admin", async () => {
    stub("findById", async () => ({ _id: "admin-2", user: "Owner", role: "admin" }));
    stub("countAdmins", async () => 1);

    const response = await call("/users/admin-2", {
        method: "PATCH",
        token: admin(),
        body: { role: "user" },
    });

    assert.equal(response.status, 400);
    assert.equal(
        ((await response.json()) as { code: string }).code,
        "admin.lastAdmin",
    );
});

test("answers 404 for an id nobody has", async () => {
    stub("findById", async () => null);

    const response = await call("/users/missing", {
        method: "DELETE",
        token: admin(),
    });

    assert.equal(response.status, 404);
});

test("refuses to delete your own account", async () => {
    stub("findById", async () => ({ _id: "admin-1", user: "Owner", role: "admin" }));
    stub("countAdmins", async () => 3);

    const response = await call("/users/admin-1", {
        method: "DELETE",
        token: admin(),
    });

    assert.equal(response.status, 400);
    assert.equal(
        ((await response.json()) as { code: string }).code,
        "admin.cannotRemoveSelf",
    );
});

test("deletes somebody else and says what it did", async () => {
    stub("findById", async () => ({ _id: "u2", user: "Marek", role: "user" }));
    stub("countAdmins", async () => 2);
    let deleted = "";

    stub("delete", async (id: string) => {
        deleted = id;

        return { deletedCount: 1 };
    });

    const response = await call("/users/u2", {
        method: "DELETE",
        token: admin(),
    });

    assert.equal(response.status, 200);
    assert.equal(deleted, "u2");
    assert.equal(
        ((await response.json()) as { code: string }).code,
        "user.removed",
    );
});
