import assert from "node:assert/strict";
import test from "node:test";
import { getMissingConfig } from ".";

const complete: NodeJS.ProcessEnv = {
    DB_USER: "user",
    DB_PASSWORD: "password",
    DB_HOST: "cluster.example.net",
    DB: "data",
    PORT: "5000",
    SECRET_KEY: "secret",
};

test("a complete environment is missing nothing", () => {
    // The invite variables are absent on purpose: with no secret and no bootstrap
    // list registration is closed, which is a deployment choice, not an error.
    assert.deepEqual(getMissingConfig(complete), []);
});

test("it names every variable that is missing", () => {
    const partial = { ...complete };

    delete partial.SECRET_KEY;
    delete partial.DB_HOST;

    assert.deepEqual(getMissingConfig(partial), ["DB_HOST", "SECRET_KEY"]);
});

test("an empty or whitespace-only value counts as missing", () => {
    assert.deepEqual(getMissingConfig({ ...complete, DB_PASSWORD: "" }), [
        "DB_PASSWORD",
    ]);
    assert.deepEqual(getMissingConfig({ ...complete, PORT: "   " }), ["PORT"]);
});
