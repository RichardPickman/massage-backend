import userController from "../controllers/userController";
import JwtMiddleware from "../middleware/Token";

const user = new userController();
const e = require("express");

const router = e();

router.post("/registration", user.registration);
router.post("/login", user.login);

// /users is shared by both roles: a signed-in user does the usual things to
// their own account, an admin does them to anyone's. The gate is therefore
// "authenticated" here, and the controller decides who may touch which record.
router.get("/auth", JwtMiddleware, user.check);

router.delete("/remove/:id", JwtMiddleware, user.remove);

export default router;
