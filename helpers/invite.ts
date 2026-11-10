import { createHmac, timingSafeEqual } from "node:crypto";

type Role = "user" | "admin";

export type InviteDecision =
  | { allowed: true; role: Role }
  | { allowed: false; role: null };

type DecideInput = {
  email: unknown;
  code: unknown;
  secret: string;
  adminEmails: string;
};

const codeLength = 16;

export const normalizeEmail = (email: unknown) =>
  String(email ?? "").trim().toLowerCase();

const group = (code: string) => code.replace(/(.{4})(?=.)/g, "$1-");

// The dashes exist for a person copying the code out of a chat message, so
// verification throws the punctuation away and compares the characters only.
const canonical = (code: unknown) =>
  String(code ?? "").replace(/[^0-9a-z]/gi, "").toUpperCase();

/**
 * A code is an HMAC of the address, so it needs nothing stored and is worthless
 * for any other address. Changing the secret retires every code at once.
 */
export const makeInviteCode = (email: unknown, secret: string) => {
  const digest = createHmac("sha256", secret)
    .update(normalizeEmail(email))
    .digest("hex");

  return group(digest.slice(0, codeLength).toUpperCase());
};

export const verifyInviteCode = (
  email: unknown,
  code: unknown,
  secret: string,
) => {
  if (!secret) {
    return false;
  }

  const given = canonical(code);
  const expected = canonical(makeInviteCode(email, secret));

  if (given.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
};

const adminList = (adminEmails: string) =>
  String(adminEmails ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);

export const isAdminEmail = (email: unknown, adminEmails: string) =>
  adminList(adminEmails).includes(normalizeEmail(email));

export const decideRegistration = ({
  email,
  code,
  secret,
  adminEmails,
}: DecideInput): InviteDecision => {
  const address = normalizeEmail(email);

  if (!address) {
    return { allowed: false, role: null };
  }

  // Bootstrap first, and before the secret is checked: an owner who has not set
  // one yet can still register, which is the difference between closed and shut
  // out of their own site.
  if (isAdminEmail(address, adminEmails)) {
    return { allowed: true, role: "admin" };
  }

  // No secret means no way to check a code, so nobody else gets in. Failing
  // open here would make a missing variable into an open signup.
  if (!secret) {
    return { allowed: false, role: null };
  }

  if (!verifyInviteCode(address, code, secret)) {
    return { allowed: false, role: null };
  }

  return { allowed: true, role: "user" };
};
