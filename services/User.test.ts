// The user service against a real collection.
//
// These are the reads and writes the admin panel and the sign-in path depend on:
// a nickname is found however it was typed, a page of the list never overflows,
// and an edit touches only the field it was given. Each of those is a query
// string, and a query string is the part the fakes cannot check.

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { clear, connect, disconnect } from "../test/mongo";
import User from "./User";

before(connect);
after(disconnect);
beforeEach(clear);

const seed = async (rows: Array<{ user?: string; email: string; role?: string; password?: string }>) => {
    for (const row of rows) {
        await User.create({ role: "user", password: "hash", ...row });
    }
};

test("stores the nickname key in lower case", async () => {
    const created = await User.create({ user: "Anna Kowalska", email: "a@students.local", role: "user" });

    assert.equal(created?.user, "Anna Kowalska");
    assert.equal(created?.userKey, "anna kowalska");
});

test("finds a student by nickname regardless of case and spacing", async () => {
    await seed([{ user: "Ania", email: "ania@students.local" }]);

    assert.ok(await User.findByNickname("ania"));
    assert.ok(await User.findByNickname("  ANIA  "));
    assert.equal(await User.findByNickname("Anka"), null);
});

test("returns null for an id that is not an ObjectId", async () => {
    // A hand-edited URL reaches this with "abc"; mongoose would throw a CastError
    // and the endpoint would answer 500 instead of 404.
    assert.equal(await User.findById("abc"), null);
});

test("counts only admins", async () => {
    await seed([
        { user: "Admin", email: "admin@students.local", role: "admin" },
        { user: "Ania", email: "ania@students.local" },
        { user: "Ola", email: "ola@students.local" },
    ]);

    assert.equal(await User.countAdmins(), 1);
});

test("lists users sorted by nickname with paging", async () => {
    await seed([
        { user: "Celina", email: "c@students.local" },
        { user: "Ala", email: "a@students.local" },
        { user: "Bogdan", email: "b@students.local" },
    ]);

    const first = await User.list({ page: 1, limit: 2 });

    assert.deepEqual(first.items.map((row) => row.user), ["Ala", "Bogdan"]);
    assert.equal(first.total, 3);
    assert.equal(first.pages, 2);

    const second = await User.list({ page: 2, limit: 2 });

    assert.deepEqual(second.items.map((row) => row.user), ["Celina"]);
});

test("lands a page past the end on the last real page", async () => {
    await seed([
        { user: "Ala", email: "a@students.local" },
        { user: "Bogdan", email: "b@students.local" },
    ]);

    const result = await User.list({ page: 9, limit: 2 });

    assert.equal(result.page, 1);
    assert.equal(result.items.length, 2);
});

test("searches by nickname fragment, ignoring case", async () => {
    await seed([
        { user: "Anna Kowalska", email: "a@students.local" },
        { user: "Jan Nowak", email: "j@students.local" },
    ]);

    const result = await User.list({ page: 1, limit: 25, search: "KOWAL" });

    assert.equal(result.total, 1);
    assert.equal(result.items[0]?.user, "Anna Kowalska");
});

test("treats a search with regex characters as text", async () => {
    await seed([{ user: "Anna (1)", email: "a@students.local" }, { user: "Ala", email: "b@students.local" }]);

    // Unescaped, "(" would either throw or match everything; the panel must not
    // become a way to run a regex against the user collection.
    const result = await User.list({ page: 1, limit: 25, search: "(1)" });

    assert.equal(result.total, 1);
    assert.equal(result.items[0]?.user, "Anna (1)");
});

test("never returns the password hash in the list", async () => {
    await seed([{ user: "Ania", email: "ania@students.local", password: "hash" }]);

    const result = await User.list({ page: 1, limit: 25 });

    assert.equal(Object.hasOwn(result.items[0] ?? {}, "password"), false);
});

test("an edit touches only the fields it was given", async () => {
    const created = await User.create({ user: "Ania", email: "ania@students.local", role: "user", password: "hash" });
    const id = String(created?._id);

    const promoted = await User.updateById(id, { role: "admin" });

    assert.equal(promoted?.role, "admin");
    assert.equal(promoted?.user, "Ania");
    assert.equal(promoted?.password, "hash");
});

test("a rename keeps the nickname key in step", async () => {
    const created = await User.create({ user: "Ania", email: "ania@students.local", role: "user" });
    const id = String(created?._id);

    await User.updateById(id, { user: "Ania Z" });

    // Without this the unique index keeps comparing the old key and two students
    // can hold the same visible name.
    assert.ok(await User.findByNickname("ania z"));
    assert.equal(await User.findByNickname("ania"), null);
});

test("an empty change set returns the record untouched", async () => {
    const created = await User.create({ user: "Ania", email: "ania@students.local", role: "user" });

    const result = await User.updateById(String(created?._id), {});

    assert.equal(result?.user, "Ania");
});

test("refuses to update an id that is not an ObjectId", async () => {
    assert.equal(await User.updateById("nonsense", { role: "admin" }), null);
});

test("deletes one account and leaves the rest", async () => {
    const ania = await User.create({ user: "Ania", email: "ania@students.local", role: "user" });
    await User.create({ user: "Ola", email: "ola@students.local", role: "user" });

    const result = await User.delete(String(ania?._id));

    assert.equal(result.deletedCount, 1);
    assert.equal(await User.countAdmins(), 0);
});
