import assert from "node:assert/strict";
import type { Response } from "express";
import test from "node:test";
import { makeInviteCode } from "../helpers/invite";
import type { RequestWithUser } from "../middleware/Token";
import UserResolver from "../services/User";
import UserController from "./userController";

const controller = new UserController();

const secret = "spec-secret";
const refusal = "This address needs a valid invite code to register";

process.env.SECRET_KEY = "spec-secret-key";
process.env.INVITE_SECRET = secret;
process.env.ADMIN_EMAILS = "owner@example.com";

// The service is a singleton behind a CommonJS import, so this spec and the
// controller hold the same object: replacing a method replaces it for both.
const stubFind = (account: unknown) => {
    const queries: unknown[] = [];

    UserResolver.find = ((query: unknown) => {
        queries.push(query);

        return Promise.resolve(account);
    }) as typeof UserResolver.find;

    return queries;
};

const stubCreate = (account: unknown) => {
    const calls: Record<string, string>[] = [];

    UserResolver.create = ((values: Record<string, string>) => {
        calls.push(values);

        return Promise.resolve(account);
    }) as typeof UserResolver.create;

    return calls;
};

const register = async (body: Record<string, unknown>) => {
    const res = {
        statusCode: 0,
        body: undefined as unknown,
        status(code: number) {
            res.statusCode = code;

            return res;
        },
        json(payload: unknown) {
            res.body = payload;

            return res;
        },
    };
    const failures: { status: number; message: string }[] = [];

    await controller.registration(
        { body } as RequestWithUser,
        res as unknown as Response,
        ((error: { status: number; message: string }) => {
            failures.push(error);
        }) as unknown,
    );

    return { res, failures };
};

test("refuses a registration with no code without reading the user collection", async () => {
    const queries = stubFind({ _id: "existing" });
    const created = stubCreate({ _id: "new" });

    const { res, failures } = await register({
        email: "stranger@example.com",
        password: "a-long-password",
    });

    assert.equal(failures.length, 1);
    assert.equal(failures[0].status, 403);
    assert.equal(res.body, undefined);
    // The point of checking the code first: a refused caller cannot use this
    // endpoint to find out whether an address is registered.
    assert.deepEqual(queries, []);
    assert.deepEqual(created, []);
});

test("refuses a code minted for another address with the same message", async () => {
    const queries = stubFind(null);
    const code = makeInviteCode("invited@example.com", secret);

    const { failures } = await register({
        email: "stranger@example.com",
        password: "a-long-password",
        code,
    });

    assert.equal(failures[0].status, 403);
    assert.equal(failures[0].message, refusal);
    assert.deepEqual(queries, []);
});

test("creates the account its code was minted for, as an ordinary user", async () => {
    const queries = stubFind(null);
    const created = stubCreate({ _id: "new" });
    const code = makeInviteCode("friend@example.com", secret);

    const { res, failures } = await register({
        user: "Friend",
        email: " Friend@Example.COM ",
        password: "a-long-password",
        code,
    });

    assert.deepEqual(failures, []);
    assert.deepEqual(queries, [{ email: "friend@example.com" }]);
    assert.equal(created.length, 1);
    assert.equal(created[0].email, "friend@example.com");
    assert.equal(created[0].role, "user");
    // Stored as a hash, and at a cost worth the time it takes.
    assert.notEqual(created[0].password, "a-long-password");
    assert.match(created[0].password, /^\$2[aby]\$10\$/);
    assert.ok((res.body as { token: string }).token);
});

test("refuses an address that already exists, only after the gate passes", async () => {
    const queries = stubFind({ _id: "existing" });
    const created = stubCreate({ _id: "new" });
    const code = makeInviteCode("friend@example.com", secret);

    const { failures } = await register({
        email: "friend@example.com",
        password: "a-long-password",
        code,
    });

    assert.equal(failures[0].status, 403);
    assert.equal(failures[0].message, refusal);
    assert.deepEqual(queries, [{ email: "friend@example.com" }]);
    assert.deepEqual(created, []);
});

test("registers an admin address with no code, even with no secret set", async () => {
    const configured = process.env.INVITE_SECRET;

    process.env.INVITE_SECRET = "";

    try {
        stubFind(null);
        const created = stubCreate({ _id: "owner" });

        const { failures } = await register({
            email: "owner@example.com",
            password: "a-long-password",
        });

        assert.deepEqual(failures, []);
        assert.equal(created[0].role, "admin");
    } finally {
        process.env.INVITE_SECRET = configured;
    }
});
