import type { NextFunction, Request, Response } from "express";
import ApiError from "../Error";
import { getInviteConfig } from "../config";
import { makeInviteCode, normalizeEmail } from "../helpers/invite";

class AdminController {
    // Hands back the code for one address. A read: nothing is stored, so asking
    // twice answers the same thing and a broken panel costs nothing to retry.
    async invite(req: Request, res: Response, next: NextFunction) {
        const address = normalizeEmail(req.query.email);

        if (!address.includes("@")) {
            return res
                .status(400)
                .json({ message: "A valid email address is required" });
        }

        const { secret } = getInviteConfig();

        // A code minted with a different secret than the server checks against
        // would be handed out and quietly fail, so say what is wrong instead.
        if (!secret) {
            return next(
                ApiError.internal(
                    "INVITE_SECRET is not set, so no invite can be minted",
                ),
            );
        }

        return res.json({
            email: address,
            code: makeInviteCode(address, secret),
        });
    }
}

export default AdminController;
