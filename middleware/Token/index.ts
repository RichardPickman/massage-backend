import type { NextFunction, Request, Response } from "express";
// Must stay above the jsonwebtoken import: it repairs a Buffer export that
// Node 26 removed and that jsonwebtoken's dependency chain reads on load.
import "../../helpers/slowBufferCompat";
import * as jwt from "jsonwebtoken";

export interface TokenUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthedRequest extends Request {
  user?: TokenUser;
}

export const readToken = (req: Request) => {
  const header = req.headers.authorization;

  if (!header) {
    return null;
  }

  return header.startsWith("Bearer ") ? header.slice(7) : header;
};

export const toTokenUser = (decoded: jwt.JwtPayload): TokenUser => ({
  id: String(decoded.id),
  email: String(decoded.email ?? ""),
  role: String(decoded.role ?? "user"),
});

export default function (
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  if (req.method === "OPTIONS") {
    return next();
  }

  const token = readToken(req);

  if (!token) {
    return res.status(401).json({ message: "Not authorised" });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY as string);

    if (typeof decoded === "string") {
      return res.status(401).json({ message: "Not authorised" });
    }

    // Attach to req.user, never req.body: body carries the payload being written.
    req.user = toTokenUser(decoded);

    return next();
  } catch (e) {
    return res.status(401).json({ message: "Not authorised" });
  }
}
