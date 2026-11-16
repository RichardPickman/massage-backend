import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Response } from "express";
// Must stay above the Role import, which reaches jsonwebtoken: this is the same
// repair the entry point does before it loads any route.
import "../../helpers/slowBufferCompat";
import * as jwt from "jsonwebtoken";
import Role from "./index";
import type { RequestWithUser } from "../Token";

const secret = "spec-secret";

process.env.SECRET_KEY = secret;

const sign = (role: string) => jwt.sign({ id: "u1", email: "a@b.c", role }, secret);

const response = () => {
    const res = {
        statusCode: 0,
        body: undefined as unknown,
        status(code: number) {
            res.statusCode = code;

            return res;
        },
        json(body: unknown) {
            res.body = body;

            return res;
        },
    };

    return res;
};

interface CallOptions {
    method?: string;
    authorisation?: string;
}

const call = (options: CallOptions = {}) => {
    const req = {
        method: options.method ?? "POST",
        headers: {},
    } as RequestWithUser;
    const res = response();
    let passed = false;

    if (options.authorisation !== undefined) {
        req.headers.authorization = options.authorisation;
    }

    Role("admin")(
        req,
        res as unknown as Response,
        (() => {
            passed = true;
        }) as NextFunction,
    );

    return { req, res, passed };
};

test("refuses a request carrying no token", () => {
    const { res, passed } = call();

    assert.equal(passed, false);
    assert.equal(res.statusCode, 401);
});

test("refuses a token issued for another role", () => {
    const { res, passed } = call({ authorisation: sign("user") });

    assert.equal(passed, false);
    assert.equal(res.statusCode, 403);
});

test("passes the role it guards through, with the user attached", () => {
    const { req, passed } = call({ authorisation: sign("admin") });

    assert.equal(passed, true);
    assert.deepEqual(req.user, { id: "u1", email: "a@b.c", role: "admin" });
});

test("reads a token sent without the bearer prefix", () => {
    const { req, passed } = call({ authorisation: sign("admin") });

    assert.equal(passed, true);
    assert.equal(req.user?.role, "admin");
});

test("lets a preflight request through without a token", () => {
    const { passed, res } = call({ method: "OPTIONS" });

    assert.equal(passed, true);
    assert.equal(res.statusCode, 0);
});

test("refuses a token signed with another secret", () => {
    const forged = jwt.sign({ id: "u1", email: "a@b.c", role: "admin" }, "wrong");
    const { res, passed } = call({ authorisation: forged });

    assert.equal(passed, false);
    assert.equal(res.statusCode, 401);
});
