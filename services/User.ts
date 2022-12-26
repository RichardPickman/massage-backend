import ApiError from "../exceptions";
import userModel from "../model/schemes/User";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import MailService from "../controllers/mailController";
import TokenService from "../controllers/tokenController";
import UserDto from "../dtos/user";

class UserService {
  async registration(email: string, password: string) {
    const candidate = await userModel.findOne({ email });

    if (candidate) {
      console.log("UserService: candidate already found");

      return;
    }

    const hashPassword = await bcrypt.hash(password, 3);
    const activationLink = uuidv4();

    const user = await userModel.create({
      email,
      password: hashPassword,
      activationLink,
    });
    await MailService.sendActivationLink(
      email,
      `${process.env.API_URL}/api/users/activate/${activationLink}`
    );

    const userDto = new UserDto(user);
    const tokens = TokenService.generateTokens({ ...userDto });
    await TokenService.saveToken(userDto.id, tokens.refreshToken);

    return {
      ...tokens,
      user: userDto,
    };
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

  async login(email, password) {
    const userData = await userModel.findOne({ email });

    if (!userData) {
      throw ApiError.BadRequest("User not found");
    }

    const isPassEquals = await bcrypt.compare(password, userData.password);

    if (!isPassEquals) {
      throw ApiError.BadRequest("Invalid email or password");
    }

    const userDto = new UserDto(userData);
    const tokens = TokenService.generateTokens({ ...userDto });
    await TokenService.saveToken(userDto.id, tokens.refreshToken);

    return {
      ...tokens,
      user: userDto,
    };
  }

  async logout(refreshToken) {
    try {
      const token = await TokenService.removeToken(refreshToken);

      return token;
      return;
    } catch (e) {}
  }

  async refresh(refreshToken) {
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
    const tokens = TokenService.generateTokens({ ...userDto });
    await TokenService.saveToken(userDto.id, tokens.refreshToken);

    return {
      ...tokens,
      user: userDto,
    };
  }

  async getAll() {
    const users = await userModel.find();

    return users;
  }
}

const User = new UserService();

export default User;
