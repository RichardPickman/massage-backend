// The image service against a real collection: an upload writes a record keyed by
// the form field name, and the delete path has to find it by that same name.

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { clear, connect, disconnect } from "../test/mongo";
import Images from "./Images";

before(connect);
after(disconnect);
beforeEach(clear);

test("stores an upload under its field name", async () => {
    const created = await Images.create({ fieldname: "a1b2c3d4e5f60718293a4b5c6d7e8f90" });

    assert.equal(created?.fieldname, "a1b2c3d4e5f60718293a4b5c6d7e8f90");
});

test("finds an upload by field name", async () => {
    await Images.create({ fieldname: "key-1" });

    assert.equal((await Images.find("key-1"))?.fieldname, "key-1");
    assert.equal(await Images.find("key-2"), null);
});

test("deletes an upload by field name", async () => {
    await Images.create({ fieldname: "key-1" });
    await Images.create({ fieldname: "key-2" });

    const result = await Images.delete("key-1");

    assert.equal(result.deletedCount, 1);
    assert.ok(await Images.find("key-2"));
});
