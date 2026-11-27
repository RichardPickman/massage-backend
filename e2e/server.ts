// The API the browser tests talk to.
//
// `index.ts` refuses to start without Atlas credentials and connects to the real
// cluster, which is exactly what an end-to-end run must not do. This entry reuses
// the same router, the same middleware and the same models, but puts them on an
// in-memory MongoDB that is seeded first — so a test can register, sign in and
// answer a quiz without touching a single real record.
//
//   ts-node e2e/server.ts        # listens on 127.0.0.1:8281
//
// The port differs from the dev API (8280) so a developer running the app locally
// does not have their API shadowed by a test server.

import "./../helpers/slowBufferCompat";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import router from "../routes";
import errorHandler from "../middleware/ErrorHandle/index";
import { seed } from "./seed";

const PORT = Number(process.env.E2E_PORT) || 8281;

const start = async () => {
    const mongo = await MongoMemoryServer.create();

    await mongoose.connect(mongo.getUri(), { dbName: "e2e" });
    await seed();

    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use("/api", router);
    app.use(errorHandler);

    const server = app.listen(PORT, "127.0.0.1", () => {
        console.log(`e2e api listening on http://127.0.0.1:${PORT}`);
    });

    const shutdown = async () => {
        server.close();
        await mongoose.disconnect();
        await mongo.stop();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
};

start().catch((error) => {
    console.error(error);
    process.exit(1);
});
