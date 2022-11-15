import ApiError from '../Error';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UserResolver from '../services/User';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

function generateJWT(id: ObjectId, email: string, role: string) {
    return jwt.sign(
        { id: id, email: email, role },
        process.env.SECRET_KEY as string,
        { expiresIn: '24h' }
    );
}

class UserController {
    async registration(req: Request, res: Response, next: any) {
        const { user, email, role, password } = req.body;

        if (!email || !password) {
            next(ApiError.internal('Incorrect input'));
        }

        const candidate = await UserResolver.find({ email });

        if (candidate) {
            return next(ApiError.forbidden('User with provided email already exist'));
        }

        const hashPassword = await bcrypt.hash(password, 5);

        const createUser = await UserResolver.create({ user, email, password: hashPassword, role: role ? role : 'user' });

        const token = generateJWT(createUser?._id as ObjectId, email, createUser?.role as string);

        res.json({ token });

        return;
    }

    async login(req: Request, res: Response, next: any) {
        const { email, password } = req.body;

        const user = await UserResolver.find({ email });

        if (!user) {
            return next(ApiError.internal('User with provided email does not exist'));
        }

        const checkPass = bcrypt.compareSync(password, user?.password as string);

        if (!checkPass) {
            return next(ApiError.badRequest('Provided info is not valid!'));

        }

        const token = generateJWT(user?._id as ObjectId, email, user.role as string);

        res.json({ token })

        return;
    }

    async check(req: Request, res: Response, next: any) {
        const token = generateJWT(req.body.user?._id, req.body.user?.email, req.body.role);

        return res.json({ token });
    }

    async remove(req: Request, res: Response, next: any) {
        const id = req.params.id;

        const removeUser = await UserResolver.delete(id);

        res.json({ message: 'Removed successfully', payload: removeUser })
    }
}

export default UserController;
