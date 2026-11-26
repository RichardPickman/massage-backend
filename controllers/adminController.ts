import type { NextFunction, Request, Response } from "express";
import ApiError from "../Error";
import { getInviteConfig } from "../config";

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
}

export default AdminController;
