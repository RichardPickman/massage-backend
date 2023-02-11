import ApiError from "../exceptions";
import userModel from "../model/schemes/User";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import MailService from "../controllers/mailController";
import TokenService from "../controllers/tokenController";
import UserDto from "../dtos/user";
import { User } from "../types";

class UserService {
  async registration(email: string, password: string, nickname: string = "") {
    const candidate = await userModel.findOne({ email });

    if (candidate) {
      throw ApiError.BadRequest("User with provided email already exist");
    }

    const hashPassword = await bcrypt.hash(password, 3);
    const activationLink = uuidv4();

    const user = await userModel.create({
      email,
      nickname,
      password: hashPassword,
      activationLink,
    });

    await MailService.sendActivationLink(
      email,
      `${process.env.API_URL}/api/users/activate/${activationLink}`
    );

    const userDto = new UserDto(user);
    const updatedUser = await TokenService.updateTokens(userDto);

    return updatedUser;
  }

  async activate(activationLink: string) {
    const user = await userModel.findOne({ activationLink });

    if (!user) {
      console.log("There is no such user");

      return;
    }

    user.isActivated = true;

    await user.save();
  }

  async login(email: string, password: string) {
    const userData = await userModel.findOne({ email });

    if (!userData) {
      throw ApiError.BadRequest("User not found");
    }

    const isPassEquals = await bcrypt.compare(password, userData.password);

    if (!isPassEquals) {
      throw ApiError.BadRequest("Invalid email or password");
    }

    const userDto = new UserDto(userData);
    const updatedUser = await TokenService.updateTokens(userDto);

    return updatedUser;
  }

  async logout(refreshToken: string) {
    try {
      const token = await TokenService.removeToken(refreshToken);

      return token;
    } catch (e) {
      throw Error("Something gone wrong while processing the request");
    }
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw ApiError.UnauthorizedError();
    }

    const userData = TokenService.validateRefreshToken(refreshToken);
    const tokenFromDB = TokenService.findToken(refreshToken);

    if (!userData || !tokenFromDB) {
      throw ApiError.UnauthorizedError();
    }

    const user = await userModel.findById(userData.id);
    const userDto = new UserDto(user);
    const updatedUser = await TokenService.updateTokens(userDto);

    return updatedUser;
  }

  async getAll() {
    const users = await userModel.find();

    const result = users.map((user) => new UserDto(user));

    return result;
  }
}

const User = new UserService();

export default User;
