import StatsController from "../controllers/statsController";
import JwtMiddleware from "../middleware/Token";

const stats = new StatsController();
const e = require("express");

const router = e();

router.get("/", JwtMiddleware, stats.mine);

export default router;
