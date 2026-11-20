export const DEFAULT_THRESHOLD = 50;

export type ThresholdParse =
  | { ok: true; value: number }
  | { ok: false; message: string };

// Explicit guard: narrowing through `parsed && !parsed.ok` is fragile across
// TypeScript versions, and a wrong cast here would hide a 400.
export const isThresholdError = (
  parsed: ThresholdParse | null
): parsed is { ok: false; message: string } =>
  parsed !== null && parsed.ok === false;

// Returns null when the field is absent, so a create can fall back to the
// default while an update leaves the stored value alone - "not sent" and
// "sent as 50" are different intentions.
export const parseThreshold = (raw: unknown): ThresholdParse | null => {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }

  const value =
    typeof raw === "number" ? raw : Number(String(raw).trim());

  if (!Number.isFinite(value)) {
    return { ok: false, message: "Threshold must be a number between 0 and 100" };
  }

  if (!Number.isInteger(value)) {
    return { ok: false, message: "Threshold must be a whole number" };
  }

  if (value < 0 || value > 100) {
    return { ok: false, message: "Threshold must be between 0 and 100" };
  }

  return { ok: true, value };
};
