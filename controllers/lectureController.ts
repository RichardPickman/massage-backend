import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Response } from "express";
import { getBucketConfig } from "../config";

import { getFormattedBuffer, getRandomName } from "../helpers";
import { readPageQuery } from "../helpers/pagination";

import type { RequestWithUser } from "../middleware/Token";
import LectureResolver from "../services/Lecture";

const { accesskey, secretkey, region, bucketname } = getBucketConfig();

const s3 = new S3Client({
    credentials: {
        accessKeyId: accesskey,
        secretAccessKey: secretkey,
    },
    region: region,
});

interface LectureDocument {
    _id: unknown;
    topic?: string;
    teacher?: string[];
    lesson?: string[];
    date?: string;
    images?: string[];
    author?: unknown;
    toObject?: () => Record<string, unknown>;
}

const isOwner = (author: unknown, req: RequestWithUser) =>
    Boolean(req.user) &&
    (req.user.role === "admin" || String(author ?? "") === req.user.id);

// Multipart fields arrive as strings; a repeated field arrives as an array.
const toStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.filter(
            (item): item is string =>
                typeof item === "string" && item.trim().length > 0,
        );
    }

    if (typeof value === "string" && value.trim()) {
        return [value.trim()];
    }

    return [];
};

// The edit form sends the S3 keys it wants to keep as a JSON array, so removed
// images can be deleted from the bucket as well as the record.
const parseKeepImages = (value: unknown): string[] | null => {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === "string");
    }

    if (typeof value !== "string") {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(value);

        return Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === "string")
            : [value];
    } catch {
        return [value];
    }
};

const getImageUrl = async (key: string) =>
    getSignedUrl(s3, new GetObjectCommand({ Bucket: bucketname, Key: key }), {
        expiresIn: 3600,
    });

const uploadImage = async (file: Express.Multer.File) => {
    const buffer = await getFormattedBuffer(file.path);
    const imageName = getRandomName();

    await s3.send(
        new PutObjectCommand({
            Bucket: bucketname,
            Key: imageName,
            Body: buffer,
            ContentType: file.mimetype,
        }),
    );

    return imageName;
};

const removeImage = async (key: string) => {
    try {
        await s3.send(
            new DeleteObjectCommand({ Bucket: bucketname, Key: key }),
        );
    } catch (e) {
        // A missing object must not keep the lecture record alive.
        console.log("Lecture image delete failed:", key, e);
    }
};

class LectureController {
    async create(req: RequestWithUser & { files: unknown }, res: Response) {
        const { topic } = req.body;
        const files = Array.isArray(req.files) ? req.files : [];

        if (!topic) {
            return res.status(400).json({ message: "Incorrect inputs" });
        }

        if (!req.user) {
            return res.status(401).json({ message: "Not authorised" });
        }

        const imagesNames = [];

        for (const file of files) {
            try {
                imagesNames.push(await uploadImage(file));
            } catch (e) {
                console.log("Lecture image upload failed:", e);

                return res.status(502).json({ message: "Image upload failed" });
            }
        }

        const result = await LectureResolver.create({
            topic,
            teacher: toStringArray(req.body.teacher),
            lesson: toStringArray(req.body.lesson),
            date: req.body.date,
            images: imagesNames,
            author: req.user.id,
        });

        res.json({ message: "Item created successfully", payload: result });

        return;
    }

    async update(req: RequestWithUser & { files: unknown }, res: Response) {
        const { id } = req.params;

        const existing = (await LectureResolver.find(
            id,
        )) as LectureDocument | null;

        if (!existing) {
            return res.status(404).json({ message: "Lecture not found" });
        }

        if (!isOwner(existing.author, req)) {
            return res.status(403).json({ message: "Not allowed" });
        }

        const files = Array.isArray(req.files) ? req.files : [];
        const keepImages = parseKeepImages(req.body.keepImages);
        const existingImages = existing.images ?? [];

        // No keepImages field means a legacy client that only appends.
        const keptImages =
            keepImages === null
                ? existingImages
                : existingImages.filter((image) => keepImages.includes(image));
        const removedImages =
            keepImages === null
                ? []
                : existingImages.filter((image) => !keepImages.includes(image));

        const addedImages = [];

        for (const file of files) {
            try {
                addedImages.push(await uploadImage(file));
            } catch (e) {
                console.log("Lecture image upload failed:", e);

                return res.status(502).json({ message: "Image upload failed" });
            }
        }

        const fields: Record<string, unknown> = {};

        if (req.body.topic !== undefined) {
            fields.topic = req.body.topic;
        }

        if (req.body.teacher !== undefined) {
            fields.teacher = toStringArray(req.body.teacher);
        }

        if (req.body.lesson !== undefined) {
            fields.lesson = toStringArray(req.body.lesson);
        }

        if (req.body.date !== undefined) {
            fields.date = req.body.date;
        }

        if (keepImages !== null || addedImages.length > 0) {
            fields.images = [...keptImages, ...addedImages];
        }

        let result;

        try {
            result = await LectureResolver.update(id, fields);
        } catch (e) {
            console.log("Lecture update failed:", e);

            // The newly uploaded objects are not referenced by any record yet.
            await Promise.all(addedImages.map((image) => removeImage(image)));

            return res.status(500).json({ message: "Lecture update failed" });
        }

        // Delete objects only once the record has stopped pointing at them.
        await Promise.all(removedImages.map((image) => removeImage(image)));

        res.json({ message: "Lecture updated successfully", payload: result });

        return;
    }

    async get(req: RequestWithUser, res: Response) {
        const { id } = req.params;

        const lecture = (await LectureResolver.find(
            id,
        )) as LectureDocument | null;

        if (!lecture) {
            return res.status(404).json({ message: "Not found", code: 404 });
        }

        const images = await Promise.all(
            (lecture.images ?? []).map((image) => getImageUrl(image)),
        );

        const fields = lecture.toObject ? lecture.toObject() : { ...lecture };

        // The viewer needs signed URLs; the edit form needs the keys to keep or
        // delete stored objects.
        res.json({
            message: "successful",
            payload: { ...fields, images, imageKeys: lecture.images ?? [] },
        });

        return;
    }

    async getAll(req: RequestWithUser, res: Response) {
        const query = readPageQuery(req.query);

        // A request carrying no page parameters keeps answering the payload the
        // current client expects, so this backend can deploy before the
        // frontend knows about pages.
        if (!query.paginated) {
            const getItems = await LectureResolver.findAll();

            res.json({ message: "return lectures", payload: getItems });

            return;
        }

        const page = await LectureResolver.findPage(query);

        res.json({ message: "return lectures", payload: page });

        return;
    }

    async remove(req: RequestWithUser, res: Response) {
        const id = req.params.id;

        const existing = (await LectureResolver.find(
            id,
        )) as LectureDocument | null;

        if (!existing) {
            return res.status(404).json({ message: "Lecture not found" });
        }

        if (!isOwner(existing.author, req)) {
            return res.status(403).json({ message: "Not allowed" });
        }

        await Promise.all(
            (existing.images ?? []).map((image) => removeImage(image)),
        );

        const removeLecture = await LectureResolver.delete(id);

        res.json({ message: "Removed successfully", payload: removeLecture });

        return;
    }
}

export default LectureController;
