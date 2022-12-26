import ApiError from "../exceptions";
import { Request, Response, NextFunction } from "express";
import User from "../services/User";
import { validationResult } from "express-validator";

class UserController {
  async registration(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(ApiError.BadRequest("Validation error", errors.array()));
      }
      const { email, password } = req.body;
      const userData = await User.registration(email, password);

      res.cookie("refreshToken", userData.refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      });

      return res.json(userData);
    } catch (e) {
      console.log(e);
    }
  }

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const link = req.params.link;

      await User.activate(link);

      console.log("worked");
    } catch (e) {
      console.log(e);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body;
    const userData = await User.login(email, password);

    res.cookie("refreshToken", userData.refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });

    return res.json(userData);
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.cookies;

      const token = await User.logout(refreshToken);

      res.clearCookie("refreshToken");

      return res.json(token);
    } catch (e) {}
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    const { refreshToken } = req.cookies;
    const userData = await User.refresh(refreshToken);

    res.cookie("refreshToken", userData.refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });

    res.json(userData);
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    const users = await User.getAll();

    res.json(users);
  }
}

export default UserController;
