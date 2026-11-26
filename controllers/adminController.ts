import * as bcrypt from "bcrypt";
import type { NextFunction, Response } from "express";
import ApiError from "../Error";
import { getInviteConfig } from "../config";
import { guardChange, guardRemoval } from "../helpers/adminUsers";
import {
    NICKNAME_MAX,
    NICKNAME_MIN,
    nicknameProblem,
} from "../helpers/nickname";
import { readPageQuery } from "../helpers/pagination";
import type { RequestWithUser } from "../middleware/Token";
import UserResolver from "../services/User";

const ROLES = ["user", "admin"];

class AdminController {
    // Hands back the one registration code the server checks against. A read:
    // nothing is stored, so asking twice answers the same thing.
    async registrationCode(_req: Request, res: Response, next: NextFunction) {
        const { registrationCode } = getInviteConfig();

        // A panel that copied an empty code would send people to a form that
        // always refuses them, so say what is wrong instead of showing nothing.
        if (!registrationCode) {
            return next(
                ApiError.internal(
                    "REGISTRATION_CODE is not set, so nobody can register",
                ),
            );
        }

        return res.json({ code: registrationCode });
    }

    async users(req: RequestWithUser, res: Response) {
        const { page, limit } = readPageQuery(req.query);
        const search = String(req.query.search ?? "").trim();
        const result = await UserResolver.list({ search, page, limit });

        return res.json({ ...result, limit });
    }

    async updateUser(req: RequestWithUser, res: Response) {
        if (!req.user) {
            return res
                .status(401)
                .json({ message: "Not authorised", code: "auth.notAuthorised" });
        }

        const id = req.params.id;
        const { user, role, password } = req.body ?? {};
        const target = await UserResolver.findById(id);

        if (!target) {
            return res
                .status(404)
                .json({ message: "No such user", code: "admin.userNotFound" });
        }

        const changes: { user?: string; role?: string; password?: string } = {};

        if (role !== undefined) {
            if (!ROLES.includes(role)) {
                return res.status(400).json({
                    message: `The role must be one of: ${ROLES.join(", ")}`,
                    code: "admin.roleInvalid",
                });
            }

            changes.role = role;
        }

        if (user !== undefined) {
            const problem = nicknameProblem(String(user));

            if (problem) {
                return res.status(400).json({
                    message: `The nickname must be ${NICKNAME_MIN}-${NICKNAME_MAX} characters and contain only letters, digits, spaces, dots, dashes or underscores`,
                    code: "auth.nicknameInvalid",
                });
            }

            const taken = await UserResolver.findByNickname(String(user));

            // Renaming onto an existing nickname would break the unique index and,
            // worse, show two students under one name in every result list.
            if (taken && String(taken._id) !== id) {
                return res.status(400).json({
                    message: "This nickname is already taken",
                    code: "auth.nicknameTaken",
                });
            }

            changes.user = String(user);
        }

        if (password !== undefined) {
            if (String(password).length < 6) {
                return res.status(400).json({
                    message: "The password must be at least 6 characters",
                    code: "admin.passwordTooShort",
                });
            }

            changes.password = await bcrypt.hash(String(password), 10);
        }

        const admins = await UserResolver.countAdmins();
        const guard = guardChange({
            actorId: req.user.id,
            targetId: id,
            targetRole: target.role ?? "user",
            nextRole: changes.role,
            admins,
        });

        if (guard.allowed === false) {
            return res
                .status(400)
                .json({ message: guard.message, code: guard.code });
        }

        const updated = await UserResolver.updateById(id, changes);

        return res.json({
            id,
            user: updated?.user ?? "",
            email: updated?.email ?? "",
            role: updated?.role ?? "user",
        });
    }

    async removeUser(req: RequestWithUser, res: Response) {
        if (!req.user) {
            return res
                .status(401)
                .json({ message: "Not authorised", code: "auth.notAuthorised" });
        }

        const id = req.params.id;
        const target = await UserResolver.findById(id);

        if (!target) {
            return res
                .status(404)
                .json({ message: "No such user", code: "admin.userNotFound" });
        }

        const admins = await UserResolver.countAdmins();
        const guard = guardRemoval({
            actorId: req.user.id,
            targetId: id,
            targetRole: target.role ?? "user",
            admins,
        });

        if (guard.allowed === false) {
            return res
                .status(400)
                .json({ message: guard.message, code: guard.code });
        }

        await UserResolver.delete(id);

        return res.json({ id, code: "user.removed" });
    }
}

export default AdminController;
