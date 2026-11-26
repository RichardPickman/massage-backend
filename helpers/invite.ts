import { timingSafeEqual } from "node:crypto";

type Role = "user" | "admin";

export type InviteDecision =
  | { allowed: true; role: Role }
  | { allowed: false; role: null };

type DecideInput = {
  email: unknown;
  code: unknown;
  adminEmails: string;
  registrationCode: string;
};

export const normalizeEmail = (email: unknown) =>
  String(email ?? "").trim().toLowerCase();

// Codes travel through chat apps, so punctuation is dropped and case ignored
// before the comparison: a person sending "abcd-1234" and "ABCD1234" is sending
// the same code twice.
const canonical = (code: unknown) =>
  String(code ?? "").replace(/[^0-9a-z]/gi, "").toUpperCase();

/**
 * One code for everyone, held only in the environment: nothing is stored, and
 * changing REGISTRATION_CODE retires the old one for whoever has not signed up
 * yet. An empty setting closes registration instead of opening it.
 */
export const codeMatches = (given: unknown, expected: string) => {
  if (!expected) {
    return false;
  }

  const attempt = canonical(given);
  const wanted = canonical(expected);

  if (!attempt || attempt.length !== wanted.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(attempt), Buffer.from(wanted));
};

const adminList = (adminEmails: string) =>
  String(adminEmails ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);

export const isAdminEmail = (email: unknown, adminEmails: string) =>
  adminList(adminEmails).includes(normalizeEmail(email));

/**
 * Students no longer type an address, so the server makes one. This keeps the
 * `email` field populated for accounts that predate nicknames and for the
 * login-by-address path, without asking anyone for an address they do not have.
 * A nickname cannot contain "@", so these never collide with real addresses.
 */
export const studentAddress = (nickname: string) =>
  `${nickname.trim().toLowerCase().replace(/\s+/g, ".")}@students.local`;

export const decideRegistration = ({
  email,
  code,
  adminEmails,
  registrationCode,
}: DecideInput): InviteDecision => {
  // Bootstrap first: the owner's address is the only way to mint the first admin,
  // and it keeps working when no registration code is configured at all.
  if (isAdminEmail(email, adminEmails)) {
    return { allowed: true, role: "admin" };
  }

  // No code configured means no way to check one, so nobody else gets in.
  // Failing open here would turn a missing variable into an open signup.
  if (!codeMatches(code, registrationCode)) {
    return { allowed: false, role: null };
  }

  return { allowed: true, role: "user" };
};
