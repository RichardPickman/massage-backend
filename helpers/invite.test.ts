import assert from "node:assert/strict";
import test from "node:test";
import {
  decideRegistration,
  isAdminEmail,
  makeInviteCode,
  normalizeEmail,
  verifyInviteCode,
} from "./invite";

const secret = "a-secret-only-the-server-knows";
const nothing = { code: undefined, secret, adminEmails: "" };

test("normalises an address so case and stray space cannot make a second account", () => {
  assert.equal(normalizeEmail("  Foo@Example.COM "), "foo@example.com");
  assert.equal(normalizeEmail(undefined), "");
  assert.equal(normalizeEmail(null), "");
});

test("mints a code a person can read out and paste", () => {
  assert.match(makeInviteCode("a@b.c", secret), /^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
});

test("mints the same code for the same address every time, and never across addresses", () => {
  assert.equal(
    makeInviteCode("a@b.c", secret),
    makeInviteCode("a@b.c", secret),
  );
  assert.notEqual(
    makeInviteCode("a@b.c", secret),
    makeInviteCode("a@b.d", secret),
  );
});

test("mints a different code once the secret changes, retiring the old ones", () => {
  assert.notEqual(
    makeInviteCode("a@b.c", secret),
    makeInviteCode("a@b.c", "another-secret"),
  );
});

test("mints by address, not by how the address was typed", () => {
  assert.equal(
    makeInviteCode("A@B.C", secret),
    makeInviteCode(" a@b.c ", secret),
  );
});

test("accepts a code however the punctuation survived the trip", () => {
  const code = makeInviteCode("a@b.c", secret);

  assert.equal(verifyInviteCode("a@b.c", code, secret), true);
  assert.equal(verifyInviteCode("a@b.c", code.replace(/-/g, ""), secret), true);
  assert.equal(verifyInviteCode("a@b.c", ` ${code.toLowerCase()} `, secret), true);
});

test("refuses a code minted for a different address", () => {
  const code = makeInviteCode("a@b.c", secret);

  assert.equal(verifyInviteCode("someone@else.c", code, secret), false);
});

test("refuses a code with one character changed", () => {
  const code = makeInviteCode("a@b.c", secret);
  const last = code.slice(-1) === "A" ? "B" : "A";
  const tampered = `${code.slice(0, -1)}${last}`;

  assert.equal(verifyInviteCode("a@b.c", tampered, secret), false);
});

test("refuses an empty or missing code without throwing", () => {
  for (const code of ["", " ", undefined, null, "----"]) {
    assert.equal(verifyInviteCode("a@b.c", code, secret), false);
  }
});

test("refuses every code when no secret is configured", () => {
  const code = makeInviteCode("a@b.c", secret);

  assert.equal(verifyInviteCode("a@b.c", code, ""), false);
});

test("reads the admin list with spaces, commas and case", () => {
  assert.equal(isAdminEmail("owner@x.c", " owner@x.c , other@y.c "), true);
  assert.equal(isAdminEmail("OWNER@X.C", "owner@x.c"), true);
  assert.equal(isAdminEmail("nobody@x.c", "owner@x.c"), false);
  assert.equal(isAdminEmail("owner@x.c", ""), false);
});

test("refuses a registration with no code", () => {
  assert.deepEqual(decideRegistration({ email: "a@b.c", ...nothing }), {
    allowed: false,
    role: null,
  });
});

test("refuses a registration whose code belongs to another address", () => {
  const code = makeInviteCode("invited@x.c", secret);

  assert.equal(
    decideRegistration({ email: "other@x.c", code, secret, adminEmails: "" })
      .allowed,
    false,
  );
});

test("admits the address its code was minted for, as an ordinary user", () => {
  const code = makeInviteCode("invited@x.c", secret);

  assert.deepEqual(
    decideRegistration({ email: "invited@x.c", code, secret, adminEmails: "" }),
    { allowed: true, role: "user" },
  );
});

test("admits an admin address with no code, and makes it an admin", () => {
  assert.deepEqual(
    decideRegistration({
      email: "owner@x.c",
      ...nothing,
      adminEmails: "owner@x.c",
    }),
    { allowed: true, role: "admin" },
  );
});

test("admits an admin address even before a secret is configured", () => {
  assert.deepEqual(
    decideRegistration({
      email: "owner@x.c",
      code: undefined,
      secret: "",
      adminEmails: "owner@x.c",
    }),
    { allowed: true, role: "admin" },
  );
});

test("closes registration for everyone else when no secret is configured", () => {
  assert.equal(
    decideRegistration({ email: "a@b.c", code: "ABCD-1234-EF56-7890", secret: "", adminEmails: "owner@x.c" })
      .allowed,
    false,
  );
});

test("refuses a registration with no address at all", () => {
  for (const email of ["", " ", undefined, null]) {
    assert.equal(
      decideRegistration({ email, ...nothing, adminEmails: "owner@x.c" }).allowed,
      false,
    );
  }
});
