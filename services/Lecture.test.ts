// The lecture service against a real collection.

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { clear, connect, disconnect } from "../test/mongo";
import lectureModel from "../model/schemes/Lecture";
import Lecture from "./Lecture";

before(connect);
after(disconnect);
beforeEach(clear);

test("creates a lecture and returns it with its id", async () => {
    const created = await Lecture.create({ topic: "Anatomia zęba", date: "11/24/2026", teacher: ["dr Nowak"] });

    assert.equal(created?.topic, "Anatomia zęba");
    assert.equal(created?.date, "11/24/2026");
    assert.deepEqual(created?.teacher, ["dr Nowak"]);
    assert.ok(created?._id);
});

test("keeps the wire date as a string, never a Date", async () => {
    // The client parses this with dayjs in MM/DD/YYYY; a Date object here comes back
    // as ISO on the wire and renders as "Invalid Date".
    const created = await Lecture.create({ topic: "Data", date: "11/24/2026" });

    assert.equal(typeof created?.date, "string");
});

test("updates only the fields it is given", async () => {
    const created = await Lecture.create({ topic: "Stary temat", date: "11/24/2026", teacher: ["dr Nowak"] });

    const updated = await Lecture.update(String(created?._id), { topic: "Nowy temat" });

    assert.equal(updated?.topic, "Nowy temat");
    assert.equal(updated?.date, "11/24/2026");
});

test("finds a lecture by id", async () => {
    const created = await Lecture.create({ topic: "Chirurgia" });

    const found = await Lecture.find(String(created?._id));

    assert.equal(found?.topic, "Chirurgia");
});

test("lists the newest lecture first and pages the rest", async () => {
    await Lecture.create({ topic: "Pierwszy" });
    await Lecture.create({ topic: "Drugi" });
    await Lecture.create({ topic: "Trzeci" });

    const page = await Lecture.findPage({ page: 1, limit: 2 });

    assert.deepEqual(page.items.map((item) => item.topic), ["Trzeci", "Drugi"]);
    assert.equal(page.total, 3);
    assert.equal(page.pages, 2);
});

test("deletes one lecture only", async () => {
    const doomed = await Lecture.create({ topic: "Do usunięcia" });
    await Lecture.create({ topic: "Zostaje" });

    const result = await Lecture.delete(String(doomed?._id));

    assert.equal(result.deletedCount, 1);
    assert.equal(await lectureModel.countDocuments({}), 1);
});
