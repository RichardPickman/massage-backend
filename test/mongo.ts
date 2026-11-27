// A real MongoDB for the tests that touch the data layer.
//
// The unit tests run against fakes, which is why a wrong query or a missing index
// never fails a build: the controller is exercised, the collection is not. This
// helper starts an in-memory mongod for the duration of one test file (Node runs
// each file in its own process), so services and schemas are checked against a
// server that answers like Atlas instead of against a stub.

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let server: MongoMemoryServer | null = null;

export const connect = async () => {
    server = await MongoMemoryServer.create();
    await mongoose.connect(server.getUri(), { dbName: "test" });
};

export const disconnect = async () => {
    await mongoose.disconnect();
    await server?.stop();
    server = null;
};

/** Empties every collection between tests, keeping indexes in place. */
export const clear = async () => {
    const db = mongoose.connection.db;

    if (!db) {
        return;
    }

    const collections = await db.collections();

    await Promise.all(collections.map((collection) => collection.deleteMany({})));
};
