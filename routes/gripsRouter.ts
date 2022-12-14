import gripController from "../controllers/gripsController";

const grip = new gripController();
const e = require("express");

const router = e();

router.post("/create", grip.create);
router.get("/all", grip.getAll);
router.delete("/remove/:id", grip.remove);

export default router;
