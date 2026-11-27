import * as bcrypt from "bcrypt";
import type { Response } from "express";
import * as jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import ApiError from "../Error";
import { getInviteConfig } from "../config";
import {
    decideRegistration,
    normalizeEmail,
    studentAddress,
} from "../helpers/invite";
import {
    NICKNAME_MAX,
    NICKNAME_MIN,
    nicknameProblem,
    normalizeNickname,
} from "../helpers/nickname";
import type { RequestWithUser } from "../middleware/Token";
import UserResolver from "../services/User";

function generateJWT(
    id: ObjectId | string,
    email: string,
    role: string,
    nickname?: string,
) {
    return jwt.sign(
        { id: id, email: email, role, nickname: nickname ?? null },
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
        // An address is optional now: students sign up with a nickname only, and
        // the server makes the address. Email is still read because the owner
        // bootstraps the first admin with it.
        const { user, email, password, code } = req.body;

        if (!password) {
            return next(ApiError.internal("Incorrect input"));
        }

        // The nickname is chosen here, not derived from the address: the address is
        // never verified, so it makes a poor name to show next to a test result.
        const problem = nicknameProblem(user ?? "");

        if (problem) {
            // Plain response with a code, not ApiError: the error class grows a
            // `code` argument in another open pull request, and this refusal must
            // not wait for it.
            return res.status(400).json({
                message: `The nickname must be ${NICKNAME_MIN}-${NICKNAME_MAX} characters and contain only letters, digits, spaces, dots, dashes or underscores`,
                code: "auth.nicknameInvalid",
            });
        }

        const nickname = normalizeNickname(user);

        // One answer and one code for every refusal below: a wrong code, a missing
        // code and an address that already exists must stay indistinguishable, or
        // the endpoint becomes a way to ask who has an account.
        const refused = ApiError.forbidden(
            "A valid registration code is required",
            "auth.inviteRequired",
        );

        const { registrationCode, adminEmails } = getInviteConfig();
        const decision = decideRegistration({
            email,
            code,
            registrationCode,
            adminEmails,
        });

        if (!decision.allowed) {
            return next(refused);
        }

        // The owner registers with their own address; everyone else gets one made
        // from the nickname, because the address is never verified and asking for
        // it only makes people invent one.
        const address =
            decision.role === "admin"
                ? normalizeEmail(email)
                : studentAddress(nickname);
        const candidate = await UserResolver.find({ email: address });

        // Only once the caller has proved they were invited, so a refused attempt
        // never reads the collection.
        if (candidate) {
            return next(refused);
        }

        // Reached only after the code checked out, so this cannot be used to probe
        // which nicknames exist without an invite.
        const takenNickname = await UserResolver.findByNickname(nickname);

        if (takenNickname) {
            return res.status(400).json({
                message: "This nickname is already taken",
                code: "auth.nicknameTaken",
            });
        }

        // Cost 10 where this used to hash at 5: one hash per registration, so the
        // extra time costs the user nothing they notice and buys real resistance.
        const hashPassword = await bcrypt.hash(password, 10);

        // The role comes from the gate, never from the request body.
        const createUser = await UserResolver.create({
            user: nickname,
            email: address,
            password: hashPassword,
            role: decision.role,
        });

        const token = generateJWT(
            createUser?._id as ObjectId,
            address,
            decision.role,
            nickname,
        );

        res.json({ token });

        return;
    }

    async login(req: RequestWithUser, res: Response, next: any) {
        const { password } = req.body;
        // The nickname is what a student remembers: the address is invented by the
        // owner when the invite is issued, so signing in with it asks people to recall
        // something they never chose. An address still works, for the accounts that
        // predate nicknames and for the owner.
        const identifier = String(
            req.body.login ?? req.body.email ?? "",
        ).trim();
        const looksLikeAddress = identifier.includes("@");

        const user = looksLikeAddress
            ? await findAccount(identifier, normalizeEmail(identifier))
            : await UserResolver.findByNickname(identifier);

        // Unknown address and wrong password share a code: the two messages differ,
        // and telling them apart in the UI would confirm which addresses exist.
        if (!user) {
            return next(
                ApiError.internal(
                    "User with provided email does not exist",
                    "auth.badCredentials",
                ),
            );
        }

        const checkPass = bcrypt.compareSync(
            password,
            user?.password as string,
        );

        if (!checkPass) {
            return next(
                ApiError.badRequest(
                    "Provided info is not valid!",
                    "auth.badCredentials",
                ),
            );
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
            return res.status(401).json({
                message: "Not authorised",
                code: "auth.notAuthorised",
            });
        }

        const token = generateJWT(req.user.id, req.user.email, req.user.role);

        return res.json({ token });
    }

    // Tokens are not revocable, so signing out is the client dropping its copy. The
    // endpoint exists because the client has always called it: without the route the
    // request answered 404, and a client that only clears its token after a successful
    // call stayed signed in.
    async logout(_req: RequestWithUser, res: Response) {
        return res.json({ message: "Signed out" });
    }

    async remove(req: RequestWithUser, res: Response, next: any) {
        const id = req.params.id;

        if (!req.user) {
            return res.status(401).json({
                message: "Not authorised",
                code: "auth.notAuthorised",
            });
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

        res.json({
            message: "Removed successfully",
            code: "user.removed",
            payload: removeUser,
        });

        return;
    }
}

export default UserController;
