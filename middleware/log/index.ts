import { Request, Response, NextFunction } from "express";

// The body used to be logged verbatim, which put every password typed at sign-in
// and every invite code in the log. It also printed the object as
// "[object Object]", so the entries were both a leak and useless.
const sensitiveKeys = ["password", "code", "token"];

const redact = (body: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(body).map(([key, value]) => [
      key,
      sensitiveKeys.includes(key) ? "[redacted]" : value,
    ])
  );

// Nothing to say about a request with no body, and GETs should not print an
// empty object on every line.
const describeBody = (body: unknown) => {
  if (typeof body !== "object" || body === null) {
    return "";
  }

  const entries = Object.entries(body);

  if (entries.length === 0) {
    return "";
  }

  return `\n[LOG]: Request body: ${JSON.stringify(redact(body as Record<string, unknown>))}`;
};

export default (req: Request, res: Response, next: NextFunction) => {
  console.log(
    `[LOG]: Request code: ${req.method}\n[LOG]: Request url: ${req.url}${describeBody(req.body)}\n`
  );

  next();
};
