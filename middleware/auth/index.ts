import { Request, Response, NextFunction } from "express";
import ApiError from "../../exceptions";
import TokenService from "../../controllers/tokenController";

export default function (req: Request, res: Response, next: NextFunction) {
  try {
    const authorizationHeader = req.headers.authorization as string;

    if (!authorizationHeader) {
      return next(ApiError.UnauthorizedError());
    }

    const accessToken = authorizationHeader.split(" ")[1];

    if (!accessToken) {
      return next(ApiError.UnauthorizedError());
    }

    const userData = TokenService.validateAccessToken(accessToken);

    if (!userData) {
      return next(ApiError.UnauthorizedError());
    }

    req["user"] = userData;
    next();
  } catch (e) {
    return next(ApiError.UnauthorizedError());
  }
}
