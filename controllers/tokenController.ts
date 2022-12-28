import * as jwt from "jsonwebtoken";
import tokenModel from "../model/schemes/Token";

interface JwtWithData extends jwt.JwtPayload {
  email: string;
  id: string;
  isActivated: boolean;
  iat: number;
  exp: number;
}

class TokenService {
  generateTokens(payload: Record<string, unknown>) {
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN, {
      expiresIn: "30m",
    });
    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN, {
      expiresIn: "30d",
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  validateAccessToken(token: string) {
    try {
      const userData = jwt.verify(token, process.env.ACCESS_TOKEN);

      return userData as JwtWithData;
    } catch (e) {
      return null;
    }
  }

  validateRefreshToken(token: string) {
    try {
      const userData = jwt.verify(token, process.env.REFRESH_TOKEN);

      return userData as JwtWithData;
    } catch (e) {
      return null;
    }
  }

  async updateTokens(userDto) {
    const tokens = this.generateTokens({ ...userDto });
    await this.saveToken(userDto.id, tokens.refreshToken);

    return {
      ...tokens,
      user: userDto,
    };
  }

  async saveToken(userId, refreshToken) {
    const tokenData = await tokenModel.findOne({ user: userId });

    if (tokenData) {
      tokenData.refreshToken = refreshToken;
      return tokenData.save();
    }

    const token = await tokenModel.create({ user: userId, refreshToken });

    return token;
  }

  async removeToken(refreshToken) {
    const tokenData = await tokenModel.deleteOne({ refreshToken });

    return tokenData;
  }

  async findToken(refreshToken) {
    const tokenData = await tokenModel.findOne({ refreshToken });

    return tokenData;
  }
}

export default new TokenService();
