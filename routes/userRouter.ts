import userController from "../controllers/userController";
import JwtMiddleware from "../middleware/Token";
import checkRole from "../middleware/Role";

const user = new userController();
const e = require("express");

const router = e();

router.post("/registration", user.registration);
router.post("/login", user.login);

router.get("/auth", JwtMiddleware, checkRole("admin"), user.check);

router.delete("/remove/:id", JwtMiddleware, checkRole("admin"), user.remove);

export default router;
