import "./helpers/slowBufferCompat";
const cors = require("cors");
import { getServerConfig } from "./config";
import router from "./routes";
import errorHandler from "./middleware/ErrorHandle/index";
import logger from "./middleware/log/index";
import "./model/db";
const e = require("express");

const { port } = getServerConfig();
const app = e();

// Behind nginx the caller's address arrives in X-Forwarded-For. Without this the
// limiter sees the proxy on every request and one flood locks out everyone; with
// it set in front of a directly exposed server, any client can claim to be any
// address. So it is opt-in, and only the deployment that has a proxy sets it.
if (process.env.TRUST_PROXY === "1") {
    app.set("trust proxy", 1);
}

app.use(cors());
app.use(e.json());
app.use(logger);
app.use("/api", router);
app.use(errorHandler);

app.listen(port, () => console.log(`Server started on port ${port}`));
