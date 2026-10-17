import type { NextFunction, Response } from "express";
import * as jwt from "jsonwebtoken";
import { readToken, toTokenUser, type AuthedRequest } from "../Token";

export default function (role: string) {
  return function (req: AuthedRequest, res: Response, next: NextFunction) {
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

      if (decoded.role !== role) {
        return res.status(403).json({ message: "Not authorized" });
      }

      req.user = toTokenUser(decoded);

      return next();
    } catch (e) {
      return res.status(401).json({ message: "Not authorised" });
    }
  };
}
