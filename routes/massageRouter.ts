import massageController from "../controllers/massageController";

const massage = new massageController();
const e = require("express");

const router = e();

router.post("/create", massage.create);
router.get("/all", massage.getAll);
router.delete("/remove/:id", massage.remove);

router.get("/:id", massage.get);

export default router;
