import * as bcrypt from "bcrypt";
import type { Response } from "express";
import * as jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import ApiError from "../Error";
import { getInviteConfig } from "../config";
import { decideRegistration, normalizeEmail } from "../helpers/invite";
import type { RequestWithUser } from "../middleware/Token";
import UserResolver from "../services/User";

function generateJWT(id: ObjectId | string, email: string, role: string) {
    return jwt.sign(
        { id: id, email: email, role },
        process.env.SECRET_KEY as string,
        { expiresIn: "24h" },
    );
}

// Accounts made before addresses were normalised can hold mixed case, so a miss
// on the normalised form tries the address as typed before giving up. Without
// this, normalising would quietly lock out anyone whose address had a capital.
const findAccount = async (email: string, address: string) => {
    const account = await UserResolver.find({ email: address });

    if (account || !email) {
        return account;
    }

    return email === address ? null : UserResolver.find({ email });
};

class UserController {
    async registration(req: RequestWithUser, res: Response, next: any) {
        const { user, email, password, code } = req.body;

        if (!email || !password) {
            return next(ApiError.internal("Incorrect input"));
        }

        // One answer for every refusal below. A wrong code, a missing code and an
        // address that already exists have to be indistinguishable, or the
        // endpoint becomes a way to ask who has an account.
        const refused = ApiError.forbidden(
            "This address needs a valid invite code to register",
        );

        const { secret, adminEmails } = getInviteConfig();
        const decision = decideRegistration({
            email,
            code,
            secret,
            adminEmails,
        });

        if (!decision.allowed) {
            return next(refused);
        }

        const address = normalizeEmail(email);
        const candidate = await UserResolver.find({ email: address });

        // Only once the caller has proved they were invited, so a refused attempt
        // never reads the collection.
        if (candidate) {
            return next(refused);
        }

        // Cost 10 where this used to hash at 5: one hash per registration, so the
        // extra time costs the user nothing they notice and buys real resistance.
        const hashPassword = await bcrypt.hash(password, 10);

        // The role comes from the gate, never from the request body.
        const createUser = await UserResolver.create({
            user,
            email: address,
            password: hashPassword,
            role: decision.role,
        });

        const token = generateJWT(
            createUser?._id as ObjectId,
            address,
            decision.role,
        );

        res.json({ token });

        return;
    }

    async login(req: RequestWithUser, res: Response, next: any) {
        const { email, password } = req.body;
        const address = normalizeEmail(email);

        const user = await findAccount(email, address);

        if (!user) {
            return next(
                ApiError.internal("User with provided email does not exist"),
            );
        }

        const checkPass = bcrypt.compareSync(
            password,
            user?.password as string,
        );

        if (!checkPass) {
            return next(ApiError.badRequest("Provided info is not valid!"));
        }

        const token = generateJWT(
            user?._id as ObjectId,
            user.email as string,
            user.role as string,
        );

        res.json({ token });

        return;
    }

    // Issues a fresh token for an already verified one, so the session can be
    // extended. The claims come from the verified token, never from the request
    // body - trusting the body here let a caller mint any role they liked.
    async check(req: RequestWithUser, res: Response) {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorised" });
        }

        const token = generateJWT(req.user.id, req.user.email, req.user.role);

        return res.json({ token });
    }

    async remove(req: RequestWithUser, res: Response, next: any) {
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
