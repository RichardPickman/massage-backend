import assert from "node:assert/strict";
import test from "node:test";
import {
  codeMatches,
  decideRegistration,
  isAdminEmail,
  normalizeEmail,
  studentAddress,
} from "./invite";

const registrationCode = "PRZEMYSLAW-2026-KOD";
const openRegistration = {
  adminEmails: "",
  registrationCode,
};
const refused = { allowed: false, role: null };

test("normalises an address so case and stray space cannot make a second account", () => {
  assert.equal(normalizeEmail("  Foo@Example.COM "), "foo@example.com");
  assert.equal(normalizeEmail(undefined), "");
  assert.equal(normalizeEmail(null), "");
});

test("accepts the code however the punctuation survived the trip", () => {
  assert.equal(codeMatches(registrationCode, registrationCode), true);
  assert.equal(codeMatches(registrationCode.replace(/-/g, ""), registrationCode), true);
  assert.equal(codeMatches(` ${registrationCode.toLowerCase()} `, registrationCode), true);
});

test("refuses a code with one character changed", () => {
  const tampered = `${registrationCode.slice(0, -1)}X`;

  assert.equal(codeMatches(tampered, registrationCode), false);
});

test("refuses a shorter or longer code without throwing on the length check", () => {
  for (const code of ["", " ", "PRZEMYSLAW", `${registrationCode}X`]) {
    assert.equal(codeMatches(code, registrationCode), false);
  }
});

test("refuses an empty or missing code without throwing", () => {
  for (const code of ["", " ", undefined, null, "----"]) {
    assert.equal(codeMatches(code, registrationCode), false);
  }
});

test("refuses every code when no registration code is configured", () => {
  assert.equal(codeMatches(registrationCode, ""), false);
});

test("makes a student address from the nickname, without asking for one", () => {
  assert.equal(studentAddress("Ania"), "ania@students.local");
  assert.equal(studentAddress("  Jan Kowalski "), "jan.kowalski@students.local");
  assert.equal(studentAddress("Ola_99"), "ola_99@students.local");
});

test("reads the admin list with spaces, commas and case", () => {
  assert.equal(isAdminEmail("owner@x.c", " owner@x.c , other@y.c "), true);
  assert.equal(isAdminEmail("OWNER@X.C", "owner@x.c"), true);
  assert.equal(isAdminEmail("nobody@x.c", "owner@x.c"), false);
  assert.equal(isAdminEmail("owner@x.c", ""), false);
});

test("admits a registration that carries the shared code, as an ordinary user", () => {
  assert.deepEqual(
    decideRegistration({
      email: undefined,
      code: registrationCode,
      ...openRegistration,
    }),
    { allowed: true, role: "user" },
  );
});

test("admits the shared code for any address, since the code is no longer tied to one", () => {
  for (const email of [undefined, "", "anything@else.c"]) {
    assert.equal(
      decideRegistration({ email, code: registrationCode, ...openRegistration }).allowed,
      true,
    );
  }
});

test("refuses a registration with a wrong code", () => {
  assert.deepEqual(
    decideRegistration({
      email: undefined,
      code: "PRZEMYSLAW-2026-KOX",
      ...openRegistration,
    }),
    refused,
  );
});

test("refuses a registration with no code at all", () => {
  assert.deepEqual(
    decideRegistration({ email: undefined, code: undefined, ...openRegistration }),
    refused,
  );
});

test("closes registration for everyone else when no code is configured", () => {
  assert.deepEqual(
    decideRegistration({
      email: "anything@x.c",
      code: "COKOLWIEK",
      adminEmails: "owner@x.c",
      registrationCode: "",
    }),
    refused,
  );
});

test("admits an admin address with no code, and makes it an admin", () => {
  assert.deepEqual(
    decideRegistration({
      email: "owner@x.c",
      code: undefined,
      adminEmails: "owner@x.c",
      registrationCode,
    }),
    { allowed: true, role: "admin" },
  );
});

test("admits an admin address even before a code is configured", () => {
  assert.deepEqual(
    decideRegistration({
      email: "owner@x.c",
      code: undefined,
      adminEmails: "owner@x.c",
      registrationCode: "",
    }),
    { allowed: true, role: "admin" },
  );
});
