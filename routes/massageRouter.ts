import MassageController from "../controllers/massageController";

const e = require("express");

const router = e();

router.post("/create", MassageController.create);
router.get("/all", MassageController.getAll);
router.delete("/remove/:id", MassageController.remove);

router.get("/:id", MassageController.get);

export default router;
