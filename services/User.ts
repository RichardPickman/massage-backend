import { ObjectId } from "mongodb";
import { nicknameKey } from "../helpers/nickname";
import { pageRange } from "../helpers/pagination";
import userModel from "../model/schemes/User";

// What a row in the admin list carries. The password hash never leaves the
// database, and neither does anything else the panel has no use for.
export interface ListedUser {
    id: string;
    user: string;
    email: string;
    role: string;
}

type ListInput = { search?: string; page: number; limit: number };

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class UserService {
    async create({ user, email, password, role }: { [k: string]: string }) {
        const createUser = await new userModel(({
            user,
            userKey: user ? nicknameKey(user) : undefined,
            email,
            role,
            password,
        }))
        .save()
        .then(() => this.find({ email }));

        return createUser;
    }

    async delete(id: string) {
        const removeItem = await userModel.deleteOne({ _id: id });

        return removeItem;
    }

    async update({ user, email, password }: { [k: string]: string }) {
        const createUser = new userModel({ user, email, password }).save();

        return createUser;
    }

    async find({ email }: { [k: string]: string }) {
        const user = userModel.findOne({ email });

        return user;
    }

    // Registration asks this before it writes, so a taken name is a message under
    // the field rather than a duplicate-key error from the index.
    async findByNickname(nickname: string) {
        const user = userModel.findOne({ userKey: nicknameKey(nickname) });

        return user;
    }

    async findById(id: string) {
        if (!ObjectId.isValid(id)) {
            return null;
        }

        return userModel.findById(id);
    }

    async countAdmins() {
        return userModel.countDocuments({ role: "admin" });
    }

    /**
     * The admin list. Search goes through `userKey`, the same normalised field the
     * unique index uses, so "ania", "Ania" and "ANIA" all find one student and a
     * nickname with Polish letters is found however it was typed.
     */
    async list({ search, page, limit }: ListInput) {
        const filter = search
            ? { userKey: { $regex: escapeRegex(nicknameKey(search)) } }
            : {};
        const total = await userModel.countDocuments(filter);
        // A stale link, or a page that just lost its last row, lands on the last
        // real page instead of an empty one.
        const range = pageRange({ page, limit }, total);
        const rows = await userModel
            .find(filter)
            .sort({ userKey: 1 })
            .skip(range.skip)
            .limit(limit)
            .lean();

        const items: ListedUser[] = rows.map((row) => ({
            id: String(row._id),
            user: row.user ?? "",
            email: row.email ?? "",
            role: row.role ?? "user",
        }));

        return { items, total, page: range.page, pages: range.pages };
    }

    /**
     * Applies only the fields the caller actually sent, so a nickname edit cannot
     * erase a role and a role edit cannot erase a password hash. The nickname keeps
     * `userKey` in step, or the uniqueness rule silently stops applying.
     */
    async updateById(
        id: string,
        changes: { user?: string; role?: string; password?: string },
    ) {
        if (!ObjectId.isValid(id)) {
            return null;
        }

        const update: Record<string, unknown> = {};

        if (changes.user !== undefined) {
            update.user = changes.user;
            update.userKey = nicknameKey(changes.user);
        }

        if (changes.role !== undefined) {
            update.role = changes.role;
        }

        if (changes.password !== undefined) {
            update.password = changes.password;
        }

        if (Object.keys(update).length === 0) {
            return this.findById(id);
        }

        return userModel.findByIdAndUpdate(id, update, { new: true });
    }
}

const User = new UserService();

export default User;
