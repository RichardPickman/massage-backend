import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";
import test from "node:test";
import logger from ".";

// The middleware only writes to the console, so the way to assert what it logs
// is to take the console away for the length of the call.
const logRequest = (method: string, body?: unknown) => {
  const lines: string[] = [];
  const original = console.log;
  let passed = false;

  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };

  try {
    logger(
      { method, url: "/api/users/login", body } as Request,
      {} as Response,
      (() => {
        passed = true;
      }) as unknown as NextFunction,
    );
  } finally {
    console.log = original;
  }

  return { output: lines.join("\n"), passed };
};

test("the password never reaches the log, the rest of the body does", () => {
  const { output, passed } = logRequest("POST", {
    email: "friend@example.com",
    password: "a-long-password",
  });

  assert.ok(passed);
  assert.match(output, /friend@example\.com/);
  assert.doesNotMatch(output, /a-long-password/);
  assert.match(output, /"password":"\[redacted\]"/);
});

test("an invite code is redacted too: it is worth an account", () => {
  const { output } = logRequest("POST", {
    email: "friend@example.com",
    code: "FE8E-FE79-FBDD-23D6",
  });

  assert.doesNotMatch(output, /FE8E-FE79-FBDD-23D6/);
  assert.match(output, /"code":"\[redacted\]"/);
});

test("a request with no body logs no body line", () => {
  const { output, passed } = logRequest("GET");

  assert.ok(passed);
  assert.doesNotMatch(output, /Request body/);
  assert.match(output, /\/api\/users\/login/);
});
