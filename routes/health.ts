import e from "express";

const router = e();

// Answered without touching Mongo or S3: the question a container health check
// asks is "is this process serving requests", and a health check that depends on
// the database reports the wrong service as broken.
router.get("/", (_request, response) => {
    response.json({ ok: true });
});

export default router;
