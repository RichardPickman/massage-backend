import assert from "node:assert/strict";
import test from "node:test";
import { guardChange, guardRemoval } from "./adminUsers";

const base = { actorId: "me", targetId: "other", admins: 3 };

test("lets an admin change somebody else's role", () => {
    assert.deepEqual(
        guardChange({ ...base, targetRole: "user", nextRole: "admin" }),
        { allowed: true },
    );
});

test("lets an admin edit a nickname without touching a role", () => {
    assert.deepEqual(
        guardChange({ ...base, targetRole: "admin", nextRole: undefined }),
        { allowed: true },
    );
});

test("refuses to take the admin role away from yourself", () => {
    const result = guardChange({
        actorId: "me",
        targetId: "me",
        targetRole: "admin",
        nextRole: "user",
        admins: 3,
    });

    assert.equal(result.allowed, false);
    assert.equal(result.allowed === false && result.code, "admin.cannotDemoteSelf");
});

test("refuses to demote the last admin", () => {
    const result = guardChange({
        ...base,
        targetRole: "admin",
        nextRole: "user",
        admins: 1,
    });

    assert.equal(result.allowed === false && result.code, "admin.lastAdmin");
});

test("demoting an admin is fine while another one exists", () => {
    assert.deepEqual(
        guardChange({ ...base, targetRole: "admin", nextRole: "user", admins: 2 }),
        { allowed: true },
    );
});

test("never blocks a removal of somebody else who is not the last admin", () => {
    assert.deepEqual(
        guardRemoval({ ...base, targetRole: "user", admins: 1 }),
        { allowed: true },
    );
});

test("refuses removing your own account through the panel", () => {
    const result = guardRemoval({
        actorId: "me",
        targetId: "me",
        targetRole: "admin",
        admins: 2,
    });

    assert.equal(result.allowed === false && result.code, "admin.cannotRemoveSelf");
});

test("refuses removing the last admin", () => {
    const result = guardRemoval({ ...base, targetRole: "admin", admins: 1 });

    assert.equal(result.allowed === false && result.code, "admin.lastAdmin");
});
