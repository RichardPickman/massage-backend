import adminController from "../controllers/adminController";
import Role from "../middleware/Role";

const admin = new adminController();
const e = require("express");

const router = e();

// `Role` verifies the token itself, so this route needs no Token middleware in
// front of it, and it lets a preflight through untouched. This is the middleware
// written for exactly this job and, until now, wired to nothing.
//
// The code is no longer minted per address: one code admits everybody, so the
// panel reads it instead of generating a pair address+code.
router.get("/registration-code", Role("admin"), admin.registrationCode);

export default router;
