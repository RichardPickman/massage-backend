// The nickname is what people see; the email is what they sign in with and what
// an invite code is issued for. Addresses are not verified, so two students can
// hold near-identical ones and the email alone is a poor name to show.

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 24;

// Letters of any alphabet, digits, spaces and . _ -
const ALLOWED = /^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u;
const SPACES = /\s+/g;

export type NicknameProblem = "tooShort" | "tooLong" | "characters";

export const normalizeNickname = (raw: string) =>
    (raw ?? "").trim().replace(SPACES, " ");

// Compared case-insensitively and with a fixed locale: "Ania" and "ania" are the
// same student to a reader, so they must be the same key to the database.
export const nicknameKey = (raw: string) =>
    normalizeNickname(raw).toLocaleLowerCase("pl");

export const nicknameProblem = (raw: string): NicknameProblem | null => {
    const value = normalizeNickname(raw);

    if (value.length < NICKNAME_MIN) {
        return "tooShort";
    }

    if (value.length > NICKNAME_MAX) {
        return "tooLong";
    }

    if (!ALLOWED.test(value)) {
        return "characters";
    }

    return null;
};
