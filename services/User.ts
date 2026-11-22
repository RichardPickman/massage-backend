import ApiError from "../Error";
import { nicknameKey } from "../helpers/nickname";
import userModel from "../model/schemes/User";


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
}

const User = new UserService();

export default User;
