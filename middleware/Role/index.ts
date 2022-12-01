import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";

interface BodyRequest extends Request {
  user?: string | jwt.JwtPayload;
}

export default function (role: string) {
  return function (req: BodyRequest, res: Response, next: any) {
    if (req.method === "OPTIONS") {
      next();
    }

    try {
      const token = req.headers?.authorization?.split(" ")[1];

      if (!token) {
        return res.status(401).json({ message: "Not authorised" });
      }

      const decoded = jwt.verify(
        token,
        process.env.SECRET_KEY as string
      ) as jwt.JwtPayload;

      if (decoded.role !== role) {
        return res.status(403).json({ message: "Not authorized" });
      }

      req.body.user = decoded;

      next();
    } catch (e) {
      res.status(401).json({ message: "Not authorised" });
    }
  };
}
