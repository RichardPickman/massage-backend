import adminController from "../controllers/adminController";
import Role from "../middleware/Role";

const admin = new adminController();
const e = require("express");

const router = e();

// `Role` verifies the token itself, so these routes need no Token middleware in
// front of them, and it lets a preflight through untouched.
//
// The code is no longer minted per address: one code admits everybody, so the
// panel reads it instead of generating a pair address+code.
router.get("/registration-code", Role("admin"), admin.registrationCode);

// Managing people. `Role` already proved the caller is an admin; the guards that
// stop an admin from deleting themselves or leaving the site with none live in
// helpers/adminUsers, not here, so they can be argued with in a test.
router.get("/users", Role("admin"), admin.users);
router.patch("/users/:id", Role("admin"), admin.updateUser);
router.delete("/users/:id", Role("admin"), admin.removeUser);

export default router;
