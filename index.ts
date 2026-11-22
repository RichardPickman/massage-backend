import "./helpers/slowBufferCompat";
const cors = require("cors");
import { getMissingConfig, getServerConfig } from "./config";
import router from "./routes";
import errorHandler from "./middleware/ErrorHandle/index";
import logger from "./middleware/log/index";
import { throttle } from "./middleware/Throttle";
const e = require("express");

const missing = getMissingConfig(process.env);

// Refusing to start beats starting and answering every request with a 500 that
// names a driver error instead of the variable nobody set.
if (missing.length > 0) {
    console.error(
        `Refusing to start: ${missing.join(", ")} ${
            missing.length === 1 ? "is" : "are"
        } not set. See .env.example.`,
    );
    process.exit(1);
}

// Required here rather than with the imports above: imports run before the first
// line of this file, so importing it up there would open a connection before the
// environment had been checked.
require("./model/db");

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

// A ceiling on how much one caller can ask for. The content routes now need a
// token, so this is not what keeps strangers out - it is what stops one signed-in
// account, or a script with a token, from turning the API into a load generator.
// Three hundred a minute is several times what a person reading a lecture with
// its images can produce.
app.use(
    "/api",
    throttle({
        limit: Number(process.env.API_RATE_LIMIT) || 300,
        windowMs: Number(process.env.API_RATE_WINDOW_MS) || 60 * 1000,
        message: "Too many requests. Slow down and try again shortly.",
    }),
);

app.use(logger);
app.use("/api", router);
app.use(errorHandler);

// Express 4 does not forward a rejected promise from an async handler, so the
// rejection arrives here instead of at the error handler above. Unhandled, Node
// 15+ treats it as fatal and exits - which is how a database outage turns into a
// container that crash-loops instead of one that keeps answering /api/health.
// Until the handlers are wrapped so their rejections reach errorHandler, this
// keeps the process serving and puts the error in the log where a deploy can see
// it. A request whose handler rejected still gets no response, so treat a dropped
// connection on a database-backed route as "Mongo is unreachable", not "the app
// is gone".
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
});

app.listen(port, () => console.log(`Server started on port ${port}`));
