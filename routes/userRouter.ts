import userController from "../controllers/userController";
import JwtMiddleware from "../middleware/Token";
import checkRole from "../middleware/Role";
import { body } from "express-validator";
import authMiddleware from "../middleware/auth";

const user = new userController();
const e = require("express");

const router = e();

router.post(
  "/registration",
  body("email").isEmail(),
  body("nickname").isLength({ max: 32 }),
  body("password").isLength({ min: 6, max: 32 }),
  user.registration
);
router.post("/login", user.login);
router.post("/logout", user.logout);
router.get("/activate/:link", user.activate);
router.get("/refresh", user.refresh);
router.get("/all", authMiddleware, user.getAll);

export default router;
