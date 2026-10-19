import ApiError from "../Error";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import UserResolver from "../services/User";
import type { Response } from "express";
import { ObjectId } from "mongodb";
import type { AuthedRequest } from "../middleware/Token";

function generateJWT(id: ObjectId | string, email: string, role: string) {
  return jwt.sign(
    { id: id, email: email, role },
    process.env.SECRET_KEY as string,
    { expiresIn: "24h" }
  );
}

class UserController {
  async registration(req: AuthedRequest, res: Response, next: any) {
    const { user, email, password } = req.body;

    if (!email || !password) {
      return next(ApiError.internal("Incorrect input"));
    }

    const candidate = await UserResolver.find({ email });

    if (candidate) {
      return next(ApiError.forbidden("User with provided email already exist"));
    }

    const hashPassword = await bcrypt.hash(password, 5);

    // The client never picks its own role: self-registration is always a user.
    // Admins are promoted out of band, never through this endpoint.
    const createUser = await UserResolver.create({
      user,
      email,
      password: hashPassword,
      role: "user",
    });

    const token = generateJWT(createUser?._id as ObjectId, email, "user");

    res.json({ token });

    return;
  }

  async login(req: AuthedRequest, res: Response, next: any) {
    const { email, password } = req.body;

    const user = await UserResolver.find({ email });

    if (!user) {
      return next(ApiError.internal("User with provided email does not exist"));
    }

    const checkPass = bcrypt.compareSync(password, user?.password as string);

    if (!checkPass) {
      return next(ApiError.badRequest("Provided info is not valid!"));
    }

    const token = generateJWT(
      user?._id as ObjectId,
      email,
      user.role as string
    );

    res.json({ token });

    return;
  }

  // Issues a fresh token for an already verified one, so the session can be
  // extended. The claims come from the verified token, never from the request
  // body - trusting the body here let a caller mint any role they liked.
  async check(req: AuthedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorised" });
    }

    const token = generateJWT(req.user.id, req.user.email, req.user.role);

    return res.json({ token });
  }

  async remove(req: AuthedRequest, res: Response, next: any) {
    const id = req.params.id;

    if (!req.user) {
      return res.status(401).json({ message: "Not authorised" });
    }

    // Shared path: a common user may only remove their own account, an admin
    // may remove anyone's. This check used to be implied by the route being
    // admin-only, so it has to be explicit now that users come through here.
    const isSelf = req.user.id === id;
    const isAdmin = req.user.role === "admin";

    if (!isSelf && !isAdmin) {
      return next(ApiError.forbidden("Not allowed to remove this user"));
    }

    const removeUser = await UserResolver.delete(id);

    res.json({ message: "Removed successfully", payload: removeUser });

    return;
  }
}

export default UserController;
