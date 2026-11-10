import userController from "../controllers/userController";
import { getThrottleConfig } from "../config";
import JwtMiddleware from "../middleware/Token";
import { throttle } from "../middleware/Throttle";

const user = new userController();
const e = require("express");

const router = e();

// Ten tries a quarter of an hour per caller by default: enough for a mistyped
// password, far too few to guess one. Registration sits behind the same counter,
// so an invite code cannot be ground out either, and both routes share it so
// neither is a cheaper way in than the other.
const { limit, windowMs } = getThrottleConfig();

const authThrottle = throttle({
    limit,
    windowMs,
    message: "Too many attempts. Wait a few minutes and try again.",
});

router.post("/registration", authThrottle, user.registration);
router.post("/login", authThrottle, user.login);

// /users is shared by both roles: a signed-in user does the usual things to
// their own account, an admin does them to anyone's. The gate is therefore
// "authenticated" here, and the controller decides who may touch which record.
router.get("/auth", JwtMiddleware, user.check);

router.delete("/remove/:id", JwtMiddleware, user.remove);

export default router;
