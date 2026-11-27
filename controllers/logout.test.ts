import assert from "node:assert/strict";
import test from "node:test";
import userController from "../controllers/userController";

// The client calls this endpoint on every sign-out, and it did not exist: the answer
// was 404, and the browser stayed signed in because the token is only dropped when
// the call is answered.
test("signing out answers 200 even without a session", () => {
    const controller = new userController();
    const state: { status?: number; body?: unknown } = {};
    const res = {
        json(body: unknown) {
            state.body = body;

            return this;
        },
        status(code: number) {
            state.status = code;

            return this;
        },
    };

    controller.logout({ headers: {} } as never, res as never);

    assert.equal(state.status, undefined);
    assert.deepEqual(state.body, { message: "Signed out" });
});
