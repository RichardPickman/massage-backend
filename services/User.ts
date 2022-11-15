import ApiError from "../Error";
import userModel from "../model/schemes/User";


class UserService {
    async create({ user, email, password, role }: { [k: string]: string }) {
        const createUser = await new userModel(({ user, email, role, password }))
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
}

const User = new UserService();

export default User;
